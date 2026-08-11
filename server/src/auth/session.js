// src/auth/session.js
//
// Issues, verifies, and refreshes player login sessions as JWTs.
// A minimal in-memory revocation list tracks explicitly revoked sessions
// (via jti) so /revoke and account bans can actually invalidate a token
// before its natural expiry, not just rely on the client discarding it.

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MIN_SECRET_LENGTH = 32;

const revokedJtis = new Map(); // jti -> expiresAt (so entries can be pruned)

function getSecret() {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
  return secret;
}

// Fail fast at boot rather than at first login.
getSecret();

function issueSession(username) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ username, jti }, getSecret(), {
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
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
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
    const payload = jwt.verify(token, getSecret(), {
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