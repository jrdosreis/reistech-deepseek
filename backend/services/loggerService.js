/**
 * SERVIÇO DE LOGGING E MONITORAMENTO - REISTECH PLATFORM
 *
 * Implementa:
 * - Logging estruturado multi-nível
 * - Rotação automática de logs
 * - Métricas de performance
 * - Alertas de erro
 * - Rastreamento de requisições
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

class LoggerService {
  constructor() {
    this.logger = null;
    this.metrics = {
      requests: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      debug: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };

    // Diretório de logs
    this.logDir = process.env.LOG_DIR || path.join(__dirname, '../../logs');

    // Criar diretório se não existir
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    this.initialize();
  }

  /**
   * Inicializa o logger Winston
   */
  initialize() {
    // Formato customizado para logs
    const customFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(meta).length > 0) {
          log += ` ${JSON.stringify(meta)}`;
        }

        return log;
      })
    );

    // Formato para console (mais legível)
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} ${level}: ${message}`;

        if (meta.requestId) {
          log += ` [ReqID: ${meta.requestId}]`;
        }

        if (meta.userId) {
          log += ` [User: ${meta.userId}]`;
        }

        if (meta.duration) {
          log += ` [${meta.duration}ms]`;
        }

        return log;
      })
    );

    // Transports
    const transports = [
      // Console (desenvolvimento)
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
      }),

      // Arquivo combinado (todos os logs)
      new DailyRotateFile({
        filename: path.join(this.logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: customFormat,
        level: 'debug'
      }),

      // Arquivo de erros
      new DailyRotateFile({
        filename: path.join(this.logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: customFormat,
        level: 'error'
      }),

      // Arquivo de requisições HTTP
      new DailyRotateFile({
        filename: path.join(this.logDir, 'http-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        format: customFormat,
        level: 'http'
      }),

      // Arquivo de auditoria (ações críticas)
      new DailyRotateFile({
        filename: path.join(this.logDir, 'audit-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '90d',
        format: customFormat,
        level: 'warn'
      })
    ];

    // Criar logger
    this.logger = winston.createLogger({
      levels: winston.config.npm.levels,
      transports,
      exitOnError: false
    });

    // Adicionar nível customizado 'http'
    winston.addColors({
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      debug: 'blue'
    });

    console.log(`✅ Logger initialized. Log directory: ${this.logDir}`);
  }

  /**
   * Log de requisição HTTP
   */
  logRequest(req, res, duration) {
    const log = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: this._getClientIP(req),
      userAgent: req.headers['user-agent'],
      requestId: req.id,
      userId: req.user?.id,
      workspace: req.user?.workspace_id
    };

    // Incrementar métricas
    this.metrics.requests++;
    this.metrics.totalResponseTime += duration;
    this.metrics.avgResponseTime = Math.round(
      this.metrics.totalResponseTime / this.metrics.requests
    );

    // Log com nível apropriado baseado no status
    if (res.statusCode >= 500) {
      this.logger.error('HTTP Request Error', log);
      this.metrics.errors++;
    } else if (res.statusCode >= 400) {
      this.logger.warn('HTTP Request Warning', log);
      this.metrics.warnings++;
    } else {
      this.logger.http('HTTP Request', log);
    }
  }

  /**
   * Log de erro com stack trace
   */
  error(message, error, meta = {}) {
    this.metrics.errors++;

    this.logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...meta
    });

    // Alertar em produção (integração futura com Slack/Email)
    if (process.env.NODE_ENV === 'production') {
      this._sendAlert('error', message, error);
    }
  }

  /**
   * Log de warning
   */
  warn(message, meta = {}) {
    this.metrics.warnings++;
    this.logger.warn(message, meta);
  }

  /**
   * Log de info
   */
  info(message, meta = {}) {
    this.metrics.info++;
    this.logger.info(message, meta);
  }

  /**
   * Log de debug
   */
  debug(message, meta = {}) {
    this.metrics.debug++;
    this.logger.debug(message, meta);
  }

  /**
   * Log de auditoria (ações críticas)
   */
  audit(action, user, details = {}) {
    this.logger.warn('AUDIT', {
      action,
      userId: user?.id,
      userEmail: user?.email,
      workspace: user?.workspace_id,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log de evento de negócio
   */
  business(event, data = {}) {
    this.logger.info('BUSINESS_EVENT', {
      event,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  /**
   * Log de performance
   */
  performance(operation, duration, meta = {}) {
    const level = duration > 1000 ? 'warn' : 'debug';

    this.logger[level]('PERFORMANCE', {
      operation,
      duration: `${duration}ms`,
      slow: duration > 1000,
      ...meta
    });
  }

  /**
   * Log de integração externa (WhatsApp, etc)
   */
  integration(service, action, status, meta = {}) {
    const level = status === 'error' ? 'error' : 'info';

    this.logger[level]('INTEGRATION', {
      service,
      action,
      status,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  /**
   * Obter IP do cliente
   */
  _getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.ip
    );
  }

  /**
   * Enviar alerta (implementação futura)
   */
  async _sendAlert(level, message, error) {
    // TODO: Implementar integração com Slack/Email/SMS
    console.error(`🚨 ALERT [${level}]: ${message}`, error);
  }

  /**
   * Obter métricas
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset métricas
   */
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      warnings: 0,
      info: 0,
      debug: 0,
      avgResponseTime: 0,
      totalResponseTime: 0
    };
  }
}

/**
 * MIDDLEWARE DE LOGGING DE REQUISIÇÕES
 */
class RequestLogger {
  static middleware() {
    return (req, res, next) => {
      // Adicionar ID único à requisição
      req.id = this._generateRequestId();

      // Timestamp de início
      const startTime = Date.now();

      // Interceptar fim da resposta
      const originalSend = res.send;
      res.send = function (data) {
        res.send = originalSend;

        const duration = Date.now() - startTime;
        logger.logRequest(req, res, duration);

        return res.send(data);
      };

      next();
    };
  }

  static _generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * MIDDLEWARE DE TRATAMENTO DE ERROS
 */
class ErrorLogger {
  static middleware() {
    return (err, req, res, next) => {
      // Log do erro
      logger.error('Unhandled Error', err, {
        requestId: req.id,
        method: req.method,
        url: req.originalUrl,
        userId: req.user?.id,
        workspace: req.user?.workspace_id,
        body: req.body,
        query: req.query
      });

      // Responder ao cliente
      const statusCode = err.statusCode || 500;
      const message =
        process.env.NODE_ENV === 'production'
          ? 'Erro interno do servidor'
          : err.message;

      res.status(statusCode).json({
        error: true,
        message,
        requestId: req.id,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    };
  }
}

/**
 * HEALTH CHECK
 */
class HealthCheck {
  constructor() {
    this.checks = [];
    this.status = 'healthy';
  }

  /**
   * Adicionar verificação de saúde
   */
  addCheck(name, checkFunction) {
    this.checks.push({ name, check: checkFunction });
  }

  /**
   * Executar todas as verificações
   */
  async runChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {}
    };

    for (const { name, check } of this.checks) {
      try {
        const result = await check();
        results.checks[name] = {
          status: result ? 'ok' : 'degraded',
          ...result
        };

        if (!result || result.status === 'error') {
          results.status = 'unhealthy';
        }
      } catch (error) {
        results.checks[name] = {
          status: 'error',
          error: error.message
        };
        results.status = 'unhealthy';
      }
    }

    this.status = results.status;
    return results;
  }

  /**
   * Endpoint de health check
   */
  middleware() {
    return async (req, res) => {
      const health = await this.runChecks();
      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json(health);
    };
  }
}

// Singleton instances
const logger = new LoggerService();
const healthCheck = new HealthCheck();

module.exports = {
  logger,
  RequestLogger,
  ErrorLogger,
  HealthCheck: healthCheck
};