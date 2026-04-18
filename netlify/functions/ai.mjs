import express from "express";
import * as jose from "jose";
import serverless from "serverless-http";

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
	req.url = req.url.replace(/^\/ai/, "") || "/";
	next();
});

if (!process.env.NEON_AUTH_URL) {
	throw new Error("NEON_AUTH_URL environment variable is required");
}

if (!process.env.OPENROUTER_API_KEY) {
	throw new Error("OPENROUTER_API_KEY environment variable is required");
}

const JWKS = jose.createRemoteJWKSet(
	new URL(`${process.env.NEON_AUTH_URL}/.well-known/jwks.json`),
);
const AUTH_ISSUER = new URL(process.env.NEON_AUTH_URL).origin;

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
		req.userId = payload.sub;
		next();
	} catch {
		return res.status(401).json({ error: "Invalid or expired token" });
	}
}

app.post("/monthly-comparison", requireAuth, async (req, res) => {
	const { current, previous, currentMonthYear, previousMonthYear, language } =
		req.body;

	if (!current || !previous || !currentMonthYear || !previousMonthYear) {
		return res.status(400).json({ error: "Missing required fields" });
	}

	const fmt = (n) => Number(n).toFixed(2);

	const prompt = `You are a personal finance assistant. Here is a user's bill payment data for ${currentMonthYear}:

- Total commitment: RM ${fmt(current.total_commitment)}
- Total paid: RM ${fmt(current.true_total_paid)}
- Unpaid: RM ${fmt(current.total_unpaid)} (${current.unpaid_count} bills)
- Paid exactly: ${current.exact_count} bills
- Underpaid: ${current.underpaid_count} bills (shortfall: RM ${fmt(current.total_shortfall)})
- Overpaid: ${current.overpaid_count} bills (excess: RM ${fmt(current.total_excess)})

Give 1 practical tip (max 25 words) on saving money or improving payment habits based on this data. Plain text only, no markdown. Reply in ${language === "my" ? "Bahasa Melayu" : "English"}.`;

	try {
		const response = await fetch(
			"https://openrouter.ai/api/v1/chat/completions",
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model:
						process.env.OPENROUTER_MODEL ??
						"meta-llama/llama-3.3-70b-instruct:free",
					messages: [{ role: "user", content: prompt }],
					provider: { ignore: ["Venice"] },
				}),
			},
		);

		if (!response.ok) {
			const err = await response.text();
			console.error("OpenRouter error:", response.status, err);
			return res.status(500).json({ error: "Failed to generate insight" });
		}

		const data = await response.json();
		const insight = data.choices?.[0]?.message?.content?.trim() ?? "";
		res.json({ insight });
	} catch (err) {
		console.error("AI error:", err);
		res.status(500).json({ error: "Failed to generate insight" });
	}
});

export const handler = serverless(app);
