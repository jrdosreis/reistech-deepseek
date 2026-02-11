module.exports = {
  async up(pgm) {
    pgm.createTable('conversas_interacoes', {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      workspace_id: {
        type: 'uuid',
        notNull: true,
        references: 'workspaces(id)',
        onDelete: 'CASCADE',
      },
      cliente_id: {
        type: 'uuid',
        notNull: true,
        references: 'clientes(id)',
        onDelete: 'CASCADE',
      },
      direction: {
        type: 'varchar(20)',
        notNull: true,
        check: "direction IN ('inbound', 'outbound')",
      },
      canal: {
        type: 'varchar(50)',
        notNull: true,
        default: 'whatsapp',
      },
      conteudo: {
        type: 'jsonb',
        notNull: true,
      },
      estado_fsm: {
        type: 'varchar(100)',
        notNull: true,
      },
      operador_id: {
        type: 'uuid',
        references: 'users(id)',
      },
      created_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('conversas_interacoes', 'workspace_id');
    pgm.createIndex('conversas_interacoes', 'cliente_id');
    pgm.createIndex('conversas_interacoes', 'direction');
    pgm.createIndex('conversas_interacoes', 'estado_fsm');
    pgm.createIndex('conversas_interacoes', 'operador_id');
    pgm.createIndex('conversas_interacoes', 'created_at');
    
    // Index composto para consultas frequentes
    pgm.createIndex('conversas_interacoes', ['cliente_id', 'created_at']);
  },

  async down(pgm) {
    pgm.dropTable('conversas_interacoes');
  },
};