const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const logger = require('../../config/logger');
const config = require('../../config/env');
const db = require('../../db/models');
const ReisTechEngine = require('../../core/engine/ReisTech');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.qrCode = null;
    this.status = 'disconnected';
    this.lastQrAt = null;
    this.workspaceEngines = new Map(); // workspace_id -> ReisTechEngine
    this.activeClients = new Map(); // phone -> lastInboundAt
    this.activeClientTtlMs = 24 * 60 * 60 * 1000; // 24h
  }

  isGroupOrBroadcast(from, message) {
    if (!from) return true;
    if (message?.isGroup) return true;
    if (from.endsWith('@g.us')) return true;
    if (from === 'status@broadcast') return true;
    if (from.endsWith('@broadcast')) return true;
    return false;
  }

  markClientActive(from) {
    if (!from) return;
    this.activeClients.set(from, Date.now());
  }

  canSendTo(from) {
    const lastInboundAt = this.activeClients.get(from);
    if (!lastInboundAt) return false;
    return Date.now() - lastInboundAt <= this.activeClientTtlMs;
  }

  async initialize() {
    if (this.client) {
      logger.warn('WhatsApp client já inicializado');
      return;
    }

    try {
      logger.info('🚀 Inicializando WhatsApp Web...');
      
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'reistech-whatsapp',
          dataPath: config.whatsapp.sessionPath,
        }),
        puppeteer: {
          headless: true,
          args: config.whatsapp.puppeteerArgs,
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        },
      });

      this.setupEventHandlers();
      await this.client.initialize();

      logger.info('✅ WhatsApp Web inicializado');
    } catch (error) {
      logger.error('❌ Falha ao inicializar WhatsApp:', error);
      this.status = 'error';
      throw error;
    }
  }

  setupEventHandlers() {
    // QR Code
    this.client.on('qr', async (qr) => {
      logger.info('📱 QR Code recebido');
      this.qrCode = qr;
      this.lastQrAt = new Date();
      this.status = 'waiting_qr';

      // Mostrar QR no terminal
      console.log('\n' + '='.repeat(50));
      console.log('📱 SCAN THIS QR CODE WITH WHATSAPP');
      console.log('='.repeat(50) + '\n');
      qrcode.generate(qr, { small: true });

      // Gerar QR para a UI
      try {
        this.qrCodeBase64 = await QRCode.toDataURL(qr);
      } catch (error) {
        logger.error('Erro ao gerar QR code base64:', error);
      }
    });

    // Ready
    this.client.on('ready', () => {
      logger.info('✅ WhatsApp Web pronto!');
      this.status = 'connected';
      this.qrCode = null;
      this.qrCodeBase64 = null;
    });

    // Disconnected
    this.client.on('disconnected', (reason) => {
      logger.warn(`❌ WhatsApp desconectado: ${reason}`);
      this.status = 'disconnected';
      this.client = null;
      
      // Tentar reconectar após 5 segundos
      setTimeout(() => {
        this.initialize().catch(err => {
          logger.error('Falha ao reconectar WhatsApp:', err);
        });
      }, 5000);
    });

    // Mensagem recebida
    this.client.on('message', async (message) => {
      await this.handleIncomingMessage(message);
    });

    // Mudança de estado
    this.client.on('change_state', (state) => {
      logger.debug(`WhatsApp state change: ${state}`);
      this.status = state;
    });

    // Autenticação falhou
    this.client.on('auth_failure', (error) => {
      logger.error('❌ Autenticação WhatsApp falhou:', error);
      this.status = 'auth_failed';
    });
  }

  async handleIncomingMessage(message) {
    try {
      const { from, body, type, timestamp } = message;
      
      // Ignorar mensagens do próprio bot e mensagens de grupo
      if (message.fromMe || this.isGroupOrBroadcast(from, message)) {
        return;
      }

      this.markClientActive(from);

      logger.info(`📨 Nova mensagem de ${from}: ${body.substring(0, 100)}...`);

      // Para MVP: assumir primeiro workspace (reis-celulares)
      // Em produção: mapear número para workspace
      const workspaceId = await this.resolveWorkspaceId(from);
      
      if (!workspaceId) {
        logger.error(`Workspace não encontrado para número ${from}`);
        await this.sendMessage(from, 'Desculpe, não consigo identificar sua empresa. Contate o administrador.');
        return;
      }

      // Obter ou criar engine para o workspace
      let engine = this.workspaceEngines.get(workspaceId);
      if (!engine) {
        engine = new ReisTechEngine(workspaceId);
        this.workspaceEngines.set(workspaceId, engine);
      }

      // Processar mensagem
      const response = await engine.processMessage({
        from,
        text: body,
        type,
        timestamp,
      });

      // Enviar resposta
      if (response.type === 'message') {
        await this.sendMessage(from, response.message);
      } else if (response.type === 'escalation') {
        await this.sendMessage(from, response.message);
        // Notificar operadores sobre novo na fila
        await this.notifyOperators(workspaceId, from, response.dossier);
      }

    } catch (error) {
      logger.error(`Erro ao processar mensagem: ${error.message}`, {
        error: error.stack,
        from: message.from,
      });

      // Fallback: enviar mensagem de erro
      try {
        await this.sendMessage(
          message.from,
          'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.'
        );
      } catch (sendError) {
        logger.error('Erro ao enviar mensagem de fallback:', sendError);
      }
    }
  }

  async resolveWorkspaceId(phoneNumber) {
    // MVP: retornar primeiro workspace ativo
    // Em produção: implementar mapeamento baseado em número, domínio, etc.
    try {
      const db = require('../../db/models');
      const workspace = await db.Workspace.findOne({
        where: { ativo: true },
        order: [['created_at', 'ASC']]
      });
      
      return workspace ? workspace.id : null;
    } catch (error) {
      logger.error(`Erro ao resolver workspace: ${error.message}`);
      return null;
    }
  }

  async sendMessage(to, content) {
    if (!this.client || this.status !== 'connected') {
      throw new Error('WhatsApp não conectado');
    }

    if (!this.canSendTo(to)) {
      throw new Error('Envio bloqueado: cliente não iniciou conversa');
    }

    try {
      await this.client.sendMessage(to, content);
      logger.debug(`📤 Mensagem enviada para ${to}`);
    } catch (error) {
      logger.error(`Erro ao enviar mensagem para ${to}:`, error);
      throw error;
    }
  }

  async notifyOperators(workspaceId, phoneNumber, dossier) {
    // Implementar notificação para operadores (email, webhook, etc.)
    logger.info(`📢 Novo cliente na fila: ${phoneNumber}`, { dossier });
    
    // Aqui poderíamos:
    // 1. Enviar notificação via WebSocket para o painel
    // 2. Enviar email para operadores
    // 3. Integrar com sistema de notificações
  }

  getStatus() {
    return {
      connected: this.status === 'connected',
      status: this.status,
      lastQrAt: this.lastQrAt,
      info: this.client?.info || null,
    };
  }

  async getQrCode() {
    if (!this.qrCodeBase64 && this.qrCode) {
      try {
        this.qrCodeBase64 = await QRCode.toDataURL(this.qrCode);
      } catch (error) {
        logger.error('Erro ao gerar QR code:', error);
        return null;
      }
    }
    
    return this.qrCodeBase64;
  }

  async getStats(workspaceId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const replacements = { workspaceId, startOfDay };

    const [{ total_mensagens }] = await db.sequelize.query(
      `
        SELECT COUNT(*)::int AS total_mensagens
        FROM conversas_interacoes
        WHERE workspace_id = :workspaceId
          AND created_at >= :startOfDay
      `,
      { replacements, type: db.Sequelize.QueryTypes.SELECT }
    );

    const [{ clientes_ativos }] = await db.sequelize.query(
      `
        SELECT COUNT(DISTINCT cliente_id)::int AS clientes_ativos
        FROM conversas_interacoes
        WHERE workspace_id = :workspaceId
          AND created_at >= :startOfDay
      `,
      { replacements, type: db.Sequelize.QueryTypes.SELECT }
    );

    const [{ conversas_abertas }] = await db.sequelize.query(
      `
        SELECT COUNT(*)::int AS conversas_abertas
        FROM fila_humana
        WHERE workspace_id = :workspaceId
          AND status IN ('waiting', 'locked')
      `,
      { replacements, type: db.Sequelize.QueryTypes.SELECT }
    );

    const [{ outbound, inbound }] = await db.sequelize.query(
      `
        SELECT
          SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END)::int AS outbound,
          SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END)::int AS inbound
        FROM conversas_interacoes
        WHERE workspace_id = :workspaceId
          AND created_at >= :startOfDay
      `,
      { replacements, type: db.Sequelize.QueryTypes.SELECT }
    );

    const inboundCount = inbound || 0;
    const outboundCount = outbound || 0;
    const taxaResposta = inboundCount > 0 ? Math.round((outboundCount / inboundCount) * 100) : 0;

    return {
      totalMensagens: total_mensagens || 0,
      clientesAtivos: clientes_ativos || 0,
      conversasAbertas: conversas_abertas || 0,
      taxaResposta,
    };
  }

  async reconnect() {
    logger.info('Reconectando WhatsApp...');
    
    if (this.client) {
      await this.client.destroy();
    }
    
    this.client = null;
    this.status = 'disconnected';
    this.qrCode = null;
    this.qrCodeBase64 = null;
    
    await this.initialize();
  }

  async destroy() {
    if (this.client) {
      await this.client.destroy();
      this.client = null;
      this.status = 'disconnected';
    }
  }
}

// Singleton
let instance = null;

function getWhatsAppService() {
  if (!instance) {
    instance = new WhatsAppService();
  }
  return instance;
}

async function initializeWhatsApp() {
  const service = getWhatsAppService();
  await service.initialize();
  return service;
}

module.exports = {
  WhatsAppService,
  getWhatsAppService,
  initializeWhatsApp,
};