/**
 * Testes unitários – CacheService
 */

// Mock do redis
jest.mock('redis', () => {
  const mockClient = {
    get: jest.fn((key, cb) => cb(null, null)),
    set: jest.fn((key, val, ...args) => {
      const cb = args[args.length - 1];
      if (typeof cb === 'function') cb(null, 'OK');
    }),
    del: jest.fn((key, cb) => cb(null, 1)),
    exists: jest.fn((key, cb) => cb(null, 0)),
    expire: jest.fn((key, ttl, cb) => cb(null, 1)),
    keys: jest.fn((pattern, cb) => cb(null, [])),
    mget: jest.fn(),
    mset: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    hget: jest.fn(),
    hset: jest.fn(),
    hgetall: jest.fn(),
    hdel: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn(),
    srem: jest.fn(),
    on: jest.fn((event, handler) => {
      if (event === 'connect') handler();
    }),
    quit: jest.fn((cb) => cb && cb()),
  };

  return {
    createClient: jest.fn(() => mockClient),
  };
});

const cache = require('../../services/cacheService');

describe('CacheService', () => {
  beforeEach(() => {
    cache.metrics = { hits: 0, misses: 0, sets: 0, deletes: 0, errors: 0 };
  });

  describe('constructor', () => {
    it('deve inicializar com métricas zeradas', () => {
      expect(cache.metrics.hits).toBe(0);
      expect(cache.metrics.misses).toBe(0);
      expect(cache.metrics.errors).toBe(0);
    });

    it('deve ter TTLs definidos', () => {
      expect(cache.TTL.CLIENTE_ESTADO).toBeDefined();
      expect(cache.TTL.TEXTO_CMS).toBeDefined();
      expect(cache.TTL.WORKSPACE_CONFIG).toBeDefined();
    });

    it('deve ter prefixos definidos', () => {
      expect(cache.PREFIX.CLIENTE).toBe('cliente');
      expect(cache.PREFIX.FILA).toBe('fila');
    });
  });

  describe('_generateKey', () => {
    it('deve gerar chave formatada corretamente', () => {
      const key = cache._generateKey('cliente', 'ws-1', '123');
      expect(key).toBe('reistech:cliente:ws-1:123');
    });

    it('deve aceitar múltiplos segmentos', () => {
      const key = cache._generateKey('fila', 'ws-1', 'waiting');
      expect(key).toBe('reistech:fila:ws-1:waiting');
    });
  });

  describe('getOrSet', () => {
    it('deve incrementar errors no catch e chamar fallback', async () => {
      cache.get = jest.fn().mockRejectedValue(new Error('Redis down'));
      const fetchFn = jest.fn().mockResolvedValue({ data: 'from-db' });

      const result = await cache.getOrSet('test-key', fetchFn, 60);

      expect(result).toEqual({ data: 'from-db' });
      expect(cache.metrics.errors).toBe(1);
      expect(fetchFn).toHaveBeenCalled();
    });

    it('deve retornar valor do cache quando existe (hit)', async () => {
      cache.get = jest.fn().mockResolvedValue(JSON.stringify({ cached: true }));
      const fetchFn = jest.fn();

      const result = await cache.getOrSet('test-key', fetchFn, 60);

      expect(result).toEqual({ cached: true });
      expect(cache.metrics.hits).toBe(1);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('deve chamar fetchFunction no cache miss e armazenar', async () => {
      cache.get = jest.fn().mockResolvedValue(null);
      cache.set = jest.fn().mockResolvedValue('OK');
      const fetchFn = jest.fn().mockResolvedValue({ fresh: true });

      const result = await cache.getOrSet('test-key', fetchFn, 60);

      expect(result).toEqual({ fresh: true });
      expect(cache.metrics.misses).toBe(1);
      expect(cache.metrics.sets).toBe(1);
      expect(fetchFn).toHaveBeenCalled();
    });

    it('não deve armazenar no cache quando fetchFunction retorna null', async () => {
      cache.get = jest.fn().mockResolvedValue(null);
      cache.set = jest.fn().mockResolvedValue('OK');
      const fetchFn = jest.fn().mockResolvedValue(null);

      const result = await cache.getOrSet('test-key', fetchFn, 60);

      expect(result).toBeNull();
      expect(cache.metrics.sets).toBe(0);
    });
  });
});
