/**
 * The Bilku API. Runs on Cloudflare Workers via Hono.
 *
 * It began as a port of a serverless Express function, and the behaviour is kept
 * identical to it: same paths, same status codes, same response shapes, same
 * SQL. That legacy implementation is gone, but its encryption format is still
 * preserved and asserted by `crypto-parity.mjs`, because data written under it
 * remains in the database.
 *
 * Two consequences of the port:
 *   - `req.userId` is a typed context variable (`c.get("userId")`).
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

// ── Activity ──────────────────────────────────────────────────────────────────

/**
 * Which client wrote the row. Allowlisted rather than free-form: an unknown or
 * absent header is recorded as 'web', so the column only ever holds two values
 * and a caller cannot write arbitrary text into the history.
 */
function clientOf(c: { req: { header(name: string): string | undefined } }) {
	return c.req.header("x-client") === "ios" ? "ios" : "web";
}

interface ActivityRow {
	bill_name: string;
	changes: {
		before?: Record<string, unknown>;
		after?: Record<string, unknown>;
	} | null;
	[key: string]: unknown;
}

/**
 * Activity rows carry ciphertext in two places: the bill_name snapshot, and the
 * name/notes fields inside `changes`. Both are decrypted here so the client never
 * sees an encrypted value.
 */
function decryptActivity<T extends ActivityRow>(row: T, keyHex: string) {
	const decryptSnapshot = (snapshot?: Record<string, unknown>) => {
		if (!snapshot) return snapshot;
		return {
			...snapshot,
			...(typeof snapshot.name === "string"
				? { name: decrypt(snapshot.name, keyHex) }
				: {}),
			...(typeof snapshot.notes === "string"
				? { notes: decrypt(snapshot.notes, keyHex) }
				: {}),
		};
	};

	return {
		...row,
		bill_name: decrypt(row.bill_name, keyHex),
		changes: row.changes
			? {
					before: decryptSnapshot(row.changes.before),
					after: decryptSnapshot(row.changes.after),
				}
			: null,
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
		const userId = c.get("userId");

		// One statement, so the bill and its record are atomic: the activity CTE
		// reads the insert's own RETURNING, and if either half fails nothing lands.
		const [bill] = await sql`
      WITH ins AS (
        INSERT INTO bills (user_id, name, amount, due_day, start_date, duration_months, notes, category)
        VALUES (
          ${userId},
          ${encrypt(name, c.env.ENCRYPTION_KEY)},
          ${amount},
          ${due_day},
          ${start_date},
          ${duration_months ?? null},
          ${notes ? encrypt(notes, c.env.ENCRYPTION_KEY) : null},
          ${category}
        )
        RETURNING id, name, amount::text, due_day, start_date, duration_months, notes, category
      ), log AS (
        INSERT INTO bill_activity (user_id, bill_id, bill_name, action, amount, client)
        SELECT ${userId}, id, name, 'bill_created', amount::numeric, ${clientOf(c)}
        FROM ins
        RETURNING id
      )
      SELECT * FROM ins
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
		const userId = c.get("userId");

		// old reads the pre-edit row in the same snapshot as upd, so the recorded
		// before/after pair is consistent. It is deliberately NOT `FOR UPDATE`:
		// LockRows skips rows that the same command has already updated, so a
		// locking read here matches nothing and the log insert would silently
		// write zero rows. upd itself takes the row lock, and one statement is
		// one transaction, so no interleaving is possible either way.
		const [bill] = await sql`
      WITH old AS (
        SELECT name, amount::text, due_day, start_date, duration_months, notes, category
        FROM bills
        WHERE id = ${id} AND user_id = ${userId} AND is_active = true
      ), upd AS (
        UPDATE bills SET
          name = ${encrypt(name, c.env.ENCRYPTION_KEY)},
          amount = ${amount},
          due_day = ${dueDayNumber},
          start_date = ${start_date},
          duration_months = ${duration_months ?? null},
          notes = ${notes ? encrypt(notes, c.env.ENCRYPTION_KEY) : null},
          category = ${category}
        WHERE id = ${id} AND user_id = ${userId} AND is_active = true
        RETURNING id, name, amount::text, due_day, start_date, duration_months, notes, category
      ), log AS (
        INSERT INTO bill_activity (user_id, bill_id, bill_name, action, changes, client)
        SELECT
          ${userId}, u.id, u.name, 'bill_updated',
          jsonb_build_object('before', to_jsonb(o), 'after', to_jsonb(u)),
          ${clientOf(c)}
        FROM upd u CROSS JOIN old o
        RETURNING id
      )
      SELECT * FROM upd
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
		const userId = c.get("userId");

		// Deletion is a soft delete, so the bills row survives and bill_activity
		// keeps a valid reference. The record is written in the same statement as
		// the is_active flip.
		const result = await sql`
      WITH upd AS (
        UPDATE bills SET is_active = false
        WHERE id = ${id} AND user_id = ${userId} AND is_active = true
        RETURNING id, name, category, amount
      ), log AS (
        INSERT INTO bill_activity (user_id, bill_id, bill_name, action, client)
        SELECT ${userId}, id, name, 'bill_deleted', ${clientOf(c)}
        FROM upd
        RETURNING id
      )
      SELECT id FROM upd
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
      WITH prev AS (
        SELECT (
          SELECT amount FROM payments WHERE bill_id = ${id} AND month_year = ${month_year}
        ) AS amount
      ), up AS (
        INSERT INTO payments (bill_id, user_id, month_year, amount, paid_at)
        VALUES (${id}, ${c.get("userId")}, ${month_year}, ${amount}, now())
        ON CONFLICT (bill_id, month_year)
        DO UPDATE SET amount = EXCLUDED.amount, paid_at = now()
        RETURNING id, amount::float, is_paid, bill_id
      ), log AS (
        INSERT INTO bill_activity (user_id, bill_id, bill_name, action, month_year, amount, prev_amount, client)
        SELECT
          ${c.get("userId")}, up.bill_id, b.name,
          CASE
            WHEN prev.amount IS NULL THEN 'payment_recorded'
            WHEN ${amount}::numeric = 0 THEN 'payment_cleared'
            ELSE 'payment_changed'
          END,
          ${month_year}, up.amount, COALESCE(prev.amount, 0), ${clientOf(c)}
        FROM up, prev, bills b
        WHERE b.id = up.bill_id
        RETURNING id
      )
      SELECT up.id, up.amount, up.is_paid FROM up
    `;
		return c.json(payment);
	} catch (err) {
		console.error("payment error:", err);
		return c.json({ error: "Failed to update payment" }, 500);
	}
});

