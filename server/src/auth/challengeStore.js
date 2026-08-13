// src/auth/challengeStore.js
//
// Short-lived storage for login challenges (nonces) issued to players
// before they sign in via Hive Keychain.
//
// Keyed by nonce (not username): a challenge issued to one username no
// longer overwrites another in-flight challenge for the same username,
// closing the targeted-eviction case.
//
// MVP note: this store is still process-local. Durable session revocation
// is handled separately through PostgreSQL token_version.

const crypto = require('crypto');

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CHALLENGES = 5000;

// Each dot-separated segment starts with a letter and cannot end with a
// hyphen. Consecutive hyphens are allowed because valid Hive accounts can
// contain them.
const SEGMENT = '[a-z](?:[a-z0-9]|-){1,14}[a-z0-9]';
const HIVE_USERNAME_PATTERN = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`);

function isValidHiveUsername(username) {
  return (
    typeof username === 'string' &&
    username.length >= 3 &&
    username.length <= 16 &&
    HIVE_USERNAME_PATTERN.test(username)
  );
}

const challenges = new Map(); // nonce -> { username, expiresAt }

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

  challenges.set(nonce, { username, expiresAt });

  return nonce;
}

function validateChallenge(username, providedNonce) {
  const entry = challenges.get(providedNonce);

  if (!entry) {
    return false;
  }

  if (Date.now() > entry.expiresAt) {
    challenges.delete(providedNonce);
    return false;
  }

  return entry.username === username;
}

function consumeChallenge(username, providedNonce) {
  if (!validateChallenge(username, providedNonce)) {
    return false;
  }

  challenges.delete(providedNonce);
  return true;
}

module.exports = {
  createChallenge,
  validateChallenge,
  consumeChallenge,
  isValidHiveUsername,
};