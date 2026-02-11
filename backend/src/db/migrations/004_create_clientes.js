module.exports = {
  async up(pgm) {
    pgm.createTable('clientes', {
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
      telefone: {
        type: 'varchar(50)',
        notNull: true,
      },
      nome: {
        type: 'varchar(200)',
      },
      tags: {
        type: 'jsonb',
        default: '[]',
      },
      origem: {
        type: 'varchar(50)',
        default: 'whatsapp',
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

    pgm.createIndex('clientes', 'workspace_id');
    pgm.createIndex('clientes', ['workspace_id', 'telefone'], { unique: true });
    pgm.createIndex('clientes', 'origem');
    pgm.createIndex('clientes', 'created_at');
    
    // Trigger para updated_at
    pgm.createTrigger('clientes', 'update_updated_at', {
      when: 'BEFORE',
      operation: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column',
      functionParams: [],
    });
  },

  async down(pgm) {
    pgm.dropTrigger('clientes', 'update_updated_at');
    pgm.dropTable('clientes');
  },
};