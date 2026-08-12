// src/auth/session.js
//
// Issues, verifies, and refreshes player login sessions as JWTs.
// A minimal in-memory revocation list tracks explicitly revoked sessions
// (via jti) so /revoke and account bans can actually invalidate a token
// before its natural expiry, not just rely on the client discarding it.
//
// NOTE: this Map-based revocation list does not survive a server
// restart, and doesn't kill a token lineage across /refresh. A
// per-user token_version column in Postgres is the durable fix and
// is planned as a follow-up.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MIN_SECRET_LENGTH = 32;

const revokedJtis = new Map(); // jti -> expiresAt (so entries can be pruned)

function validateSecret(secret) {
  return typeof secret === 'string' && secret.length >= MIN_SECRET_LENGTH;
}

// Fail fast at boot, with a clean message instead of an uncaught throw
// and stack trace.
const SECRET = process.env.SESSION_JWT_SECRET;
if (!validateSecret(SECRET)) {
  console.error(
    `SESSION_JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters.`
  );
  process.exit(1);
}

function issueSession(username) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ username, jti }, SECRET, {
    expiresIn: SESSION_TTL_SECONDS,
    algorithm: 'HS256',
  });

  return {
    token,
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
}

function pruneRevokedJtis() {
  const now = Date.now();
  for (const [jti, expiresAt] of revokedJtis) {
    if (now > expiresAt) {
      revokedJtis.delete(jti);
    }
  }
}

function verifySession(token) {
  try {
    const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    if (payload.jti && revokedJtis.has(payload.jti)) {
      return { valid: false, username: null };
    }
    return { valid: true, username: payload.username };
  } catch {
    return { valid: false, username: null };
  }
}

function revokeSession(token) {
  try {
    const payload = jwt.verify(token, SECRET, {
      algorithms: ['HS256'],
      ignoreExpiration: true,
    });
    if (payload.jti) {
      pruneRevokedJtis();
      revokedJtis.set(payload.jti, Date.now() + SESSION_TTL_SECONDS * 1000);
    }
    return true;
  } catch {
    return false;
  }
}

function refreshSession(token) {
  const { valid, username } = verifySession(token);
  if (!valid) return null;
  return issueSession(username);
}

module.exports = { issueSession, verifySession, refreshSession, revokeSession };