const logger = require('../../config/logger');
const { AppError } = require('./AppError');

const SENSITIVE_KEYS = new Set([
  'password',
  'senha',
  'refreshToken',
  'accessToken',
  'token',
  'authorization',
]);

function sanitizeObject(value) {
  if (!value || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeObject(item));
  }

  return Object.entries(value).reduce((acc, [key, val]) => {
    if (SENSITIVE_KEYS.has(key)) {
      acc[key] = '[REDACTED]';
    } else {
      acc[key] = sanitizeObject(val);
    }
    return acc;
  }, {});
}

function errorHandler(err, req, res, next) {
  logger.error('Erro não tratado:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: sanitizeObject(req.body),
    query: sanitizeObject(req.query),
  });

  // Se for um AppError, usar código e status específicos
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
  }

  // Erro de validação Joi
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.details ? err.details[0].message : err.message,
      code: 'VALIDATION_ERROR',
    });
  }

  // Erro de autenticação JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Token inválido',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expirado',
      code: 'TOKEN_EXPIRED',
    });
  }

  // Erro de banco de dados
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: err.errors ? err.errors[0].message : err.message,
      code: 'DB_VALIDATION_ERROR',
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Registro duplicado',
      code: 'DUPLICATE_ENTRY',
    });
  }

  // Erro padrão
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erro interno do servidor' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
}

module.exports = { errorHandler };