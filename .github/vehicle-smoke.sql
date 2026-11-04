-- Test-only smoke test for the vehicle workflows. NOT part of the deployed schema.
--
-- Run by .github/workflows/schema.yml against the scratch database, after the
-- stub and src/db/script.sql. It executes the same statements the API runs and
-- asserts the two multi-step workflows land completely or not at all.

INSERT INTO neon_auth."user" (id) VALUES ('11111111-1111-1111-1111-111111111111');

-- ── create ────────────────────────────────────────────────────────────────────
INSERT INTO vehicles (
  user_id, plate_number, vehicle_type, brand, model,
  current_mileage, mileage_updated_at, service_interval, next_service_mileage
) VALUES (
  '11111111-1111-1111-1111-111111111111', 'VGD 8899', 'car', 'Perodua', 'Myvi 1.5 AV',
  45200, '2026-11-04', 10000, 55200
);

-- ── insurance: first policy, then a renewal ───────────────────────────────────
CREATE TEMP TABLE renewal (
  seq int, provider text, policy text, coverage text, starts date, expires date, premium numeric
);
INSERT INTO renewal VALUES
  (1, 'Etiqa General Insurance', 'P90-0021-99381', 'comprehensive', '2026-05-15', '2027-05-14', 650.50),
  (2, 'Zurich General Insurance', 'Z12-0099-11111', 'third_party',  '2027-05-15', '2028-05-14', 410.00);

DO $$
DECLARE
  run record;
  active integer;
  retired integer;
BEGIN
  FOR run IN SELECT * FROM renewal ORDER BY seq LOOP
    -- Sequential statements inside one transaction. A single statement with CTEs
    -- cannot do this: the partial unique index needs the retire to be visible to
    -- the insert, and sibling CTEs share one snapshot.
    UPDATE vehicle_insurance SET superseded_at = now()
    WHERE vehicle_id = 1 AND user_id = '11111111-1111-1111-1111-111111111111'
      AND superseded_at IS NULL;

    INSERT INTO vehicle_insurance (
      user_id, vehicle_id, provider, policy_number, coverage_type,
      start_date, expiry_date, premium_paid
    )
    VALUES (
      '11111111-1111-1111-1111-111111111111', 1, run.provider, run.policy,
      run.coverage, run.starts, run.expires, run.premium
    );
  END LOOP;

  SELECT count(*) INTO active FROM vehicle_insurance WHERE superseded_at IS NULL;
  SELECT count(*) INTO retired FROM vehicle_insurance WHERE superseded_at IS NOT NULL;
  IF active <> 1 OR retired <> 1 THEN
    RAISE EXCEPTION 'after renewal expected 1 active + 1 retired, got % active + % retired',
      active, retired;
  END IF;
END $$;

-- A second active policy must be impossible even if two renewals race.
DO $$
BEGIN
  INSERT INTO vehicle_insurance (
    user_id, vehicle_id, provider, policy_number, coverage_type,
    start_date, expiry_date, premium_paid
  ) VALUES (
    '11111111-1111-1111-1111-111111111111', 1, 'Duplicate', 'DUP-1',
    'comprehensive', '2028-01-01', '2029-01-01', 1
  );
  RAISE EXCEPTION 'a second active policy was accepted — the partial unique index is missing';
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;

-- ── service: event, odometer and milestone update in one statement ────────────
WITH ins AS (
  INSERT INTO vehicle_service (
    user_id, vehicle_id, serviced_on, mileage_at_service, workshop, cost, notes
  )
  SELECT
    '11111111-1111-1111-1111-111111111111', 1, '2026-11-04', 50000,
    'Perodua Service Centre', 320.00, 'Full service'
  WHERE EXISTS (
    SELECT 1 FROM vehicles v
    WHERE v.id = 1 AND v.is_active = true AND 50000 >= v.current_mileage
  )
  RETURNING id
), upd AS (
  UPDATE vehicles v SET
    current_mileage = GREATEST(v.current_mileage, 50000),
    mileage_updated_at = GREATEST(
      COALESCE(v.mileage_updated_at, '2026-11-04'::date), '2026-11-04'::date
    ),
    next_service_mileage = 50000 + v.service_interval
  WHERE v.id = 1 AND v.user_id = '11111111-1111-1111-1111-111111111111'
    AND v.is_active = true
    AND 50000 >= v.current_mileage
  RETURNING v.id, v.current_mileage, v.next_service_mileage
)
SELECT count(*) FROM upd;

