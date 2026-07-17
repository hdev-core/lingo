-- 012_dedupe_streaks.sql
--
-- current_streak / longest_streak existed in both `users` and `streaks`.
-- `streaks` is the source of truth going forward (it's the table your
-- payout/loyalty-multiplier logic should read from), so drop the
-- duplicate columns from `users` to remove any chance of the two drifting
-- out of sync.

ALTER TABLE users DROP COLUMN IF EXISTS current_streak;
ALTER TABLE users DROP COLUMN IF EXISTS longest_streak;

-- users now only tracks identity + reward-summary fields:
--   hive_username, consecutive_qualifying_weeks, total_lingo_earned
-- Streak state (current_streak, longest_streak, last_solved_date) lives
-- solely in `streaks`, keyed by hive_username.

COMMENT ON TABLE users IS
  'Identity + lifetime reward totals. Streak state lives in `streaks`, not here -- see 012_dedupe_streaks.sql.';