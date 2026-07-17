-- 006_streaks.sql
-- Kept as its own table (per the data model) rather than folded into `users`,
-- so streak history/state can be recomputed or audited independently of the
-- user profile row.

CREATE TABLE IF NOT EXISTS streaks (
    hive_username    TEXT PRIMARY KEY REFERENCES users(hive_username),
    current_streak   INTEGER NOT NULL DEFAULT 0,
    longest_streak   INTEGER NOT NULL DEFAULT 0,
    last_solved_date DATE
);