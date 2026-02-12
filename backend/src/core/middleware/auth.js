const jwt = require('jsonwebtoken');
const config = require('../../config/env');
const { AppError } = require('../errors/AppError');
const db = require('../../db/models');
const tokenBlacklist = require('../../../services/tokenBlacklist');

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map(part => part.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return decodeURIComponent(part.substring(name.length + 1));
    }
  }
  return null;
}

function extractTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  const cookieHeader = req.headers.cookie;
  const cookieToken = getCookieValue(cookieHeader, 'accessToken');
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

async function authenticate(req, res, next) {
  try {
    const token = extractTokenFromRequest(req);
    
    if (!token) {
      throw new AppError('Token não fornecido', 'TOKEN_MISSING', 401);
    }

    // Verificar blacklist (tokens revogados via logout)
    if (await tokenBlacklist.isBlacklisted(token)) {
      throw new AppError('Token revogado', 'TOKEN_REVOKED', 401);
    }

    const decoded = jwt.verify(token, config.jwt.secret);

    // Buscar usuário
    const user = await db.User.findByPk(decoded.userId, {
      include: [{
        model: db.Workspace,
        as: 'workspace',
      }]
    });

    if (!user || !user.ativo) {
      throw new AppError('Usuário não encontrado ou inativo', 'USER_NOT_FOUND', 401);
    }

    // Verificar se o token não foi revogado (opcional para access token)
    req.user = user;
    req.workspace = user.workspace;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Token inválido', 'INVALID_TOKEN', 401));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expirado', 'TOKEN_EXPIRED', 401));
    } else {
      next(error);
    }
  }
}

function authorize(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Não autenticado', 'NOT_AUTHENTICATED', 401));
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(new AppError('Não autorizado', 'NOT_AUTHORIZED', 403));
    }

    next();
  };
}

async function refreshTokenMiddleware(req, res, next) {
  try {
    const refreshToken = req.body?.refreshToken || getCookieValue(req.headers.cookie, 'refreshToken');
    
    if (!refreshToken) {
      throw new AppError('Refresh token não fornecido', 'REFRESH_TOKEN_MISSING', 400);
    }

    // Verificar no banco de dados
    const tokenRecord = await db.RefreshToken.findOne({
      where: { 
        token_hash: require('crypto').createHash('sha256').update(refreshToken).digest('hex'),
        revoked_at: null,
        expires_at: { [db.Sequelize.Op.gt]: new Date() }
      },
      include: [{
        model: db.User,
        as: 'user',
        include: [{
          model: db.Workspace,
          as: 'workspace',
        }]
      }]
    });

    if (!tokenRecord) {
      throw new AppError('Refresh token inválido ou expirado', 'INVALID_REFRESH_TOKEN', 401);
    }

    req.user = tokenRecord.user;
    req.workspace = tokenRecord.user.workspace;
    req.refreshTokenRecord = tokenRecord;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  authenticate,
  authorize,
  refreshTokenMiddleware,
};