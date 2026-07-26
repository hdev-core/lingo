// src/auth/session.js
//
// Issues, verifies, and refreshes player login sessions as JWTs.
// No server-side session store needed for MVP -- the JWT itself is the
// session, signed with a server-only secret so it can't be forged.
//
// "Revoke" for MVP just means the client discards the token; true
// server-side revocation (e.g. a blocklist) can be added later if needed,
// e.g. for banning an account mid-session.

const jwt = require('jsonwebtoken');

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret() {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) {
    throw new Error('SESSION_JWT_SECRET is not set.');
  }
  return secret;
}

function issueSession(username) {
  const token = jwt.sign({ username }, getSecret(), {
    expiresIn: SESSION_TTL_SECONDS,
  });

  return {
    token,
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
}

function verifySession(token) {
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] });
    return { valid: true, username: payload.username };
  } catch {
    return { valid: false, username: null };
  }
}

/**
 * Refresh: issues a brand new token for the same user, provided their
 * current token is still valid. Extends the session without requiring
 * them to re-sign a new Keychain challenge.
 */
function refreshSession(token) {
  const { valid, username } = verifySession(token);
  if (!valid) return null;
  return issueSession(username);
}

module.exports = { issueSession, verifySession, refreshSession };