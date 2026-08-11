// src/auth/challengeStore.js
//
// Short-lived storage for login challenges (nonces) issued to players
// before they sign in via Hive Keychain.
//
// MVP note: this is an in-memory Map, which is fine for a single-process
// server but will NOT survive a restart or work across multiple instances.
// If the server is ever scaled horizontally, this should move to
// PostgreSQL (a `login_challenges` table) or Redis instead.

const crypto = require('crypto');

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CHALLENGES = 5000;

const HIVE_USERNAME_PATTERN = /^[a-z][a-z0-9-]{2,15}(\.[a-z][a-z0-9-]{2,15})*$/;

function isValidHiveUsername(username) {
  return (
    typeof username === 'string' &&
    username.length >= 3 &&
    username.length <= 16 &&
    HIVE_USERNAME_PATTERN.test(username)
  );
}

const challenges = new Map();

function evictOldestEntry() {
  const oldestKey = challenges.keys().next().value;
  if (oldestKey !== undefined) {
    challenges.delete(oldestKey);
  }
}

function createChallenge(username) {
  if (!isValidHiveUsername(username)) {
    throw new Error('Invalid username');
  }

  if (challenges.size >= MAX_CHALLENGES) {
    const now = Date.now();
    for (const [key, entry] of challenges) {
      if (now > entry.expiresAt) {
        challenges.delete(key);
      }
    }

    if (challenges.size >= MAX_CHALLENGES) {
      evictOldestEntry();
    }
  }

  const nonce = `lingo-login-${username}-${Date.now()}-${crypto
    .randomBytes(16)
    .toString('hex')}`;
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  challenges.set(username, { nonce, expiresAt });
  return nonce;
}

function consumeChallenge(username, providedNonce) {
  const entry = challenges.get(username);
  if (!entry) return false;

  challenges.delete(username);

  if (Date.now() > entry.expiresAt) return false;
  if (entry.nonce !== providedNonce) return false;

  return true;
}

module.exports = { createChallenge, consumeChallenge, isValidHiveUsername };