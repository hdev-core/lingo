const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
const express = require('express');
const authRoutes = require('./auth/routes');
const guessRouter = require('./routes/guess');
const verifyRouter = require('./routes/verify');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);

// Private: requires an authenticated player -- see src/routes/guess.js
// requireAuth for the current placeholder + the JWT-vs-session note in
// the summary below.
app.use('/api', guessRouter);

// Public: no auth, but only exposes answer/secret for already-revealed
// puzzles -- see src/routes/verify.js.
app.use('/api', verifyRouter);

app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

module.exports = app;
