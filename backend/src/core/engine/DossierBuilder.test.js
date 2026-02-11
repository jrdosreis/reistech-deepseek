const DossierBuilder = require('./DossierBuilder');
const db = require('../../db/models');
const fs = require('fs');
const path = require('path');

// Mocks
jest.mock('../../db/models', () => ({
  ClienteEstado: { findOne: jest.fn() },
  Cliente: {},
  Workspace: { findByPk: jest.fn() },
  ConversaInteracao: { findAll: jest.fn() }
}));

jest.mock('../../config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn()
  }
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    subscribe: jest.fn(),
    publish: jest.fn(),
    on: jest.fn()
  }));
});

describe('DossierBuilder', () => {
  const mockWorkspaceId = 1;
  const mockClienteId = '5511999999999';
  let builder;

  beforeEach(() => {
    jest.clearAllMocks();
    // Limpar cache estático antes de cada teste
    DossierBuilder.rulesCache.clear();
    builder = new DossierBuilder(mockWorkspaceId);
  });

  describe('getDossier', () => {
    it('deve retornar um dossiê vazio se o estado do cliente não for encontrado', async () => {
      db.ClienteEstado.findOne.mockResolvedValue(null);
      
      const dossier = await builder.getDossier(mockClienteId);
      
      expect(dossier).toBeDefined();
      expect(dossier.sessionId).toBe(mockClienteId);
      expect(dossier.tipoFluxo).toBe('INDEFINIDO');
    });

    it('deve construir um dossiê completo quando estado existe', async () => {
      const mockEstado = {
        state: 'COLETA_DADOS_MINIMOS_VENDA',
        context: {
          intent: 'COMPRAR_IPHONE',
          collectedData: { urgencia: 'hoje' }
        },
        cliente: {
          telefone: mockClienteId,
          nome: 'João',
          tags: { cidade: 'São Paulo' }
        }
      };

      db.ClienteEstado.findOne.mockResolvedValue(mockEstado);
      db.ConversaInteracao.findAll.mockResolvedValue([]);
      
      // Mock do carregamento de regras (fallback para default)
      db.Workspace.findByPk.mockResolvedValue(null);

      const dossier = await builder.getDossier(mockClienteId);

      expect(dossier.cliente.nome).toBe('João');
      expect(dossier.prioridade).toBe('ALTA'); // urgencia = hoje
      expect(dossier.tipoFluxo).toBe('OUTRO'); // Default flow logic
    });
  });

  describe('Regras de Extração e Cache', () => {
    it('deve carregar regras do arquivo JSON se existir', async () => {
      const mockPackRules = {
        regras_extracao: {
          venda: {
            modelo: "iphone\\s+(\\d+)"
          }
        }
      };

      db.Workspace.findByPk.mockResolvedValue({ vertical_key: 'iphone_store' });
      fs.existsSync.mockReturnValue(true);
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockPackRules));

      await builder._ensureRulesLoaded();

      expect(fs.promises.readFile).toHaveBeenCalled();
      expect(builder.extractionRules.venda.modelo).toBeInstanceOf(RegExp);
      expect(DossierBuilder.rulesCache.has(mockWorkspaceId)).toBe(true);
    });

    it('deve usar cache na segunda chamada', async () => {
      // Primeira chamada popula o cache
      db.Workspace.findByPk.mockResolvedValue(null); // Usa default
      await builder._ensureRulesLoaded();
      
      // Segunda chamada
      const builder2 = new DossierBuilder(mockWorkspaceId);
      await builder2._ensureRulesLoaded();

      // findByPk deve ser chamado apenas uma vez devido ao cache
      expect(db.Workspace.findByPk).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reload e Redis', () => {
    it('reloadRules deve limpar cache local e publicar no Redis', () => {
      // Setup Redis mock
      process.env.REDIS_URL = 'redis://localhost:6379';
      DossierBuilder.initRedis();
      
      // Popular cache
      DossierBuilder.rulesCache.set(mockWorkspaceId, {});
      
      builder.reloadRules();

      expect(DossierBuilder.rulesCache.has(mockWorkspaceId)).toBe(false);
      expect(DossierBuilder.redisPub.publish).toHaveBeenCalledWith(
        'reistech:reload-rules', 
        JSON.stringify({ workspaceId: mockWorkspaceId })
      );
    });
  });

  describe('Extração de Dados', () => {
    it('deve extrair dados corretamente usando regex', () => {
      // Configurar regras manuais para teste
      builder.extractionRules = {
        venda: {
          modelo: /(?:iphone)\s+(\d+)/i,
          cor: /(?:cor)\s+(\w+)/i
        }
      };

      const context = { collectedData: {} };
      const data = {
        intent: 'INFO_PRODUTO',
        message: 'Eu quero um iphone 15 cor preto',
        newState: { state: 'COLETA_DADOS_MINIMOS_VENDA' }
      };

      // Sobrescrever mapeamento de estado temporariamente para teste
      // Como extractDataFromInteraction usa this.extractionRules.venda baseado no estado hardcoded
      // precisamos garantir que o estado bata com a chave
      
      builder.extractDataFromInteraction(context, data);

      expect(context.collectedData.modelo).toBe('15');
      expect(context.collectedData.cor).toBe('preto');
    });
  });

  describe('Lógica de Negócio', () => {
    it('calculatePriority deve retornar ALTA para urgência', () => {
      const context = { collectedData: { urgencia: true } };
      expect(builder.calculatePriority(context)).toBe('ALTA');
    });

    it('determineFlowType deve identificar fluxo TECNICO', () => {
      expect(builder.determineFlowType('TECNICO_TRIAGEM')).toBe('TECNICO');
    });

    it('calculateCompleteness deve calcular porcentagem correta para VENDA', () => {
      const context = {
        tipoFluxo: 'VENDA',
        collectedData: {
          modelo: '15',
          capacidade: '128GB'
        }
      };
      // Total 4 campos (modelo, capacidade, cidade, pagamento). Tem 2. = 0.5
      expect(builder.calculateCompleteness(context)).toBe(0.5);
    });
  });
});