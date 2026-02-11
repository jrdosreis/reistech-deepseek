const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config/env');
const db = require('../../db/models');
const { responseSuccess, responseError } = require('../../core/utils/response');
const { AppError } = require('../../core/errors/AppError');

class AuthController {
  constructor() {
    this.login = this.login.bind(this);
    this.refresh = this.refresh.bind(this);
    this.logout = this.logout.bind(this);
    this.me = this.me.bind(this);
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Buscar usuário
      const user = await db.User.findOne({
        where: { email, ativo: true },
        include: [{
          model: db.Workspace,
          as: 'workspace',
          where: { ativo: true },
          required: true,
        }]
      });

      if (!user) {
        throw new AppError('Credenciais inválidas', 'INVALID_CREDENTIALS', 401);
      }

      // Verificar senha
      const isValid = await user.verifyPassword(password);
      if (!isValid) {
        throw new AppError('Credenciais inválidas', 'INVALID_CREDENTIALS', 401);
      }

      // Atualizar último login
      user.last_login_at = new Date();
      await user.save();

      // Gerar tokens
      const tokens = await this.generateTokens(user);

      const cookieOptions = {
        httpOnly: true,
        sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
        secure: config.nodeEnv === 'production',
      };

      res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json(responseSuccess({
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
          workspace: {
            id: user.workspace.id,
            nome: user.workspace.nome,
            slug: user.workspace.slug,
          },
        },
        ...tokens,
      }));
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { user, refreshTokenRecord } = req;

      // Revogar refresh token antigo
      refreshTokenRecord.revoked_at = new Date();
      await refreshTokenRecord.save();

      // Gerar novos tokens
      const tokens = await this.generateTokens(user);

      const cookieOptions = {
        httpOnly: true,
        sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
        secure: config.nodeEnv === 'production',
      };

      res.cookie('accessToken', tokens.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json(responseSuccess(tokens));
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Em produção, poderíamos adicionar o token a uma blacklist
        // Para MVP, apenas respondemos sucesso
      }

      // Se tiver refresh token no body, revogá-lo
      const refreshToken = req.body?.refreshToken || (req.headers.cookie || '').split(';').map(p => p.trim()).find(p => p.startsWith('refreshToken='))?.split('=')[1];
      if (refreshToken) {
        const tokenHash = crypto.createHash('sha256').update(decodeURIComponent(refreshToken)).digest('hex');
        await db.RefreshToken.update(
          { revoked_at: new Date() },
          { where: { token_hash: tokenHash } }
        );
      }

      const clearOptions = {
        httpOnly: true,
        sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
        secure: config.nodeEnv === 'production',
      };

      res.clearCookie('accessToken', clearOptions);
      res.clearCookie('refreshToken', clearOptions);

      res.json(responseSuccess({ message: 'Logout realizado com sucesso' }));
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const user = await db.User.findByPk(req.user.id, {
        include: [{
          model: db.Workspace,
          as: 'workspace',
        }]
      });

      if (!user) {
        throw new AppError('Usuário não encontrado', 'USER_NOT_FOUND', 404);
      }

      res.json(responseSuccess({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        workspace: {
          id: user.workspace.id,
          nome: user.workspace.nome,
          slug: user.workspace.slug,
        },
      }));
    } catch (error) {
      next(error);
    }
  }

  async generateTokens(user) {
    // Access token
    const accessToken = jwt.sign(
      {
        userId: user.id,
        workspaceId: user.workspace_id,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.accessExpiry }
    );

    // Refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30); // 30 dias

    // Salvar refresh token no banco
    await db.RefreshToken.create({
      user_id: user.id,
      token_hash: crypto.createHash('sha256').update(refreshToken).digest('hex'),
      expires_at: refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutos em segundos
    };
  }
}

module.exports = new AuthController();