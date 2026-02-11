module.exports = {
  async up(pgm) {
    pgm.createTable('refresh_tokens', {
      id: {
        type: 'uuid',
        primaryKey: true,
        default: pgm.func('gen_random_uuid()'),
      },
      user_id: {
        type: 'uuid',
        notNull: true,
        references: 'users(id)',
        onDelete: 'CASCADE',
      },
      token_hash: {
        type: 'varchar(255)',
        notNull: true,
      },
      expires_at: {
        type: 'timestamp',
        notNull: true,
      },
      revoked_at: {
        type: 'timestamp',
      },
      created_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('refresh_tokens', 'user_id');
    pgm.createIndex('refresh_tokens', 'token_hash', { unique: true });
    pgm.createIndex('refresh_tokens', 'expires_at');
    pgm.createIndex('refresh_tokens', 'revoked_at');
  },

  async down(pgm) {
    pgm.dropTable('refresh_tokens');
  },
};