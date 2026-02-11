module.exports = {
  async up(pgm) {
    pgm.createTable('textos_cms', {
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
      chave: {
        type: 'varchar(200)',
        notNull: true,
      },
      conteudo: {
        type: 'text',
        notNull: true,
      },
      ativo: {
        type: 'boolean',
        default: true,
        notNull: true,
      },
      updated_at: {
        type: 'timestamp',
        default: pgm.func('current_timestamp'),
        notNull: true,
      },
    });

    pgm.createIndex('textos_cms', 'workspace_id');
    pgm.createIndex('textos_cms', ['workspace_id', 'chave'], { unique: true });
    pgm.createIndex('textos_cms', 'ativo');
    pgm.createIndex('textos_cms', 'updated_at');
  },

  async down(pgm) {
    pgm.dropTable('textos_cms');
  },
};