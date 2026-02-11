/**
 * RATE LIMITING MIDDLEWARE - REISTECH PLATFORM
 *
 * Implementa proteção contra:
 * - Ataques DDoS
 * - Brute force em login
 * - Spam de mensagens WhatsApp
 * - Abuso de API
 */

const redis = require('redis');
const { promisify } = require('util');

class RateLimiter {
  constructor() {
    this.client = null;
    this.incr = null;
    this.expire = null;
    this.ttl = null;

    // Configurações de limite por rota
    this.limits = {
      // Autenticação (mais restritivo)
      'POST:/api/auth/login': {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // 5 tentativas
        message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
        skipSuccessfulRequests: true
      },
      'POST:/api/auth/refresh': {
        windowMs: 5 * 60 * 1000, // 5 minutos
        max: 10,
        message: 'Muitas solicitações de refresh token.'
      },

      // WhatsApp (controle de spam)
      'POST:/api/whatsapp/send': {
        windowMs: 1 * 60 * 1000, // 1 minuto
        max: 30, // 30 mensagens por minuto
        message: 'Limite de envio de mensagens excedido. Aguarde 1 minuto.'
      },
      'GET:/api/whatsapp/conversas': {
        windowMs: 1 * 60 * 1000,
        max: 60,
        message: 'Muitas requisições. Aguarde um momento.'
      },

      // Fila Humana
      'POST:/api/fila/:id/assumir': {
        windowMs: 1 * 60 * 1000,
        max: 20,
        message: 'Muitas tentativas de assumir clientes.'
      },

      // CMS e Catálogo (operações de escrita)
      'POST:/api/cms/textos': {
        windowMs: 1 * 60 * 1000,
        max: 20,
        message: 'Limite de criação de textos excedido.'
      },
      'PUT:/api/cms/textos/:id': {
        windowMs: 1 * 60 * 1000,
        max: 30,
        message: 'Muitas atualizações de textos.'
      },
      'POST:/api/catalogo': {
        windowMs: 1 * 60 * 1000,
        max: 15,
        message: 'Limite de criação de itens excedido.'
      },

      // Limite global (fallback)
      GLOBAL: {
        windowMs: 1 * 60 * 1000, // 1 minuto
        max: 100, // 100 requisições por minuto
        message: 'Muitas requisições. Por favor, reduza a velocidade.'
      }
    };

    // IPs na whitelist (sem limite)
    this.whitelist = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

    // IPs na blacklist (bloqueados)
    this.blacklist = new Set();

    // Configuração de bloqueio temporário
    this.tempBan = {
      threshold: 10, // Violações antes de ban
      duration: 60 * 60 * 1000 // 1 hora de ban
    };
  }

