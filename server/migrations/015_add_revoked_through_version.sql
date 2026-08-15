-- 015_add_revoked_through_version.sql
-- Adds a durable per-user revocation watermark while allowing multiple
-- login generations to remain valid simultaneously.
--
-- token_version remains the monotonically increasing generation allocator.
-- A JWT is valid when its generation is newer than revoked_through_version
-- and is not greater than the latest generation actually issued.
--
-- Existing rows are initialized so that only their current generation keeps
-- the validity it had before this migration. Older generations therefore do
-- not become valid again when the new model is introduced.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS revoked_through_version INTEGER;

UPDATE users
SET revoked_through_version = GREATEST(token_version - 1, -1)
WHERE revoked_through_version IS NULL;

ALTER TABLE users
ALTER COLUMN revoked_through_version SET DEFAULT -1;

ALTER TABLE users
ALTER COLUMN revoked_through_version SET NOT NULL;

COMMENT ON COLUMN users.revoked_through_version IS
  'Highest session generation revoked for this user; generations above this watermark may remain valid.';