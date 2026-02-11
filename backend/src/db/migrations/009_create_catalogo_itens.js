module.exports = {
  async up(pgm) {
    pgm.createTable('catalogo_itens', {
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
      numero: {
        type: 'integer',
        notNull: true,
      },
      familia: {
        type: 'varchar(100)',
        notNull: true,
      },
      variante: {
        type: 'varchar(100)',
        notNull: true,
      },
      capacidade: {
        type: 'varchar(50)',
        notNull: true,
      },
      preco: {
        type: 'numeric(10,2)',
        notNull: true,
      },
      ativo: {
        type: 'boolean',
        default: true,
        notNull: true,
      },
      metadata: {
        type: 'jsonb',
        default: '{}',
      },
      updated_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('catalogo_itens', 'workspace_id');
    pgm.createIndex('catalogo_itens', ['workspace_id', 'numero'], { unique: true });
    pgm.createIndex('catalogo_itens', 'familia');
    pgm.createIndex('catalogo_itens', 'variante');
    pgm.createIndex('catalogo_itens', 'ativo');
    pgm.createIndex('catalogo_itens', 'updated_at');
    
    // Trigger para updated_at
    pgm.createTrigger('catalogo_itens', 'update_updated_at', {
      when: 'BEFORE',
      operation: 'UPDATE',
      level: 'ROW',
      function: 'update_updated_at_column',
      functionParams: [],
    });
  },

  async down(pgm) {
    pgm.dropTrigger('catalogo_itens', 'update_updated_at');
    pgm.dropTable('catalogo_itens');
  },
};