-- =============================================================================
-- Migration: Manual JWT Auth → Neon Auth
-- =============================================================================
-- PREREQUISITE: Run ONLY after:
--   1. Neon Auth is enabled in your Neon project (Auth tab in console)
--   2. Every existing user has signed up again via the new Neon Auth login
--      (their email in neon_auth.user must match email in the old users table)
--
-- Run this script once inside a single transaction.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Step 0: Seed Neon Auth users from the old users table
--         Inserts only users that don't already exist in neon_auth.user.
--         Existing sign-ups are left untouched.
-- -----------------------------------------------------------------------------
INSERT INTO neon_auth.user (id, email, name, "emailVerified")
SELECT
    gen_random_uuid(),
    u.email,
    u.name,
    true
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM neon_auth.user na WHERE na.email = u.email
);

-- -----------------------------------------------------------------------------
-- Step 1: Verify all old users have matching Neon Auth accounts
--         This query must return 0 rows before you proceed.
--         If it returns rows, those users must sign up via Neon Auth first.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  unmatched_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unmatched_count
  FROM users u
  WHERE NOT EXISTS (
    SELECT 1 FROM neon_auth.user na WHERE na.email = u.email
  );

  IF unmatched_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % user(s) in the old users table have no matching '
      'Neon Auth account. Have them sign up first, then re-run this script.',
      unmatched_count;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Step 2: Preserve old integer user_id values in temp columns
-- -----------------------------------------------------------------------------
ALTER TABLE bills    ADD COLUMN IF NOT EXISTS old_user_id INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS old_user_id INTEGER;

UPDATE bills    SET old_user_id = user_id;
UPDATE payments SET old_user_id = user_id;

-- -----------------------------------------------------------------------------
-- Step 3: Drop old foreign key constraints and integer user_id columns
-- -----------------------------------------------------------------------------
ALTER TABLE bills    DROP CONSTRAINT IF EXISTS bills_user_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

ALTER TABLE bills    DROP COLUMN user_id;
ALTER TABLE payments DROP COLUMN user_id;

-- -----------------------------------------------------------------------------
-- Step 4: Add new UUID user_id columns
-- -----------------------------------------------------------------------------
ALTER TABLE bills    ADD COLUMN user_id UUID;
ALTER TABLE payments ADD COLUMN user_id UUID;

-- -----------------------------------------------------------------------------
-- Step 5: Map old integer IDs → new Neon Auth UUIDs (matched by email)
-- -----------------------------------------------------------------------------
UPDATE bills b
SET user_id = na.id
FROM users u
JOIN neon_auth.user na ON na.email = u.email
WHERE b.old_user_id = u.id;

UPDATE payments p
SET user_id = na.id
FROM users u
JOIN neon_auth.user na ON na.email = u.email
WHERE p.old_user_id = u.id;

-- -----------------------------------------------------------------------------
-- Step 6: Verify no bills/payments were left without a user_id
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  orphaned_bills    INTEGER;
  orphaned_payments INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_bills    FROM bills    WHERE user_id IS NULL;
  SELECT COUNT(*) INTO orphaned_payments FROM payments WHERE user_id IS NULL;

  IF orphaned_bills > 0 OR orphaned_payments > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % orphaned bill(s) and % orphaned payment(s) found '
      '(no matching Neon Auth user). Fix the mapping, then re-run.',
      orphaned_bills, orphaned_payments;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Step 7: Lock in NOT NULL + new foreign keys pointing to neon_auth.user
-- -----------------------------------------------------------------------------
ALTER TABLE bills ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE bills
  ADD CONSTRAINT bills_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES neon_auth.user(id) ON DELETE CASCADE;

ALTER TABLE payments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE payments
  ADD CONSTRAINT payments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES neon_auth.user(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------------------
-- Step 8: Drop temporary columns
-- -----------------------------------------------------------------------------
ALTER TABLE bills    DROP COLUMN old_user_id;
ALTER TABLE payments DROP COLUMN old_user_id;

-- -----------------------------------------------------------------------------
-- Step 9: Rebuild indexes (user_id type changed so old ones are invalid)
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_bills_user_id;
DROP INDEX IF EXISTS idx_payments_user_month;

CREATE INDEX idx_bills_user_id      ON bills(user_id);
CREATE INDEX idx_payments_user_month ON payments(user_id, month_year);

-- -----------------------------------------------------------------------------
-- Step 10: Drop the old users table — Neon Auth owns users now
-- -----------------------------------------------------------------------------
DROP TABLE users;

COMMIT;

-- =============================================================================
-- Done. Verify with:
--   SELECT COUNT(*) FROM bills;
--   SELECT COUNT(*) FROM payments;
--   \d bills    -- user_id should now be uuid
--   \d payments -- user_id should now be uuid
-- =============================================================================
