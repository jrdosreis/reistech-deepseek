const db = require('../../db/models');
const { Op, QueryTypes, Sequelize } = require('sequelize');
const { AppError } = require('../../core/errors/AppError');
const logger = require('../../config/logger');

class ReportService {
  // Dashboard principal
  async getDashboardStats(workspaceId, period = 'today') {
    try {
      const { startDate, endDate } = this.getDateRange(period);
      
      const [
        totalClientes,
        novasConversas,
        mensagensEnviadas,
        atendimentosFinalizados,
        tempoMedioResposta,
        taxaConversao,
        receitaTotal,
      ] = await Promise.all([
        this.getTotalClientes(workspaceId, startDate, endDate),
        this.getNovasConversas(workspaceId, startDate, endDate),
        this.getMensagensEnviadas(workspaceId, startDate, endDate),
        this.getAtendimentosFinalizados(workspaceId, startDate, endDate),
        this.getTempoMedioResposta(workspaceId, startDate, endDate),
        this.getTaxaConversao(workspaceId, startDate, endDate),
        this.getReceitaTotal(workspaceId, startDate, endDate),
      ]);
      
      return {
        totalClientes,
        novasConversas,
        mensagensEnviadas,
        atendimentosFinalizados,
        tempoMedioResposta: Math.round(tempoMedioResposta),
        taxaConversao: Math.round(taxaConversao * 100),
        receitaTotal,
        periodo: period,
        dataInicio: startDate,
        dataFim: endDate,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Erro ao gerar estatísticas do dashboard:', error);
      throw new AppError(`Erro ao gerar estatísticas: ${error.message}`, 'DASHBOARD_STATS_ERROR');
    }
  }
  
  // Tendências de conversação
  async getConversationTrends(workspaceId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const trends = await db.sequelize.query(`
        SELECT 
          DATE(created_at) as data,
          COUNT(*) as total_mensagens,
          SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as mensagens_recebidas,
          SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as mensagens_enviadas,
          COUNT(DISTINCT cliente_id) as clientes_ativos,
          ROUND(AVG(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) * 100, 2) as taxa_resposta
        FROM conversas_interacoes
        WHERE workspace_id = :workspaceId
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE(created_at)
        ORDER BY data ASC
      `, {
        replacements: { workspaceId, startDate, endDate },
        type: QueryTypes.SELECT,
      });
      
      return trends;
    } catch (error) {
      logger.error('Erro ao gerar tendências de conversação:', error);
      throw new AppError('Erro ao gerar tendências', 'CONVERSATION_TRENDS_ERROR');
    }
  }
  
