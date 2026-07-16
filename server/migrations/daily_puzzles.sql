-- 003_daily_puzzles.sql
-- answer and secret are the whole reason the commit-reveal scheme works.
-- They must NEVER be selectable by anything other than the backend's own
-- DB role. See 011_security.sql for the lockdown (view + revoked grants).

CREATE TABLE IF NOT EXISTS daily_puzzles (
    puzzle_date     DATE PRIMARY KEY,
    puzzle_number   INTEGER NOT NULL UNIQUE,
    word_length     INTEGER NOT NULL,
    word_id         BIGINT REFERENCES words(id),
    answer          TEXT NOT NULL,          -- SERVER-ONLY
    secret          TEXT NOT NULL,          -- SERVER-ONLY (random salt for the commit hash)
    commit_hash     TEXT NOT NULL,          -- SHA-256(date | answer | secret) -- safe to expose
    commit_tx_id    TEXT,                   -- Hive tx id for lingo_commit
    reveal_tx_id    TEXT,                   -- Hive tx id for lingo_reveal
    status          TEXT NOT NULL DEFAULT 'committed'
                        CHECK (status IN ('committed', 'live', 'revealed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_puzzles_status ON daily_puzzles (status);

COMMENT ON COLUMN daily_puzzles.answer IS 'SERVER-ONLY. Never select this column in any endpoint the frontend can reach.';
COMMENT ON COLUMN daily_puzzles.secret IS 'SERVER-ONLY. Only published (via reveal) at end-of-day through the reveal_tx_id flow.';