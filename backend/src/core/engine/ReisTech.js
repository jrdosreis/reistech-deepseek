const logger = require('../../config/logger');
const StateMachine = require('./StateMachine');
const Router = require('./Router');
const DossierBuilder = require('./DossierBuilder');
const { AppError } = require('../errors/AppError');

class ReisTechEngine {
  constructor(workspaceId) {
    this.workspaceId = workspaceId;
    this.stateMachine = new StateMachine(workspaceId);
    this.router = new Router(workspaceId);
    this.dossierBuilder = new DossierBuilder(workspaceId);
    this.activeSessions = new Map();
  }

  async processMessage(message) {
    const { from, text, type, timestamp } = message;
    const sessionId = `${this.workspaceId}:${from}`;

    try {
      logger.info(`📨 Processando mensagem de ${from}`, { 
        workspaceId: this.workspaceId, 
        text, 
        sessionId 
      });

      // 1. Obter ou criar estado do cliente
      let clientState = await this.stateMachine.getClientState(from);
      
      if (!clientState) {
        // Primeira interação
        clientState = await this.stateMachine.initializeClient(from);
        logger.info(`👤 Novo cliente criado: ${from}`, { clientState });
      }

      // 2. Registrar interação
      await this.stateMachine.recordInteraction({
        clienteId: clientState.cliente_id,
        direction: 'inbound',
        canal: 'whatsapp',
        conteudo: { text, type, timestamp },
        estadoFsm: clientState.state,
      });

      // 3. Determinar intenção
      const intent = await this.router.determineIntent(text, clientState);
      logger.debug(`🎯 Intenção detectada: ${intent}`, { intent });

      // 4. Executar transição de estado
      const newState = await this.stateMachine.transition(
        clientState.cliente_id,
        intent,
        { message: text }
      );

      // 5. Atualizar dossiê
      await this.dossierBuilder.updateDossier(
        clientState.cliente_id,
        {
          intent,
          message: text,
          newState,
          timestamp,
        }
      );

      // 6. Determinar resposta
      const response = await this.router.generateResponse(
        newState,
        intent,
        clientState.cliente_id
      );

      // 7. Verificar se precisa escalonar para humano
      const needsHuman = await this.shouldEscalateToHuman(
        newState,
        intent,
        clientState.cliente_id
      );

      if (needsHuman) {
        await this.escalateToHuman(clientState.cliente_id, from, intent);
        return {
          type: 'escalation',
          message: await this.getCmsText('escalamento.humano.confirmacao'),
          dossier: await this.dossierBuilder.getDossier(clientState.cliente_id),
          priority: needsHuman.priority,
        };
      }

      // 8. Registrar resposta outbound
      if (response.type === 'message') {
        await this.stateMachine.recordInteraction({
          clienteId: clientState.cliente_id,
          direction: 'outbound',
          canal: 'whatsapp',
          conteudo: { text: response.message, type: 'text' },
          estadoFsm: newState.state,
        });
      }

      return response;

    } catch (error) {
      logger.error(`❌ Erro ao processar mensagem: ${error.message}`, {
        sessionId,
        error: error.stack,
      });

      // Fallback seguro
      return {
        type: 'message',
        message: await this.getCmsText('sistema.erro.fallback') || 
                'Desculpe, estou com problemas técnicos. Por favor, tente novamente em alguns instantes.',
        error: true,
      };
    }
  }

  async shouldEscalateToHuman(state, intent, clienteId) {
    // Regras determinísticas de escalonamento
    const dossier = await this.dossierBuilder.getDossier(clienteId);
    
    // Critério 1: Cliente explicitamente pediu humano
    if (intent === 'HUMANO_SOLICITADO') {
      return { priority: 'high', reason: 'solicitação_explicita' };
    }

    // Critério 2: Dossiê completo e intenção real detectada
    if (dossier.completeness >= 0.8 && dossier.intencaoReal) {
      return { priority: dossier.priority || 'medium', reason: 'intencao_real' };
    }

    // Critério 3: Problema técnico complexo
    if (state.state.includes('TECNICO') && dossier.complexidade >= 0.7) {
      return { priority: 'high', reason: 'problema_tecnico_complexo' };
    }

    // Critério 4: Timeout no fluxo
    if (dossier.timeInState > 300000) { // 5 minutos no mesmo estado
      return { priority: 'low', reason: 'timeout_fluxo' };
    }

    return false;
  }

  async escalateToHuman(clienteId, telefone, motivo) {
    const db = require('../../db/models');
    
    // Verificar se já está na fila
    const existing = await db.FilaHumana.findOne({
      where: { 
        cliente_id: clienteId, 
        workspace_id: this.workspaceId,
        status: ['waiting', 'locked']
      }
    });

    if (existing) {
      throw new AppError('Cliente já está na fila humana', 'CLIENTE_JA_NA_FILA');
    }

    // Obter dossiê
    const dossier = await this.dossierBuilder.getDossier(clienteId);

    // Inserir na fila
    await db.FilaHumana.create({
      workspace_id: this.workspaceId,
      cliente_id: clienteId,
      status: 'waiting',
      motivo: motivo,
      metadata: {
        dossier,
        telefone,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info(`👥 Cliente escalado para fila humana: ${telefone}`, {
      clienteId,
      motivo,
      priority: dossier.priority,
    });

    // Atualizar estado FSM
    await this.stateMachine.updateState(clienteId, 'HUMANO_FILA', {
      escalatedAt: new Date().toISOString(),
      motivo,
    });
  }

  async getCmsText(key) {
    const db = require('../../db/models');
    const text = await db.TextoCms.findOne({
      where: { 
        workspace_id: this.workspaceId, 
        chave: key,
        ativo: true
      }
    });
    
    return text ? text.conteudo : null;
  }

  async getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  async cleanupOldSessions(maxAge = 3600000) { // 1 hora
    const now = Date.now();
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        this.activeSessions.delete(sessionId);
        logger.debug(`🧹 Sessão limpa: ${sessionId}`);
      }
    }
  }
}

module.exports = ReisTechEngine;