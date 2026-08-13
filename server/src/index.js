const express = require('express');
const authRoutes = require('./auth/routes');

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

app.listen(PORT, () => {
  console.log(`api listening on port ${PORT}`);
});

module.exports = app;