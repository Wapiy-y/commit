-- Test-only scaffolding for CI. NOT part of the deployed database.
--
-- src/db/script.sql references neon_auth.user(id), but that table is created by
-- Neon Auth inside the database it manages, so a freshly created database has no
-- neon_auth schema and the foreign key cannot be created. This stub supplies the
-- minimum structure needed to apply the real schema to an otherwise empty
-- database, which is what makes the check meaningful: every statement in
-- script.sql actually executes, instead of being skipped by IF NOT EXISTS.
--
-- Used by .github/workflows/schema.yml. If Neon Auth's user table ever changes
-- the columns referenced by script.sql, update this stub to match.
--
-- Verified against PostgreSQL 16: with this stub applied, script.sql creates
-- bills and payments with all three foreign keys, the generated is_paid column,
-- the unique (bill_id, month_year) constraint and every CHECK constraint.

CREATE SCHEMA IF NOT EXISTS neon_auth;

CREATE TABLE IF NOT EXISTS neon_auth."user" (
  id UUID PRIMARY KEY
);
