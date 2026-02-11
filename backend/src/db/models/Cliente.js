module.exports = (sequelize, DataTypes) => {
  const Cliente = sequelize.define('Cliente', {
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
    telefone: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(200),
    },
    tags: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },
    origem: {
      type: DataTypes.STRING(50),
      defaultValue: 'whatsapp',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  }, {
    tableName: 'clientes',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['workspace_id', 'telefone'],
      },
    ],
  });

  return Cliente;
};