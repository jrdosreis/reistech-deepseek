module.exports = (sequelize, DataTypes) => {
  const ConversaInteracao = sequelize.define('ConversaInteracao', {
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
    direction: {
      type: DataTypes.ENUM('inbound', 'outbound'),
      allowNull: false,
    },
    canal: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'whatsapp',
    },
    conteudo: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    estado_fsm: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    operador_id: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  }, {
    tableName: 'conversas_interacoes',
    underscored: true,
    timestamps: false,
  });

  return ConversaInteracao;
};