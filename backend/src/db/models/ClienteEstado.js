module.exports = (sequelize, DataTypes) => {
  const ClienteEstado = sequelize.define('ClienteEstado', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workspace_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'workspaces',
        key: 'id',
      },
    },
    cliente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id',
      },
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'INICIO_SESSAO',
    },
    context: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  }, {
    tableName: 'clientes_estado',
    underscored: true,
    timestamps: false,
  });

  return ClienteEstado;
};