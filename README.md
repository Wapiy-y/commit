# Bilku 💸

A personal bills tracking PWA — track monthly commitments, log payments, and monitor what's paid or outstanding.

**Stack:** React + TypeScript + Vite + Tailwind v4 · Netlify Functions (serverless Express) · Neon PostgreSQL

---

## Local Dev Setup

### Prerequisites

- Node.js 18+
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) — `npm install -g netlify-cli`
- A [Neon](https://neon.tech) PostgreSQL database

---

### 1. Clone & Install

```bash
git clone https://github.com/your-username/bilku.git
cd bilku
npm install
```

---

### 2. Set Up Environment Variables

Create a `.env` file at the project root:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your_64_char_random_string
ENCRYPTION_KEY=your_64_char_hex_string
```

Generate the secrets:

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# ENCRYPTION_KEY (must be exactly 64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 3. Set Up the Database

Run this SQL in your Neon SQL Editor:

Get the sql script from ```src/db/script.sql```

---

### 4. Run Locally

```bash
netlify dev
```

This starts both the Vite frontend and Netlify Functions together at `http://localhost:8888`.

> ⚠️ Do **not** use `npm run dev` alone — the API functions won't be available.

---

### 5. Project Structure

```
bilku/
├── netlify/
│   └── functions/
│       └── api.mjs          # Express backend (auth + bills + payments)
├── src/
│   ├── api/
│   │   ├── auth.ts      
│   │   └── bills.ts         
│   ├── components/
│   ├── locale
│   ├── view/
│   │   ├── login.tsx
│   │   ├── Content.tsx
│   │   └── Bills.tsx
│   ├── App.tsx
│   ├── type.ts
│   └── main.tsx
├── netlify.toml
├── vite.config.ts
└── .env                     # local only, never commit
```

---

Set these environment variables in **Netlify UI → Site configuration → Environment variables**:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | 64-char random string |
| `ENCRYPTION_KEY` | 64-char hex string |

---