  /**
   * Inicializa cliente Redis
   */
  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 1 // DB separado para rate limiting
      });

      this.incr = promisify(this.client.incr).bind(this.client);
      this.expire = promisify(this.client.expire).bind(this.client);
      this.ttl = promisify(this.client.ttl).bind(this.client);
      this.get = promisify(this.client.get).bind(this.client);
      this.set = promisify(this.client.set).bind(this.client);
      this.del = promisify(this.client.del).bind(this.client);

      this.client.on('error', (err) => {
        console.error('❌ Rate Limiter Redis error:', err);
      });

      console.log('✅ Rate Limiter Redis connected');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Rate Limiter Redis:', error);
      return false;
    }
  }

  /**
   * Obtém IP real do cliente (considerando proxies)
   */
  _getClientIP(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip
    );
  }

  /**
   * Gera chave Redis para rate limiting
   */
  _generateKey(ip, route) {
    return `ratelimit:${route}:${ip}`;
  }

  /**
   * Gera chave para violações
   */
  _generateViolationKey(ip) {
    return `violations:${ip}`;
  }

  /**
   * Gera chave para ban temporário
   */
  _generateBanKey(ip) {
    return `tempban:${ip}`;
  }

  /**
   * Verifica se IP está na whitelist
   */
  _isWhitelisted(ip) {
    return this.whitelist.includes(ip);
  }

  /**
   * Verifica se IP está na blacklist
   */
  _isBlacklisted(ip) {
    return this.blacklist.has(ip);
  }

  /**
   * Adiciona IP à blacklist
   */
  addToBlacklist(ip) {
    this.blacklist.add(ip);
    console.log(`🚫 IP ${ip} added to blacklist`);
  }

  /**
   * Remove IP da blacklist
   */
  removeFromBlacklist(ip) {
    this.blacklist.delete(ip);
    console.log(`✅ IP ${ip} removed from blacklist`);
  }

  /**
   * Verifica e aplica ban temporário
   */
  async checkTempBan(ip) {
    const banKey = this._generateBanKey(ip);
    const banned = await this.get(banKey);

    if (banned) {
      const ttl = await this.ttl(banKey);
      return {
        banned: true,
        remainingTime: ttl
      };
    }

    return { banned: false };
  }

  /**
   * Aplica ban temporário
   */
  async applyTempBan(ip) {
    const banKey = this._generateBanKey(ip);
    const duration = this.tempBan.duration / 1000; // Converter para segundos

    await this.set(banKey, '1', 'EX', duration);

    console.log(`⛔ Temporary ban applied to IP ${ip} for ${duration}s`);

    return {
      banned: true,
      duration
    };
  }

  /**
   * Incrementa contador de violações
   */
  async incrementViolations(ip) {
    const violationKey = this._generateViolationKey(ip);
    const violations = await this.incr(violationKey);

    // Definir expiração de 1 hora para o contador de violações
    if (violations === 1) {
      await this.expire(violationKey, 3600);
    }

    // Se atingiu threshold, aplicar ban temporário
    if (violations >= this.tempBan.threshold) {
      await this.applyTempBan(ip);
      await this.del(violationKey); // Reset contador
      return { shouldBan: true, violations };
    }

    return { shouldBan: false, violations };
  }

  /**
   * Middleware principal de rate limiting
   */
  middleware(options = {}) {
    return async (req, res, next) => {
      try {
        const ip = this._getClientIP(req);

        // Verificar whitelist
        if (this._isWhitelisted(ip)) {
          return next();
        }

        // Verificar blacklist permanente
        if (this._isBlacklisted(ip)) {
          return res.status(403).json({
            error: 'Acesso negado',
            message: 'Seu IP foi bloqueado permanentemente.'
          });
        }

        // Verificar ban temporário
        const tempBanStatus = await this.checkTempBan(ip);
        if (tempBanStatus.banned) {
          return res.status(429).json({
            error: 'Bloqueio temporário',
            message: `Você foi bloqueado temporariamente. Tente novamente em ${Math.ceil(
              tempBanStatus.remainingTime / 60
            )} minutos.`,
            retryAfter: tempBanStatus.remainingTime
          });
        }

        // Determinar configuração de limite
        const route = `${req.method}:${req.route?.path || req.path}`;
        const config = this.limits[route] || this.limits.GLOBAL;
        const appliedConfig = { ...config, ...options };

        // Gerar chave Redis
        const key = this._generateKey(ip, route);

        // Incrementar contador
        const requests = await this.incr(key);

        // Definir expiração na primeira requisição
        if (requests === 1) {
          await this.expire(key, Math.ceil(appliedConfig.windowMs / 1000));
        }

        // Obter TTL restante
        const ttl = await this.ttl(key);
        const resetTime = Date.now() + ttl * 1000;

        // Headers de rate limit (padrão RateLimit)
        res.setHeader('X-RateLimit-Limit', appliedConfig.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, appliedConfig.max - requests));
        res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

        // Verificar se excedeu o limite
        if (requests > appliedConfig.max) {
          // Incrementar violações
          const violationStatus = await this.incrementViolations(ip);

          res.setHeader('Retry-After', ttl);

          return res.status(429).json({
            error: 'Rate limit excedido',
            message: appliedConfig.message,
            retryAfter: ttl,
            limit: appliedConfig.max,
            windowMs: appliedConfig.windowMs,
            violations: violationStatus.violations
          });
        }

        // Continuar se dentro do limite
        next();
      } catch (error) {
        console.error('❌ Rate limiter error:', error);
        // Em caso de erro, permitir a requisição (fail-open)
        next();
      }
    };
  }

  /**
   * Rate limiter específico para login
   */
  loginLimiter() {
    return async (req, res, next) => {
      const ip = this._getClientIP(req);
      const email = req.body?.email;

      if (!email) {
        return next();
      }

      // Limitar por IP + Email
      const key = this._generateKey(ip, `login:${email}`);
      const requests = await this.incr(key);

      if (requests === 1) {
        await this.expire(key, 15 * 60); // 15 minutos
      }

      if (requests > 5) {
        const ttl = await this.ttl(key);

        // Incrementar violações graves
        await this.incrementViolations(ip);

        return res.status(429).json({
          error: 'Muitas tentativas de login',
          message:
            'Sua conta foi temporariamente bloqueada por segurança. Tente novamente em 15 minutos.',
          retryAfter: ttl
        });
      }

      next();
    };
  }

  /**
   * Rate limiter para WhatsApp (mais permissivo)
   */
  whatsappLimiter() {
    return this.middleware({
      windowMs: 1 * 60 * 1000,
      max: 30
    });
  }

  /**
   * Limpar rate limit de um IP (admin)
   */
  async clearIPLimits(ip) {
    try {
      const patterns = [`ratelimit:*:${ip}`, `violations:${ip}`, `tempban:${ip}`];

      for (const pattern of patterns) {
        const keys = await promisify(this.client.keys).bind(this.client)(pattern);
        if (keys.length > 0) {
          await this.del(...keys);
        }
      }

      console.log(`✅ Rate limits cleared for IP ${ip}`);
      return true;
    } catch (error) {
      console.error('❌ Error clearing IP limits:', error);
      return false;
    }
  }

  /**
   * Obter estatísticas de rate limiting
   */
  async getStats(ip = null) {
    try {
      const pattern = ip ? `ratelimit:*:${ip}` : 'ratelimit:*';
      const keys = await promisify(this.client.keys).bind(this.client)(pattern);

      const stats = {
        totalKeys: keys.length,
        limits: []
      };

      for (const key of keys.slice(0, 100)) {
        // Limitar a 100 para performance
        const value = await this.get(key);
        const ttl = await this.ttl(key);

        stats.limits.push({
          key,
          requests: parseInt(value, 10),
          ttl
        });
      }

      return stats;
    } catch (error) {
      console.error('❌ Error getting rate limit stats:', error);
      return { error: error.message };
    }
  }
}

// Singleton instance
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;