const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
});

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./auth/routes');
const guessRouter = require('./routes/guess');
const verifyRouter = require('./routes/verify');
const { allowedOrigins } = require('./lib/allowedOrigins');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust exactly 1 hop: the reverse proxy in front of this server.
// Do not use `true`, because that would trust the entire
// X-Forwarded-For chain.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
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
app.use('/api', guessRouter);
app.use('/api', verifyRouter);

app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

module.exports = app;