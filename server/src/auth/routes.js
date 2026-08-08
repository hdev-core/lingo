// src/auth/routes.js
//
// POST /api/auth/challenge  -- issue a one-time nonce for a Hive username
// POST /api/auth/verify     -- verify a signed nonce, issue a session (httpOnly cookie)
// GET  /api/auth/me         -- check current login status from the session cookie
// POST /api/auth/refresh    -- extend an existing valid session
// POST /api/auth/revoke     -- clear the session cookie (logout)

const express = require('express');
const rateLimit = require('express-rate-limit');
const { createChallenge, consumeChallenge } = require('./challengeStore');
const { verifyChallengeSignature } = require('./verifySignature');
const { issueSession, verifySession, refreshSession } = require('./session');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per window
  message: { error: 'Too many requests, please try again later.' },
});

// Shared cookie options -- httpOnly so client-side JS can never read the
// token (protects against XSS token theft). secure:true requires HTTPS,
// which is fine in production but would block cookies over plain
// http://localhost in local dev, so it's toggled off outside production.
const SESSION_COOKIE_NAME = 'lingo_session';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days, matches SESSION_TTL_SECONDS in session.js
};

router.post('/challenge', authLimiter, (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'username is required' });
  }

  const nonce = createChallenge(username);
  res.status(200).json({ nonce });
});

router.post('/verify', authLimiter, async (req, res) => {
  const { username, nonce, signature } = req.body;
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
    if (err.message.includes('Hive account not found')) {
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

router.post('/refresh', authLimiter, (req, res) => {
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

router.post('/revoke', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.status(200).json({ revoked: true });
});

module.exports = router;