const dotenv = require('dotenv');

dotenv.config();

const requiredEnv = (key) => {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Variável de ambiente obrigatória ausente: ${key}`);
  }
  return value;
};

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3001,
  apiPrefix: process.env.API_PREFIX || '/api',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'reistech',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  
  jwt: {
    secret: requiredEnv('JWT_SECRET'),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },
  
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  admin: {
    email: requiredEnv('ADMIN_EMAIL'),
    password: requiredEnv('ADMIN_PASSWORD'),
    name: process.env.ADMIN_NAME || 'Administrador',
  },
  
  whatsapp: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './whatsapp-sessions',
    puppeteerArgs: process.env.WHATSAPP_PUPPETEER_ARGS 
      ? process.env.WHATSAPP_PUPPETEER_ARGS.split(',') 
      : ['--no-sandbox', '--disable-setuid-sandbox'],
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760,
    path: process.env.UPLOAD_PATH || './uploads',
  },
  
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};

module.exports = config;