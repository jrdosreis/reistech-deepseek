const logger = require('../../config/logger');
const { AppError } = require('../errors/AppError');
const db = require('../../db/models');

class StateMachine {
  constructor(workspaceId) {
    this.workspaceId = workspaceId;
    this.states = {
      // Estados iniciais
      INICIO_SESSAO: {
        onEnter: this.onEnterInicioSessao.bind(this),
        transitions: {
          MENU_PRINCIPAL: 'MENU_PRINCIPAL',
        }
      },
      
      MENU_PRINCIPAL: {
        transitions: {
          MENU_PRINCIPAL: 'MENU_PRINCIPAL',
          CATALOGO_MENU: 'CATALOGO_MENU',
          ACESSORIOS_MENU: 'ACESSORIOS_MENU',
          TECNICO_MENU: 'TECNICO_MENU',
          SERVICOS_MENU: 'SERVICOS_MENU',
          POS_VENDA_MENU: 'POS_VENDA_MENU',
          HUMANO_SOLICITADO: 'AVALIAR_ESCALONAMENTO',
        }
      },
      
      // Fluxo Catálogo
      CATALOGO_MENU: {
        transitions: {
          CATALOGO_LISTA_MODELOS: 'CATALOGO_LISTA_MODELOS',
          VOLTAR_MENU_PRINCIPAL: 'MENU_PRINCIPAL',
        }
      },
      
      CATALOGO_LISTA_MODELOS: {
        transitions: {
          CATALOGO_DETALHE_MODELO: 'CATALOGO_DETALHE_MODELO',
          VOLTAR_CATALOGO_MENU: 'CATALOGO_MENU',
        }
      },
      
      CATALOGO_DETALHE_MODELO: {
        transitions: {
          SIMULACAO_PARCELAMENTO: 'SIMULACAO_PARCELAMENTO',
          VOLTAR_CATALOGO_LISTA: 'CATALOGO_LISTA_MODELOS',
        }
      },
      
      SIMULACAO_PARCELAMENTO: {
        transitions: {
          COLETA_DADOS_MINIMOS_VENDA: 'COLETA_DADOS_MINIMOS_VENDA',
          VOLTAR_CATALOGO_DETALHE: 'CATALOGO_DETALHE_MODELO',
        }
      },
      
      COLETA_DADOS_MINIMOS_VENDA: {
        transitions: {
          GERAR_DOSSIE_VENDA: 'GERAR_DOSSIE_VENDA',
          CANCELAR_FLUXO: 'MENU_PRINCIPAL',
        }
      },
      
      GERAR_DOSSIE_VENDA: {
        transitions: {
          AVALIAR_ESCALONAMENTO: 'AVALIAR_ESCALONAMENTO',
        }
      },
      
      // Estados de escalonamento
      AVALIAR_ESCALONAMENTO: {
        transitions: {
          HUMANO_FILA: 'HUMANO_FILA',
          FOLLOW_UP_AUTOMATICO: 'FOLLOW_UP_AUTOMATICO',
          ENCERRAMENTO_CONTROLADO: 'ENCERRAMENTO_CONTROLADO',
        }
      },
      
      HUMANO_FILA: {
        onEnter: this.onEnterHumanoFila.bind(this),
        transitions: {
          HUMANO_ATENDIMENTO: 'HUMANO_ATENDIMENTO',
          ENCERRAMENTO_CONTROLADO: 'ENCERRAMENTO_CONTROLADO',
        }
      },
      
      HUMANO_ATENDIMENTO: {
        transitions: {
          ENCERRAMENTO_CONTROLADO: 'ENCERRAMENTO_CONTROLADO',
        }
      },
      
      ENCERRAMENTO_CONTROLADO: {
        onEnter: this.onEnterEncerramento.bind(this),
        transitions: {
          // Estados finais
          FECHADO_VENDA: 'FECHADO_VENDA',
          ORCAMENTO_RECUSADO: 'ORCAMENTO_RECUSADO',
          EM_EXECUCAO_TECNICA: 'EM_EXECUCAO_TECNICA',
          GARANTIA_REGISTRADA: 'GARANTIA_REGISTRADA',
          ATENDIMENTO_CANCELADO: 'ATENDIMENTO_CANCELADO',
        }
      },
    };
  }

  async getClientState(telefone) {
    try {
      // Buscar cliente
      const cliente = await db.Cliente.findOne({
        where: { 
          telefone,
          workspace_id: this.workspaceId 
        }
      });

      if (!cliente) {
        return null;
      }

      // Buscar estado atual
      const estado = await db.ClienteEstado.findOne({
        where: { 
          cliente_id: cliente.id,
          workspace_id: this.workspaceId 
        }
      });

      return {
        cliente_id: cliente.id,
        state: estado ? estado.state : 'INICIO_SESSAO',
        context: estado ? estado.context : {},
        cliente,
      };
    } catch (error) {
      logger.error(`Erro ao buscar estado do cliente: ${error.message}`);
      throw error;
    }
  }

