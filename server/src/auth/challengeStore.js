// src/auth/challengeStore.js
//
// Short-lived storage for login challenges (nonces) issued to players
// before they sign in via Hive Keychain.
//
// MVP note: this is an in-memory Map, which is fine for a single-process
// server but will NOT survive a restart or work across multiple instances.
// If the server is ever scaled horizontally, this should move to
// PostgreSQL (a `login_challenges` table) or Redis instead.

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const challenges = new Map(); // username -> { nonce, expiresAt }

function createChallenge(username) {
  const nonce = `lingo-login-${username}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  challenges.set(username, { nonce, expiresAt });
  return nonce;
}

function consumeChallenge(username, providedNonce) {
  const entry = challenges.get(username);
  if (!entry) return false;

  // One-time use: remove it whether or not it's valid, so a leaked/replayed
  // signature can't be reused against the same challenge twice.
  challenges.delete(username);

  if (Date.now() > entry.expiresAt) return false;
  if (entry.nonce !== providedNonce) return false;

  return true;
}

module.exports = { createChallenge, consumeChallenge };