-- ── service with a lower odometer must change nothing ─────────────────────────
DO $$
DECLARE
  rows integer;
  before_mileage integer;
  after_mileage integer;
  services_before integer;
  services_after integer;
BEGIN
  SELECT current_mileage INTO before_mileage FROM vehicles WHERE id = 1;
  SELECT count(*) INTO services_before FROM vehicle_service WHERE vehicle_id = 1;

  WITH ins AS (
    INSERT INTO vehicle_service (
      user_id, vehicle_id, serviced_on, mileage_at_service
    )
    SELECT '11111111-1111-1111-1111-111111111111', 1, '2026-10-01', 40000
    WHERE EXISTS (
      SELECT 1 FROM vehicles v WHERE v.id = 1 AND v.is_active = true
        AND 40000 >= v.current_mileage
    )
    RETURNING id
  ), upd AS (
    UPDATE vehicles v SET current_mileage = 40000
    WHERE v.id = 1 AND v.is_active = true AND 40000 >= v.current_mileage
    RETURNING v.id
  )
  SELECT count(*) INTO rows FROM upd;

  IF rows <> 0 THEN
    RAISE EXCEPTION 'a backwards odometer was accepted';
  END IF;

  SELECT current_mileage INTO after_mileage FROM vehicles WHERE id = 1;
  SELECT count(*) INTO services_after FROM vehicle_service WHERE vehicle_id = 1;

  IF after_mileage <> before_mileage THEN
    RAISE EXCEPTION 'odometer moved despite the rejected service (% -> %)',
      before_mileage, after_mileage;
  END IF;
  IF services_after <> services_before THEN
    RAISE EXCEPTION 'a service row was kept despite the rejected update (% -> %)',
      services_before, services_after;
  END IF;

  RAISE NOTICE 'backwards service rejected, nothing written';
END $$;

-- ── assertions ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  mileage integer;
  next_mileage integer;
  interval integer;
  services integer;
  active_policy record;
BEGIN
  SELECT current_mileage, next_service_mileage, service_interval
    INTO mileage, next_mileage, interval
  FROM vehicles WHERE id = 1;

  IF mileage <> 50000 THEN
    RAISE EXCEPTION 'odometer not moved to the serviced value: %', mileage;
  END IF;
  IF next_mileage <> mileage + interval THEN
    RAISE EXCEPTION 'next_service_mileage % is not % + %', next_mileage, mileage, interval;
  END IF;

  SELECT count(*) INTO services FROM vehicle_service WHERE vehicle_id = 1;
  IF services <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 service row, got %', services;
  END IF;

  SELECT * INTO active_policy FROM vehicle_insurance WHERE superseded_at IS NULL;
  IF active_policy.policy_number <> 'Z12-0099-11111' THEN
    RAISE EXCEPTION 'the newest policy is not the active one: %', active_policy.policy_number;
  END IF;

  -- Soft delete must keep the histories, like bills.
  UPDATE vehicles SET is_active = false WHERE id = 1;
  IF (SELECT count(*) FROM vehicle_service WHERE vehicle_id = 1) <> 1 THEN
    RAISE EXCEPTION 'service history vanished with the vehicle';
  END IF;
  IF (SELECT count(*) FROM vehicle_insurance WHERE vehicle_id = 1) <> 2 THEN
    RAISE EXCEPTION 'insurance history vanished with the vehicle';
  END IF;

  RAISE NOTICE 'vehicle smoke test passed';
END $$;
