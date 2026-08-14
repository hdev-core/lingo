const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});
const express = require('express');
const cors = require('cors');
const authRoutes = require('./auth/routes');
const guessRouter = require('./routes/guess');
const verifyRouter = require('./routes/verify');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: comma-separated list, so both the current Vercel preview URL and
// a future custom domain can be allowed at once without a code change.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn('ALLOWED_ORIGINS is not set -- CORS will block all cross-origin requests.');
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (no Origin header, e.g. curl/health checks)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
  })
);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', guessRouter);
app.use('/api', verifyRouter);

app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

module.exports = app;