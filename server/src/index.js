const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./auth/routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Required behind a reverse proxy (Hetzner/Vercel/etc.) so express-rate-limit
// reads the real client IP instead of throwing or bucketing every user together.
app.set('trust proxy', 1);

// Comma-separated list of allowed frontend origins, e.g.
// "http://localhost:5173,https://lingo-web-livid.vercel.app"
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // required so the browser sends/receives the httpOnly cookie
  })
);

app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.use('/api/auth', authRoutes);

app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

module.exports = app;