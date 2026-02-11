module.exports = (sequelize, DataTypes) => {
  const CatalogoItem = sequelize.define('CatalogoItem', {
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
    numero: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    familia: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    variante: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    capacidade: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  }, {
    tableName: 'catalogo_itens',
    underscored: true,
    timestamps: false,
  });

  return CatalogoItem;
};