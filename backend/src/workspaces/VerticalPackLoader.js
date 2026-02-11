const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class VerticalPackLoader {
  constructor() {
    this.packsDir = path.join(__dirname, 'packs');
    this.availablePacks = this.loadAvailablePacks();
  }

  loadAvailablePacks() {
    try {
      const packs = {};
      const files = fs.readdirSync(this.packsDir);
      
      files.forEach(file => {
        if (file.endsWith('.json')) {
          const packKey = file.replace('.json', '');
          const packPath = path.join(this.packsDir, file);
          
          try {
            const packData = JSON.parse(fs.readFileSync(packPath, 'utf8'));
            packs[packKey] = {
              key: packKey,
              name: packData.name || packKey,
              description: packData.description || '',
              version: packData.version || '1.0.0',
              config: packData.config || {},
            };
          } catch (error) {
            logger.error(`Erro ao carregar pack ${file}: ${error.message}`);
          }
        }
      });

      logger.info(`Carregados ${Object.keys(packs).length} packs verticais`);
      return packs;
    } catch (error) {
      logger.error(`Erro ao carregar packs: ${error.message}`);
      return {};
    }
  }

  getAvailablePacks() {
    return Object.values(this.availablePacks);
  }

  getPack(key) {
    const packPath = path.join(this.packsDir, `${key}.json`);
    
    if (!fs.existsSync(packPath)) {
      throw new Error(`Pack não encontrado: ${key}`);
    }

    return JSON.parse(fs.readFileSync(packPath, 'utf8'));
  }

  validatePack(packData) {
    const requiredFields = ['name', 'key', 'textos_cms'];
    
    for (const field of requiredFields) {
      if (!packData[field]) {
        throw new Error(`Campo obrigatório faltando no pack: ${field}`);
      }
    }

    if (!Array.isArray(packData.textos_cms)) {
      throw new Error('textos_cms deve ser um array');
    }

    return true;
  }

  createPackTemplate(key, name, description = '') {
    return {
      name,
      key,
      description,
      version: '1.0.0',
      config: {
        whatsapp: {
          welcome_message: true,
          business_hours: true,
        },
        catalogo: {
          enabled: true,
          type: 'produtos',
        },
      },
      textos_cms: [
        {
          chave: 'menu.principal.titulo',
          conteudo: `🤖 *Bem-vindo à ${name}* 🤖`,
          ativo: true,
        },
        {
          chave: 'menu.principal.opcoes',
          conteudo: 'Escolha uma opção:\n\n1️⃣ *Opção 1*\n2️⃣ *Opção 2*\n3️⃣ *Opção 3*\n4️⃣ *Opção 4*\n5️⃣ *Opção 5*\n6️⃣ *Falar com Atendente*\n\nDigite o número da opção desejada.',
          ativo: true,
        },
        {
          chave: 'sistema.erro.fallback',
          conteudo: 'Desculpe, estou com problemas técnicos. Por favor, tente novamente em alguns instantes.',
          ativo: true,
        },
      ],
      fluxos: {
        principal: {
          nome: 'Fluxo Principal',
          descricao: 'Fluxo principal de atendimento',
          estados: [
            'MENU_PRINCIPAL',
            'COLETA_DADOS',
            'AVALIAR_ESCALONAMENTO',
          ],
        },
      },
    };
  }
}

module.exports = VerticalPackLoader;