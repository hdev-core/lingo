-- 005_solves.sql
-- One row per successful solve. Drives the daily leaderboard / fastest-10.

CREATE TABLE IF NOT EXISTS solves (
    id               BIGSERIAL PRIMARY KEY,
    hive_username    TEXT NOT NULL REFERENCES users(hive_username),
    puzzle_date      DATE NOT NULL REFERENCES daily_puzzles(puzzle_date),
    solved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    elapsed_seconds  NUMERIC(10,3) NOT NULL, -- first-guess timestamp -> solving-guess timestamp
    attempt_count    INTEGER NOT NULL,
    fastest_10_rank  SMALLINT, -- 1-10 if in the day's top 10, else NULL; backfilled after the day closes

    CONSTRAINT solves_one_per_account_per_day UNIQUE (hive_username, puzzle_date)
);

CREATE INDEX IF NOT EXISTS idx_solves_daily_leaderboard ON solves (puzzle_date, elapsed_seconds);