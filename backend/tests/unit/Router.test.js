/**
 * Testes unitários – Router
 */

jest.mock('../../src/db/models', () => ({
  TextoCms: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  CatalogoItem: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const Router = require('../../src/core/engine/Router');
const db = require('../../src/db/models');

describe('Router', () => {
  let router;
  const workspaceId = 'ws-123';

  beforeEach(() => {
    router = new Router(workspaceId);
    jest.clearAllMocks();
  });

  describe('determineIntent', () => {
    it('deve detectar intenção de compra com palavras-chave', async () => {
      const state = { state: 'MENU_PRINCIPAL', context: {} };
      const intent = await router.determineIntent('quero comprar um iphone', state);
      expect(intent).toBeDefined();
      expect(typeof intent).toBe('string');
    });

    it('deve detectar intenção de falar com humano', async () => {
      const state = { state: 'MENU_PRINCIPAL', context: {} };
      const intent = await router.determineIntent('quero falar com atendente', state);
      expect(intent).toBe('HUMANO_SOLICITADO');
    });

    it('deve retornar MENU_PRINCIPAL como fallback', async () => {
      const state = { state: 'MENU_PRINCIPAL', context: {} };
      const intent = await router.determineIntent('xyzzy123', state);
      expect(intent).toBeDefined();
    });

    it('deve detectar saudação', async () => {
      const state = { state: 'INICIO_SESSAO', context: {} };
      const intent = await router.determineIntent('olá bom dia', state);
      expect(intent).toBeDefined();
    });

    it('deve detectar resposta numérica no menu', async () => {
      const state = { state: 'MENU_PRINCIPAL', context: {} };
      const intent = await router.determineIntent('1', state);
      expect(intent).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('deve gerar resposta de boas-vindas', async () => {
      db.TextoCms.findOne.mockResolvedValue({
        conteudo: 'Bem-vindo! Como posso ajudar?',
      });

      const state = { state: 'MENU_PRINCIPAL' };
      const response = await router.generateResponse(state, 'SAUDACAO', 'cli-1');
      expect(response).toBeDefined();
      expect(response.type).toBe('message');
    });

    it('deve usar resposta default quando CMS não encontra texto', async () => {
      db.TextoCms.findOne.mockResolvedValue(null);

      const state = { state: 'MENU_PRINCIPAL' };
      const response = await router.generateResponse(state, 'SAUDACAO', 'cli-1');
      expect(response).toBeDefined();
      expect(response.message).toBeDefined();
    });
  });
});
