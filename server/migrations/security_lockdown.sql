-- 010_security_lockdown.sql
--
-- Goal: even if a bug, a wrong query, or a future contributor wires the
-- frontend directly to Postgres (e.g. via Supabase's PostgREST/anon key),
-- daily_puzzles.answer and daily_puzzles.secret can never leak.
--
-- This gives you TWO independent layers of defense:
--   1. A public-safe VIEW that the API/frontend should query instead of
--      the raw table.
--   2. Column-level privilege revocation on the base table itself, so even
--      "SELECT * FROM daily_puzzles" fails for any role except the one
--      your Express backend connects as.

-- 1) Safe view -- everything EXCEPT answer/secret
CREATE OR REPLACE VIEW daily_puzzles_public AS
SELECT
    puzzle_date,
    puzzle_number,
    word_length,
    commit_hash,
    commit_tx_id,
    reveal_tx_id,
    status
FROM daily_puzzles;

-- 2) Column-level lockdown on the base table.
-- Adjust role names to whatever you actually create (see README section
-- "Database roles"). PUBLIC covers any role that isn't explicitly granted.
REVOKE ALL ON daily_puzzles FROM PUBLIC;
GRANT SELECT (puzzle_date, puzzle_number, word_length, commit_hash, commit_tx_id, reveal_tx_id, status)
    ON daily_puzzles TO PUBLIC;
-- Note: PUBLIC here still can't do anything unless a role also has CONNECT/USAGE
-- on the database/schema. The important part is that `answer` and `secret`
-- are excluded from the column grant above, so no role picks them up by
-- inheriting from PUBLIC.

-- If you're on Supabase specifically, also do this (safe to run on Neon too --
-- it's a no-op if those roles don't exist there):
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON daily_puzzles FROM anon';
        EXECUTE 'GRANT SELECT ON daily_puzzles_public TO anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON daily_puzzles FROM authenticated';
        EXECUTE 'GRANT SELECT ON daily_puzzles_public TO authenticated';
    END IF;
END $$;

COMMENT ON VIEW daily_puzzles_public IS
  'Use this view (not daily_puzzles directly) for GET /api/puzzle/today and any other endpoint the frontend can reach.';