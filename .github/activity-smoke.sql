-- Test-only smoke test for the bill_activity writes. NOT part of the deployed schema.
--
-- Run by .github/workflows/schema.yml against the scratch database, after the
-- stub and src/db/script.sql. It executes the same statements the API runs (one
-- data-modifying CTE per mutation) and then asserts what they recorded.
--
-- Why this exists: a locking read (`FOR UPDATE`) alongside an UPDATE of the same
-- row in one statement matches nothing, because LockRows skips rows the command
-- has already modified. That made `bill_updated` silently record zero rows.
-- The action-list assertion below catches that class of regression.
--
-- Any assertion failure raises, so ON_ERROR_STOP fails the job.

INSERT INTO neon_auth."user" (id) VALUES ('11111111-1111-1111-1111-111111111111');

-- ── create ────────────────────────────────────────────────────────────────────
WITH ins AS (
  INSERT INTO bills (user_id, name, amount, due_day, start_date, duration_months, notes, category)
  VALUES ('11111111-1111-1111-1111-111111111111', 'AES:AES:AES', 100, 5, '2026-11-01', NULL, NULL, 'water')
  RETURNING id, name, amount::text, due_day, start_date, duration_months, notes, category
), log AS (
  INSERT INTO bill_activity (user_id, bill_id, bill_name, action, amount, client)
  SELECT '11111111-1111-1111-1111-111111111111', id, name, 'bill_created', amount::numeric, 'web'
  FROM ins
  RETURNING id
)
SELECT count(*) FROM log;

-- ── update ────────────────────────────────────────────────────────────────────
WITH old AS (
  SELECT name, amount::text, due_day, start_date, duration_months, notes, category
  FROM bills
  WHERE id = 1 AND user_id = '11111111-1111-1111-1111-111111111111' AND is_active = true
), upd AS (
  UPDATE bills SET
    name = 'AES:AES:AES2', amount = 120, due_day = 7,
    start_date = '2026-11-01', duration_months = 12, notes = NULL, category = 'electric'
  WHERE id = 1 AND user_id = '11111111-1111-1111-1111-111111111111' AND is_active = true
  RETURNING id, name, amount::text, due_day, start_date, duration_months, notes, category
), log AS (
  INSERT INTO bill_activity (user_id, bill_id, bill_name, action, changes, client)
  SELECT '11111111-1111-1111-1111-111111111111', u.id, u.name, 'bill_updated',
         jsonb_build_object('before', to_jsonb(o), 'after', to_jsonb(u)), 'web'
  FROM upd u CROSS JOIN old o
  RETURNING id
)
SELECT count(*) FROM log;

-- ── payments: new, changed, then cleared ──────────────────────────────────────
-- Same statement shape as POST /api/bills/:id/payment, run three times with a
-- different amount each time. prev_amount is read from the pre-statement snapshot.
CREATE TEMP TABLE payment_runs (seq int, amount numeric);
INSERT INTO payment_runs VALUES (1, 40), (2, 100), (3, 0);

DO $$
DECLARE
  run record;
  inserted integer;
BEGIN
  FOR run IN SELECT * FROM payment_runs ORDER BY seq LOOP
    WITH prev AS (
      SELECT (
        SELECT amount FROM payments WHERE bill_id = 1 AND month_year = '2026-11'
      ) AS amount
    ), up AS (
      INSERT INTO payments (bill_id, user_id, month_year, amount, paid_at)
      VALUES (1, '11111111-1111-1111-1111-111111111111', '2026-11', run.amount, now())
      ON CONFLICT (bill_id, month_year)
      DO UPDATE SET amount = EXCLUDED.amount, paid_at = now()
      RETURNING id, amount::float, is_paid, bill_id
    ), log AS (
      INSERT INTO bill_activity (user_id, bill_id, bill_name, action, month_year, amount, prev_amount, client)
      SELECT '11111111-1111-1111-1111-111111111111', up.bill_id, b.name,
             CASE
               WHEN prev.amount IS NULL THEN 'payment_recorded'
               WHEN run.amount = 0 THEN 'payment_cleared'
               ELSE 'payment_changed'
             END,
             '2026-11', up.amount, COALESCE(prev.amount, 0), 'web'
      FROM up, prev, bills b
      WHERE b.id = up.bill_id
      RETURNING id
    )
    SELECT count(*) INTO inserted FROM log;

    IF inserted <> 1 THEN
      RAISE EXCEPTION 'payment % inserted % activity rows, expected 1', run.amount, inserted;
    END IF;
  END LOOP;
