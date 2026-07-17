-- 011_backend_grants.sql
--
-- 010_security_lockdown.sql revoked SELECT on `answer`, `secret`, and
-- `word_id` from PUBLIC (and from Supabase's anon/authenticated roles).
-- This migration makes sure your backend's own connection role is
-- explicitly exempted -- otherwise guess validation (which legitimately
-- needs to read `answer`) breaks.
--
-- WHICH CASE APPLIES TO YOU:
--
-- Case A -- your backend connects as the table owner (default on both
-- Supabase and Neon free tier if you never created a separate DB user,
-- e.g. your DATABASE_URL user is `postgres` or `postgres.<project-ref>`).
-- The owner ALWAYS has full privileges on tables they own, regardless of
-- any REVOKE FROM PUBLIC. Nothing to run -- you're already fine.
-- You can confirm this with:
--
--   SELECT tableowner FROM pg_tables WHERE tablename = 'daily_puzzles';
--   SELECT current_user;
--
-- If those two match, skip straight to part 3 below.
--
-- Case B -- you later create a dedicated least-privilege backend role
-- (recommended long-term, e.g. so a compromised API key can't drop
-- tables). If/when you do that, run this with the real role name:

-- Example (uncomment and replace 'app_backend' with your actual role):
-- GRANT SELECT (puzzle_date, puzzle_number, word_length, word_id, answer,
--               secret, commit_hash, commit_tx_id, reveal_tx_id, status)
--     ON daily_puzzles TO app_backend;
-- GRANT INSERT, UPDATE ON daily_puzzles TO app_backend;

-- Also explicitly cover Supabase's service_role, in case a future
-- contributor swaps the backend to use it instead of the owner connection:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        EXECUTE 'GRANT SELECT (puzzle_date, puzzle_number, word_length, word_id, answer, secret, commit_hash, commit_tx_id, reveal_tx_id, status) ON daily_puzzles TO service_role';
        EXECUTE 'GRANT INSERT, UPDATE, DELETE ON daily_puzzles TO service_role';
    END IF;
END $$;