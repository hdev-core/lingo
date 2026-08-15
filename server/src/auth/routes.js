// src/auth/routes.js
//
// POST /api/auth/challenge  -- issue a one-time nonce for a Hive username
// POST /api/auth/verify     -- verify a signed nonce, issue a session cookie
// GET  /api/auth/me         -- check current login status
// POST /api/auth/refresh    -- extend an existing valid session
// POST /api/auth/revoke     -- revoke all tokens in the current generation

const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  createChallenge,
  validateChallenge,
  consumeChallenge,
} = require('./challengeStore');

const {
  verifyChallengeSignature,
  HiveAccountNotFoundError,
  HiveRpcUnavailableError,
} = require('./verifySignature');

const {
  issueSession,
  verifySession,
  refreshSession,
  revokeSession,
} = require('./session');

const { allowedOrigins } = require('../lib/allowedOrigins');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});

const readLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

function requireTrustedOrigin(req, res, next) {
  const origin = req.headers.origin;

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({ error: 'Untrusted origin' });
  }

  next();
}

function normalizeUsername(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/^@/, '').toLowerCase();
}

const SESSION_COOKIE_NAME = 'lingo_session';

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 60 * 60 * 24 * 7 * 1000,
};

// clearCookie must match the cookie's identity/security attributes, but does
// not need the original maxAge.
const clearCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
};

router.post('/challenge', requireTrustedOrigin, authLimiter, (req, res) => {
  const username = normalizeUsername(req.body.username);

  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    const nonce = createChallenge(username);
    return res.status(200).json({ nonce });
  } catch {
    return res.status(400).json({ error: 'Invalid username' });
  }
});

router.post('/verify', requireTrustedOrigin, authLimiter, async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { nonce, signature } = req.body;

  if (!username || !nonce || !signature) {
    return res
      .status(400)
      .json({ error: 'username, nonce, and signature are required' });
  }

  // Check first without consuming it. A temporary Hive RPC failure must not
  // permanently burn a valid login challenge.
  if (!validateChallenge(username, nonce)) {
    return res.status(401).json({ error: 'Challenge is invalid or expired' });
  }

  let signatureIsValid;

  try {
    signatureIsValid = await verifyChallengeSignature({
      username,
      nonce,
      signatureHex: signature,
    });
  } catch (err) {
    if (err instanceof HiveAccountNotFoundError) {
      // Account-not-found is a decisive result, so this attempt is complete
      // and the one-time challenge should be consumed.
      if (!consumeChallenge(username, nonce)) {
        return res
          .status(401)
          .json({ error: 'Challenge is invalid or expired' });
      }

      return res.status(401).json({ error: 'Invalid Hive account' });
    }

    if (err instanceof HiveRpcUnavailableError) {
      // Infrastructure failure is retryable. Leave the nonce intact.
      console.warn(
        'Hive RPC unavailable during login verification:',
        err.message
      );

      return res.status(503).json({
        error: 'Hive network is temporarily unavailable. Please try again.',
      });
    }

    console.error('Login verification error:', err);

    // Unknown infrastructure/internal error: do not burn the challenge.
    return res.status(500).json({ error: 'Verification failed' });
  }

  if (!signatureIsValid) {
    if (!consumeChallenge(username, nonce)) {
      return res
        .status(401)
        .json({ error: 'Challenge is invalid or expired' });
    }

    return res.status(401).json({ error: 'Signature verification failed' });
  }

  // Claim the one-time challenge before creating a new token generation.
  // This ensures concurrent replays cannot both advance token_version.
  if (!consumeChallenge(username, nonce)) {
    return res.status(401).json({ error: 'Challenge is invalid or expired' });
  }

  let session;

  try {
    session = await issueSession(username);
  } catch (err) {
    console.error('Session issuance error:', err);

    return res.status(503).json({
      error: 'Session service is temporarily unavailable. Please try again.',
    });
  }

  res.cookie(SESSION_COOKIE_NAME, session.token, cookieOptions);

  return res.status(200).json({
    username: session.username,
    expiresAt: session.expiresAt,
  });
});

router.get('/me', readLimiter, async (req, res) => {
  const token = req.cookies[SESSION_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    const { valid, username } = await verifySession(token);

    if (!valid) {
      return res
        .status(401)
        .json({ error: 'Session is invalid or expired' });
    }

    return res.status(200).json({ username });
  } catch (err) {
    console.error('Session verification error:', err);

    return res.status(503).json({
      error: 'Session service is temporarily unavailable. Please try again.',
    });
  }
});

router.post(
  '/refresh',
  requireTrustedOrigin,
  authLimiter,
  async (req, res) => {
    const token = req.cookies[SESSION_COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ error: 'No active session' });
    }

    try {
      const refreshed = await refreshSession(token);

      if (!refreshed) {
        return res
          .status(401)
          .json({ error: 'Session is invalid or expired' });
      }

      res.cookie(SESSION_COOKIE_NAME, refreshed.token, cookieOptions);

      return res.status(200).json({
        username: refreshed.username,
        expiresAt: refreshed.expiresAt,
      });
    } catch (err) {
      console.error('Session refresh error:', err);

      return res.status(503).json({
        error: 'Session service is temporarily unavailable. Please try again.',
      });
    }
  }
);

router.post(
  '/revoke',
  requireTrustedOrigin,
  readLimiter,
  async (req, res) => {
    const token = req.cookies[SESSION_COOKIE_NAME];

    try {
      if (token) {
        await revokeSession(token);
      }
    } catch (err) {
      console.error('Session revocation error:', err);

      // Always remove this browser's cookie even if the database is
      // temporarily unavailable. Do not falsely claim durable revocation
      // succeeded, though.
      res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions);

      return res.status(503).json({
        error: 'Could not fully revoke the session. Please try again.',
      });
    }

    res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions);

    return res.status(200).json({ revoked: true });
  }
);

module.exports = router;