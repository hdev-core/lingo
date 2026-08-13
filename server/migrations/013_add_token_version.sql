-- 013_add_token_version.sql
-- Adds durable per-user session revocation.
--
-- Every JWT carries the user's current token_version. Logging out increments
-- this value, immediately invalidating every older token for that Hive account,
-- including tokens created earlier in the refresh lineage.
--
-- This is intentionally additive: no existing users columns or data are changed.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN users.token_version IS
  'Session generation counter. Incrementing it invalidates all previously issued JWTs for this user.';