# Bilku 💸

A personal bills tracking PWA — track monthly commitments, log payments, and monitor what's paid or outstanding.

**Stack:** React + TypeScript + Vite + Tailwind v4 · Cloudflare Workers (Hono API) · Neon PostgreSQL + Neon Auth

---

## Local Dev Setup

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database with **Neon Auth** enabled
- A Cloudflare account (only needed to deploy)

---

### 1. Clone & Install

```bash
git clone https://github.com/Wapiy-y/commit.git
cd commit
npm install
```

---

### 2. Set Up Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
ENCRYPTION_KEY=your_64_char_hex_string
NEON_AUTH_URL=https://ep-xxx.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth

# Baked into the client bundle AT BUILD TIME. Without it the auth client is
# constructed with no URL, gets tree-shaken away, and login silently breaks.
VITE_NEON_AUTH_URL=https://ep-xxx.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth
```

Generate the encryption key — it must be exactly 64 hex characters (32 bytes):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **Never change `ENCRYPTION_KEY` for an existing database.** Bill `name` and
> `notes` are encrypted with it, so a new value makes every existing row
> unreadable.

---

### 3. Set Up the Database

Run `src/db/script.sql` in your Neon SQL Editor. It requires Neon Auth to be
enabled first, because it references `neon_auth.user`.

---

### 4. Run Locally

```bash
npm run dev:worker
```

This serves the frontend **and** the API together through `wrangler dev`, using
`.env` for local values. `npm run dev` alone starts only Vite, so `/api/*` will
not respond.

---

### 5. Deploy

Merging to `main` deploys automatically via Cloudflare Workers Builds.

To deploy manually:

```bash
npm run build
npm run deploy
```

Runtime secrets are set once per Worker (these are **not** the same as the build
variables used by Workers Builds):

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put NEON_AUTH_URL
```

---

### 6. Project Structure

```
├── cloudflare/
│   ├── api.ts                # Hono API (auth + bills + payments)
│   ├── worker.ts             # Worker entry: /api/* to Hono, everything else to assets
│   └── crypto-parity.mjs     # Asserts AES-GCM output matches the legacy format
├── src/
│   ├── api/                  # Client-side fetch wrappers
│   ├── components/
│   ├── locale/               # i18n strings (English + Bahasa Melayu)
│   ├── view/                 # Screen-level components
│   ├── App.tsx
│   └── type.ts
├── src/db/script.sql         # Database schema
├── wrangler.jsonc            # Worker config
└── .env                      # local only, never commit
```

---

### Notes

- **Sessions** are issued by Neon Auth. `src/view/login.tsx` signs in against
  `VITE_NEON_AUTH_URL` directly, and the API verifies the resulting JWT against
  Neon's JWKS.
- **New origins must be allowlisted.** Neon Auth only trusts the domains listed
  under Console → Auth → Configuration → Domains, so a new deployment URL
  returns `INVALID_ORIGIN` until it is added.
- **`VITE_NEON_AUTH_URL` must be set wherever the build runs** (locally and in
  Cloudflare Workers Builds). It is build-time, not runtime.
