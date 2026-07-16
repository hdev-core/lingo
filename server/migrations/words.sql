-- 002_words.sql
-- Curated word bank that daily_puzzles.answer is drawn from.
-- This is NOT one of the 8 core tables but is required infra for seeding puzzles.

CREATE TABLE IF NOT EXISTS words (
    id          BIGSERIAL PRIMARY KEY,
    word        TEXT NOT NULL,
    length      INTEGER NOT NULL,
    difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    category    TEXT NOT NULL CHECK (category IN ('general', 'web3')),
    theme       TEXT CHECK (theme IN ('general', 'defi', 'nft', 'advanced')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    used_count  INTEGER NOT NULL DEFAULT 0,
    last_used_on DATE,
    source      TEXT, -- e.g. 'wordle-open-list', 'hive-glossary', 'manual'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT words_word_unique UNIQUE (word)
);

-- length must actually match the word's character count
ALTER TABLE words
    ADD CONSTRAINT words_length_matches CHECK (length = char_length(word));

CREATE INDEX IF NOT EXISTS idx_words_selection
    ON words (length, difficulty, category, theme)
    WHERE is_active = true;

COMMENT ON TABLE words IS
  'Curated word bank: general English words + Hive/Web3 terms, tagged by difficulty/category/theme/length so the daily puzzle picker can query instead of choosing manually.';