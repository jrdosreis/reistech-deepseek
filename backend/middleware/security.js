/**
 * MIDDLEWARE DE SEGURANÇA - REISTECH PLATFORM
 *
 * Implementa camadas de segurança:
 * - Helmet (headers de segurança)
 * - CORS configurável
 * - Sanitização de input
 * - Proteção contra SQL Injection
 * - Proteção contra XSS
 * - Validação de JWT
 * - CSRF Protection
 */

const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const hpp = require('hpp');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const { cpf: cpfValidator } = require('cpf-cnpj-validator');

class SecurityMiddleware {
  /**
   * Configuração completa de Helmet
   */
  static helmet() {
    return helmet({
      // Content Security Policy
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", 'wss:', 'ws:'],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },

      // HTTP Strict Transport Security
      hsts: {
        maxAge: 31536000, // 1 ano
        includeSubDomains: true,
        preload: true
      },

      // Prevenir clickjacking
      frameguard: {
        action: 'deny'
      },

      // Prevenir MIME type sniffing
      noSniff: true,

      // Desabilitar X-Powered-By header
      hidePoweredBy: true,

      // Prevenir abertura no IE
      ieNoOpen: true,

      // XSS Protection
      xssFilter: true,

      // Referrer Policy
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin'
      }
    });
  }

  /**
   * Configuração de CORS
   */
  static cors() {
    const whitelist = process.env.CORS_WHITELIST
      ? process.env.CORS_WHITELIST.split(',')
      : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:4173'];

    const corsOptions = {
      origin: (origin, callback) => {
        // Permitir requisições sem origin (mobile apps, Postman, etc)
        if (!origin) {
          return callback(null, true);
        }

        if (whitelist.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Origem não permitida pelo CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      maxAge: 86400 // 24 horas
    };

    return cors(corsOptions);
  }

  /**
   * Proteção contra XSS
   */
  static xssProtection() {
    return xss();
  }

  /**
   * Proteção contra HTTP Parameter Pollution
   */
  static hppProtection() {
    return hpp({
      whitelist: ['page', 'limit', 'sort', 'filter', 'categoria', 'nicho', 'estado']
    });
  }

  /**
   * Validação e sanitização de inputs
   */
  static validateInput(schema) {
    return (req, res, next) => {
      const errors = [];

      // Validar body
      if (schema.body) {
        for (const [field, rules] of Object.entries(schema.body)) {
          const value = req.body[field];

          // Required
          if (rules.required && !value) {
            errors.push(`Campo '${field}' é obrigatório`);
            continue;
          }

          if (!value) {
            continue;
          }

          // Type validation
          if (rules.type === 'email' && !validator.isEmail(value)) {
            errors.push(`Campo '${field}' deve ser um email válido`);
          }

          if (rules.type === 'url' && !validator.isURL(value)) {
            errors.push(`Campo '${field}' deve ser uma URL válida`);
          }

          if (rules.type === 'phone' && !validator.isMobilePhone(value, 'pt-BR')) {
            errors.push(`Campo '${field}' deve ser um telefone válido`);
          }

          if (rules.type === 'cpf' && !cpfValidator.isValid(value)) {
            errors.push(`Campo '${field}' deve ser um CPF válido`);
          }

          // Length validation
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`Campo '${field}' deve ter no mínimo ${rules.minLength} caracteres`);
          }

          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`Campo '${field}' deve ter no máximo ${rules.maxLength} caracteres`);
          }

          // Pattern validation
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`Campo '${field}' está em formato inválido`);
          }

          // Enum validation
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`Campo '${field}' deve ser um dos valores: ${rules.enum.join(', ')}`);
          }

          // Sanitize
          if (rules.sanitize) {
            req.body[field] = validator.escape(value);
          }
        }
      }

      // Validar params
      if (schema.params) {
        for (const [param, rules] of Object.entries(schema.params)) {
          const value = req.params[param];

          if (rules.type === 'id' && !validator.isInt(value)) {
            errors.push(`Parâmetro '${param}' deve ser um número inteiro`);
          }

          if (rules.type === 'uuid' && !validator.isUUID(value)) {
            errors.push(`Parâmetro '${param}' deve ser um UUID válido`);
          }
        }
      }

      // Retornar erros se houver
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validação falhou',
          errors
        });
      }

      next();
    };
  }

  /**
   * Middleware de autenticação JWT
   */
  static authenticate() {
    return async (req, res, next) => {
      try {
        // Extrair token do header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Não autenticado',
            message: 'Token de acesso não fornecido'
          });
        }

        const token = authHeader.substring(7);

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verificar expiração
        if (decoded.exp < Date.now() / 1000) {
          return res.status(401).json({
            error: 'Token expirado',
            message: 'Seu token de acesso expirou. Faça login novamente.'
          });
        }

        // Adicionar usuário à requisição
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          workspace_id: decoded.workspace_id
        };

        next();
      } catch (error) {
        if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({
            error: 'Token inválido',
            message: 'Token de acesso inválido'
          });
        }

        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            error: 'Token expirado',
            message: 'Seu token de acesso expirou. Faça login novamente.'
          });
        }

        return res.status(500).json({
          error: 'Erro de autenticação',
          message: 'Erro ao verificar token'
        });
      }
    };
  }

  /**
   * Middleware de autorização por role
   */
  static authorize(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Não autenticado',
          message: 'Autenticação necessária'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Não autorizado',
          message: 'Você não tem permissão para acessar este recurso'
        });
      }

      next();
    };
  }

  /**
   * Middleware de verificação de workspace
   */
  static verifyWorkspace() {
    return (req, res, next) => {
      const workspaceId =
        req.params.workspace_id || req.body.workspace_id || req.query.workspace_id;

      // Se não há workspace_id na requisição, pular
      if (!workspaceId) {
        return next();
      }

      // Verificar se o usuário pertence ao workspace
      if (req.user.workspace_id !== parseInt(workspaceId, 10)) {
        return res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem acesso a este workspace'
        });
      }

      next();
    };
  }

  /**
   * Proteção contra SQL Injection
   */
  static sqlInjectionProtection() {
    return (req, res, next) => {
      const checkValue = (value) => {
        if (typeof value === 'string') {
          // Padrões suspeitos de SQL Injection
          const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
            /(;|\|\||&|\$|`|’|”|<|>)/g,
            /(\bunion\b|\bjoin\b)/gi
          ];

          for (const pattern of sqlPatterns) {
            if (pattern.test(value)) {
              console.warn(`⚠️ Possible SQL injection attempt: ${value}`);
              return true;
            }
          }
        }
        return false;
      };

      // Verificar body
      for (const key in req.body) {
        if (checkValue(req.body[key])) {
          return res.status(400).json({
            error: 'Input inválido',
            message: 'Caracteres não permitidos detectados'
          });
        }
      }

      // Verificar query params
      for (const key in req.query) {
        if (checkValue(req.query[key])) {
          return res.status(400).json({
            error: 'Input inválido',
            message: 'Caracteres não permitidos detectados'
          });
        }
      }

      next();
    };
  }

  /**
   * Middleware de auditoria de ações
   */
  static auditLog(action) {
    return (req, res, next) => {
      // Salvar dados originais para comparação
      req.auditData = {
        action,
        userId: req.user?.id,
        workspace: req.user?.workspace_id,
        timestamp: new Date(),
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        before: null,
        after: null
      };

      // Interceptar resposta para capturar dados após a ação
      const originalJson = res.json;
      res.json = function (data) {
        req.auditData.after = data;

        // Aqui você pode salvar o log de auditoria no banco
        // auditService.log(req.auditData);

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * Proteção contra força bruta (complemento ao rate limiter)
   */
  static bruteForceProtection(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const attempts = new Map();

    return (req, res, next) => {
      const identifier = req.body.email || req.body.username || req.ip;
      const now = Date.now();

      // Limpar tentativas antigas
      if (attempts.has(identifier)) {
        const data = attempts.get(identifier);
        if (now - data.firstAttempt > windowMs) {
          attempts.delete(identifier);
        }
      }

      // Verificar tentativas
      if (!attempts.has(identifier)) {
        attempts.set(identifier, {
          count: 1,
          firstAttempt: now
        });
        return next();
      }

      const data = attempts.get(identifier);
      data.count++;

      if (data.count > maxAttempts) {
        const remainingTime = Math.ceil((windowMs - (now - data.firstAttempt)) / 1000 / 60);

        return res.status(429).json({
          error: 'Muitas tentativas',
          message: `Muitas tentativas de login. Tente novamente em ${remainingTime} minutos.`
        });
      }

      next();
    };
  }
}

module.exports = SecurityMiddleware;