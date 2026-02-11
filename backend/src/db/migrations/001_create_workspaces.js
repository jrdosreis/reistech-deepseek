module.exports = {
  async up(pgm) {
    pgm.createTable('workspaces', {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      slug: {
        type: 'varchar(100)',
        notNull: true,
        unique: true,
      },
      nome: {
        type: 'varchar(200)',
        notNull: true,
      },
      vertical_key: {
        type: 'varchar(50)',
        notNull: true,
      },
      timezone: {
        type: 'varchar(50)',
        default: 'America/Sao_Paulo',
      },
      moeda: {
        type: 'char(3)',
        default: 'BRL',
      },
      ativo: {
        type: 'boolean',
        default: true,
        notNull: true,
      },
      config: {
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

    pgm.createIndex('workspaces', 'slug', { unique: true });
    pgm.createIndex('workspaces', 'vertical_key');
    pgm.createIndex('workspaces', 'ativo');
  },

  async down(pgm) {
    pgm.dropTable('workspaces');
  },
};