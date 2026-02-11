module.exports = {
  async up(pgm) {
    pgm.createTable('fila_humana', {
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
      status: {
        type: 'varchar(20)',
        notNull: true,
        check: "status IN ('waiting', 'locked', 'done', 'cancelled')",
        default: 'waiting',
      },
      operador_id: {
        type: 'uuid',
        references: 'users(id)',
      },
      lock_expires_at: {
        type: 'timestamp',
      },
      motivo: {
        type: 'text',
      },
      metadata: {
        type: 'jsonb',
        default: '{}',
      },
      created_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
      updated_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('fila_humana', 'workspace_id');
    pgm.createIndex('fila_humana', 'cliente_id');
    pgm.createIndex('fila_humana', 'status');
    pgm.createIndex('fila_humana', 'operador_id');
    pgm.createIndex('fila_humana', 'lock_expires_at');
    pgm.createIndex('fila_humana', 'created_at');
    pgm.createIndex('fila_humana', ['workspace_id', 'status', 'created_at']);
    
    // Trigger para updated_at
    pgm.createTrigger('fila_humana', 'update_updated_at', {
      when: 'BEFORE',
      operation: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column',
      functionParams: [],
    });
  },

  async down(pgm) {
    pgm.dropTrigger('fila_humana', 'update_updated_at');
    pgm.dropTable('fila_humana');
  },
};