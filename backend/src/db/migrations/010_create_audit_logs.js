module.exports = {
  async up(pgm) {
    pgm.createTable('audit_logs', {
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
        references: 'users(id)',
      },
      action: {
        type: 'varchar(100)',
        notNull: true,
      },
      entity: {
        type: 'varchar(100)',
        notNull: true,
      },
      entity_id: {
        type: 'varchar(255)',
      },
      meta: {
        type: 'jsonb',
        default: '{}',
      },
      ip_address: {
        type: 'varchar(45)',
      },
      user_agent: {
        type: 'text',
      },
      created_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('audit_logs', 'workspace_id');
    pgm.createIndex('audit_logs', 'user_id');
    pgm.createIndex('audit_logs', 'action');
    pgm.createIndex('audit_logs', 'entity');
    pgm.createIndex('audit_logs', 'entity_id');
    pgm.createIndex('audit_logs', 'created_at');
    pgm.createIndex('audit_logs', ['workspace_id', 'created_at']);
  },

  async down(pgm) {
    pgm.dropTable('audit_logs');
  },
};