  // Desempenho dos operadores
  async getOperatorPerformance(workspaceId, startDate, endDate) {
    try {
      const performance = await db.sequelize.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          u.role,
          COUNT(DISTINCT f.id) as total_atendimentos,
          COUNT(DISTINCT CASE WHEN f.status = 'done' THEN f.id END) as atendimentos_concluidos,
          COUNT(DISTINCT CASE WHEN f.status = 'cancelled' THEN f.id END) as atendimentos_cancelados,
          ROUND(AVG(EXTRACT(EPOCH FROM (f.updated_at - f.created_at)) / 60), 2) as tempo_medio_atendimento,
          COUNT(ci.id) as mensagens_enviadas,
          ROUND(
            COUNT(DISTINCT CASE WHEN f.status = 'done' THEN f.id END) * 100.0 / 
            NULLIF(COUNT(DISTINCT f.id), 0), 
            2
          ) as taxa_sucesso,
          ROUND(
            COUNT(DISTINCT CASE WHEN f.status = 'done' AND f.lock_expires_at IS NOT NULL THEN f.id END) * 100.0 /
            NULLIF(COUNT(DISTINCT f.id), 0),
            2
          ) as taxa_conclusao_tempo
        FROM users u
        LEFT JOIN fila_humana f ON f.operador_id = u.id 
          AND f.workspace_id = :workspaceId
          AND f.created_at BETWEEN :startDate AND :endDate
        LEFT JOIN conversas_interacoes ci ON ci.operador_id = u.id 
          AND ci.workspace_id = :workspaceId
          AND ci.direction = 'outbound'
          AND ci.created_at BETWEEN :startDate AND :endDate
        WHERE u.workspace_id = :workspaceId
          AND u.ativo = true
          AND u.role IN ('admin', 'supervisor', 'operator')
        GROUP BY u.id, u.nome, u.email, u.role
        ORDER BY total_atendimentos DESC
      `, {
        replacements: { workspaceId, startDate, endDate },
        type: QueryTypes.SELECT,
      });
      
      return performance;
    } catch (error) {
      logger.error('Erro ao gerar desempenho dos operadores:', error);
      throw new AppError('Erro ao gerar relatório de desempenho', 'OPERATOR_PERFORMANCE_ERROR');
    }
  }
  
  // Métricas da fila
  async getFilaMetrics(workspaceId, period = 'week') {
    try {
      const { startDate, endDate } = this.getDateRange(period);
      
      const metrics = await db.sequelize.query(`
        SELECT 
          status,
          COUNT(*) as quantidade,
          ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60), 2) as tempo_medio_minutos,
          ROUND(MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60), 2) as tempo_maximo_minutos,
          ROUND(MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 60), 2) as tempo_minimo_minutos,
          ROUND(AVG(EXTRACT(EPOCH FROM (lock_expires_at - created_at)) / 60), 2) as tempo_medio_lock_minutos
        FROM fila_humana
        WHERE workspace_id = :workspaceId
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY status
        ORDER BY quantidade DESC
      `, {
        replacements: { workspaceId, startDate, endDate },
        type: QueryTypes.SELECT,
      });
      
      return metrics;
    } catch (error) {
      logger.error('Erro ao gerar métricas da fila:', error);
      throw new AppError('Erro ao gerar métricas', 'FILA_METRICS_ERROR');
    }
  }
  
  // Fluxos mais populares
  async getPopularFlows(workspaceId, limit = 10) {
    try {
      const flows = await db.ClienteEstado.findAll({
        where: { workspace_id: workspaceId },
        attributes: [
          'state',
          [Sequelize.fn('COUNT', Sequelize.col('state')), 'count'],
          [Sequelize.fn('AVG', Sequelize.literal("EXTRACT(EPOCH FROM (updated_at - created_at)) / 60")), 'avg_duration'],
          [Sequelize.fn('MAX', Sequelize.literal("EXTRACT(EPOCH FROM (updated_at - created_at)) / 60")), 'max_duration'],
          [Sequelize.fn('MIN', Sequelize.literal("EXTRACT(EPOCH FROM (updated_at - created_at)) / 60")), 'min_duration'],
        ],
        group: ['state'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('state')), 'DESC']],
        limit,
        raw: true,
      });
      
      return flows;
    } catch (error) {
      logger.error('Erro ao gerar fluxos populares:', error);
      throw new AppError('Erro ao gerar relatório de fluxos', 'POPULAR_FLOWS_ERROR');
    }
  }
  
  // Aquisição de clientes
  async getClientAcquisition(workspaceId, days = 90) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const acquisition = await db.sequelize.query(`
        SELECT 
          DATE(created_at) as data,
          COUNT(*) as novos_clientes,
          COUNT(DISTINCT origem) as origens_diferentes,
          STRING_AGG(DISTINCT origem, ', ') as origens,
          COUNT(DISTINCT CASE WHEN tags::jsonb ? 'lead_quente' THEN id END) as leads_quentes,
          COUNT(DISTINCT CASE WHEN tags::jsonb ? 'lead_frio' THEN id END) as leads_frios
        FROM clientes
        WHERE workspace_id = :workspaceId
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE(created_at)
        ORDER BY data ASC
      `, {
        replacements: { workspaceId, startDate, endDate },
        type: QueryTypes.SELECT,
      });
      
      return acquisition;
    } catch (error) {
      logger.error('Erro ao gerar aquisição de clientes:', error);
      throw new AppError('Erro ao gerar relatório de aquisição', 'CLIENT_ACQUISITION_ERROR');
    }
  }
  
  // Métricas do catálogo
  async getCatalogoMetrics(workspaceId) {
    try {
      const metrics = await db.sequelize.query(`
        SELECT 
          COUNT(*) as total_itens,
          COUNT(CASE WHEN ativo = true THEN 1 END) as itens_ativos,
          COUNT(CASE WHEN ativo = false THEN 1 END) as itens_inativos,
          ROUND(AVG(preco), 2) as preco_medio,
          MIN(preco) as preco_minimo,
          MAX(preco) as preco_maximo,
          familia,
          COUNT(*) as quantidade_por_familia,
          ROUND(AVG(preco), 2) as preco_medio_familia
        FROM catalogo_itens
        WHERE workspace_id = :workspaceId
        GROUP BY familia
        ORDER BY quantidade_por_familia DESC
      `, {
        replacements: { workspaceId },
        type: QueryTypes.SELECT,
      });
      
      return metrics;
    } catch (error) {
      logger.error('Erro ao gerar métricas do catálogo:', error);
      throw new AppError('Erro ao gerar relatório do catálogo', 'CATALOGO_METRICS_ERROR');
    }
  }
  
  // Estatísticas de horários de pico
  async getPeakHours(workspaceId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const peakHours = await db.sequelize.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hora,
          COUNT(*) as total_mensagens,
          COUNT(DISTINCT cliente_id) as clientes_unicos,
          ROUND(AVG(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) * 100, 2) as taxa_resposta,
          STRING_AGG(DISTINCT TO_CHAR(created_at, 'HH24:MI'), ', ') as horarios
        FROM conversas_interacoes
        WHERE workspace_id = :workspaceId
          AND created_at BETWEEN :startDate AND :endDate
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY total_mensagens DESC
      `, {
        replacements: { workspaceId, startDate, endDate },
        type: QueryTypes.SELECT,
      });
      
      return peakHours;
    } catch (error) {
      logger.error('Erro ao gerar horários de pico:', error);
      throw new AppError('Erro ao gerar relatório de horários', 'PEAK_HOURS_ERROR');
    }
  }
  
  // Métodos auxiliares
  async getTotalClientes(workspaceId, startDate, endDate) {
    const count = await db.Cliente.count({
      where: {
        workspace_id: workspaceId,
        created_at: { [Op.between]: [startDate, endDate] },
      },
    });
    return count;
  }
  
  async getNovasConversas(workspaceId, startDate, endDate) {
    const count = await db.ConversaInteracao.count({
      where: {
        workspace_id: workspaceId,
        direction: 'inbound',
        created_at: { [Op.between]: [startDate, endDate] },
      },
      distinct: true,
      col: 'cliente_id',
    });
    return count;
  }
  
  async getMensagensEnviadas(workspaceId, startDate, endDate) {
    const count = await db.ConversaInteracao.count({
      where: {
        workspace_id: workspaceId,
        direction: 'outbound',
        created_at: { [Op.between]: [startDate, endDate] },
      },
    });
    return count;
  }
  
  async getAtendimentosFinalizados(workspaceId, startDate, endDate) {
    const count = await db.FilaHumana.count({
      where: {
        workspace_id: workspaceId,
        status: 'done',
        updated_at: { [Op.between]: [startDate, endDate] },
      },
    });
    return count;
  }
  
  async getTempoMedioResposta(workspaceId, startDate, endDate) {
    const result = await db.sequelize.query(`
      SELECT ROUND(AVG(response_time), 2) as avg_response_time
      FROM (
        SELECT 
          EXTRACT(EPOCH FROM (MIN(c2.created_at) - c1.created_at)) / 60 as response_time
        FROM conversas_interacoes c1
        LEFT JOIN conversas_interacoes c2 ON c1.cliente_id = c2.cliente_id
          AND c2.direction = 'outbound'
          AND c2.created_at > c1.created_at
          AND c2.created_at < c1.created_at + INTERVAL '1 hour'
        WHERE c1.workspace_id = :workspaceId
          AND c1.direction = 'inbound'
          AND c1.created_at BETWEEN :startDate AND :endDate
        GROUP BY c1.id
      ) as response_times
      WHERE response_time > 0 AND response_time < 60
    `, {
      replacements: { workspaceId, startDate, endDate },
      type: QueryTypes.SELECT,
    });
    
    return result[0]?.avg_response_time || 0;
  }
  
  async getTaxaConversao(workspaceId, startDate, endDate) {
    const [conversations, atendimentos] = await Promise.all([
      this.getNovasConversas(workspaceId, startDate, endDate),
      this.getAtendimentosFinalizados(workspaceId, startDate, endDate),
    ]);
    
    return conversations > 0 ? atendimentos / conversations : 0;
  }
  
  async getReceitaTotal(workspaceId, startDate, endDate) {
    // Este método depende da implementação de vendas/pedidos
    // Retornar 0 por enquanto, implementar quando houver módulo de vendas
    return 0;
  }
  
  getDateRange(period) {
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }
    
    return { startDate, endDate };
  }
  
  // Exportar relatório
  async exportReport(workspaceId, reportType, format = 'json', options = {}) {
    try {
      let data;
      let filename = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}`;
      
      switch (reportType) {
        case 'dashboard':
          data = await this.getDashboardStats(workspaceId, options.period || 'month');
          break;
        case 'conversations':
          data = await this.getConversationTrends(workspaceId, options.days || 30);
          break;
        case 'operators':
          const { startDate, endDate } = this.getDateRange(options.period || 'month');
          data = await this.getOperatorPerformance(workspaceId, startDate, endDate);
          break;
        case 'fila':
          data = await this.getFilaMetrics(workspaceId, options.period || 'week');
          break;
        case 'flows':
          data = await this.getPopularFlows(workspaceId, options.limit || 10);
          break;
        case 'acquisition':
          data = await this.getClientAcquisition(workspaceId, options.days || 90);
          break;
        case 'catalogo':
          data = await this.getCatalogoMetrics(workspaceId);
          break;
        case 'peak_hours':
          data = await this.getPeakHours(workspaceId, options.days || 30);
          break;
        default:
          throw new AppError('Tipo de relatório inválido', 'INVALID_REPORT_TYPE');
      }
      
      if (format === 'csv') {
        return {
          data: this.convertToCSV(data),
          filename: `${filename}.csv`,
          contentType: 'text/csv',
        };
      } else if (format === 'json') {
        return {
          data: JSON.stringify(data, null, 2),
          filename: `${filename}.json`,
          contentType: 'application/json',
        };
      } else if (format === 'excel') {
        const excelData = await this.convertToExcel(data, reportType);
        return {
          data: excelData,
          filename: `${filename}.xlsx`,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      }
      
      return { data, filename: `${filename}.${format}` };
    } catch (error) {
      logger.error('Erro ao exportar relatório:', error);
      throw new AppError(`Erro ao exportar relatório: ${error.message}`, 'REPORT_EXPORT_ERROR');
    }
  }
  
  convertToCSV(data) {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return '';
    }
    
    let items = data;
    if (!Array.isArray(data)) {
      items = [data];
    }
    
    const headers = Object.keys(items[0]);
    const csvRows = [
      headers.join(','),
      ...items.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          return stringValue.includes(',') || stringValue.includes('"') 
            ? `"${stringValue.replace(/"/g, '""')}"` 
            : stringValue;
        }).join(',')
      ),
    ];
    
    return csvRows.join('\n');
  }
  
  async convertToExcel(data, reportType) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(reportType);
      
      if (Array.isArray(data) && data.length > 0) {
        // Adicionar cabeçalhos
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);
        
        // Adicionar dados
        data.forEach(row => {
          const rowData = headers.map(header => row[header]);
          worksheet.addRow(rowData);
        });
        
        // Estilizar cabeçalho
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Ajustar largura das colunas
        worksheet.columns = headers.map(header => ({
          width: Math.max(header.length, 15)
        }));
      }
      
      // Gerar buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      logger.error('Erro ao converter para Excel:', error);
      throw new AppError('Erro ao gerar Excel', 'EXCEL_CONVERSION_ERROR');
    }
  }
}

module.exports = ReportService;