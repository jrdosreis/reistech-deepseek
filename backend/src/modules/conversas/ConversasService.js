const db = require('../../db/models');
const { getWhatsAppService } = require('../whatsapp/WhatsAppService');
const DossierBuilder = require('../../core/engine/DossierBuilder');
const { AppError } = require('../../core/errors/AppError');

class ConversasService {
  async listConversas(workspaceId, telefone, offset = 0, limit = 20) {
    const clienteWhere = { workspace_id: workspaceId };
    if (telefone) {
      clienteWhere.telefone = { [db.Sequelize.Op.iLike]: `%${telefone}%` };
    }

    // Buscar clientes que possuem interações, com última interação, estado e fila
    const { count, rows: clientes } = await db.Cliente.findAndCountAll({
      where: clienteWhere,
      include: [
        {
          model: db.ConversaInteracao,
          as: 'interacoes',
          attributes: ['id', 'created_at', 'estado_fsm'],
          order: [['created_at', 'DESC']],
          limit: 1,
          required: true, // INNER JOIN — só clientes com interações
        },
        {
          model: db.ClienteEstado,
          as: 'estado',
          attributes: ['state'],
          required: false,
        },
        {
          model: db.FilaHumana,
          as: 'fila',
          attributes: ['id', 'status'],
          where: { status: ['waiting', 'locked'] },
          required: false,
        },
      ],
      attributes: ['id', 'nome', 'telefone', 'tags', 'created_at'],
      order: [[{ model: db.ConversaInteracao, as: 'interacoes' }, 'created_at', 'DESC']],
      offset,
      limit,
      distinct: true,
      subQuery: false,
    });

    const data = clientes.map((cliente) => {
      const ultimaInteracao = cliente.interacoes?.[0];
      return {
        id: ultimaInteracao?.id,
        cliente_id: cliente.id,
        cliente: {
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          tags: cliente.tags || [],
        },
        ultima_interacao: ultimaInteracao?.created_at,
        estado_atual: cliente.estado?.state || ultimaInteracao?.estado_fsm,
        na_fila: Boolean(cliente.fila),
        created_at: cliente.created_at,
      };
    });

    return {
      data,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  async listMensagens(workspaceId, clienteId) {
    const mensagens = await db.ConversaInteracao.findAll({
      where: {
        workspace_id: workspaceId,
        cliente_id: clienteId,
      },
      order: [['created_at', 'ASC']],
    });

    return mensagens.map((mensagem) => mensagem.toJSON());
  }

  async listLastMessages(workspaceId, limit = 10) {
    const mensagens = await db.ConversaInteracao.findAll({
      where: { workspace_id: workspaceId },
      include: [{
        model: db.Cliente,
        as: 'cliente',
        attributes: ['nome', 'telefone'],
      }],
      attributes: ['id', 'created_at', 'conteudo'],
      order: [['created_at', 'DESC']],
      limit,
    });

    return mensagens.map((msg) => {
      let conteudo = msg.conteudo;
      if (conteudo && typeof conteudo === 'object') {
        conteudo = conteudo.mensagem || conteudo.text || conteudo.message || conteudo.body || JSON.stringify(conteudo);
      }

      return {
        id: msg.id,
        created_at: msg.created_at,
        cliente_nome: msg.cliente?.nome,
        cliente_telefone: msg.cliente?.telefone,
        conteudo: conteudo || '',
      };
    });
  }

  async getDossie(workspaceId, clienteId) {
    const builder = new DossierBuilder(workspaceId);
    return builder.getDossier(clienteId);
  }

  async sendMensagem({ workspaceId, clienteId, mensagem, operadorId }) {
    const cliente = await db.Cliente.findOne({
      where: {
        id: clienteId,
        workspace_id: workspaceId,
      },
    });

    if (!cliente) {
      throw new AppError('Cliente não encontrado', 'CLIENTE_NOT_FOUND', 404);
    }

    const estado = await db.ClienteEstado.findOne({
      where: {
        cliente_id: clienteId,
        workspace_id: workspaceId,
      },
    });

    const estadoFsm = estado?.state || 'MENU_PRINCIPAL';
    const service = getWhatsAppService();

    await service.sendMessage(cliente.telefone, mensagem);

    await db.ConversaInteracao.create({
      workspace_id: workspaceId,
      cliente_id: clienteId,
      direction: 'outbound',
      canal: 'whatsapp',
      conteudo: { mensagem },
      estado_fsm: estadoFsm,
      operador_id: operadorId,
    });

    return { message: 'Mensagem enviada' };
  }

  /**
   * Refresh da materialized view vw_conversas_resumo.
   * Usa CONCURRENTLY para não bloquear leituras.
   */
  async refreshConversasView() {
    await db.sequelize.query('REFRESH MATERIALIZED VIEW CONCURRENTLY vw_conversas_resumo');
  }
}

module.exports = new ConversasService();
