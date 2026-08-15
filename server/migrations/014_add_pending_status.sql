-- 014_add_pending_status.sql
--
-- The redesigned daily_commit.js now reserves a row with status='pending'
-- BEFORE broadcasting to chain, so a crash between reservation and
-- broadcast leaves a safely-resumable row instead of losing the record of
-- an already-permanent on-chain commit. The original CHECK constraint
-- (committed/live/revealed) didn't allow this new intermediate state.

ALTER TABLE daily_puzzles DROP CONSTRAINT IF EXISTS daily_puzzles_status_check;

ALTER TABLE daily_puzzles
    ADD CONSTRAINT daily_puzzles_status_check
    CHECK (status IN ('pending', 'committed', 'live', 'revealed'));