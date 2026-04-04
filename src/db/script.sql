-- Fresh install schema — requires Neon Auth to be enabled first.
-- The neon_auth schema (and neon_auth.user table) is created automatically
-- by Neon Auth; do NOT create it here.

CREATE TABLE IF NOT EXISTS bills (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  amount          NUMERIC(10, 2) NOT NULL,
  due_day         SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  start_date      DATE NOT NULL,
  duration_months INTEGER,
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT NULL,
  category        TEXT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id           SERIAL PRIMARY KEY,
  bill_id      INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  month_year   TEXT NOT NULL CHECK (month_year ~ '^\d{4}-\d{2}$'),
  amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_paid      BOOLEAN GENERATED ALWAYS AS (amount > 0) STORED,
  paid_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (bill_id, month_year)
);

CREATE INDEX IF NOT EXISTS idx_bills_user_id      ON bills(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_month ON payments(user_id, month_year);
