/**
 * Verifies the Hono port's encryption is byte-compatible with the Express
 * implementation, in both directions. If these disagree, every existing
 * encrypted bill name/notes in the database would become unreadable.
 *
 * Run: node crypto-parity.mjs
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = randomBytes(32).toString("hex");

// ── Express version (netlify/functions/api.mjs), copied verbatim ──────────────
function encryptExpress(text) {
	const iv = randomBytes(16);
	const cipher = createCipheriv(ALGORITHM, Buffer.from(KEY, "hex"), iv);
	const encrypted = Buffer.concat([
		cipher.update(text, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptExpress(encoded) {
	try {
		const parts = encoded.split(":");
		if (parts.length !== 3) return encoded;
		const [ivHex, tagHex, encryptedHex] = parts;
		const decipher = createDecipheriv(
			ALGORITHM,
			Buffer.from(KEY, "hex"),
			Buffer.from(ivHex, "hex"),
		);
		decipher.setAuthTag(Buffer.from(tagHex, "hex"));
		return (
			decipher.update(Buffer.from(encryptedHex, "hex")).toString("utf8") +
			decipher.final("utf8")
		);
	} catch {
		return encoded;
	}
}

// ── Hono version (cloudflare/api.ts) ─────────────────────────────────────────
function toHex(bytes) {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex) {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}
function encryptHono(text) {
	const iv = randomBytes(16);
	const cipher = createCipheriv(ALGORITHM, fromHex(KEY), iv);
	const encrypted = cipher.update(text, "utf8");
	const final = cipher.final();
	const tag = cipher.getAuthTag();
	return `${toHex(iv)}:${toHex(tag)}:${toHex(encrypted)}${toHex(final)}`;
}
function decryptHono(encoded) {
	try {
		const parts = encoded.split(":");
		if (parts.length !== 3) return encoded;
		const [ivHex, tagHex, encryptedHex] = parts;
		const decipher = createDecipheriv(ALGORITHM, fromHex(KEY), fromHex(ivHex));
		decipher.setAuthTag(fromHex(tagHex));
		const decoder = new TextDecoder();
		return (
			decoder.decode(decipher.update(fromHex(encryptedHex))) +
			decoder.decode(decipher.final())
		);
	} catch {
		return encoded;
	}
}

const samples = [
	"Netflix",
	"TNB Electricity",
	"租金 – Januari",
	"Électricité ⚡",
	"",
	"A".repeat(400),
	"line\nbreak\ttab",
];

let failures = 0;
console.log("=== 1. decrypt Hono -> Express (cross-implementation) ===");
for (const text of samples) {
	const a = decryptExpress(encryptHono(text));
	const b = decryptHono(encryptExpress(text));
	const ok = a === text && b === text;
	if (!ok) failures++;
	console.log(
		`  ${ok ? "PASS" : "FAIL"}  ${JSON.stringify(text.slice(0, 24))}`,
	);
}

console.log("\n=== 2. same length/casing rules (hex format) ===");
const h = encryptHono("Netflix");
const e = encryptExpress("Netflix");
const shape = (s) => s.split(":").map((p) => p.length);
console.log(
	`  hono    parts: ${shape(h).join(",")}  lowercase=${h === h.toLowerCase()}`,
);
console.log(
	`  express parts: ${shape(e).join(",")}  lowercase=${e === e.toLowerCase()}`,
);

console.log("\n=== 3. legacy plaintext passthrough ===");
for (const legacy of ["plain name", "a:b", "", "x:y:z:extra"]) {
	const a = decryptExpress(legacy);
	const b = decryptHono(legacy);
	const ok = a === legacy ? b === legacy : a === b;
	if (!ok) failures++;
	console.log(
		`  ${ok ? "PASS" : "FAIL"}  ${JSON.stringify(legacy)} -> ${JSON.stringify(b)}`,
	);
}

console.log("\n=== 4. tamper detection (GCM auth tag) ===");
const sealed = encryptHono("Netflix");
const tampered = sealed.replace(/.$/, (ch) => (ch === "0" ? "1" : "0"));
const tamperResult = decryptHono(tampered);
console.log(
	`  tampered ciphertext -> ${tamperResult === tampered ? "returns raw (safe fallback)" : "DECRYPTED (BAD)"}`,
);

console.log(
	`\n${failures === 0 ? "ALL PARITY CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`,
);
process.exit(failures === 0 ? 0 : 1);
