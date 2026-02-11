// backend/tests/unit/ReisTechEngine.test.js
const ReisTechEngine = require('../../src/core/engine/ReisTech');
const db = require('../../src/db/models');

jest.mock('../../src/db/models', () => ({
  sequelize: {
    transaction: jest.fn()
  },
  Cliente: {
    findOne: jest.fn(),
    create: jest.fn()
  },
  ClienteEstado: {
    findOne: jest.fn(),
    create: jest.fn()
  },
  ConversaInteracao: {
    create: jest.fn()
  },
  TextoCms: {
    findOne: jest.fn()
  },
  FilaHumana: {
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

jest.mock('../../src/core/engine/Router', () => {
  return jest.fn().mockImplementation(() => ({
    determineIntent: jest.fn().mockResolvedValue('CATALOGO_MENU'),
    generateResponse: jest.fn().mockResolvedValue({ type: 'message', message: 'ok' })
  }));
});

jest.mock('../../src/core/engine/DossierBuilder', () => {
  return jest.fn().mockImplementation(() => ({
    updateDossier: jest.fn().mockResolvedValue(true),
    getDossier: jest.fn().mockResolvedValue({
      completeness: 0.2,
      intencaoReal: false,
      complexidade: 0.1,
      timeInState: 0,
      priority: 'low'
    })
  }));
});

describe('ReisTech Engine', () => {
  let engine;
  const mockWorkspaceId = 'workspace-123';
  
  beforeEach(() => {
    engine = new ReisTechEngine(mockWorkspaceId);
    engine.stateMachine.getClientState = jest.fn();
    engine.stateMachine.initializeClient = jest.fn();
    engine.stateMachine.recordInteraction = jest.fn().mockResolvedValue(true);
    engine.stateMachine.transition = jest.fn().mockResolvedValue({ state: 'CATALOGO_MENU' });
    engine.dossierBuilder.updateDossier = jest.fn().mockResolvedValue(true);
    engine.dossierBuilder.getDossier = jest.fn().mockResolvedValue({
      completeness: 0.2,
      intencaoReal: false,
      complexidade: 0.1,
      timeInState: 0,
      priority: 'low'
    });
    db.sequelize.transaction.mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn()
    });
    db.ConversaInteracao.create.mockResolvedValue({});
    db.TextoCms.findOne.mockResolvedValue(null);
    jest.clearAllMocks();
  });
  
  describe('processMessage', () => {
    it('deve processar mensagem de novo cliente', async () => {
      const mockMessage = {
        from: '+5511999999999',
        text: 'Olá, quero comprar um iPhone',
        type: 'text',
        timestamp: new Date()
      };
      
      engine.stateMachine.getClientState.mockResolvedValue(null);
      engine.stateMachine.initializeClient.mockResolvedValue({
        cliente_id: 'cliente-123',
        state: 'INICIO_SESSAO',
        context: {},
        cliente: { id: 'cliente-123', telefone: '+5511999999999' }
      });
      
      const result = await engine.processMessage(mockMessage);
      
      expect(result.type).toBe('message');
      expect(engine.stateMachine.initializeClient).toHaveBeenCalled();
    });
    
    it('deve detectar intenção de catálogo', async () => {
      const mockMessage = {
        from: '+5511999999999',
        text: 'Quero ver catálogo de iPhones',
        type: 'text',
        timestamp: new Date()
      };
      
      engine.stateMachine.getClientState.mockResolvedValue({
        cliente_id: 'cliente-123',
        state: 'MENU_PRINCIPAL',
        context: {},
        cliente: { id: 'cliente-123', telefone: '+5511999999999' }
      });
      
      const result = await engine.processMessage(mockMessage);
      
      expect(engine.router.determineIntent).toHaveBeenCalledWith(
        'Quero ver catálogo de iPhones',
        expect.objectContaining({ state: 'MENU_PRINCIPAL' })
      );
      expect(engine.stateMachine.transition).toHaveBeenCalledWith(
        'cliente-123',
        'CATALOGO_MENU',
        { message: 'Quero ver catálogo de iPhones' }
      );
    });
  });
  
  describe('shouldEscalateToHuman', () => {
    it('deve escalonar quando cliente pede humano', async () => {
      const mockDossier = {
        completeness: 0.5,
        intencaoReal: false
      };
      
      const shouldEscalate = await engine.shouldEscalateToHuman(
        { state: 'MENU_PRINCIPAL' },
        'HUMANO_SOLICITADO',
        'cliente-123'
      );
      
      expect(shouldEscalate).toEqual({
        priority: 'high',
        reason: 'solicitação_explicita'
      });
    });
    
    it('deve escalonar quando dossiê está completo', async () => {
      // Mock do DossierBuilder
      engine.dossierBuilder.getDossier = jest.fn().mockResolvedValue({
        completeness: 0.9,
        intencaoReal: true,
        priority: 'medium'
      });
      
      const shouldEscalate = await engine.shouldEscalateToHuman(
        { state: 'GERAR_DOSSIE_VENDA' },
        'GERAR_DOSSIE_VENDA',
        'cliente-123'
      );
      
      expect(shouldEscalate).toBeTruthy();
    });
  });
});

// backend/tests/unit/StateMachine.test.js
const StateMachine = require('../../src/core/engine/StateMachine');

describe('State Machine', () => {
  let stateMachine;
  const mockWorkspaceId = 'workspace-123';
  
  beforeEach(() => {
    stateMachine = new StateMachine(mockWorkspaceId);
    jest.clearAllMocks();
  });
  
  describe('transition', () => {
    it('deve permitir transição válida', async () => {
      const mockEstadoAtual = {
        state: 'MENU_PRINCIPAL',
        context: {},
        save: jest.fn()
      };
      
      db.ClienteEstado.findOne = jest.fn().mockResolvedValue(mockEstadoAtual);
      db.sequelize.transaction = jest.fn().mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn()
      });
      
      const result = await stateMachine.transition(
        'cliente-123',
        'CATALOGO_MENU',
        { message: 'catálogo' }
      );
      
      expect(result.state).toBe('CATALOGO_MENU');
      expect(mockEstadoAtual.save).toHaveBeenCalled();
    });
    
    it('deve rejeitar transição inválida', async () => {
      const mockEstadoAtual = {
        state: 'MENU_PRINCIPAL',
        context: {},
        save: jest.fn()
      };
      
      db.ClienteEstado.findOne = jest.fn().mockResolvedValue(mockEstadoAtual);
      db.sequelize.transaction = jest.fn().mockResolvedValue({
        commit: jest.fn(),
        rollback: jest.fn()
      });
      
      await expect(
        stateMachine.transition('cliente-123', 'INVALID_TRANSITION')
      ).rejects.toThrow('Transição não permitida');
    });
  });
});