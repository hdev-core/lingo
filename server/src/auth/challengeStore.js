// src/auth/challengeStore.js
//
// Short-lived storage for login challenges (nonces) issued to players
// before they sign in via Hive Keychain.
//
// Keyed by nonce (not username): a challenge issued to one username no
// longer overwrites another in-flight challenge for the same username.
//
// A challenge may be temporarily claimed while verification/session issuance
// is in progress. Infrastructure failures release the claim so the same nonce
// remains retryable; decisive results consume it.

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

const challenges = new Map(); // nonce -> { username, expiresAt, claimed }

function evictOldestEntry() {
  const oldestKey = challenges.keys().next().value;

  if (oldestKey !== undefined) {
    challenges.delete(oldestKey);
  }
}

function getValidEntry(username, providedNonce) {
  const entry = challenges.get(providedNonce);

  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    challenges.delete(providedNonce);
    return null;
  }

  if (entry.username !== username) {
    return null;
  }

  return entry;
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

  challenges.set(nonce, {
    username,
    expiresAt,
    claimed: false,
  });

  return nonce;
}

function validateChallenge(username, providedNonce) {
  return getValidEntry(username, providedNonce) !== null;
}

function claimChallenge(username, providedNonce) {
  const entry = getValidEntry(username, providedNonce);

  if (!entry || entry.claimed) {
    return false;
  }

  entry.claimed = true;
  return true;
}

function releaseChallenge(username, providedNonce) {
  const entry = getValidEntry(username, providedNonce);

  if (!entry || !entry.claimed) {
    return false;
  }

  entry.claimed = false;
  return true;
}

function consumeClaimedChallenge(username, providedNonce) {
  const entry = getValidEntry(username, providedNonce);

  if (!entry || !entry.claimed) {
    return false;
  }

  challenges.delete(providedNonce);
  return true;
}

function consumeChallenge(username, providedNonce) {
  const entry = getValidEntry(username, providedNonce);

  if (!entry || entry.claimed) {
    return false;
  }

  challenges.delete(providedNonce);
  return true;
}

module.exports = {
  createChallenge,
  validateChallenge,
  claimChallenge,
  releaseChallenge,
  consumeClaimedChallenge,
  consumeChallenge,
  isValidHiveUsername,
};