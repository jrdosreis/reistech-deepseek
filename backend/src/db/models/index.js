const { Sequelize } = require('sequelize');
const config = require('../../config/env');

const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: config.nodeEnv === 'development' ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// Importar modelos
const Workspace = require('./Workspace')(sequelize, Sequelize);
const User = require('./User')(sequelize, Sequelize);
const RefreshToken = require('./RefreshToken')(sequelize, Sequelize);
const Cliente = require('./Cliente')(sequelize, Sequelize);
const ConversaInteracao = require('./ConversaInteracao')(sequelize, Sequelize);
const ClienteEstado = require('./ClienteEstado')(sequelize, Sequelize);
const FilaHumana = require('./FilaHumana')(sequelize, Sequelize);
const TextoCms = require('./TextoCms')(sequelize, Sequelize);
const CatalogoItem = require('./CatalogoItem')(sequelize, Sequelize);
const AuditLog = require('./AuditLog')(sequelize, Sequelize);
const Notification = require('./Notification')(sequelize, Sequelize);

// Definir relacionamentos
Workspace.hasMany(User, { foreignKey: 'workspace_id', as: 'users' });
User.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Workspace.hasMany(Cliente, { foreignKey: 'workspace_id', as: 'clientes' });
Cliente.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

Cliente.hasMany(ConversaInteracao, { foreignKey: 'cliente_id', as: 'interacoes' });
ConversaInteracao.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

ConversaInteracao.belongsTo(User, { foreignKey: 'operador_id', as: 'operador' });

Cliente.hasOne(ClienteEstado, { foreignKey: 'cliente_id', as: 'estado' });
ClienteEstado.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

Cliente.hasOne(FilaHumana, { foreignKey: 'cliente_id', as: 'fila' });
FilaHumana.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
FilaHumana.belongsTo(User, { foreignKey: 'operador_id', as: 'operador' });

Workspace.hasMany(TextoCms, { foreignKey: 'workspace_id', as: 'textos' });
TextoCms.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

Workspace.hasMany(CatalogoItem, { foreignKey: 'workspace_id', as: 'catalogoItens' });
CatalogoItem.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });

Workspace.hasMany(AuditLog, { foreignKey: 'workspace_id', as: 'auditLogs' });
AuditLog.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Workspace.hasMany(Notification, { foreignKey: 'workspace_id', as: 'notifications' });
Notification.belongsTo(Workspace, { foreignKey: 'workspace_id', as: 'workspace' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Função para inicializar o banco de dados
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com PostgreSQL estabelecida');
    
    if (config.nodeEnv === 'development') {
      await sequelize.sync({ alter: false });
      console.log('✅ Modelos sincronizados');
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ Falha ao conectar ao banco de dados:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  Sequelize,
  Workspace,
  User,
  RefreshToken,
  Cliente,
  ConversaInteracao,
  ClienteEstado,
  FilaHumana,
  TextoCms,
  CatalogoItem,
  AuditLog,
  Notification,
  initializeDatabase,
};