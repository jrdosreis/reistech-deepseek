/**
 * Migration: Otimizar listConversas
 *
 * 1. Índice composto (workspace_id, cliente_id, created_at DESC) na tabela
 *    conversas_interacoes – cobre a subquery de "última interação por cliente".
 * 2. Materialized view vw_conversas_resumo – pré-calcula última interação,
 *    estado atual e presença em fila por cliente.
 * 3. Índice único na view materializada para REFRESH CONCURRENTLY.
 */

module.exports = {
  async up(pgm) {
    // 1. Índice composto covering para conversas_interacoes
    pgm.createIndex('conversas_interacoes', ['workspace_id', 'cliente_id', 'created_at'], {
      name: 'idx_interacoes_workspace_cliente_created',
      method: 'btree',
    });

    // 2. Materialized View
    pgm.sql(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS vw_conversas_resumo AS
      SELECT DISTINCT ON (c.id)
        c.id                AS cliente_id,
        c.workspace_id,
        c.nome              AS cliente_nome,
        c.telefone          AS cliente_telefone,
        c.tags              AS cliente_tags,
        c.created_at        AS cliente_created_at,
        ci.id               AS ultima_interacao_id,
        ci.created_at       AS ultima_interacao_at,
        ci.estado_fsm,
        COALESCE(ce.state, ci.estado_fsm)  AS estado_atual,
        fh.id IS NOT NULL   AS na_fila
      FROM clientes c
      INNER JOIN conversas_interacoes ci ON ci.cliente_id = c.id
      LEFT  JOIN clientes_estado ce      ON ce.cliente_id = c.id
      LEFT  JOIN fila_humana fh          ON fh.cliente_id = c.id
                                         AND fh.workspace_id = c.workspace_id
                                         AND fh.status IN ('waiting','locked')
      ORDER BY c.id, ci.created_at DESC
      WITH DATA
    `);

    // 3. Índice único (necessário para REFRESH CONCURRENTLY)
    pgm.sql(`
      CREATE UNIQUE INDEX idx_vw_conversas_resumo_pk
        ON vw_conversas_resumo (cliente_id)
    `);

    // 4. Índice de workspace + ordenação na view
    pgm.sql(`
      CREATE INDEX idx_vw_conversas_resumo_ws
        ON vw_conversas_resumo (workspace_id, ultima_interacao_at DESC)
    `);
  },

  async down(pgm) {
    pgm.sql('DROP MATERIALIZED VIEW IF EXISTS vw_conversas_resumo CASCADE');
    pgm.dropIndex('conversas_interacoes', ['workspace_id', 'cliente_id', 'created_at'], {
      name: 'idx_interacoes_workspace_cliente_created',
    });
  },
};
