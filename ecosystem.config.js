module.exports = {
  apps: [
    {
      name: 'whatsapp-scheduler',
      script: 'dist/scripts/start-scheduler-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        TZ: 'Asia/Kolkata'
      },
      env_production: {
        NODE_ENV: 'production',
        TZ: 'Asia/Kolkata'
      },
      log_file: './logs/scheduler.log',
      out_file: './logs/scheduler-out.log',
      error_file: './logs/scheduler-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
