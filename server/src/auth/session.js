// src/auth/session.js
//
// Issues, verifies, refreshes, and revokes player login sessions as JWTs.
//
// Revocation is backed by users.token_version in PostgreSQL instead of an
// in-memory denylist. Every issued JWT carries the user's current version.
// Logout increments the database value, so every token from the older
// generation becomes invalid at once, including pre-refresh tokens.
//
// Because token_version lives in PostgreSQL, revocation survives server
// restarts and works across server instances.

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

async function getTokenVersion(username) {
  const { rows } = await pool.query(
    'SELECT token_version FROM users WHERE hive_username = $1',
    [username]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0].token_version;
}

async function ensureUserAndGetTokenVersion(username) {
  // The users table is defined as one row per Hive account that has logged
  // into LINGO. Existing gameplay/stat columns already have defaults, so
  // this creates only the account row when it does not already exist.
  await pool.query(
    `INSERT INTO users (hive_username)
     VALUES ($1)
     ON CONFLICT (hive_username) DO NOTHING`,
    [username]
  );

  const tokenVersion = await getTokenVersion(username);

  if (tokenVersion === null) {
    throw new Error('Unable to initialize session state for user');
  }

  return tokenVersion;
}

async function issueSession(username) {
  const tokenVersion = await ensureUserAndGetTokenVersion(username);
  return signSession(username, tokenVersion);
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
    !Number.isInteger(payload.tokenVersion)
  ) {
    return { valid: false, username: null, tokenVersion: null };
  }

  const currentTokenVersion = await getTokenVersion(payload.username);

  if (
    currentTokenVersion === null ||
    payload.tokenVersion !== currentTokenVersion
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

  // Important: preserve the version that was actually verified rather than
  // re-reading the newest version here. If logout increments token_version
  // while a refresh is already in flight, this refreshed token remains on
  // the old version and is therefore invalid rather than resurrecting the
  // logged-out session.
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
    !Number.isInteger(payload.tokenVersion)
  ) {
    return false;
  }

  // Only a token from the CURRENT generation may advance the generation.
  // An already-stale token must not be able to log out a newer session.
  const result = await pool.query(
    `UPDATE users
     SET token_version = token_version + 1
     WHERE hive_username = $1
       AND token_version = $2
     RETURNING token_version`,
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