const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const logger = require('../../config/logger');
const db = require('../../db/models');

class DossierBuilder {
  // Cache estático para compartilhar regras entre instâncias da classe
  static rulesCache = new Map();
  static redisPub = null;
  static redisSub = null;

  constructor(workspaceId) {
    this.workspaceId = workspaceId;
    this.extractionRules = null;
    this.rulesLoaded = false;
  }

  // Inicializa conexão Redis para sincronização entre clusters (chamar no startup)
  static initRedis() {
    if (process.env.REDIS_URL && !this.redisPub) {
      try {
        this.redisPub = new Redis(process.env.REDIS_URL);
        this.redisSub = new Redis(process.env.REDIS_URL);

        this.redisSub.subscribe('reistech:reload-rules', (err) => {
          if (err) logger.error('Falha ao assinar canal Redis:', err);
        });

        this.redisSub.on('message', (channel, message) => {
          if (channel === 'reistech:reload-rules') {
            const { workspaceId } = JSON.parse(message);
            if (DossierBuilder.rulesCache.has(workspaceId)) {
              DossierBuilder.rulesCache.delete(workspaceId);
              logger.info(`[Redis] Cache de regras invalidado para workspace ${workspaceId}`);
            }
          }
        });
        
        logger.info('Redis Pub/Sub inicializado para DossierBuilder');
      } catch (error) {
        logger.error('Erro ao conectar Redis:', error);
      }
    }
  }

  reloadRules() {
    // Limpa cache local desta instância
    DossierBuilder.rulesCache.delete(this.workspaceId);
    this.rulesLoaded = false;
    this.extractionRules = null;
    
    // Notifica outras instâncias via Redis
    if (DossierBuilder.redisPub) {
      DossierBuilder.redisPub.publish('reistech:reload-rules', JSON.stringify({ workspaceId: this.workspaceId }));
    }
    
    logger.info(`Solicitação de recarga de regras enviada para workspace ${this.workspaceId}`);
  }

  async getDossier(clienteId) {
    try {
      await this._ensureRulesLoaded();

      const estado = await db.ClienteEstado.findOne({
        where: {
          cliente_id: clienteId,
          workspace_id: this.workspaceId,
        },
        include: [{
          model: db.Cliente,
          as: 'cliente',
        }]
      });

      if (!estado || !estado.context) {
        return this.buildEmptyDossier(clienteId);
      }

      // Construir dossiê baseado no contexto
      const dossier = {
        sessionId: clienteId,
        tipoFluxo: this.determineFlowType(estado.state),
        prioridade: this.calculatePriority(estado.context),
        cliente: {
          telefone: estado.cliente?.telefone || '',
          nome: estado.cliente?.nome || null,
          cidade: estado.cliente?.tags?.cidade || null,
        },
        intencaoDetectada: estado.context.intent || 'Não detectada',
        resumoCronologico: await this.getInteractionHistory(clienteId),
        dadosColetados: estado.context.collectedData || {},
        pontosPendentes: this.getPendingPoints(estado.context),
        sugestaoAbordagem: this.generateApproachSuggestion(estado.context),
        proximosPassos: this.getNextSteps(estado.state, estado.context),
        completeness: this.calculateCompleteness(estado.context),
        timestamp: new Date().toISOString(),
      };

      return dossier;
    } catch (error) {
      logger.error(`Erro ao construir dossiê: ${error.message}`);
      return this.buildEmptyDossier(clienteId);
    }
  }

  async updateDossier(clienteId, data) {
    try {
      await this._ensureRulesLoaded();

      const estado = await db.ClienteEstado.findOne({
        where: {
          cliente_id: clienteId,
          workspace_id: this.workspaceId,
        }
      });

      if (!estado) {
        throw new Error('Estado do cliente não encontrado');
      }

      // Atualizar contexto com novos dados
      const context = estado.context || {};
      
      if (data.intent) {
        context.intent = data.intent;
      }

      if (data.message) {
        if (!context.messageHistory) {
          context.messageHistory = [];
        }
        context.messageHistory.push({
          message: data.message,
          timestamp: data.timestamp || new Date().toISOString(),
          direction: 'inbound'
        });
      }

      // Extrair dados baseado na intenção e estado
      if (data.intent && data.newState) {
        this.extractDataFromInteraction(context, data);
      }

      // Atualizar contexto
      estado.context = context;
      await estado.save();

      logger.debug(`Dossiê atualizado para cliente ${clienteId}`, {
        intent: data.intent,
        state: data.newState?.state,
      });

    } catch (error) {
      logger.error(`Erro ao atualizar dossiê: ${error.message}`);
      throw error;
    }
  }