END $$;

-- ── delete (soft) ─────────────────────────────────────────────────────────────
WITH upd AS (
  UPDATE bills SET is_active = false
  WHERE id = 1 AND user_id = '11111111-1111-1111-1111-111111111111' AND is_active = true
  RETURNING id, name, category, amount
), log AS (
  INSERT INTO bill_activity (user_id, bill_id, bill_name, action, client)
  SELECT '11111111-1111-1111-1111-111111111111', id, name, 'bill_deleted', 'web'
  FROM upd
  RETURNING id
)
SELECT count(*) FROM log;

-- ── assertions ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  actions text[];
  payment_amounts numeric[];
  deleted_bill_payments integer;
  before_due text;
  after_due text;
  paid_total numeric;
  due_before smallint;
  due_after smallint;
BEGIN
  SELECT array_agg(action ORDER BY id) INTO actions FROM bill_activity;
  IF actions IS DISTINCT FROM ARRAY[
    'bill_created', 'bill_updated', 'payment_recorded', 'payment_changed',
    'payment_cleared', 'bill_deleted'
  ] THEN
    RAISE EXCEPTION 'unexpected activity actions: %', actions;
  END IF;

  -- The before/after pair must be populated, with pre-edit values on the left.
  SELECT changes->'before'->>'due_day', changes->'after'->>'due_day'
    INTO before_due, after_due
  FROM bill_activity WHERE action = 'bill_updated';
  IF before_due IS DISTINCT FROM '5' OR after_due IS DISTINCT FROM '7' THEN
    RAISE EXCEPTION 'bill_updated diff wrong: before=% after=%', before_due, after_due;
  END IF;

  -- prev_amount must reflect the state before each write, not the new total.
  SELECT array_agg(prev_amount ORDER BY id) INTO payment_amounts
  FROM bill_activity WHERE action LIKE 'payment%';
  IF payment_amounts IS DISTINCT FROM ARRAY[0, 40, 100]::numeric[] THEN
    RAISE EXCEPTION 'prev_amount chain wrong: %', payment_amounts;
  END IF;

  -- Payment rows must outlive the soft delete; a real cascade would empty these.
  SELECT count(*) INTO deleted_bill_payments FROM payments WHERE bill_id = 1;
  IF deleted_bill_payments <> 1 THEN
    RAISE EXCEPTION 'payments did not survive the soft delete: %', deleted_bill_payments;
  END IF;

  -- One statement is one transaction: a rejected write must leave nothing behind.
  SELECT due_day INTO due_before FROM bills WHERE id = 1;
  BEGIN
    UPDATE bills SET due_day = 28 WHERE id = 1;
    INSERT INTO bill_activity (user_id, bill_id, bill_name, action)
    VALUES ('11111111-1111-1111-1111-111111111111', 1, 'x', 'not_a_real_action');
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  SELECT due_day INTO due_after FROM bills WHERE id = 1;
  IF due_after IS DISTINCT FROM due_before THEN
    RAISE EXCEPTION 'a failed activity insert left the bill change behind (due_day % -> %)',
      due_before, due_after;
  END IF;

  -- Month rollup used by the Record screen.
  SELECT COALESCE(sum(
    CASE action
      WHEN 'payment_recorded' THEN amount
      WHEN 'payment_changed' THEN amount - prev_amount
      WHEN 'payment_cleared' THEN -prev_amount
      ELSE 0
    END), 0) INTO paid_total
  FROM bill_activity;
  -- 40 recorded + 60 raised - 100 cleared nets to zero, which is what the
  -- Record screen must show for a month that was paid and then un-paid.
  IF paid_total <> 0 THEN
    RAISE EXCEPTION 'net paid total wrong: %', paid_total;
  END IF;

  RAISE NOTICE 'activity smoke test passed (% rows)', array_length(actions, 1);
END $$;
