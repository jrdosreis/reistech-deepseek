// backend/src/db/migrations/011_create_notifications.js
module.exports = {
  async up(pgm) {
    pgm.createTable('notifications', {
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
      user_id: {
        type: 'uuid',
        notNull: true,
        references: 'users(id)',
        onDelete: 'CASCADE',
      },
      tipo: {
        type: 'varchar(50)',
        notNull: true,
      },
      titulo: {
        type: 'varchar(200)',
        notNull: true,
      },
      mensagem: {
        type: 'text',
        notNull: true,
      },
      dados: {
        type: 'jsonb',
        default: '{}',
      },
      prioridade: {
        type: 'varchar(20)',
        notNull: true,
        default: 'medium',
        check: "prioridade IN ('low', 'medium', 'high', 'urgent')",
      },
      lida: {
        type: 'boolean',
        default: false,
        notNull: true,
      },
      lida_em: {
        type: 'timestamp',
      },
      created_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('notifications', 'workspace_id');
    pgm.createIndex('notifications', 'user_id');
    pgm.createIndex('notifications', ['user_id', 'lida', 'created_at']);
    pgm.createIndex('notifications', ['workspace_id', 'created_at']);
    pgm.createIndex('notifications', 'tipo');
    pgm.createIndex('notifications', 'prioridade');
  },

  async down(pgm) {
    pgm.dropTable('notifications');
  },
};