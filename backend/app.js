const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./src/config/env');
const logger = require('./src/config/logger');
const { errorHandler } = require('./src/core/errors/errorHandler');
const routes = require('./src/routes');
const { initializeDatabase } = require('./src/db/models');
const { initializeWhatsApp } = require('./src/modules/whatsapp/WhatsAppService');

const app = express();

// Security middlewares
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Rate limiting
const isDev = config.nodeEnv !== 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 1000 : 300, // limite maior em dev para evitar 429 com polling
  message: {
    success: false,
    error: 'Muitas requisições. Tente novamente mais tarde.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.http(message.trim()) } }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// Disponibilizar wss quando existir
app.use((req, res, next) => {
  if (app.locals.wss) {
    req.wss = app.locals.wss;
  }
  next();
});

// API routes
app.use('/api', routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    code: 'ENDPOINT_NOT_FOUND',
  });
});

// Global error handler
app.use(errorHandler);

// Initialize services
async function initializeApp() {
  try {
    await initializeDatabase();
    logger.info('✅ Banco de dados conectado');

    // Initialize WhatsApp in background (non-blocking)
    if (config.nodeEnv !== 'test') {
      setTimeout(() => {
        initializeWhatsApp().catch(err => {
          logger.error('❌ Falha ao inicializar WhatsApp:', err);
        });
      }, 1000);
    }

    logger.info('✅ Serviços inicializados');
  } catch (error) {
    logger.error('❌ Falha na inicialização:', error);
    process.exit(1);
  }
}

initializeApp();

module.exports = app;