  async initializeClient(telefone) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Criar cliente
      const cliente = await db.Cliente.create({
        workspace_id: this.workspaceId,
        telefone,
        origem: 'whatsapp',
        tags: ['novo_cliente'],
      }, { transaction });

      // Criar estado inicial
      const estado = await db.ClienteEstado.create({
        workspace_id: this.workspaceId,
        cliente_id: cliente.id,
        state: 'INICIO_SESSAO',
        context: {
          createdAt: new Date().toISOString(),
          firstMessage: true,
        },
      }, { transaction });

      await transaction.commit();

      // Executar ação de entrada do estado
      if (this.states.INICIO_SESSAO.onEnter) {
        await this.states.INICIO_SESSAO.onEnter(cliente.id, estado.context);
      }

      return {
        cliente_id: cliente.id,
        state: estado.state,
        context: estado.context,
        cliente,
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Erro ao inicializar cliente: ${error.message}`);
      throw error;
    }
  }

  async transition(clienteId, action, data = {}) {
    const transaction = await db.sequelize.transaction();
    
    try {
      // Buscar estado atual
      const estadoAtual = await db.ClienteEstado.findOne({
        where: { 
          cliente_id: clienteId,
          workspace_id: this.workspaceId 
        },
        transaction
      });

      if (!estadoAtual) {
        throw new AppError('Estado do cliente não encontrado', 'ESTADO_NAO_ENCONTRADO');
      }

      const currentState = this.states[estadoAtual.state];
      if (!currentState) {
        throw new AppError(`Estado inválido: ${estadoAtual.state}`, 'ESTADO_INVALIDO');
      }

      // Verificar transição permitida
      const nextStateName = currentState.transitions[action];
      if (!nextStateName) {
        throw new AppError(
          `Transição não permitida: ${estadoAtual.state} -> ${action}`,
          'TRANSICAO_NAO_PERMITIDA'
        );
      }

      // Atualizar estado
      estadoAtual.state = nextStateName;
      estadoAtual.context = {
        ...estadoAtual.context,
        ...data,
        lastTransition: {
          from: estadoAtual.state,
          to: nextStateName,
          action,
          timestamp: new Date().toISOString(),
        },
      };
      
      await estadoAtual.save({ transaction });

      // Executar ação de entrada do novo estado
      const nextState = this.states[nextStateName];
      if (nextState.onEnter) {
        await nextState.onEnter(clienteId, estadoAtual.context, data);
      }

      await transaction.commit();

      logger.info(`🔄 Transição de estado: ${estadoAtual.state} -> ${nextStateName}`, {
        clienteId,
        action,
        workspaceId: this.workspaceId,
      });

      return {
        cliente_id: clienteId,
        state: nextStateName,
        context: estadoAtual.context,
        previousState: estadoAtual.state,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Erro na transição de estado: ${error.message}`, {
        clienteId,
        action,
        error: error.stack,
      });
      throw error;
    }
  }

  async updateState(clienteId, state, contextUpdates = {}) {
    try {
      const estado = await db.ClienteEstado.findOne({
        where: { 
          cliente_id: clienteId,
          workspace_id: this.workspaceId 
        }
      });

      if (!estado) {
        throw new AppError('Estado do cliente não encontrado', 'ESTADO_NAO_ENCONTRADO');
      }

      estado.state = state;
      estado.context = {
        ...estado.context,
        ...contextUpdates,
        updatedAt: new Date().toISOString(),
      };

      await estado.save();
      return estado;
    } catch (error) {
      logger.error(`Erro ao atualizar estado: ${error.message}`);
      throw error;
    }
  }

  async recordInteraction(data) {
    try {
      const {
        clienteId,
        cliente_id,
        direction,
        canal,
        conteudo,
        estadoFsm,
        estado_fsm,
        operadorId,
        operador_id,
      } = data || {};

      await db.ConversaInteracao.create({
        workspace_id: this.workspaceId,
        cliente_id: cliente_id || clienteId,
        direction,
        canal,
        conteudo,
        estado_fsm: estado_fsm || estadoFsm,
        operador_id: operador_id || operadorId,
      });
    } catch (error) {
      logger.error(`Erro ao registrar interação: ${error.message}`);
      throw error;
    }
  }

  async onEnterInicioSessao(clienteId, context) {
    // Após criar a sessão, transição automática para MENU_PRINCIPAL
    setTimeout(async () => {
      try {
        await this.transition(clienteId, 'MENU_PRINCIPAL');
      } catch (error) {
        logger.error(`Erro na transição automática: ${error.message}`);
      }
    }, 100);
  }

  async onEnterHumanoFila(clienteId, context) {
    // Aqui poderíamos notificar operadores, etc.
    logger.info(`Cliente ${clienteId} entrou na fila humana`);
  }

  async onEnterEncerramento(clienteId, context) {
    // Limpar recursos, gerar relatório final, etc.
    logger.info(`Atendimento encerrado para cliente ${clienteId}`);
  }
}

module.exports = StateMachine;