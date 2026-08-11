// src/auth/routes.js
//
// POST /api/auth/challenge  -- issue a one-time nonce for a Hive username
// POST /api/auth/verify     -- verify a signed nonce, issue a session (httpOnly cookie)
// GET  /api/auth/me         -- check current login status from the session cookie
// POST /api/auth/refresh    -- extend an existing valid session
// POST /api/auth/revoke     -- revoke the session and clear the cookie (logout)

const express = require('express');
const rateLimit = require('express-rate-limit');
const { createChallenge, consumeChallenge } = require('./challengeStore');
const { verifyChallengeSignature } = require('./verifySignature');
const {
  issueSession,
  verifySession,
  refreshSession,
  revokeSession,
} = require('./session');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' },
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

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

router.post('/challenge', authLimiter, requireTrustedOrigin, (req, res) => {
  const username = normalizeUsername(req.body.username);
  if (!username) {
    return res.status(400).json({ error: 'username is required' });
  }

  try {
    const nonce = createChallenge(username);
    res.status(200).json({ nonce });
  } catch {
    res.status(400).json({ error: 'Invalid username' });
  }
});

router.post('/verify', authLimiter, requireTrustedOrigin, async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const { nonce, signature } = req.body;
  if (!username || !nonce || !signature) {
    return res
      .status(400)
      .json({ error: 'username, nonce, and signature are required' });
  }

  const nonceIsValid = consumeChallenge(username, nonce);
  if (!nonceIsValid) {
    return res.status(401).json({ error: 'Challenge is invalid or expired' });
  }

  try {
    const signatureIsValid = await verifyChallengeSignature({
      username,
      nonce,
      signatureHex: signature,
    });

    if (!signatureIsValid) {
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    const session = issueSession(username);

    res.cookie(SESSION_COOKIE_NAME, session.token, cookieOptions);
    res.status(200).json({ username: session.username, expiresAt: session.expiresAt });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Hive account not found')) {
      return res.status(401).json({ error: 'Invalid Hive account' });
    }
    console.error('Login verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.get('/me', (req, res) => {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { valid, username } = verifySession(token);
  if (!valid) {
    return res.status(401).json({ error: 'Session is invalid or expired' });
  }

  res.status(200).json({ username });
});

router.post('/refresh', authLimiter, requireTrustedOrigin, (req, res) => {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(400).json({ error: 'No active session' });
  }

  const refreshed = refreshSession(token);
  if (!refreshed) {
    return res.status(401).json({ error: 'Session is invalid or expired' });
  }

  res.cookie(SESSION_COOKIE_NAME, refreshed.token, cookieOptions);
  res.status(200).json({ username: refreshed.username, expiresAt: refreshed.expiresAt });
});

router.post('/revoke', requireTrustedOrigin, (req, res) => {
  const token = req.cookies[SESSION_COOKIE_NAME];
  if (token) {
    revokeSession(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions);
  res.status(200).json({ revoked: true });
});

module.exports = router;