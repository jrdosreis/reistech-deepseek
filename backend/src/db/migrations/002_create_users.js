module.exports = {
  async up(pgm) {
    pgm.createTable('users', {
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
      nome: {
        type: 'varchar(200)',
        notNull: true,
      },
      email: {
        type: 'varchar(255)',
        notNull: true,
      },
      password_hash: {
        type: 'varchar(255)',
        notNull: true,
      },
      role: {
        type: 'varchar(20)',
        notNull: true,
        check: "role IN ('admin', 'supervisor', 'operator', 'system')",
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
      last_login_at: {
        type: 'timestamp',
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

    pgm.createIndex('users', 'workspace_id');
    pgm.createIndex('users', ['workspace_id', 'email'], { unique: true });
    pgm.createIndex('users', 'role');
    pgm.createIndex('users', 'ativo');
  },

  async down(pgm) {
    pgm.dropTable('users');
  },
};