// server/ecosystem.config.js
//
// PM2 process config. PM2 keeps the Express app running as a background
// process, restarts it if it crashes, and can restart it on VPS reboot
// (via `pm2 startup` + `pm2 save`, run once manually on the box).
//
// Chosen over a systemd unit because this is a shared, multi-tenant VPS
// (same box other teams' projects run on) -- PM2 runs entirely under a
// normal user account, no sudo/root needed to manage this app, so it
// can't interfere with anyone else's service on the same machine.

module.exports = {
  apps: [
    {
      name: 'lingo-server',
      script: 'src/index.js',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      // src/index.js loads this directory's real .env through dotenv.
      // The file is created directly on the server and is never committed.
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      time: true,
    },
  ],
};