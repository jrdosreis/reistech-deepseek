// backend/tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../app');
const db = require('../../src/db/models');

describe('Auth API', () => {
  let workspace;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
  });
  
  afterAll(async () => {
    await db.sequelize.close();
  });
  
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      workspace = await db.Workspace.create({
        slug: 'workspace-123',
        nome: 'Workspace Teste',
        vertical_key: 'celulares',
        ativo: true
      });

      await db.User.create({
        workspace_id: workspace.id,
        nome: 'Test User',
        email: 'test@reiscelulares.com.br',
        password_hash: 'Test123!',
        role: 'admin',
        ativo: true
      });
    });
    
    afterEach(async () => {
      await db.RefreshToken.destroy({ where: {} });
      await db.User.destroy({ where: {} });
      await db.Workspace.destroy({ where: {} });
    });
    
    it('deve fazer login com credenciais válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@reiscelulares.com.br',
          password: 'Test123!'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
    
    it('deve rejeitar credenciais inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@reiscelulares.com.br',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Credenciais inválidas');
    });
  });
});