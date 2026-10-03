-- Test-only scaffolding for CI. NOT part of the deployed database.
--
-- src/db/script.sql references neon_auth.user(id), but that table is created by
-- Neon Auth inside the database it manages, so a brand-new scratch database has
-- no neon_auth schema and the foreign key cannot be created. This stub supplies
-- the minimum structure needed to apply the real schema to an otherwise empty
-- database, which is what makes the CI check meaningful: every statement in
-- script.sql actually executes, instead of being skipped by IF NOT EXISTS.
--
-- Used by .github/workflows/neon-schema.yml. If Neon Auth's user table ever
-- changes the columns referenced by script.sql, update this stub to match.

CREATE SCHEMA IF NOT EXISTS neon_auth;

CREATE TABLE IF NOT EXISTS neon_auth."user" (
  id UUID PRIMARY KEY
);