  extractDataFromInteraction(context, data) {
    const { intent, message, newState } = data;
    
    if (!context.collectedData) {
      context.collectedData = {};
    }

    // Lógica genérica de extração baseada em regras
    // Mapeia estados para conjuntos de regras de regex
    const stateRules = {
      'COLETA_DADOS_MINIMOS_VENDA': this.extractionRules.venda,
      'TECNICO_COLETA_DETALHES': this.extractionRules.tecnico,
      'POS_VENDA_DESCRICAO_PROBLEMA': this.extractionRules.posVenda
    };

    const rules = stateRules[newState.state];
    if (rules) {
      this._applyExtractionRules(context, message, rules);
    }
  }

  _applyExtractionRules(context, message, patterns) {
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = message.match(pattern);
      if (match) {
        // Captura o grupo 1 se existir, ou true se for apenas match booleano
        context.collectedData[key] = match[1] || true;
      }
    }
  }

  async _ensureRulesLoaded() {
    // Verifica se já existe no cache estático
    if (DossierBuilder.rulesCache.has(this.workspaceId)) {
      this.extractionRules = DossierBuilder.rulesCache.get(this.workspaceId);
      this.rulesLoaded = true;
    } else {
      // Se não, carrega e salva no cache
      const rules = await this._loadRulesFromPack();
      DossierBuilder.rulesCache.set(this.workspaceId, rules);
      this.extractionRules = rules;
      this.rulesLoaded = true;
    }
  }

  async _loadRulesFromPack() {
    try {
      // 1. Buscar vertical_key do workspace
      const workspace = await db.Workspace.findByPk(this.workspaceId);
      
      if (!workspace || !workspace.vertical_key) {
        return this._loadDefaultRules();
      }

      // 2. Ler arquivo do pack
      const packPath = path.join(__dirname, '../../workspaces/packs', `${workspace.vertical_key}.json`);
      
      if (!fs.existsSync(packPath)) {
        logger.warn(`Pack não encontrado: ${packPath}. Usando regras padrão.`);
        return this._loadDefaultRules();
      }

      // Alterado para leitura assíncrona para não bloquear o Event Loop
      const packContent = await fs.promises.readFile(packPath, 'utf8');
      const pack = JSON.parse(packContent);

      // 3. Extrair regras se existirem no JSON
      if (pack.regras_extracao) {
        return this._parseRules(pack.regras_extracao);
      }
      
      return this._loadDefaultRules();
    } catch (error) {
      logger.error(`Erro ao carregar regras do pack: ${error.message}`);
      return this._loadDefaultRules();
    }
  }

  _parseRules(jsonRules) {
    const parsed = {};
    for (const [category, rules] of Object.entries(jsonRules)) {
      parsed[category] = {};
      for (const [key, patternStr] of Object.entries(rules)) {
        // Converte string do JSON para RegExp
        parsed[category][key] = new RegExp(patternStr, 'i');
      }
    }
    return parsed;
  }

  _loadDefaultRules() {
    // Retorna objeto vazio ou regras genéricas mínimas.
    // Regras de negócio específicas (iPhone, etc) foram removidas daqui
    // para garantir que o Core seja agnóstico.
    return {
      venda: {},
      tecnico: {},
      posVenda: {}
    };
  }

  determineFlowType(state) {
    if (state.includes('CATALOGO')) return 'VENDA';
    if (state.includes('ACESSORIOS')) return 'ACESSORIOS';
    if (state.includes('TECNICO')) return 'TECNICO';
    if (state.includes('POS_VENDA')) return 'POS_VENDA';
    if (state.includes('SERVICOS')) return 'SERVICOS';
    return 'OUTRO';
  }

  calculatePriority(context) {
    const collectedData = context.collectedData || {};
    
    if (collectedData.urgencia) return 'ALTA';
    if (context.intent === 'HUMANO_SOLICITADO') return 'ALTA';
    if (collectedData.defeito) return 'MEDIA';
    if (collectedData.cidade && collectedData.pagamento) return 'MEDIA';
    
    return 'BAIXA';
  }

  async getInteractionHistory(clienteId, limit = 10) {
    try {
      const interacoes = await db.ConversaInteracao.findAll({
        where: {
          cliente_id: clienteId,
          workspace_id: this.workspaceId,
        },
        order: [['created_at', 'DESC']],
        limit,
      });

      return interacoes.map(interacao => ({
        direction: interacao.direction,
        conteudo: interacao.conteudo,
        estadoFsm: interacao.estado_fsm,
        timestamp: interacao.created_at,
      }));
    } catch (error) {
      logger.error(`Erro ao buscar histórico: ${error.message}`);
      return [];
    }
  }

  getPendingPoints(context) {
    const collectedData = context.collectedData || {};
    const pending = [];

    if (!collectedData.cidade) pending.push('Cidade do cliente');
    if (context.tipoFluxo === 'VENDA' && !collectedData.pagamento) pending.push('Forma de pagamento');
    if (context.tipoFluxo === 'TECNICO' && !collectedData.defeito) pending.push('Descrição detalhada do defeito');

    return pending;
  }

  generateApproachSuggestion(context) {
    const tipoFluxo = this.determineFlowType(context.state || '');
    const collectedData = context.collectedData || {};

    switch (tipoFluxo) {
      case 'VENDA':
        if (collectedData.urgencia) {
          return 'Cliente demonstra urgência na compra. Confirmar disponibilidade imediata e oferecer opções de retirada/entrega rápida.';
        }
        return 'Cliente interessado em compra. Confirmar modelo desejado, verificar estoque e apresentar condições de pagamento.';
      
      case 'TECNICO':
        if (collectedData.queda || collectedData.liquido) {
          return 'Aparelho com histórico de queda/umidade. Recomendar avaliação técnica completa antes de orçamento.';
        }
        return 'Cliente busca assistência técnica. Solicitar envio do aparelho para diagnóstico detalhado.';
      
      case 'POS_VENDA':
        if (collectedData.garantia) {
          return 'Caso em garantia. Solicitar dados do pedido e agendar coleta para análise.';
        }
        return 'Cliente com problema pós-venda. Coletar detalhes do pedido e sintomas para análise.';
      
      default:
        return 'Manter conversa amigável e coletar informações básicas para melhor direcionamento.';
    }
  }

  getNextSteps(state, context) {
    const steps = [];
    
    if (state === 'GERAR_DOSSIE_VENDA') {
      steps.push('Confirmar disponibilidade em estoque');
      steps.push('Enviar instruções de pagamento');
      steps.push('Agendar retirada/entrega');
    } else if (state === 'GERAR_DOSSIE_TECNICO') {
      steps.push('Solicitar envio do aparelho');
      steps.push('Realizar diagnóstico');
      steps.push('Emitir orçamento');
    } else if (state === 'AVALIAR_ESCALONAMENTO') {
      steps.push('Avaliar necessidade de intervenção humana');
      steps.push('Encaminhar para fila se necessário');
    }
    
    return steps;
  }

  calculateCompleteness(context) {
    const collectedData = context.collectedData || {};
    let score = 0;
    let total = 0;

    // Critérios baseados no tipo de fluxo
    if (context.tipoFluxo === 'VENDA') {
      if (collectedData.modelo) score++;
      if (collectedData.capacidade) score++;
      if (collectedData.cidade) score++;
      if (collectedData.pagamento) score++;
      total = 4;
    } else if (context.tipoFluxo === 'TECNICO') {
      if (collectedData.modelo) score++;
      if (collectedData.defeito) score++;
      if (collectedData.queda !== undefined) score++;
      if (collectedData.liquido !== undefined) score++;
      total = 4;
    } else {
      // Fluxo genérico
      score = Object.keys(collectedData).length;
      total = Math.max(score, 3);
    }

    return total > 0 ? score / total : 0;
  }

  buildEmptyDossier(clienteId) {
    return {
      sessionId: clienteId,
      tipoFluxo: 'INDEFINIDO',
      prioridade: 'BAIXA',
      cliente: {
        telefone: '',
        nome: null,
        cidade: null,
      },
      intencaoDetectada: 'Não detectada',
      resumoCronologico: [],
      dadosColetados: {},
      pontosPendentes: [],
      sugestaoAbordagem: 'Coletar informações básicas do cliente.',
      proximosPassos: ['Identificar necessidade do cliente'],
      completeness: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = DossierBuilder;