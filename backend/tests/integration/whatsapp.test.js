const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const db = require('../../src/db/models');
const { getWhatsAppService } = require('../../src/modules/whatsapp/WhatsAppService');

jest.mock('../../src/modules/whatsapp/WhatsAppService');

describe('WhatsApp API', () => {
  let token;
  let workspace;
  let user;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });

    workspace = await db.Workspace.create({
      slug: 'workspace-123',
      nome: 'Workspace Teste',
      vertical_key: 'celulares',
      ativo: true
    });

    user = await db.User.create({
      workspace_id: workspace.id,
      nome: 'Test User',
      email: 'test@reiscelulares.com.br',
      password_hash: 'Test123!',
      role: 'admin',
      ativo: true
    });

    getWhatsAppService.mockReturnValue({
      getStatus: jest.fn().mockReturnValue({
        connected: true,
        status: 'connected',
        lastQrAt: null,
        info: { pushname: 'ReisTech' }
      }),
      getQrCode: jest.fn().mockResolvedValue('data:image/png;base64,mockqr'),
      reconnect: jest.fn().mockResolvedValue(true)
    });
  });

  beforeEach(() => {
    token = jwt.sign(
      {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await db.RefreshToken.destroy({ where: {} });
    await db.User.destroy({ where: {} });
    await db.Workspace.destroy({ where: {} });
    await db.sequelize.close();
  });

  describe('GET /api/whatsapp/status', () => {
    it('deve retornar status com autenticação válida', async () => {
      const response = await request(app)
        .get('/api/whatsapp/status')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.connected).toBe(true);
    });

    it('deve rejeitar sem autenticação', async () => {
      const response = await request(app).get('/api/whatsapp/status');

      expect(response.status).toBe(401);
    });
  });
});
