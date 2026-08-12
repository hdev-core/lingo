// src/auth/challengeStore.js
//
// Short-lived storage for login challenges (nonces) issued to players
// before they sign in via Hive Keychain.
//
// Keyed by nonce (not username): a challenge issued to one username no
// longer overwrites another in-flight challenge for the same username,
// closing the "targeted eviction" case where POST /challenge with a
// victim's username could invalidate their in-progress login.
//
// MVP note: this is an in-memory Map, which is fine for a single-process
// server but will NOT survive a restart or work across multiple instances.
// If the server is ever scaled horizontally, this should move to
// PostgreSQL (a `login_challenges` table) or Redis instead.

const crypto = require('crypto');

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CHALLENGES = 5000;

// Each dot-separated segment: starts with a letter, 3-16 chars total,
// no trailing hyphen, no consecutive hyphens.
const SEGMENT = '[a-z](?:[a-z0-9]|-(?!-)){1,14}[a-z0-9]';
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

function consumeChallenge(username, providedNonce) {
  const entry = challenges.get(providedNonce);
  if (!entry) return false;

  challenges.delete(providedNonce);

  if (Date.now() > entry.expiresAt) return false;
  if (entry.username !== username) return false;

  return true;
}

module.exports = { createChallenge, consumeChallenge, isValidHiveUsername };