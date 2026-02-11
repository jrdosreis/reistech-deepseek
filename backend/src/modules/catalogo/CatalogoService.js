const db = require('../../db/models');
const { AppError } = require('../../core/errors/AppError');
const logger = require('../../config/logger');
const csvParser = require('csv-parser');
const fs = require('fs');

class CatalogoService {
  async importCSV(workspaceId, filePath, replace = false) {
    const transaction = await db.sequelize.transaction();
    
    try {
      if (replace) {
        await db.CatalogoItem.update(
          { ativo: false },
          { where: { workspace_id: workspaceId }, transaction }
        );
      }

      const items = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csvParser())
          .on('data', (row) => {
            items.push({
              workspace_id: workspaceId,
              numero: parseInt(row.numero),
              familia: row.familia,
              variante: row.variante,
              capacidade: row.capacidade,
              preco: parseFloat(row.preco.replace('R$', '').replace('.', '').replace(',', '.').trim()),
              ativo: true,
            });
          })
          .on('end', resolve)
          .on('error', reject);
      });

      for (const item of items) {
        await db.CatalogoItem.create(item, { transaction });
      }

      await transaction.commit();
      logger.info(`Catálogo importado para workspace ${workspaceId}, itens: ${items.length}`);
      return { imported: items.length };
    } catch (error) {
      await transaction.rollback();
      logger.error(`Erro ao importar catálogo: ${error.message}`);
      throw new AppError('Erro ao importar catálogo', 'CATALOGO_IMPORT_ERROR');
    } finally {
      // Limpar arquivo temporário
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  async getWhatsappText(workspaceId) {
    try {
      const itens = await db.CatalogoItem.findAll({
        where: {
          workspace_id: workspaceId,
          ativo: true,
        },
        order: [['familia', 'ASC'], ['variante', 'ASC']],
      });

      if (itens.length === 0) {
        return '📭 Nenhum item disponível no catálogo no momento.';
      }

      // Agrupar por família
      const grupos = {};
      itens.forEach(item => {
        if (!grupos[item.familia]) {
          grupos[item.familia] = [];
        }
        grupos[item.familia].push(item);
      });

      let response = '📱 *CATÁLOGO REIS CELULARES*\n';
      response += '━━━━━━━━━━━━━━━━━━\n\n';

      Object.entries(grupos).forEach(([familia, items]) => {
        response += `*${familia}*\n`;
        
        items.forEach(item => {
          const icon = this.getIconForVariant(item.variante);
          const price = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
          }).format(item.preco);
          
          response += `${icon} *${item.numero}. ${item.variante}* ${item.capacidade}\n`;
          response += `   💰 ${price}\n`;
        });
        
        response += '\n';
      });

      response += '━━━━━━━━━━━━━━━━━━\n';
      response += 'Digite o *NÚMERO* do item para detalhes.\n';
      response += 'Digite *VOLTAR* para menu.';

      return response;
    } catch (error) {
      logger.error(`Erro ao gerar texto WhatsApp: ${error.message}`);
      throw new AppError('Erro ao gerar catálogo', 'CATALOGO_GENERATE_ERROR');
    }
  }

  getIconForVariant(variant) {
    const variants = {
      'Pro Max': '👑',
      'Pro': '🔶',
      'Plus': '🔹',
      'default': '🔸'
    };
    
    return variants[variant] || variants['default'];
  }

  async list(workspaceId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const { count, rows } = await db.CatalogoItem.findAndCountAll({
      where: { workspace_id: workspaceId },
      order: [['numero', 'ASC']],
      limit,
      offset,
    });

    return {
      items: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    };
  }

  async update(workspaceId, id, data) {
    const item = await db.CatalogoItem.findOne({
      where: { id, workspace_id: workspaceId },
    });

    if (!item) {
      throw new AppError('Item não encontrado', 'ITEM_NOT_FOUND');
    }

    await item.update(data);
    return item;
  }

  async delete(workspaceId, id) {
    const item = await db.CatalogoItem.findOne({
      where: { id, workspace_id: workspaceId },
    });

    if (!item) {
      throw new AppError('Item não encontrado', 'ITEM_NOT_FOUND');
    }

    await item.update({ ativo: false });
    return { success: true };
  }
}

module.exports = CatalogoService;