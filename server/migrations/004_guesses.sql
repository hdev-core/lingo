-- 004_guesses.sql

CREATE TABLE IF NOT EXISTS guesses (
    id                BIGSERIAL PRIMARY KEY,
    hive_username     TEXT NOT NULL REFERENCES users(hive_username),
    puzzle_date       DATE NOT NULL REFERENCES daily_puzzles(puzzle_date),
    attempt_number    INTEGER NOT NULL CHECK (attempt_number BETWEEN 1 AND 7),
    guess_word        TEXT NOT NULL,
    submitted_at      TIMESTAMPTZ NOT NULL DEFAULT now(), -- server-recorded, never client time
    validation_result JSONB NOT NULL,  -- e.g. [{"letter":"a","state":"correct"}, ...]
    tx_id             TEXT,            -- lingo_guess custom_json tx id, filled in after broadcast

    CONSTRAINT guesses_one_attempt_per_account UNIQUE (hive_username, puzzle_date, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_guesses_player_puzzle ON guesses (hive_username, puzzle_date);

COMMENT ON COLUMN guesses.submitted_at IS 'Server timestamp only -- this feeds fastest-solver timing, never trust client-reported time.';