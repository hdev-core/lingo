// src/auth/routes.js
//
// POST /api/auth/challenge  -- issue a one-time nonce for a Hive username
// POST /api/auth/verify     -- verify a signed nonce, issue a session cookie
// GET  /api/auth/me         -- check current login status
// POST /api/auth/refresh    -- extend an existing valid session
// POST /api/auth/revoke     -- revoke this session generation and older ones

const express = require('express');
const rateLimit = require('express-rate-limit');

const {
  createChallenge,
  claimChallenge,
  releaseChallenge,
  consumeClaimedChallenge,
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

  // Reserve the challenge rather than consuming it immediately. This keeps
  // concurrent replays single-use while allowing infrastructure failures to
  // release the nonce for a legitimate retry.
  if (!claimChallenge(username, nonce)) {
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
      if (!consumeClaimedChallenge(username, nonce)) {
        return res
          .status(401)
          .json({ error: 'Challenge is invalid or expired' });
      }

      return res.status(401).json({ error: 'Invalid Hive account' });
    }

    if (err instanceof HiveRpcUnavailableError) {
      releaseChallenge(username, nonce);

      console.warn(
        'Hive RPC unavailable during login verification:',
        err.message
      );

      return res.status(503).json({
        error: 'Hive network is temporarily unavailable. Please try again.',
      });
    }

    releaseChallenge(username, nonce);

    console.error('Login verification error:', err);

    return res.status(500).json({ error: 'Verification failed' });
  }

  if (!signatureIsValid) {
    if (!consumeClaimedChallenge(username, nonce)) {
      return res
        .status(401)
        .json({ error: 'Challenge is invalid or expired' });
    }

    return res.status(401).json({ error: 'Signature verification failed' });
  }

  let session;

  try {
    // PostgreSQL failure is retryable. Keep the challenge claimed during the
    // DB operation, consume it only after issuance succeeds, and release it
    // if the DB operation fails.
    session = await issueSession(username);
  } catch (err) {
    releaseChallenge(username, nonce);

    console.error('Session issuance error:', err);

    return res.status(503).json({
      error: 'Session service is temporarily unavailable. Please try again.',
    });
  }

  if (!consumeClaimedChallenge(username, nonce)) {
    return res.status(401).json({ error: 'Challenge is invalid or expired' });
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