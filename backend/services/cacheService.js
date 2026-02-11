/**
 * SERVIÇO DE CACHE REDIS - REISTECH PLATFORM
 *
 * Implementa cache estratégico multi-camada com:
 * - Cache de consultas frequentes
 * - Invalidação inteligente
 * - Cache warming
 * - Métricas de performance
 */

const redis = require('redis');
const { promisify } = require('util');

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };

    // Definir TTLs estratégicos por tipo de dado
    this.TTL = {
      // Cache de curto prazo (30 segundos - 5 minutos)
      CLIENTE_ESTADO: 30, // Estado FSM muda frequentemente
      FILA_HUMANA: 10, // Fila muda constantemente
      CONVERSAS_ATIVAS: 15, // Conversas em tempo real

      // Cache de médio prazo (5 - 30 minutos)
      CLIENTE_DADOS: 300, // Dados de cliente mudam ocasionalmente
      TEXTO_CMS: 600, // Textos CMS raramente mudam
      CATALOGO_ITEM: 900, // Catálogo é relativamente estável

      // Cache de longo prazo (30 minutos - 1 hora)
      WORKSPACE_CONFIG: 1800, // Configuração de workspace
      NICHO_CONFIG: 1800, // Configuração de nicho
      USER_PERMISSIONS: 900, // Permissões de usuário

      // Cache de muito longo prazo (1 hora+)
      DASHBOARD_METRICS: 300, // Métricas podem ter delay aceitável
      REPORTS_DATA: 3600 // Relatórios históricos
    };

    // Prefixos para organização de chaves
    this.PREFIX = {
      CLIENTE: 'cliente',
      CLIENTE_ESTADO: 'cliente:estado',
      CONVERSA: 'conversa',
      FILA: 'fila',
      USER: 'user',
      WORKSPACE: 'workspace',
      CMS: 'cms',
      CATALOGO: 'catalogo',
      SESSION: 'session',
      METRICS: 'metrics',
      LOCK: 'lock'
    };
  }

  /**
   * Inicializa conexão com Redis
   */
  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis connection refused');
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('❌ Redis retry time exhausted');
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('❌ Redis max retry attempts reached');
            return undefined;
          }
          // Retry com backoff exponencial
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Promisify métodos do Redis
      this.get = promisify(this.client.get).bind(this.client);
      this.set = promisify(this.client.set).bind(this.client);
      this.del = promisify(this.client.del).bind(this.client);
      this.exists = promisify(this.client.exists).bind(this.client);
      this.expire = promisify(this.client.expire).bind(this.client);
      this.keys = promisify(this.client.keys).bind(this.client);
      this.mget = promisify(this.client.mget).bind(this.client);
      this.mset = promisify(this.client.mset).bind(this.client);
      this.incr = promisify(this.client.incr).bind(this.client);
      this.decr = promisify(this.client.decr).bind(this.client);
      this.hget = promisify(this.client.hget).bind(this.client);
      this.hset = promisify(this.client.hset).bind(this.client);
      this.hgetall = promisify(this.client.hgetall).bind(this.client);
      this.hdel = promisify(this.client.hdel).bind(this.client);
      this.sadd = promisify(this.client.sadd).bind(this.client);
      this.smembers = promisify(this.client.smembers).bind(this.client);
      this.srem = promisify(this.client.srem).bind(this.client);

      this.client.on('connect', () => {
        console.log('✅ Redis connected');
        this.connected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis error:', err);
        this.metrics.errors++;
        this.connected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Desconecta do Redis
   */
  async disconnect() {
    if (this.client) {
      await promisify(this.client.quit).bind(this.client)();
      this.connected = false;
      console.log('✅ Redis disconnected');
    }
  }

  /**
   * Gera chave de cache formatada
   */
  _generateKey(prefix, ...parts) {
    return `reistech:${prefix}:${parts.join(':')}`;
  }

  /**
   * Cache GET com fallback
   */
  async getOrSet(key, fetchFunction, ttl = 300) {
    try {
      // Tentar buscar do cache
      const cached = await this.get(key);

      if (cached) {
        this.metrics.hits++;
        return JSON.parse(cached);
      }

      // Cache miss - buscar do banco
      this.metrics.misses++;
      const data = await fetchFunction();

      // Armazenar no cache
      if (data !== null && data !== undefined) {
        await this.set(key, JSON.stringify(data), 'EX', ttl);
        this.metrics.sets++;
      }

      return data;
    } catch (error) {
      console.error('❌ Cache getOrSet error:', error);
      this.metrics.errors++;
      // Em caso de erro, executar função de busca diretamente
      return await fetchFunction();
    }
  }

  /**
   * CACHE DE CLIENTE
   */
  async getCliente(clienteId, workspace_id) {
    const key = this._generateKey(this.PREFIX.CLIENTE, workspace_id, clienteId);
    return await this.get(key);
  }

  async setCliente(clienteId, workspace_id, data) {
    const key = this._generateKey(this.PREFIX.CLIENTE, workspace_id, clienteId);
    await this.set(key, JSON.stringify(data), 'EX', this.TTL.CLIENTE_DADOS);
    this.metrics.sets++;
  }

  async invalidateCliente(clienteId, workspace_id) {
    const key = this._generateKey(this.PREFIX.CLIENTE, workspace_id, clienteId);
    await this.del(key);
    this.metrics.deletes++;
  }

  /**
   * CACHE DE ESTADO DO CLIENTE (FSM)
   */
  async getClienteEstado(clienteId) {
    const key = this._generateKey(this.PREFIX.CLIENTE_ESTADO, clienteId);
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setClienteEstado(clienteId, estado) {
    const key = this._generateKey(this.PREFIX.CLIENTE_ESTADO, clienteId);
    await this.set(key, JSON.stringify(estado), 'EX', this.TTL.CLIENTE_ESTADO);
    this.metrics.sets++;
  }

  async invalidateClienteEstado(clienteId) {
    const key = this._generateKey(this.PREFIX.CLIENTE_ESTADO, clienteId);
    await this.del(key);
    this.metrics.deletes++;
  }

  /**
   * CACHE DE CONVERSAS ATIVAS
   */
  async getConversasAtivas(workspace_id) {
    const key = this._generateKey(this.PREFIX.CONVERSA, workspace_id, 'ativas');
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setConversasAtivas(workspace_id, conversas) {
    const key = this._generateKey(this.PREFIX.CONVERSA, workspace_id, 'ativas');
    await this.set(key, JSON.stringify(conversas), 'EX', this.TTL.CONVERSAS_ATIVAS);
    this.metrics.sets++;
  }

  async invalidateConversasAtivas(workspace_id) {
    const key = this._generateKey(this.PREFIX.CONVERSA, workspace_id, 'ativas');
    await this.del(key);
    this.metrics.deletes++;
  }

  /**
   * CACHE DE FILA HUMANA
   */
  async getFilaHumana(workspace_id, estado = 'todos') {
    const key = this._generateKey(this.PREFIX.FILA, workspace_id, estado);
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setFilaHumana(workspace_id, estado, data) {
    const key = this._generateKey(this.PREFIX.FILA, workspace_id, estado);
    await this.set(key, JSON.stringify(data), 'EX', this.TTL.FILA_HUMANA);
    this.metrics.sets++;
  }

  async invalidateFilaHumana(workspace_id) {
    const pattern = this._generateKey(this.PREFIX.FILA, workspace_id, '*');
    const keys = await this.keys(pattern);
    if (keys.length > 0) {
      await this.del(...keys);
      this.metrics.deletes += keys.length;
    }
  }

  /**
   * CACHE DE TEXTOS CMS
   */
  async getTextoCMS(workspace_id, chave) {
    const key = this._generateKey(this.PREFIX.CMS, workspace_id, chave);
    return await this.get(key);
  }

  async setTextoCMS(workspace_id, chave, valor) {
    const key = this._generateKey(this.PREFIX.CMS, workspace_id, chave);
    await this.set(key, valor, 'EX', this.TTL.TEXTO_CMS);
    this.metrics.sets++;
  }

  async invalidateTextoCMS(workspace_id, chave = null) {
    if (chave) {
      const key = this._generateKey(this.PREFIX.CMS, workspace_id, chave);
      await this.del(key);
      this.metrics.deletes++;
    } else {
      // Invalidar todos os textos CMS do workspace
      const pattern = this._generateKey(this.PREFIX.CMS, workspace_id, '*');
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.del(...keys);
        this.metrics.deletes += keys.length;
      }
    }
  }

  /**
   * CACHE DE CATÁLOGO
   */
  async getCatalogoItens(workspace_id, categoria = 'todos') {
    const key = this._generateKey(this.PREFIX.CATALOGO, workspace_id, categoria);
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setCatalogoItens(workspace_id, categoria, itens) {
    const key = this._generateKey(this.PREFIX.CATALOGO, workspace_id, categoria);
    await this.set(key, JSON.stringify(itens), 'EX', this.TTL.CATALOGO_ITEM);
    this.metrics.sets++;
  }

  async invalidateCatalogo(workspace_id, categoria = null) {
    if (categoria) {
      const key = this._generateKey(this.PREFIX.CATALOGO, workspace_id, categoria);
      await this.del(key);
      this.metrics.deletes++;
    } else {
      const pattern = this._generateKey(this.PREFIX.CATALOGO, workspace_id, '*');
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await this.del(...keys);
        this.metrics.deletes += keys.length;
      }
    }
  }

  /**
   * CACHE DE WORKSPACE
   */
  async getWorkspace(workspace_id) {
    const key = this._generateKey(this.PREFIX.WORKSPACE, workspace_id);
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setWorkspace(workspace_id, data) {
    const key = this._generateKey(this.PREFIX.WORKSPACE, workspace_id);
    await this.set(key, JSON.stringify(data), 'EX', this.TTL.WORKSPACE_CONFIG);
    this.metrics.sets++;
  }

  async invalidateWorkspace(workspace_id) {
    const key = this._generateKey(this.PREFIX.WORKSPACE, workspace_id);
    await this.del(key);
    this.metrics.deletes++;
  }

  /**
   * CACHE DE USUÁRIO
   */
  async getUser(user_id) {
    const key = this._generateKey(this.PREFIX.USER, user_id);
    const cached = await this.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setUser(user_id, data) {
    const key = this._generateKey(this.PREFIX.USER, user_id);
    await this.set(key, JSON.stringify(data), 'EX', this.TTL.USER_PERMISSIONS);
    this.metrics.sets++;
  }

  async invalidateUser(user_id) {
    const key = this._generateKey(this.PREFIX.USER, user_id);
    await this.del(key);
    this.metrics.deletes++;
  }

  /**
   * SISTEMA DE LOCKS DISTRIBUÍDOS
   */
  async acquireLock(resource, timeout = 10) {
    const key = this._generateKey(this.PREFIX.LOCK, resource);
    const lockId = `${Date.now()}-${Math.random()}`;

    const acquired = await this.set(key, lockId, 'NX', 'EX', timeout);

    if (acquired === 'OK') {
      return lockId;
    }
    return null;
  }

  async releaseLock(resource, lockId) {
    const key = this._generateKey(this.PREFIX.LOCK, resource);
    const currentLock = await this.get(key);

    if (currentLock === lockId) {
      await this.del(key);
      return true;
    }
    return false;
  }

  /**
   * MÉTRICAS DE CACHE
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.metrics,
      total,
      hitRate: `${hitRate}%`,
      connected: this.connected
    };
  }

  resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * CACHE WARMING - Pré-carrega dados críticos
   */
  async warmCache(workspace_id, db) {
    console.log(`🔥 Warming cache for workspace ${workspace_id}...`);

    try {
      // Pre-carregar configuração do workspace
      const workspace = await db.query(
        'SELECT * FROM workspaces WHERE id = $1 AND deleted_at IS NULL',
        [workspace_id]
      );
      if (workspace.rows[0]) {
        await this.setWorkspace(workspace_id, workspace.rows[0]);
      }

      // Pre-carregar textos CMS mais usados
      const textosCMS = await db.query(
        `SELECT chave, valor FROM textos_cms
         WHERE workspace_id = $1 AND ativo = true
         ORDER BY uso_contador DESC LIMIT 50`,
        [workspace_id]
      );
      for (const texto of textosCMS.rows) {
        await this.setTextoCMS(workspace_id, texto.chave, texto.valor);
      }

      // Pre-carregar catálogo disponível
      const catalogo = await db.query(
        `SELECT * FROM catalogo_itens
         WHERE workspace_id = $1 AND disponivel = true AND deleted_at IS NULL`,
        [workspace_id]
      );
      await this.setCatalogoItens(workspace_id, 'todos', catalogo.rows);

      console.log(`✅ Cache warmed for workspace ${workspace_id}`);
      return true;
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
      return false;
    }
  }

  /**
   * LIMPAR CACHE EXPIRADO
   */
  async flushExpired() {
    // Redis faz isso automaticamente, mas podemos forçar
    console.log('🧹 Flushing expired cache entries...');
    // Implementação se necessário
  }

  /**
   * ESTATÍSTICAS DE MEMÓRIA
   */
  async getMemoryStats() {
    if (!this.connected) {
      return { error: 'Redis not connected' };
    }

    return new Promise((resolve, reject) => {
      this.client.info('memory', (err, info) => {
        if (err) {
          reject(err);
        } else {
          const stats = {};
          info.split('\r\n').forEach((line) => {
            const [key, value] = line.split(':');
            if (key && value) {
              stats[key] = value;
            }
          });
          resolve(stats);
        }
      });
    });
  }
}

// Singleton instance
const cacheService = new CacheService();

module.exports = cacheService;