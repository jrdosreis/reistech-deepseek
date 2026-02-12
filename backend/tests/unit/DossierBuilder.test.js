/**
 * Testes unitários – DossierBuilder
 */

jest.mock('../../src/db/models', () => ({
  ClienteEstado: {
    findOne: jest.fn(),
  },
  Cliente: {},
  ConversaInteracao: {
    findAll: jest.fn(),
  },
  Workspace: {
    findByPk: jest.fn(),
  },
  sequelize: {},
  Sequelize: {},
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    subscribe: jest.fn(),
    on: jest.fn(),
    publish: jest.fn(),
  }));
});

const DossierBuilder = require('../../src/core/engine/DossierBuilder');
const db = require('../../src/db/models');

describe('DossierBuilder', () => {
  let builder;
  const workspaceId = 'ws-123';

  beforeEach(() => {
    builder = new DossierBuilder(workspaceId);
    DossierBuilder.rulesCache.clear();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('deve inicializar com workspaceId', () => {
      expect(builder.workspaceId).toBe(workspaceId);
      expect(builder.rulesLoaded).toBe(false);
    });
  });

  describe('buildEmptyDossier', () => {
    it('deve retornar dossiê vazio com estrutura correta', () => {
      const dossier = builder.buildEmptyDossier('cli-1');
      expect(dossier.sessionId).toBe('cli-1');
      expect(dossier.tipoFluxo).toBe('INDEFINIDO');
      expect(dossier.prioridade).toBe('BAIXA');
      expect(dossier.completeness).toBe(0);
      expect(dossier.dadosColetados).toEqual({});
      expect(dossier.pontosPendentes).toEqual([]);
      expect(dossier.timestamp).toBeDefined();
    });
  });

  describe('determineFlowType', () => {
    it('deve detectar fluxo de venda', () => {
      expect(builder.determineFlowType('CATALOGO_IPHONE')).toBe('VENDA');
    });

    it('deve detectar fluxo técnico', () => {
      expect(builder.determineFlowType('TECNICO_COLETA_DETALHES')).toBe('TECNICO');
    });

    it('deve detectar fluxo pós-venda', () => {
      expect(builder.determineFlowType('POS_VENDA_DESCRICAO')).toBe('POS_VENDA');
    });

    it('deve retornar OUTRO para estado desconhecido', () => {
      expect(builder.determineFlowType('MENU_PRINCIPAL')).toBe('OUTRO');
    });
  });

  describe('calculatePriority', () => {
    it('deve retornar ALTA para urgência', () => {
      expect(builder.calculatePriority({ collectedData: { urgencia: true } })).toBe('ALTA');
    });

    it('deve retornar ALTA para solicitação de humano', () => {
      expect(builder.calculatePriority({ intent: 'HUMANO_SOLICITADO' })).toBe('ALTA');
    });

    it('deve retornar MEDIA para defeito', () => {
      expect(builder.calculatePriority({ collectedData: { defeito: 'tela quebrada' } })).toBe('MEDIA');
    });

    it('deve retornar BAIXA por padrão', () => {
      expect(builder.calculatePriority({ collectedData: {} })).toBe('BAIXA');
    });
  });

  describe('getDossier', () => {
    it('deve retornar dossiê vazio quando estado não existe', async () => {
      db.ClienteEstado.findOne.mockResolvedValue(null);
      db.Workspace.findByPk.mockResolvedValue(null);

      const dossier = await builder.getDossier('cli-1');
      expect(dossier.sessionId).toBe('cli-1');
      expect(dossier.tipoFluxo).toBe('INDEFINIDO');
    });
  });

  describe('reloadRules', () => {
    it('deve limpar cache local ao recarregar regras', () => {
      DossierBuilder.rulesCache.set(workspaceId, { venda: {} });
      builder.rulesLoaded = true;

      builder.reloadRules();

      expect(DossierBuilder.rulesCache.has(workspaceId)).toBe(false);
      expect(builder.rulesLoaded).toBe(false);
      expect(builder.extractionRules).toBeNull();
    });
  });

  describe('calculateCompleteness', () => {
    it('deve calcular completude para fluxo de venda', () => {
      const context = {
        tipoFluxo: 'VENDA',
        collectedData: { modelo: 'iPhone 15', capacidade: '256GB' },
      };
      const score = builder.calculateCompleteness(context);
      expect(score).toBe(0.5); // 2 de 4
    });

    it('deve retornar 0 quando sem dados coletados', () => {
      const context = { tipoFluxo: 'VENDA', collectedData: {} };
      const score = builder.calculateCompleteness(context);
      expect(score).toBe(0);
    });
  });

  describe('_loadDefaultRules', () => {
    it('deve retornar regras padrão vazias', () => {
      const rules = builder._loadDefaultRules();
      expect(rules).toHaveProperty('venda');
      expect(rules).toHaveProperty('tecnico');
      expect(rules).toHaveProperty('posVenda');
    });
  });

  describe('updateDossier', () => {
    it('deve lançar AppError quando estado não encontrado', async () => {
      db.ClienteEstado.findOne.mockResolvedValue(null);
      db.Workspace.findByPk.mockResolvedValue(null);

      await expect(builder.updateDossier('cli-1', { intent: 'VENDA' }))
        .rejects.toThrow('Estado do cliente não encontrado');
    });
  });
});
