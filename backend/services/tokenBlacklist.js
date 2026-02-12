/**
 * TOKEN BLACKLIST - REISTECH PLATFORM
 *
 * Armazena access tokens revogados no Redis.
 * O TTL de cada chave é definido pelo tempo restante de vida do token,
 * ou seja, a chave expira automaticamente quando o token expiraria.
 * Se Redis não estiver disponível, a blacklist fica em memória (Map).
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Fallback in-memory quando Redis não está disponível
const memoryStore = new Map();

/**
 * Gera hash SHA-256 do token (não armazenamos o JWT bruto)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Adiciona um access token à blacklist.
 * @param {string} token - JWT access token
 */
async function add(token) {
  const hash = hashToken(token);

  // Calcular TTL restante do token
  let ttl;
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      ttl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
    } else {
      ttl = 900; // 15 min padrão
    }
  } catch {
    ttl = 900;
  }

  try {
    const cacheService = require('./cacheService');
    if (cacheService.connected) {
      await cacheService.set(`reistech:blacklist:${hash}`, '1', 'EX', ttl);
      return;
    }
  } catch {
    // Redis indisponível, fallback
  }

  // Fallback in-memory
  memoryStore.set(hash, Date.now() + ttl * 1000);
}

/**
 * Verifica se um token está na blacklist.
 * @param {string} token - JWT access token
 * @returns {Promise<boolean>}
 */
async function isBlacklisted(token) {
  const hash = hashToken(token);

  try {
    const cacheService = require('./cacheService');
    if (cacheService.connected) {
      const result = await cacheService.get(`reistech:blacklist:${hash}`);
      return result !== null && result !== undefined;
    }
  } catch {
    // Redis indisponível, fallback
  }

  // Fallback in-memory
  const expiry = memoryStore.get(hash);
  if (!expiry) {
    return false;
  }
  if (Date.now() > expiry) {
    memoryStore.delete(hash);
    return false;
  }
  return true;
}

module.exports = { add, isBlacklisted };
