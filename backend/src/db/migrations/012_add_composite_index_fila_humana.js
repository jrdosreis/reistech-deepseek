/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createIndex('fila_humana', ['workspace_id', 'status', 'created_at'], {
    name: 'idx_fila_workspace_status_created',
    method: 'btree',
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('fila_humana', ['workspace_id', 'status', 'created_at'], {
    name: 'idx_fila_workspace_status_created',
  });
};
