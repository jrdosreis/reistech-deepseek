const db = require('../../db/models');
const { getWhatsAppService } = require('../whatsapp/WhatsAppService');
const DossierBuilder = require('../../core/engine/DossierBuilder');

class ConversasService {
  async listConversas(workspaceId, telefone) {
    const replacements = { workspaceId };
    let telefoneFilter = '';

    if (telefone) {
      replacements.telefoneLike = `%${telefone}%`;
      telefoneFilter = 'AND c.telefone ILIKE :telefoneLike';
    }

    const sql = `
      SELECT DISTINCT ON (ci.cliente_id)
        ci.id,
        ci.cliente_id,
        ci.created_at AS ultima_interacao,
        ci.estado_fsm,
        c.id AS cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        c.tags AS cliente_tags,
        c.created_at AS cliente_created_at,
        ce.state AS estado_atual,
        fh.id AS fila_id,
        fh.status AS fila_status
      FROM conversas_interacoes ci
      JOIN clientes c ON c.id = ci.cliente_id
      LEFT JOIN clientes_estado ce ON ce.cliente_id = c.id
      LEFT JOIN fila_humana fh ON fh.cliente_id = c.id AND fh.status IN ('waiting', 'locked')
      WHERE ci.workspace_id = :workspaceId
      ${telefoneFilter}
      ORDER BY ci.cliente_id, ci.created_at DESC;
    `;

    const rows = await db.sequelize.query(sql, {
      replacements,
      type: db.Sequelize.QueryTypes.SELECT,
    });

    return rows.map((row) => ({
      id: row.id,
      cliente_id: row.cliente_id,
      cliente: {
        id: row.cliente_id,
        nome: row.cliente_nome,
        telefone: row.cliente_telefone,
        tags: row.cliente_tags || [],
      },
      ultima_interacao: row.ultima_interacao,
      estado_atual: row.estado_atual || row.estado_fsm,
      na_fila: Boolean(row.fila_id),
      created_at: row.cliente_created_at,
    }));
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
    const rows = await db.sequelize.query(
      `
        SELECT
          ci.id,
          ci.created_at,
          ci.conteudo,
          c.nome AS cliente_nome,
          c.telefone AS cliente_telefone
        FROM conversas_interacoes ci
        JOIN clientes c ON c.id = ci.cliente_id
        WHERE ci.workspace_id = :workspaceId
        ORDER BY ci.created_at DESC
        LIMIT :limit
      `,
      {
        replacements: { workspaceId, limit },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    return rows.map((row) => {
      let conteudo = row.conteudo;
      if (conteudo && typeof conteudo === 'object') {
        conteudo = conteudo.mensagem || conteudo.text || conteudo.message || conteudo.body || JSON.stringify(conteudo);
      }

      return {
        id: row.id,
        created_at: row.created_at,
        cliente_nome: row.cliente_nome,
        cliente_telefone: row.cliente_telefone,
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
      const error = new Error('Cliente não encontrado');
      error.code = 'CLIENTE_NOT_FOUND';
      error.status = 404;
      throw error;
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
}

module.exports = new ConversasService();
