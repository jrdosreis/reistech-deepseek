/**
 * PM2 ECOSYSTEM CONFIGURATION - REISTECH PLATFORM
 *
 * Configuração de produção com:
 * - Modo cluster (4 instâncias)
 * - Auto-restart
 * - Log rotation
 * - Memory limits
 * - Health checks
 */

module.exports = {
  apps: [
    {
      // ============ APLICAÇÃO PRINCIPAL ============
      name: 'reistech-api',
      script: './server.js',
      cwd: __dirname,

      // Modo cluster para aproveitar múltiplos CPUs
      instances: process.env.CLUSTER_INSTANCES || 4,
      exec_mode: 'cluster',

      // Variáveis de ambiente
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        WS_PORT: 3002
      },

      // Logs
      error_file: '/var/log/reistech/error.log',
      out_file: '/var/log/reistech/out.log',
      log_file: '/var/log/reistech/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Gestão de memória
      max_memory_restart: '1G',

      // Auto-restart
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Timeouts
      listen_timeout: 10000,
      kill_timeout: 5000,

      // Graceful shutdown
      wait_ready: false,
      shutdown_with_message: true,

      // Cron para restart diário às 3AM (opcional)
      cron_restart: '0 3 * * *',

      // Incrementar versão a cada restart
      increment_var: 'INSTANCE_ID',

      // Watch (desabilitado em produção)
      watch: false,

      // Ignorar arquivos no watch (caso habilitado)
      ignore_watch: [
        'node_modules',
        'logs',
        '.git',
        '*.log'
      ],

      // Variáveis de ambiente adicionais
      env: {
        // Otimização de memória Node.js
        NODE_OPTIONS: '--max-old-space-size=4096'
      },

      // Post-deploy hooks
      post_update: [
        'npm install',
        'npm run migrate'
      ]
    }
  ],

  // ============ DEPLOY CONFIGURATION ============
  deploy: {
    production: {
      // SSH
      user: 'deploy',
      host: ['server1.reiscelulares.com.br', 'server2.reiscelulares.com.br'],
      ref: 'origin/main',
      repo: 'git@github.com:reistech/platform.git',
      path: '/var/www/reistech',

      // SSH options
      ssh_options: 'StrictHostKeyChecking=no',

      // Pre-deploy (no servidor remoto)
      'pre-deploy-local': 'echo "Preparing deployment..."',

      // Post-deploy (no servidor remoto)
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',

      // Ambiente
      env: {
        NODE_ENV: 'production'
      }
    },

    staging: {
      user: 'deploy',
      host: 'staging.reiscelulares.com.br',
      ref: 'origin/develop',
      repo: 'git@github.com:reistech/platform.git',
      path: '/var/www/reistech-staging',

      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',

      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};