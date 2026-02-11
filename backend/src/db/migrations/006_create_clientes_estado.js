module.exports = {
  async up(pgm) {
    pgm.createTable('clientes_estado', {
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
      state: {
        type: 'varchar(100)',
        notNull: true,
        default: 'INICIO_SESSAO',
      },
      context: {
        type: 'jsonb',
        default: '{}',
      },
      updated_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('clientes_estado', 'workspace_id');
    pgm.createIndex('clientes_estado', 'cliente_id', { unique: true });
    pgm.createIndex('clientes_estado', 'state');
    pgm.createIndex('clientes_estado', 'updated_at');
    
    // Trigger para updated_at
    pgm.createTrigger('clientes_estado', 'update_updated_at', {
      when: 'BEFORE',
      operation: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column',
      functionParams: [],
    });
  },

  async down(pgm) {
    pgm.dropTrigger('clientes_estado', 'update_updated_at');
    pgm.dropTable('clientes_estado');
  },
};