// ── Activity ──────────────────────────────────────────────────────────────────

/**
 * Activity for the newest N months that actually contain activity, returned whole.
 *
 * Pagination is by month rather than by row on purpose: if rows were paged
 * directly, the last month in a page would be half-loaded and its totals wrong.
 * Fetching every row of N complete months lets the client group and total them
 * without a second query. `before` pages backwards by month.
 */
app.get("/api/activity", async (c) => {
	const userId = c.get("userId");
	const monthsParam = Number.parseInt(c.req.query("months") ?? "6", 10);
	const months = Number.isNaN(monthsParam)
		? 6
		: Math.min(Math.max(monthsParam, 1), 24);
	const before = c.req.query("before") ?? null;
	const billIdParam = c.req.query("bill_id");
	const billId = billIdParam ? Number.parseInt(billIdParam, 10) : null;

	if (before !== null && !/^\d{4}-\d{2}$/.test(before)) {
		return c.json({ error: "Invalid before format. Use YYYY-MM" }, 400);
	}
	if (billId !== null && Number.isNaN(billId)) {
		return c.json({ error: "Invalid bill_id" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const rows = await sql`
      WITH months AS (
        SELECT to_char(created_at, 'YYYY-MM') AS month
        FROM bill_activity
        WHERE user_id = ${userId}
          AND (${before}::text IS NULL OR to_char(created_at, 'YYYY-MM') < ${before})
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT ${months}
      )
      SELECT
        a.id,
        a.bill_id,
        a.bill_name,
        a.action,
        a.month_year,
        a.amount::float,
        a.prev_amount::float,
        a.changes,
        a.client,
        a.created_at,
        to_char(a.created_at, 'YYYY-MM') AS month
      FROM bill_activity a
      JOIN months m ON m.month = to_char(a.created_at, 'YYYY-MM')
      WHERE a.user_id = ${userId}
        AND (${billId}::int IS NULL OR a.bill_id = ${billId}::int)
      ORDER BY a.created_at DESC, a.id DESC
    `;

		return c.json(
			rows.map((row) =>
				decryptActivity(row as unknown as ActivityRow, c.env.ENCRYPTION_KEY),
			),
		);
	} catch (err) {
		console.error("fetch activity error:", err);
		return c.json({ error: "Failed to fetch activity" }, 500);
	}
});

// ── Vehicles ──────────────────────────────────────────────────────────────────
//
// Status (insurance expiry, service due) is derived on the client from these
// fields rather than stored: a stored status would go stale the moment the date
// changes, and this app has no scheduled job to refresh it.

const VEHICLE_TYPES = ["car", "motorcycle"];
const COVERAGE_TYPES = ["comprehensive", "third_party"];

app.get("/api/vehicles", async (c) => {
	try {
		const sql = neon(c.env.DATABASE_URL);
		const rows = await sql`
      SELECT
        v.id, v.plate_number, v.vehicle_type, v.brand, v.model,
        v.current_mileage, v.mileage_updated_at, v.service_interval,
        v.next_service_mileage, v.created_at,
        i.id AS insurance_id, i.provider, i.policy_number, i.coverage_type,
        i.start_date, i.expiry_date, i.premium_paid::float
      FROM vehicles v
      LEFT JOIN vehicle_insurance i
        ON i.vehicle_id = v.id AND i.superseded_at IS NULL
      WHERE v.user_id = ${c.get("userId")} AND v.is_active = true
      ORDER BY v.created_at ASC
    `;

		return c.json(
			rows.map((row) => {
				const { insurance_id, provider, ...rest } = row as Record<
					string,
					unknown
				>;
				return {
					...rest,
					insurance: insurance_id
						? {
								id: insurance_id,
								provider,
								policy_number: (row as Record<string, unknown>).policy_number,
								coverage_type: (row as Record<string, unknown>).coverage_type,
								start_date: (row as Record<string, unknown>).start_date,
								expiry_date: (row as Record<string, unknown>).expiry_date,
								premium_paid: (row as Record<string, unknown>).premium_paid,
							}
						: null,
				};
			}),
		);
	} catch (err) {
		console.error("fetch vehicles error:", err);
		return c.json({ error: "Failed to fetch vehicles" }, 500);
	}
});

app.post("/api/vehicles", async (c) => {
	const body = await c.req.json();
	const {
		plate_number,
		vehicle_type,
		brand,
		model,
		current_mileage,
		service_interval,
	} = body ?? {};

	if (!plate_number || !vehicle_type || !brand || !model) {
		return c.json({ error: "Missing required fields" }, 400);
	}
	if (!VEHICLE_TYPES.includes(vehicle_type)) {
		return c.json({ error: "Invalid vehicle_type" }, 400);
	}

	const mileage = Number(current_mileage ?? 0);
	const interval = Number(service_interval ?? 10000);
	if (!Number.isInteger(mileage) || mileage < 0) {
		return c.json({ error: "current_mileage must be a whole number" }, 400);
	}
	if (!Number.isInteger(interval) || interval <= 0) {
		return c.json(
			{ error: "service_interval must be a positive whole number" },
			400,
		);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [vehicle] = await sql`
      INSERT INTO vehicles (
        user_id, plate_number, vehicle_type, brand, model,
        current_mileage, mileage_updated_at, service_interval, next_service_mileage
      )
      VALUES (
        ${c.get("userId")}, ${plate_number.trim()}, ${vehicle_type},
        ${brand.trim()}, ${model.trim()},
        ${mileage}, ${mileage > 0 ? new Date().toISOString().slice(0, 10) : null},
        ${interval}, ${mileage + interval}
      )
      RETURNING *
    `;
		return c.json(vehicle, 201);
	} catch (err) {
		console.error("add vehicle error:", err);
		return c.json({ error: "Failed to create vehicle" }, 500);
	}
});

app.patch("/api/vehicles/:id", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();
	const { plate_number, vehicle_type, brand, model, service_interval } =
		body ?? {};

	if (!plate_number || !vehicle_type || !brand || !model) {
		return c.json({ error: "Missing required fields" }, 400);
	}
	if (!VEHICLE_TYPES.includes(vehicle_type)) {
		return c.json({ error: "Invalid vehicle_type" }, 400);
	}
	const interval = Number(service_interval ?? 10000);
	if (!Number.isInteger(interval) || interval <= 0) {
		return c.json(
			{ error: "service_interval must be a positive whole number" },
			400,
		);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [vehicle] = await sql`
      UPDATE vehicles SET
        plate_number = ${plate_number.trim()},
        vehicle_type = ${vehicle_type},
        brand = ${brand.trim()},
        model = ${model.trim()},
        -- The target is measured from the last service (or from the current
        -- reading if the vehicle has never been serviced), so shortening the
        -- interval brings the next service forward instead of silently keeping
        -- a target that no longer matches.
        next_service_mileage = COALESCE(
          (SELECT max(mileage_at_service) FROM vehicle_service WHERE vehicle_id = ${id}),
          current_mileage
        ) + ${interval},
        service_interval = ${interval}
      WHERE id = ${id} AND user_id = ${c.get("userId")} AND is_active = true
      RETURNING *
    `;
		if (!vehicle) return c.json({ error: "Vehicle not found" }, 404);
		return c.json(vehicle);
	} catch (err) {
		console.error("update vehicle error:", err);
		return c.json({ error: "Failed to update vehicle" }, 500);
	}
});

app.delete("/api/vehicles/:id", async (c) => {
	const id = c.req.param("id");
	try {
		const sql = neon(c.env.DATABASE_URL);
		const rows = await sql`
      UPDATE vehicles SET is_active = false
      WHERE id = ${id} AND user_id = ${c.get("userId")} AND is_active = true
      RETURNING id
    `;
		if (rows.length === 0) return c.json({ error: "Vehicle not found" }, 404);
		return c.json({ success: true });
	} catch (err) {
		console.error("delete vehicle error:", err);
		return c.json({ error: "Failed to delete vehicle" }, 500);
	}
});

// Odometer-only update: no service event, just a newer reading. Rejects a lower
// value because an odometer does not run backwards, and silently accepting one
// would corrupt every "km until service" figure.
app.patch("/api/vehicles/:id/mileage", async (c) => {
	const id = c.req.param("id");
	const { current_mileage, mileage_updated_at } = (await c.req.json()) ?? {};
	const mileage = Number(current_mileage);

	if (!Number.isInteger(mileage) || mileage < 0) {
		return c.json({ error: "current_mileage must be a whole number" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [vehicle] = await sql`
      UPDATE vehicles SET
        current_mileage = ${mileage},
        mileage_updated_at = ${mileage_updated_at ?? new Date().toISOString().slice(0, 10)}
      WHERE id = ${id} AND user_id = ${c.get("userId")} AND is_active = true
        AND ${mileage} >= current_mileage
      RETURNING *
    `;
		if (!vehicle) {
			return c.json(
				{ error: "Mileage cannot be lower than the current reading" },
				400,
			);
		}
		return c.json(vehicle);
	} catch (err) {
		console.error("update mileage error:", err);
		return c.json({ error: "Failed to update mileage" }, 500);
	}
});

app.get("/api/vehicles/:id/insurance", async (c) => {
	const id = c.req.param("id");
	try {
		const sql = neon(c.env.DATABASE_URL);
		const rows = await sql`
      SELECT id, provider, policy_number, coverage_type, start_date, expiry_date,
             premium_paid::float, superseded_at, created_at
      FROM vehicle_insurance
      WHERE vehicle_id = ${id} AND user_id = ${c.get("userId")}
      ORDER BY start_date DESC, id DESC
    `;
		return c.json(rows);
	} catch (err) {
		console.error("fetch insurance error:", err);
		return c.json({ error: "Failed to fetch insurance history" }, 500);
	}
});

// Renewal. One statement: stamp the active policy superseded, insert the new one.
// The partial unique index means a concurrent second renewal fails loudly rather
// than leaving two active policies.
app.post("/api/vehicles/:id/insurance", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();
	const {
		provider,
		policy_number,
		coverage_type,
		start_date,
		expiry_date,
		premium_paid,
	} = body ?? {};

	if (
		!provider ||
		!policy_number ||
		!coverage_type ||
		!start_date ||
		!expiry_date
	) {
		return c.json({ error: "Missing required fields" }, 400);
	}
	if (!COVERAGE_TYPES.includes(coverage_type)) {
		return c.json({ error: "Invalid coverage_type" }, 400);
	}
	if (
		!/^\d{4}-\d{2}-\d{2}$/.test(start_date) ||
		!/^\d{4}-\d{2}-\d{2}$/.test(expiry_date)
	) {
		return c.json({ error: "Dates must be YYYY-MM-DD" }, 400);
	}
	if (expiry_date <= start_date) {
		return c.json({ error: "expiry_date must be after start_date" }, 400);
	}
	const premium = Number(premium_paid ?? 0);
	if (Number.isNaN(premium) || premium < 0) {
		return c.json({ error: "premium_paid must be zero or more" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [vehicle] =
			await sql`SELECT id FROM vehicles WHERE id = ${id} AND user_id = ${c.get("userId")} AND is_active = true`;
		if (!vehicle) return c.json({ error: "Vehicle not found" }, 404);

		// Two statements in one transaction, not one statement with CTEs: the
		// partial unique index only allows one active policy, and a sibling CTE's
		// UPDATE is not visible to the INSERT's uniqueness check in the same
		// command — Postgres rejects that with a duplicate-key error. Sequential
		// statements inside a transaction see each other, so retire-then-insert
		// is the only correct shape here.
		const [, inserted] = await sql.transaction([
			sql`
        UPDATE vehicle_insurance SET superseded_at = now()
        WHERE vehicle_id = ${id} AND user_id = ${c.get("userId")} AND superseded_at IS NULL
      `,
			sql`
        INSERT INTO vehicle_insurance (
          user_id, vehicle_id, provider, policy_number, coverage_type,
          start_date, expiry_date, premium_paid
        )
        VALUES (
          ${c.get("userId")}, ${id}, ${provider.trim()}, ${policy_number.trim()},
          ${coverage_type}, ${start_date}, ${expiry_date}, ${premium}
        )
        RETURNING id, provider, policy_number, coverage_type, start_date,
                  expiry_date, premium_paid::float, created_at
      `,
		]);
		const policy = (inserted as Record<string, unknown>[])[0];
		return c.json(policy, 201);
	} catch (err) {
		console.error("renew insurance error:", err);
		return c.json({ error: "Failed to renew insurance" }, 500);
	}
});

app.get("/api/vehicles/:id/service", async (c) => {
	const id = c.req.param("id");
	try {
		const sql = neon(c.env.DATABASE_URL);
		const rows = await sql`
      SELECT id, serviced_on, mileage_at_service, workshop, cost::float, notes, created_at
      FROM vehicle_service
      WHERE vehicle_id = ${id} AND user_id = ${c.get("userId")}
      ORDER BY serviced_on DESC, id DESC
    `;
		return c.json(rows);
	} catch (err) {
		console.error("fetch service error:", err);
		return c.json({ error: "Failed to fetch service history" }, 500);
	}
});

// Logging a service does three things at once: record the event, move the
// odometer, and recompute the next milestone. All in one statement, because a
// half-applied version leaves the odometer and the log permanently disagreeing.
app.post("/api/vehicles/:id/service", async (c) => {
	const id = c.req.param("id");
	const body = await c.req.json();
	const { serviced_on, mileage_at_service, workshop, cost, notes } = body ?? {};

	if (!serviced_on || mileage_at_service === undefined) {
		return c.json(
			{ error: "serviced_on and mileage_at_service are required" },
			400,
		);
	}
	if (!/^\d{4}-\d{2}-\d{2}$/.test(serviced_on)) {
		return c.json({ error: "serviced_on must be YYYY-MM-DD" }, 400);
	}
	const mileage = Number(mileage_at_service);
	if (!Number.isInteger(mileage) || mileage < 0) {
		return c.json({ error: "mileage_at_service must be a whole number" }, 400);
	}
	const costValue =
		cost === undefined || cost === null || cost === "" ? null : Number(cost);
	if (costValue !== null && (Number.isNaN(costValue) || costValue < 0)) {
		return c.json({ error: "cost must be zero or more" }, 400);
	}

	try {
		const sql = neon(c.env.DATABASE_URL);
		const [updated] = await sql`
      WITH ins AS (
        -- The same odometer guard as the UPDATE below. A data-modifying CTE always
        -- runs, even when its sibling matches no rows, so guarding only the UPDATE
        -- would record the service while refusing to move the mileage.
        INSERT INTO vehicle_service (
          user_id, vehicle_id, serviced_on, mileage_at_service, workshop, cost, notes
        )
        SELECT ${c.get("userId")}, ${id}, ${serviced_on}, ${mileage},
               ${workshop?.trim() || null}, ${costValue}, ${notes?.trim() || null}
        WHERE EXISTS (
          SELECT 1 FROM vehicles v
          WHERE v.id = ${id} AND v.user_id = ${c.get("userId")} AND v.is_active = true
            AND ${mileage} >= v.current_mileage
        )
        RETURNING id
      ), upd AS (
        UPDATE vehicles v SET
          current_mileage = GREATEST(v.current_mileage, ${mileage}),
          mileage_updated_at = GREATEST(
            COALESCE(v.mileage_updated_at, ${serviced_on}::date), ${serviced_on}::date
          ),
          next_service_mileage = ${mileage} + v.service_interval
        WHERE v.id = ${id} AND v.user_id = ${c.get("userId")} AND v.is_active = true
          AND ${mileage} >= v.current_mileage
        RETURNING v.id, v.current_mileage, v.next_service_mileage, v.service_interval
      )
      SELECT * FROM upd
    `;

		if (!updated) {
			return c.json(
				{
					error:
						"mileage_at_service cannot be lower than the vehicle's current mileage",
				},
				400,
			);
		}
		return c.json(updated, 201);
	} catch (err) {
		console.error("log service error:", err);
		return c.json({ error: "Failed to log service" }, 500);
	}
});

export default app;
