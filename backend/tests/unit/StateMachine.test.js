/**
 * Testes unitários – StateMachine
 */

// Mocks de dependências
jest.mock('../../../src/db/models', () => ({
  Cliente: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  ClienteEstado: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  ConversaInteracao: {
    create: jest.fn(),
  },
  sequelize: {
    transaction: jest.fn((cb) => cb({ commit: jest.fn(), rollback: jest.fn() })),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const StateMachine = require('../../../src/core/engine/StateMachine');
const db = require('../../../src/db/models');

describe('StateMachine', () => {
  let sm;
  const workspaceId = 'ws-123';

  beforeEach(() => {
    sm = new StateMachine(workspaceId);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('deve inicializar com workspaceId e mapa de estados', () => {
      expect(sm.workspaceId).toBe(workspaceId);
      expect(sm.states).toBeDefined();
      expect(sm.states.INICIO_SESSAO).toBeDefined();
      expect(sm.states.MENU_PRINCIPAL).toBeDefined();
    });

    it('deve ter transições definidas para INICIO_SESSAO', () => {
      const transitions = sm.states.INICIO_SESSAO.transitions;
      expect(transitions).toBeDefined();
      expect(Array.isArray(Object.keys(transitions)) || typeof transitions === 'object').toBe(true);
    });
  });

  describe('getClientState', () => {
    it('deve retornar null quando cliente não existe', async () => {
      db.Cliente.findOne.mockResolvedValue(null);
      const result = await sm.getClientState('5511999999999');
      expect(result).toBeNull();
    });

    it('deve retornar estado quando cliente existe', async () => {
      const mockCliente = {
        id: 'cli-1',
        telefone: '5511999999999',
        estado: { state: 'MENU_PRINCIPAL', context: {} },
      };
      db.Cliente.findOne.mockResolvedValue(mockCliente);
      const result = await sm.getClientState('5511999999999');
      expect(result).toBeDefined();
    });
  });

  describe('initializeClient', () => {
    it('deve criar cliente e estado inicial', async () => {
      const mockCliente = { id: 'new-cli-1' };
      const mockEstado = { state: 'INICIO_SESSAO', context: {} };

      db.Cliente.create.mockResolvedValue(mockCliente);
      db.ClienteEstado.create.mockResolvedValue(mockEstado);

      const result = await sm.initializeClient('5511888888888');
      expect(result).toBeDefined();
      expect(db.Cliente.create).toHaveBeenCalled();
    });
  });

  describe('recordInteraction', () => {
    it('deve criar registro de interação', async () => {
      const data = {
        clienteId: 'cli-1',
        direction: 'inbound',
        canal: 'whatsapp',
        conteudo: { text: 'oi' },
        estadoFsm: 'MENU_PRINCIPAL',
      };

      db.ConversaInteracao.create.mockResolvedValue({ id: 'int-1', ...data });
      await sm.recordInteraction(data);
      expect(db.ConversaInteracao.create).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'inbound',
          canal: 'whatsapp',
        })
      );
    });
  });
});
