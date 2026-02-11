/**
 * SISTEMA DE HEALTH CHECKS - REISTECH PLATFORM
 *
 * Monitora saúde dos componentes:
 * - Banco de dados PostgreSQL
 * - Redis (cache e rate limit)
 * - Conexões WhatsApp
 * - Memória e CPU
 * - Disco
 * - WebSocket
 */

const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.lastCheckResults = null;
    this.checkInterval = null;
  }

  /**
   * Registrar verificação de saúde
   */
  register(name, checkFunction, critical = false) {
    this.checks.set(name, {
      check: checkFunction,
      critical,
      lastResult: null,
      lastCheck: null
    });
  }

  /**
   * Executar todas as verificações
   */
  async runAll() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.APP_VERSION || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {}
    };

    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const [name, { check, critical }] of this.checks.entries()) {
      try {
        const startTime = Date.now();
        const result = await Promise.race([
          check(),
          this._timeout(5000) // Timeout de 5 segundos
        ]);
        const duration = Date.now() - startTime;

        const checkResult = {
          status: result.healthy ? 'healthy' : 'unhealthy',
          message: result.message || '',
          duration: `${duration}ms`,
          critical,
          details: result.details || {},
          timestamp: new Date().toISOString()
        };

        results.checks[name] = checkResult;

        // Atualizar status geral
        if (!result.healthy) {
          if (critical) {
            hasUnhealthy = true;
          } else {
            hasDegraded = true;
          }
        }

        // Salvar último resultado
        this.checks.get(name).lastResult = checkResult;
        this.checks.get(name).lastCheck = new Date();
      } catch (error) {
        const errorResult = {
          status: 'error',
          message: error.message,
          critical,
          timestamp: new Date().toISOString()
        };

        results.checks[name] = errorResult;

        if (critical) {
          hasUnhealthy = true;
        } else {
          hasDegraded = true;
        }
      }
    }

    // Definir status geral
    if (hasUnhealthy) {
      results.status = 'unhealthy';
    } else if (hasDegraded) {
      results.status = 'degraded';
    }

    this.lastCheckResults = results;
    return results;
  }

  /**
   * Timeout helper
   */
  _timeout(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), ms)
    );
  }

  /**
   * Obter última verificação
   */
  getLastResults() {
    return this.lastCheckResults || { status: 'unknown', message: 'No checks run yet' };
  }

  /**
   * Iniciar monitoramento contínuo
   */
  startMonitoring(intervalMs = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Executar imediatamente
    this.runAll();

    // Executar periodicamente
    this.checkInterval = setInterval(() => {
      this.runAll();
    }, intervalMs);

    console.log(`✅ Health monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏹️ Health monitoring stopped');
    }
  }
}

/**
 * VERIFICAÇÕES ESPECÍFICAS
 */

// Verificação do PostgreSQL
async function checkDatabase(db) {
  try {
    const result = await db.query('SELECT NOW() as current_time, version() as version');

    // Verificar pool de conexões
    const poolStats = {
      total: db.pool.totalCount,
      idle: db.pool.idleCount,
      waiting: db.pool.waitingCount
    };

    return {
      healthy: true,
      message: 'Database is operational',
      details: {
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version.split(' ')[1],
        pool: poolStats
      }
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Database error: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Verificação do Redis (Cache)
async function checkRedisCache(cacheService) {
  try {
    if (!cacheService.connected) {
      return {
        healthy: false,
        message: 'Redis cache not connected'
      };
    }

    // Testar SET e GET
    const testKey = 'health:check:cache';
    const testValue = Date.now().toString();

    await cacheService.set(testKey, testValue, 'EX', 10);
    const retrieved = await cacheService.get(testKey);

    if (retrieved !== testValue) {
      return {
        healthy: false,
        message: 'Redis cache read/write mismatch'
      };
    }

    const metrics = cacheService.getMetrics();

    return {
      healthy: true,
      message: 'Redis cache is operational',
      details: {
        hitRate: metrics.hitRate,
        totalRequests: metrics.total,
        connected: true
      }
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Redis cache error: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Verificação do Redis (Rate Limiter)
async function checkRedisRateLimiter(rateLimiter) {
  try {
    if (!rateLimiter.client || !rateLimiter.client.connected) {
      return {
        healthy: false,
        message: 'Redis rate limiter not connected'
      };
    }

    // Testar operação básica
    const testKey = 'health:check:ratelimit';
    await rateLimiter.set(testKey, '1', 'EX', 10);
    const value = await rateLimiter.get(testKey);

    return {
      healthy: true,
      message: 'Redis rate limiter is operational',
      details: {
        connected: true,
        testPassed: value === '1'
      }
    };
  } catch (error) {
    return {
      healthy: false,
      message: `Redis rate limiter error: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Verificação de memória
async function checkMemory() {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const memoryUsagePercent = (usedMem / totalMem) * 100;
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // Alerta se uso de memória > 85%
  const healthy = memoryUsagePercent < 85 && heapUsagePercent < 85;

  return {
    healthy,
    message: healthy ? 'Memory usage is normal' : 'Memory usage is high',
    details: {
      system: {
        total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        used: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`
      },
      process: {
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`
      }
    }
  };
}

// Verificação de CPU
async function checkCPU() {
  const cpus = os.cpus();
  const loadAverage = os.loadavg();

  // Calcular uso de CPU
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuUsagePercent = 100 - ~~((100 * totalIdle) / totalTick);

  // Load average normalizado pelo número de CPUs
  const normalizedLoad = loadAverage[0] / cpus.length;

  // Alerta se CPU > 80% ou load > 1.5
  const healthy = cpuUsagePercent < 80 && normalizedLoad < 1.5;

  return {
    healthy,
    message: healthy ? 'CPU usage is normal' : 'CPU usage is high',
    details: {
      cores: cpus.length,
      model: cpus[0].model,
      usagePercent: `${cpuUsagePercent}%`,
      loadAverage: {
        '1min': loadAverage[0].toFixed(2),
        '5min': loadAverage[1].toFixed(2),
        '15min': loadAverage[2].toFixed(2),
        normalized: normalizedLoad.toFixed(2)
      }
    }
  };
}

// Verificação de disco
async function checkDisk() {
  try {
    // Funciona apenas em sistemas Unix-like
    if (os.platform() === 'win32') {
      return {
        healthy: true,
        message: 'Disk check not available on Windows'
      };
    }

    const { stdout } = await execAsync('df -h / | tail -1');
    const parts = stdout.trim().split(/\s+/);

    const usagePercent = parseInt(parts[4], 10);
    const healthy = usagePercent < 85;

    return {
      healthy,
      message: healthy ? 'Disk usage is normal' : 'Disk usage is high',
      details: {
        filesystem: parts[0],
        size: parts[1],
        used: parts[2],
        available: parts[3],
        usagePercent: parts[4],
        mountPoint: parts[5]
      }
    };
  } catch (error) {
    return {
      healthy: true,
      message: 'Disk check skipped',
      details: { reason: 'Unable to check disk usage' }
    };
  }
}

// Verificação de conexões WhatsApp
async function checkWhatsApp(whatsappSessions) {
  try {
    if (!whatsappSessions || whatsappSessions.size === 0) {
      return {
        healthy: true,
        message: 'No WhatsApp sessions active',
        details: { totalSessions: 0 }
      };
    }

    let connected = 0;
    let disconnected = 0;
    let errors = 0;

    for (const [, session] of whatsappSessions.entries()) {
      if (session.status === 'connected') {
        connected++;
      } else if (session.status === 'error') {
        errors++;
      } else {
        disconnected++;
      }
    }

    const healthy = errors === 0 && disconnected < whatsappSessions.size;

    return {
      healthy,
      message: `${connected}/${whatsappSessions.size} WhatsApp sessions connected`,
      details: {
        total: whatsappSessions.size,
        connected,
        disconnected,
        errors
      }
    };
  } catch (error) {
    return {
      healthy: false,
      message: `WhatsApp check error: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Verificação de WebSocket
async function checkWebSocket(io) {
  try {
    if (!io) {
      return {
        healthy: false,
        message: 'WebSocket server not initialized'
      };
    }

    const sockets = await io.fetchSockets();
    const connectedClients = sockets.length;

    return {
      healthy: true,
      message: 'WebSocket server is operational',
      details: {
        connectedClients,
        namespaces: Array.from(io._nsps.keys())
      }
    };
  } catch (error) {
    return {
      healthy: false,
      message: `WebSocket error: ${error.message}`,
      details: { error: error.message }
    };
  }
}

// Middleware Express para health check
function healthCheckMiddleware(healthCheckService) {
  return async (req, res) => {
    try {
      const health = await healthCheckService.runAll();

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json(health);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message
      });
    }
  };
}

// Endpoint de readiness (para Kubernetes/Load Balancers)
function readinessCheckMiddleware(healthCheckService) {
  return async (req, res) => {
    const health = healthCheckService.getLastResults();

    if (!health || health.status === 'unhealthy') {
      return res.status(503).json({
        ready: false,
        message: 'Service not ready'
      });
    }

    res.status(200).json({
      ready: true,
      message: 'Service is ready'
    });
  };
}

// Endpoint de liveness (para Kubernetes)
function livenessCheckMiddleware() {
  return (req, res) => {
    // Simples verificação de que o processo está vivo
    res.status(200).json({
      alive: true,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  };
}

module.exports = {
  HealthCheckService,
  checkDatabase,
  checkRedisCache,
  checkRedisRateLimiter,
  checkMemory,
  checkCPU,
  checkDisk,
  checkWhatsApp,
  checkWebSocket,
  healthCheckMiddleware,
  readinessCheckMiddleware,
  livenessCheckMiddleware
};