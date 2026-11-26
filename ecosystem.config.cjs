module.exports = {
  apps: [
    {
      name: 'photocraft-ai',
      cwd: '/var/www/pts_spl/data/www/pts.splworks.com/ptscraft-ai',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4242
      }
    }
  ]
};
