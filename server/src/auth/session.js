// src/auth/session.js
//
// Issues, verifies, refreshes, and revokes player login sessions as JWTs.
//
// token_version is a monotonically increasing login-generation counter.
// Multiple generations may remain valid simultaneously, so signing in on a
// second device does not invalidate an existing session.
//
// revoked_through_version is a durable revocation watermark. Logout advances
// it only through the generation represented by the token being revoked.
// Therefore, a delayed revoke from an older session cannot kill a newer login.
//
// Both values live in PostgreSQL, so revocation survives server restarts and
// works across server instances.

const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MIN_SECRET_LENGTH = 32;

function validateSecret(secret) {
  return typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH;
}

// Fail fast at boot with a clean message instead of an uncaught stack trace.
const SECRET = process.env.SESSION_JWT_SECRET;
if (!validateSecret(SECRET)) {
  console.error(
    `SESSION_JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters.`
  );
  process.exit(1);
}

function signSession(username, tokenVersion) {
  const token = jwt.sign({ username, tokenVersion }, SECRET, {
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: 'HS256',
  });

  return {
    token,
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
}

async function getSessionState(username) {
  const { rows } = await pool.query(
    `SELECT token_version, revoked_through_version
     FROM users
     WHERE hive_username = $1`,
    [username]
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    tokenVersion: rows[0].token_version,
    revokedThroughVersion: rows[0].revoked_through_version,
  };
}

async function issueSession(username) {
  // Every successful fresh login receives a unique monotonically increasing
  // generation. Older generations stay valid until explicitly covered by the
  // revocation watermark.
  const { rows } = await pool.query(
    `INSERT INTO users (hive_username, token_version)
     VALUES ($1, 1)
     ON CONFLICT (hive_username)
     DO UPDATE SET token_version = users.token_version + 1
     RETURNING token_version`,
    [username]
  );

  if (rows.length === 0) {
    throw new Error('Unable to initialize session state for user');
  }

  return signSession(username, rows[0].token_version);
}

async function verifySession(token) {
  let payload;

  try {
    payload = jwt.verify(token, SECRET, {
      algorithms: ['HS256'],
    });
  } catch {
    return { valid: false, username: null, tokenVersion: null };
  }

  if (
    typeof payload.username !== 'string' ||
    !Number.isInteger(payload.tokenVersion) ||
    payload.tokenVersion < 0
  ) {
    return { valid: false, username: null, tokenVersion: null };
  }

  const state = await getSessionState(payload.username);

  if (
    state === null ||
    payload.tokenVersion > state.tokenVersion ||
    payload.tokenVersion <= state.revokedThroughVersion
  ) {
    return { valid: false, username: null, tokenVersion: null };
  }

  return {
    valid: true,
    username: payload.username,
    tokenVersion: payload.tokenVersion,
  };
}

async function refreshSession(token) {
  const { valid, username, tokenVersion } = await verifySession(token);

  if (!valid) {
    return null;
  }

  // Refresh stays in the same generation. If that generation is later covered
  // by the revocation watermark, refreshed tokens from it are invalid too.
  return signSession(username, tokenVersion);
}

async function revokeSession(token) {
  let payload;

  try {
    payload = jwt.verify(token, SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: true,
    });
  } catch {
    return false;
  }

  if (
    typeof payload.username !== 'string' ||
    !Number.isInteger(payload.tokenVersion) ||
    payload.tokenVersion < 0
  ) {
    return false;
  }

  // Revoke this generation and any older generations, but never a login
  // created later. This makes delayed stale revokes harmless to newer sessions.
  const result = await pool.query(
    `UPDATE users
     SET revoked_through_version =
       GREATEST(revoked_through_version, $2)
     WHERE hive_username = $1
       AND $2 <= token_version
       AND $2 > revoked_through_version
     RETURNING revoked_through_version`,
    [payload.username, payload.tokenVersion]
  );

  return result.rowCount > 0;
}

module.exports = {
  issueSession,
  verifySession,
  refreshSession,
  revokeSession,
};