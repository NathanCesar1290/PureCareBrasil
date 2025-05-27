module.exports = {
  apps: [
    {
      name: 'minimal-shop',
      script: './server.js',
      instances: 'max',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        NODE_OPTIONS: '--max_old_space_size=1024',
        PORT: 3000,
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_MAX: 100,
        LOG_LEVEL: 'info',
        LOG_DIR: '/var/log/minimal-shop',
      },
      error_file: '/var/log/minimal-shop/err.log',
      out_file: '/var/log/minimal-shop/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      exec_mode: 'cluster',
      max_restarts: 10,
      restart_delay: 5000,
      time: true,
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_exit_codes: [1, 2],
      max_old_space_size: 1024,
      max_new_space_size: 512,
      node_args: ['--optimize_for_size', '--max_old_space_size=1024'],
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_MAX: 100,
        LOG_LEVEL: 'info',
        LOG_DIR: '/var/log/minimal-shop',
      },
    },
  ],
};

// Comandos úteis:
// pm2 start ecosystem.config.js --env production
// pm2 monit
// pm2 logs minimal-shop --lines 100
// pm2 reload minimal-shop
// pm2 stop minimal-shop
// pm2 delete minimal-shop
// pm2 list
// pm2 save
// pm2 startup
// pm2 show minimal-shop
// pm2 flush
// pm2 show minimal-shop --logs
// pm2 show minimal-shop --log
// pm2 describe minimal-shop
// pm2 restart minimal-shop --update-env
