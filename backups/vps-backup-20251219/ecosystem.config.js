module.exports = {
  apps: [{
    name: 'streambro',
    script: './app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Keep process running even if terminal is closed
    detached: true,
    // Restart on crash
    min_uptime: '10s',
    max_restarts: 10,
    // Auto restart on file changes (optional, set to false for production)
    ignore_watch: ['node_modules', 'logs', 'uploads', 'public/videos'],
  }]
};
