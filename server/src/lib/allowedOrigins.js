// src/lib/allowedOrigins.js
//
// Single source of truth for the CORS/CSRF allow-list, shared by
// index.js (CORS middleware) and auth/routes.js (origin check on
// state-changing routes). Previously duplicated in both places, which
// risked the two lists drifting apart.

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

module.exports = { allowedOrigins };