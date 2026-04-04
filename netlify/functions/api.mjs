import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import express from "express";
import * as jose from "jose";
import serverless from "serverless-http";

const app = express();
app.use(express.json());

// Strip the Netlify function prefix so Express sees clean paths
app.use((req, _res, next) => {
	req.url = req.url.replace(/^\/api/, "") || "/";
	next();
});

const sql = neon(process.env.DATABASE_URL);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 64-char hex (32 bytes)
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
	throw new Error(
		"ENCRYPTION_KEY must be a 64-char hex string. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
	);
}

if (!process.env.NEON_AUTH_URL) {
	throw new Error("NEON_AUTH_URL environment variable is required");
}

// ── Neon Auth JWKS setup ──────────────────────────────────────────────────────

const JWKS = jose.createRemoteJWKSet(
	new URL(`${process.env.NEON_AUTH_URL}/.well-known/jwks.json`),
);
const AUTH_ISSUER = new URL(process.env.NEON_AUTH_URL).origin;

// ── Encryption helpers ────────────────────────────────────────────────────────

function encrypt(text) {
	const iv = randomBytes(16);
	const cipher = createCipheriv(
		ALGORITHM,
		Buffer.from(ENCRYPTION_KEY, "hex"),
		iv,
	);
	const encrypted = Buffer.concat([
		cipher.update(text, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decrypt(encoded) {
	try {
		const parts = encoded.split(":");
		// If it doesn't look like encrypted data, return as-is (handles legacy plain rows)
		if (parts.length !== 3) return encoded;
		const [ivHex, tagHex, encryptedHex] = parts;
		const decipher = createDecipheriv(
			ALGORITHM,
			Buffer.from(ENCRYPTION_KEY, "hex"),
			Buffer.from(ivHex, "hex"),
		);
		decipher.setAuthTag(Buffer.from(tagHex, "hex"));
		return (
			decipher.update(Buffer.from(encryptedHex, "hex")).toString("utf8") +
			decipher.final("utf8")
		);
	} catch {
		return encoded; // fallback: return raw if decryption fails
	}
}

function decryptBill(bill) {
	return {
		...bill,
		name: decrypt(bill.name),
		notes: bill.notes ? decrypt(bill.notes) : null,
	};
}

// ── Auth middleware ───────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Missing token" });
	}
	const token = authHeader.split(" ")[1];
	try {
		const { payload } = await jose.jwtVerify(token, JWKS, {
			issuer: AUTH_ISSUER,
		});
		if (!payload.sub) {
			return res.status(401).json({ error: "Invalid token" });
		}
		req.userId = payload.sub; // UUID string from neon_auth.user.id
		next();
	} catch {
		return res.status(401).json({ error: "Invalid or expired token" });
	}
}

// ── Bills routes ──────────────────────────────────────────────────────────────

app.get("/bills", requireAuth, async (req, res) => {
	const { month } = req.query;
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
	}
	try {
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
        b.user_id = ${req.userId}
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

		res.json(bills.map(decryptBill));
	} catch (err) {
		console.error("fetch bills error:", err);
		res.status(500).json({ error: "Failed to fetch bills" });
	}
});

app.get("/bills/summary", requireAuth, async (req, res) => {
	const { month } = req.query;
	if (!month || !/^\d{4}-\d{2}$/.test(month)) {
		return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" });
	}
	try {
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
        b.user_id = ${req.userId}
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
		res.json(summary);
	} catch (err) {
		console.error("fetch summary error:", err);
		res.status(500).json({ error: "Failed to fetch summary" });
	}
});

app.post("/bills", requireAuth, async (req, res) => {
	const {
		name,
		amount,
		due_day,
		start_date,
		duration_months,
		notes,
		category,
	} = req.body;
	if (!name || !amount || !due_day || !start_date || !category) {
		return res.status(400).json({ error: "Missing required fields" });
	}

	// Validate start_date is current month or future
	const now = new Date();
	const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
	const startYearMonth = start_date.slice(0, 7);
	if (startYearMonth < currentYearMonth) {
		return res.status(400).json({ error: "Start date cannot be in the past" });
	}

	try {
		const [bill] = await sql`
      INSERT INTO bills (user_id, name, amount, due_day, start_date, duration_months, notes, category)
      VALUES (
        ${req.userId},
        ${encrypt(name)},
        ${amount},
        ${due_day},
        ${start_date},
        ${duration_months ?? null},
        ${notes ? encrypt(notes) : null},
        ${category}
      )
      RETURNING id, name, amount::text, due_day, start_date, duration_months, notes, category
    `;

		res.status(201).json(decryptBill(bill));
	} catch (err) {
		console.error("add bill error:", err);
		res.status(500).json({ error: "Failed to create bill" });
	}
});

app.delete("/bills/:id", requireAuth, async (req, res) => {
	const { id } = req.params;
	try {
		const result = await sql`
      UPDATE bills SET is_active = false
      WHERE id = ${id} AND user_id = ${req.userId}
      RETURNING id
    `;
		if (result.length === 0)
			return res.status(404).json({ error: "Bill not found" });
		res.json({ success: true });
	} catch (err) {
		console.error("delete bill error:", err);
		res.status(500).json({ error: "Failed to delete bill" });
	}
});

// ── Payments routes ───────────────────────────────────────────────────────────

app.post("/bills/:id/payment", requireAuth, async (req, res) => {
	const { id } = req.params;
	const { month_year, amount } = req.body;
	if (!month_year || amount === undefined) {
		return res
			.status(400)
			.json({ error: "month_year and amount are required" });
	}
	try {
		const [bill] =
			await sql`SELECT id FROM bills WHERE id = ${id} AND user_id = ${req.userId}`;
		if (!bill) return res.status(404).json({ error: "Bill not found" });

		const [payment] = await sql`
      INSERT INTO payments (bill_id, user_id, month_year, amount, paid_at)
      VALUES (${id}, ${req.userId}, ${month_year}, ${amount}, now())
      ON CONFLICT (bill_id, month_year)
      DO UPDATE SET amount = EXCLUDED.amount, paid_at = now()
      RETURNING id, amount::float, is_paid
    `;
		res.json(payment);
	} catch (err) {
		console.error("payment error:", err);
		res.status(500).json({ error: "Failed to update payment" });
	}
});

export const handler = serverless(app);
