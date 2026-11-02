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

-- Append-only record of everything that happens to a bill.
--
-- Written by the API in the same statement as the change itself (a data-modifying
-- CTE), so a bill change and its record either both land or neither does.
--
-- bill_name is an encrypted snapshot rather than a join to bills: after a rename,
-- the history must show the name the bill had at that moment. `changes` likewise
-- stores the before/after rows with name and notes still encrypted.
--
-- `client` records which app wrote the row ('web' or 'ios'), decided server-side
-- from an allowlisted header, never trusted from the request body.
CREATE TABLE IF NOT EXISTS bill_activity (
  id          SERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES neon_auth.user(id) ON DELETE CASCADE,
  bill_id     INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  bill_name   TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN (
                'bill_created',
                'bill_updated',
                'payment_recorded',
                'payment_changed',
                'payment_cleared',
                'bill_deleted'
              )),
  month_year  TEXT,
  amount      NUMERIC(10, 2),
  prev_amount NUMERIC(10, 2),
  changes     JSONB,
  client      TEXT NOT NULL DEFAULT 'web' CHECK (client IN ('web', 'ios')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_time ON bill_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_bill_time ON bill_activity(bill_id, created_at DESC);
