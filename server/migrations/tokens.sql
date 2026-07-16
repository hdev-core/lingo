-- 009_tokens.sql
-- One row per daily LINGO token issuance to a solver.

CREATE TABLE IF NOT EXISTS tokens (
    id             BIGSERIAL PRIMARY KEY,
    hive_username  TEXT NOT NULL REFERENCES users(hive_username),
    puzzle_date    DATE NOT NULL REFERENCES daily_puzzles(puzzle_date),
    amount_issued  NUMERIC(18,4) NOT NULL,
    issue_tx_id    TEXT,  -- Hive-Engine "issue" contract action tx id
    issued_at      TIMESTAMPTZ,

    CONSTRAINT tokens_one_issuance_per_account_per_day UNIQUE (hive_username, puzzle_date)
);

CREATE INDEX IF NOT EXISTS idx_tokens_puzzle_date ON tokens (puzzle_date);