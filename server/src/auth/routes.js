// src/auth/routes.js
//
// POST /api/auth/challenge  -- issue a one-time nonce for a Hive username
// POST /api/auth/verify     -- verify a signed nonce, issue a session
// POST /api/auth/refresh    -- extend an existing valid session
// POST /api/auth/revoke     -- client-side logout acknowledgement

const express = require('express');
const rateLimit = require('express-rate-limit');
const { createChallenge, consumeChallenge } = require('./challengeStore');
const { verifyChallengeSignature } = require('./verifySignature');
const { issueSession, refreshSession } = require('./session');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per window
  message: { error: 'Too many requests, please try again later.' },
});

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
    res.status(200).json(session);
  } catch (err) {
    if (err.message.includes('Hive account not found')) {
      return res.status(401).json({ error: 'Invalid Hive account' });
    }
    console.error('Login verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/refresh', authLimiter, (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  const refreshed = refreshSession(token);
  if (!refreshed) {
    return res.status(401).json({ error: 'Session is invalid or expired' });
  }

  res.status(200).json(refreshed);
});

router.post('/revoke', (_req, res) => {
  // MVP: sessions are stateless JWTs, so "revoke" is enforced client-side
  // by discarding the token. Nothing to do server-side yet.
  res.status(200).json({ revoked: true });
});

module.exports = router;