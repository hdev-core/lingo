-- 001_extensions_and_users.sql
-- Run first. Sets up UUID generation and the users table.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
    hive_username               TEXT PRIMARY KEY,
    current_streak              INTEGER NOT NULL DEFAULT 0,
    longest_streak              INTEGER NOT NULL DEFAULT 0,
    consecutive_qualifying_weeks INTEGER NOT NULL DEFAULT 0,
    total_lingo_earned          NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'One row per Hive account that has ever logged into LINGO.';