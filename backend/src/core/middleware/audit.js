/**
 * Middleware de Auditoria - REISTECH PLATFORM
 *
 * Registra ações sensíveis no AuditLog para rastreabilidade.
 * Uso: audit('ACTION_NAME', 'Entity')
 */

const logger = require('../../config/logger');

/**
 * Cria um middleware que registra a ação no AuditLog após a resposta ser enviada.
 * @param {string} action - Nome da ação (ex.: 'CREATE_WORKSPACE', 'LOGIN', 'RELOAD_RULES')
 * @param {string} entity - Nome da entidade (ex.: 'Workspace', 'User', 'Session')
 */
function audit(action, entity) {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function (data) {
      // Registrar audit log de forma assíncrona (não bloqueia a resposta)
      setImmediate(async () => {
        try {
          // Import dinâmico para evitar circular dependency
          const db = require('../../db/models');

          await db.AuditLog.create({
            workspace_id: req.workspace?.id || req.user?.workspace_id,
            user_id: req.user?.id || null,
            action,
            entity,
            entity_id: req.params.id || req.params.workspaceId || req.body?.id || null,
            meta: {
              method: req.method,
              path: req.originalUrl,
              body: sanitizeBody(req.body),
              query: req.query,
              statusCode: res.statusCode,
            },
            ip_address: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress,
            user_agent: req.headers['user-agent'],
          });
        } catch (err) {
          logger.error('Erro ao salvar audit log:', err.message);
        }
      });

      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Remove campos sensíveis do body antes de salvar no log.
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'senha', 'token', 'refreshToken', 'accessToken', 'secret', 'password_hash'];

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

module.exports = { audit };
