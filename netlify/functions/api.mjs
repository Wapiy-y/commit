import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import serverless from "serverless-http";

const app = express();
app.use(express.json());

// DEBUG: log every request path
app.use((req, _res, next) => {
	console.log(">>> incoming url:", req.url, "| method:", req.method);
	next();
});

// Strip the Netlify function prefix so Express sees clean paths
app.use((req, _res, next) => {
	const original = req.url;
	req.url = req.url.replace(/^\/api/, "") || "/";
	console.log(">>> rewritten url:", original, "->", req.url);
	next();
});

const sql = neon(process.env.DATABASE_URL);
const JWT_SECRET = process.env.JWT_SECRET;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 64-char hex (32 bytes)
const ALGORITHM = "aes-256-gcm";

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
	throw new Error(
		"ENCRYPTION_KEY must be a 64-char hex string. Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
	);
}

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

function requireAuth(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Missing token" });
	}
	const token = authHeader.split(" ")[1];
	try {
		const payload = jwt.verify(token, JWT_SECRET);
		req.userId = payload.userId;
		next();
	} catch {
		return res.status(401).json({ error: "Invalid or expired token" });
	}
}

// ── Auth routes ───────────────────────────────────────────────────────────────

app.post("/auth/register", async (req, res) => {
	const { email, password, name } = req.body;
	if (!email || !password || !name) {
		return res
			.status(400)
			.json({ error: "Email, password, and name are required" });
	}
	if (password.length < 8) {
		return res
			.status(400)
			.json({ error: "Password must be at least 8 characters" });
	}
	try {
		const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
		if (existing.length > 0) {
			return res.status(409).json({ error: "Email already registered" });
		}
		const passwordHash = await bcrypt.hash(password, 12);
		const [user] = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, ${name}, ${passwordHash})
      RETURNING email, name
    `;
		const token = jwt.sign({ userId: user.id }, JWT_SECRET);
		res.status(201).json({ token, user });
	} catch (err) {
		console.error("register error:", err);
		res.status(500).json({ error: "Registration failed" });
	}
});

app.post("/auth/login", async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json({ error: "Email and password are required" });
	}
	try {
		const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
		if (!user)
			return res.status(401).json({ error: "Invalid email or password" });

		const valid = await bcrypt.compare(password, user.password_hash);
		if (!valid)
			return res.status(401).json({ error: "Invalid email or password" });

		const token = jwt.sign({ userId: user.id }, JWT_SECRET);
		res.json({
			token,
			user: { email: user.email, name: user.name },
		});
	} catch (err) {
		console.error("login error:", err);
		res.status(500).json({ error: "Login failed" });
	}
});

app.get("/auth/me", requireAuth, async (req, res) => {
	try {
		const [user] =
			await sql`SELECT email, name FROM users WHERE id = ${req.userId}`;
		if (!user) return res.status(404).json({ error: "User not found" });
		res.json({ user });
	} catch {
		res.status(500).json({ error: "Failed to fetch user" });
	}
});

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

		// Decrypt name and notes before sending to client
		res.json(bills.map(decryptBill));
	} catch (err) {
		console.error("fetch bills error:", err);
		res.status(500).json({ error: "Failed to fetch bills" });
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

		// Decrypt before returning to client
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
