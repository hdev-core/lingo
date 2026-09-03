// src/auth/sessionFromRequest.js
//
// One place that answers "who is making this request?", for every route.
//
// Two problems this fixes:
//
// 1. Two auth conventions. The auth routes read the session from an httpOnly
//    cookie (`lingo_session`), which is what the browser actually sends. The
//    game routes read an `Authorization: Bearer` header instead, which the
//    frontend never sets. We accept the cookie first and fall back to Bearer,
//    so browser and non-browser callers both work.
//
// 2. verifySession is ASYNC. It was being called without `await`, so the
//    destructured `valid`/`username` were always undefined and every
//    authenticated request 401'd. Everything here awaits it.

const { verifySession } = require('./session');

const SESSION_COOKIE_NAME = 'lingo_session';

function getTokenFromRequest(req) {
  const cookieToken = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function resolveUsername(req) {
  const token = getTokenFromRequest(req);
  if (!token) return null;

  const { valid, username } = await verifySession(token);
  return valid && username ? username : null;
}

// Rejects anonymous callers.
async function requireAuth(req, res, next) {
  try {
    const username = await resolveUsername(req);
    if (!username) {
      return res.status(401).json({ error: 'not authenticated' });
    }
    req.hiveUsername = username;
    next();
  } catch (err) {
    console.error('auth error:', err);
    res.status(401).json({ error: 'invalid or expired session' });
  }
}

// Populates req.hiveUsername when a valid session exists, but lets anonymous
// callers through -- used where some of the response is public.
async function optionalAuth(req, _res, next) {
  try {
    const username = await resolveUsername(req);
    if (username) req.hiveUsername = username;
  } catch {
    // an unreadable session is simply treated as anonymous
  }
  next();
}

module.exports = { requireAuth, optionalAuth, getTokenFromRequest, SESSION_COOKIE_NAME };
