const http = require('http');
const app = require('./app');
const config = require('./src/config/env');
const logger = require('./src/config/logger');
const WebSocketServer = require('./src/websocket/WebSocketServer');

const PORT = config.port || 3000;

const server = http.createServer(app);
const wss = new WebSocketServer(server);
app.locals.wss = wss;

server.listen(PORT, () => {
  logger.info(`🚀 Servidor ReisTech rodando na porta ${PORT}`);
  logger.info(`📁 Ambiente: ${config.nodeEnv}`);
  logger.info(`🌐 URL: http://localhost:${PORT}`);
  logger.info(`📡 WebSocket disponível em ws://localhost:${PORT}/ws`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Rejeição não tratada:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', error);
  process.exit(1);
});

module.exports = { app, server, wss };