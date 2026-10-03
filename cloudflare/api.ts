/**
 * The Bilku API, ported from Express (netlify/functions/api.mjs) to Hono so it
 * can run on Cloudflare Workers.
 *
 * Behaviour is intentionally identical to the Express version: same paths, same
 * status codes, same response shapes, same SQL. The Netlify function stays in
 * place until the Worker is verified in production.
 *
 * Two things change in the port, both machine-checked:
 *   - `req.userId` becomes a typed context variable (`c.get("userId")`).
 *   - JSON parsing is per-route (`await c.req.json()`) instead of global
 *     middleware, which is how Hono does it.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { Hono } from "hono";
import * as jose from "jose";

export interface Bindings {
	DATABASE_URL: string;
	ENCRYPTION_KEY: string;
	NEON_AUTH_URL: string;
}

interface Variables {
	userId: string;
}

const ALGORITHM = "aes-256-gcm";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ── Encryption helpers ────────────────────────────────────────────────────────
// node:crypto works on Workers via the `nodejs_compat` compatibility flag.
//
// Byte handling uses Uint8Array and explicit hex conversion rather than Buffer:
// @cloudflare/workers-types declares `Buffer` as `any`, which silently turns
// `buf.toString("hex")` into `Object.prototype.toString` and fails to compile.

function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

function encrypt(text: string, keyHex: string): string {
	const iv = randomBytes(16);
	const cipher = createCipheriv(ALGORITHM, fromHex(keyHex), iv);
	const encrypted = cipher.update(text, "utf8");
	const final = cipher.final();
	const tag = cipher.getAuthTag();
	// Same wire format as the Express version: iv:tag:ciphertext, all hex.
	return `${toHex(iv)}:${toHex(tag)}:${toHex(encrypted)}${toHex(final)}`;
}

function decrypt(encoded: string, keyHex: string): string {
	try {
		const parts = encoded.split(":");
		// Values that do not look encrypted are returned as-is, which keeps
		// legacy plaintext rows readable.
		if (parts.length !== 3) return encoded;
		const [ivHex, tagHex, encryptedHex] = parts;
		const decipher = createDecipheriv(
			ALGORITHM,
			fromHex(keyHex),
			fromHex(ivHex),
		);
		decipher.setAuthTag(fromHex(tagHex));
		// TextDecoder rather than Buffer.toString for the same reason as above.
		const decoder = new TextDecoder();
		return (
			decoder.decode(decipher.update(fromHex(encryptedHex))) +
			decoder.decode(decipher.final())
		);
	} catch {
		return encoded;
	}
}

interface BillRow {
	name: string;
	notes: string | null;
	[key: string]: unknown;
}

function decryptBill<T extends BillRow>(bill: T, keyHex: string) {
	return {
		...bill,
		name: decrypt(bill.name, keyHex),
		notes: bill.notes ? decrypt(bill.notes, keyHex) : null,
	};
}

// ── Auth middleware ───────────────────────────────────────────────────────────

app.use("/api/*", async (c, next) => {
	const authHeader = c.req.header("authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		return c.json({ error: "Missing token" }, 401);
	}

	if (!c.env.NEON_AUTH_URL) {
		return c.json({ error: "Server is not configured correctly" }, 500);
	}

	const token = authHeader.split(" ")[1];
	try {
		const jwks = jose.createRemoteJWKSet(
			new URL(`${c.env.NEON_AUTH_URL}/.well-known/jwks.json`),
		);
		const { payload } = await jose.jwtVerify(token, jwks, {
			issuer: new URL(c.env.NEON_AUTH_URL).origin,
		});
		if (!payload.sub) {
			return c.json({ error: "Invalid token" }, 401);
		}
		c.set("userId", payload.sub);
	} catch {
		return c.json({ error: "Invalid or expired token" }, 401);
	}

	await next();
});

// ── Bills ─────────────────────────────────────────────────────────────────────

app.get("/api/bills", async (c) => {
	const month = c.req.query("month");
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return c.json({ error: "Invalid month format. Use YYYY-MM" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const bills = await sql`
      SELECT
        b.id,
        b.name,
        b.amount::text,
        b.due_day,
        b.start_date,
        b.duration_months,
        COALESCE(p.amount, 0)::float AS paid_amount,
        COALESCE(p.is_paid, false) AS is_paid,
        b.notes,
        b.category
      FROM bills b
      LEFT JOIN payments p ON p.bill_id = b.id AND p.month_year = ${month}
      WHERE
        b.user_id = ${c.get("userId")}
        AND b.is_active = true
        AND TO_CHAR(b.start_date, 'YYYY-MM') <= ${month}
        AND (
          b.duration_months IS NULL
          OR TO_CHAR(
            b.start_date + (b.duration_months - 1 || ' months')::interval,
            'YYYY-MM'
          ) >= ${month}
        )
      ORDER BY b.due_day ASC
    `;

		return c.json(
			bills.map((bill) => decryptBill(bill as BillRow, c.env.ENCRYPTION_KEY)),
		);
	} catch (err) {
		console.error("fetch bills error:", err);
		return c.json({ error: "Failed to fetch bills" }, 500);
	}
});

app.get("/api/bills/summary", async (c) => {
	const month = c.req.query("month");
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return c.json({ error: "Invalid month format. Use YYYY-MM" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [summary] = await sql`
      SELECT
        COUNT(*)::int                                                          AS total_bills,
        COUNT(CASE WHEN COALESCE(p.is_paid, false) THEN 1 END)::int           AS paid_count,
        COUNT(CASE WHEN NOT COALESCE(p.is_paid, false) THEN 1 END)::int       AS unpaid_count,
        COALESCE(SUM(b.amount), 0)::float                                      AS total_commitment,
        COALESCE(SUM(CASE WHEN COALESCE(p.is_paid, false) THEN b.amount ELSE 0 END), 0)::float
                                                                               AS total_paid,
        COALESCE(SUM(CASE WHEN NOT COALESCE(p.is_paid, false) THEN b.amount ELSE 0 END), 0)::float
                                                                               AS total_unpaid,
        COALESCE(SUM(CASE WHEN COALESCE(p.is_paid, false) THEN COALESCE(p.amount, 0) ELSE 0 END), 0)::float
                                                                               AS true_total_paid,
        COUNT(CASE WHEN COALESCE(p.is_paid, false) AND COALESCE(p.amount, 0) = b.amount THEN 1 END)::int
                                                                               AS exact_count,
        COUNT(CASE WHEN COALESCE(p.is_paid, false) AND COALESCE(p.amount, 0) < b.amount THEN 1 END)::int
                                                                               AS underpaid_count,
        COALESCE(SUM(CASE WHEN COALESCE(p.is_paid, false) AND COALESCE(p.amount, 0) < b.amount
          THEN b.amount - COALESCE(p.amount, 0) ELSE 0 END), 0)::float        AS total_shortfall,
        COUNT(CASE WHEN COALESCE(p.is_paid, false) AND COALESCE(p.amount, 0) > b.amount THEN 1 END)::int
                                                                               AS overpaid_count,
        COALESCE(SUM(CASE WHEN COALESCE(p.is_paid, false) AND COALESCE(p.amount, 0) > b.amount
          THEN COALESCE(p.amount, 0) - b.amount ELSE 0 END), 0)::float        AS total_excess
      FROM bills b
      LEFT JOIN payments p ON p.bill_id = b.id AND p.month_year = ${month}
      WHERE
        b.user_id = ${c.get("userId")}
        AND b.is_active = true
        AND TO_CHAR(b.start_date, 'YYYY-MM') <= ${month}
        AND (
          b.duration_months IS NULL
          OR TO_CHAR(
            b.start_date + (b.duration_months - 1 || ' months')::interval,
            'YYYY-MM'
          ) >= ${month}
        )
    `;

		return c.json(summary);
	} catch (err) {
		console.error("fetch summary error:", err);
		return c.json({ error: "Failed to fetch summary" }, 500);
	}
});

app.post("/api/bills", async (c) => {
	const {
		name,
		amount,
		due_day,
		start_date,
		duration_months,
		notes,
		category,
	} = await c.req.json();
	if (!name || !amount || !due_day || !start_date || !category) {
		return c.json({ error: "Missing required fields" }, 400);
	}

	// Validate start_date is this month or later. Compared as full dates rather
	// than year-month: the form's date input permits any day from the 1st of the
	// current month, so a month-only comparison would reject a date the form
	// itself offers.
	const now = new Date();
	const firstOfThisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	if (start_date < firstOfThisMonth) {
		return c.json({ error: "Start date cannot be in the past" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [bill] = await sql`
      INSERT INTO bills (user_id, name, amount, due_day, start_date, duration_months, notes, category)
      VALUES (
        ${c.get("userId")},
        ${encrypt(name, c.env.ENCRYPTION_KEY)},
        ${amount},
        ${due_day},
        ${start_date},
        ${duration_months ?? null},
        ${notes ? encrypt(notes, c.env.ENCRYPTION_KEY) : null},
        ${category}
      )
      RETURNING id, name, amount::text, due_day, start_date, duration_months, notes, category
    `;

		return c.json(decryptBill(bill as BillRow, c.env.ENCRYPTION_KEY), 201);
	} catch (err) {
		console.error("add bill error:", err);
		return c.json({ error: "Failed to create bill" }, 500);
	}
});

// Edit a bill's own fields. Deliberately never touches `payments`, so a bill
// that is already paid keeps its recorded amount.
app.patch("/api/bills/:id", async (c) => {
	const id = c.req.param("id");
	const {
		name,
		amount,
		due_day,
		start_date,
		duration_months,
		notes,
		category,
	} = await c.req.json();

	// Every editable field is required, so an edit is a full replacement of the
	// bill definition and omitted fields cannot be silently mistaken for
	// "unchanged".
	if (
		name === undefined ||
		amount === undefined ||
		due_day === undefined ||
		start_date === undefined ||
		category === undefined
	) {
		return c.json({ error: "Missing required fields" }, 400);
	}

	if (!name || !amount || !due_day || !start_date || !category) {
		return c.json({ error: "Missing required fields" }, 400);
	}

	const dueDayNumber = Number(due_day);
	if (
		!Number.isInteger(dueDayNumber) ||
		dueDayNumber < 1 ||
		dueDayNumber > 31
	) {
		return c.json(
			{ error: "due_day must be an integer between 1 and 31" },
			400,
		);
	}

	// Unlike create, a past start_date is allowed: bills are edited after they
	// have already started.
	try {
		const sql = neon(c.env.DATABASE_URL);
		const [bill] = await sql`
      UPDATE bills SET
        name = ${encrypt(name, c.env.ENCRYPTION_KEY)},
        amount = ${amount},
        due_day = ${dueDayNumber},
        start_date = ${start_date},
        duration_months = ${duration_months ?? null},
        notes = ${notes ? encrypt(notes, c.env.ENCRYPTION_KEY) : null},
        category = ${category}
      WHERE id = ${id} AND user_id = ${c.get("userId")} AND is_active = true
      RETURNING id, name, amount::text, due_day, start_date, duration_months, notes, category
    `;

		if (!bill) return c.json({ error: "Bill not found" }, 404);
		return c.json(decryptBill(bill as BillRow, c.env.ENCRYPTION_KEY));
	} catch (err) {
		console.error("update bill error:", err);
		return c.json({ error: "Failed to update bill" }, 500);
	}
});

app.delete("/api/bills/:id", async (c) => {
	const id = c.req.param("id");
	try {
		const sql = neon(c.env.DATABASE_URL);
		const result = await sql`
      UPDATE bills SET is_active = false
      WHERE id = ${id} AND user_id = ${c.get("userId")}
      RETURNING id
    `;
		if (result.length === 0) return c.json({ error: "Bill not found" }, 404);
		return c.json({ success: true });
	} catch (err) {
		console.error("delete bill error:", err);
		return c.json({ error: "Failed to delete bill" }, 500);
	}
});

// ── Payments ──────────────────────────────────────────────────────────────────

app.post("/api/bills/:id/payment", async (c) => {
	const id = c.req.param("id");
	const { month_year, amount } = await c.req.json();
	if (!month_year || amount === undefined) {
		return c.json({ error: "month_year and amount are required" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [bill] =
			await sql`SELECT id FROM bills WHERE id = ${id} AND user_id = ${c.get("userId")}`;
		if (!bill) return c.json({ error: "Bill not found" }, 404);

		const [payment] = await sql`
      INSERT INTO payments (bill_id, user_id, month_year, amount, paid_at)
      VALUES (${id}, ${c.get("userId")}, ${month_year}, ${amount}, now())
      ON CONFLICT (bill_id, month_year)
      DO UPDATE SET amount = EXCLUDED.amount, paid_at = now()
      RETURNING id, amount::float, is_paid
    `;
		return c.json(payment);
	} catch (err) {
		console.error("payment error:", err);
		return c.json({ error: "Failed to update payment" }, 500);
	}
});

export default app;
