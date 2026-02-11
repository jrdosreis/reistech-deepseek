const logger = require('../../config/logger');
const db = require('../../db/models');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

class Router {
  constructor(workspaceId) {
    this.workspaceId = workspaceId;
    this.intentKeywords = {
      CATALOGO_MENU: [
        'comprar', 'iphone', 'celular', 'smartphone', 'modelo', 'preço',
        'valor', 'venda', 'novo', 'usado', 'catalogo', 'produto'
      ],
      ACESSORIOS_MENU: [
        'acessorio', 'capa', 'carregador', 'fone', 'pelicula',
        'protetor', 'cabo', 'adaptador'
      ],
      TECNICO_MENU: [
        'consertar', 'conserto', 'reparo', 'tecnico', 'assistencia',
        'defeito', 'quebrado', 'quebrei', 'nao liga', 'tela', 'bateria',
        'arrumar', 'conserta'
      ],
      SERVICOS_MENU: [
        'serviço', 'servico', 'manutenção', 'manutencao', 'preventiva',
        'limpeza', 'configurar', 'configuração', 'ajuda', 'suporte'
      ],
      POS_VENDA_MENU: [
        'garantia', 'pós venda', 'pos venda', 'reclamação', 'reclamacao',
        'problema', 'pedido', 'compra anterior', 'nota fiscal'
      ],
      HUMANO_SOLICITADO: [
        'humano', 'atendente', 'operador', 'pessoa', 'falar com alguém',
        'quero falar', 'atendimento humano'
      ],
    };
  }

  async determineIntent(text, clientState) {
    const safeText = (text || '').trim();

    if (!safeText) {
      if (clientState.state === 'INICIO_SESSAO') {
        return 'MENU_PRINCIPAL';
      }

      return clientState.state === 'MENU_PRINCIPAL' ? 'MENU_PRINCIPAL' : 'VOLTAR_MENU_PRINCIPAL';
    }

    const normalizedText = safeText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const tokens = tokenizer.tokenize(normalizedText);
    
    // Buscar intenção por palavras-chave
    for (const [intent, keywords] of Object.entries(this.intentKeywords)) {
      for (const keyword of keywords) {
        if (normalizedText.includes(keyword) || tokens.includes(keyword)) {
          logger.debug(`Intenção detectada por palavra-chave: ${intent}`, { keyword });
          return intent;
        }
      }
    }

    // Se não detectar, verificar estado atual
    if (clientState.state === 'INICIO_SESSAO') {
      return 'MENU_PRINCIPAL';
    }

    // Verificar se é resposta a pergunta específica do estado atual
    const stateResponses = await this.getStateResponses(clientState.state);
    if (stateResponses) {
      const matched = await this.matchResponseToTransition(safeText, stateResponses);
      if (matched) {
        return matched;
      }

      return clientState.state === 'MENU_PRINCIPAL' ? 'MENU_PRINCIPAL' : 'VOLTAR_MENU_PRINCIPAL';
    }

    // Fallback: voltar ao menu principal
    return 'VOLTAR_MENU_PRINCIPAL';
  }

  async matchResponseToTransition(text, stateResponses) {
    // Implementação simplificada de correspondência
    // Em produção, usar NLP mais avançado
    const normalizedText = text.toLowerCase();
    
    for (const [response, transition] of Object.entries(stateResponses)) {
      if (normalizedText.includes(response.toLowerCase())) {
        return transition;
      }
    }
    
    return null;
  }

  async getStateResponses(state) {
    // Mapeamento de respostas esperadas para cada estado
    const responses = {
      MENU_PRINCIPAL: {
        '1': 'CATALOGO_MENU',
        '2': 'ACESSORIOS_MENU',
        '3': 'TECNICO_MENU',
        '4': 'SERVICOS_MENU',
        '5': 'POS_VENDA_MENU',
        '6': 'HUMANO_SOLICITADO',
        'catálogo': 'CATALOGO_MENU',
        'catalogo': 'CATALOGO_MENU',
        'acessórios': 'ACESSORIOS_MENU',
        'acessorios': 'ACESSORIOS_MENU',
        'técnico': 'TECNICO_MENU',
        'tecnico': 'TECNICO_MENU',
        'serviços': 'SERVICOS_MENU',
        'servicos': 'SERVICOS_MENU',
        'pós venda': 'POS_VENDA_MENU',
        'pos venda': 'POS_VENDA_MENU',
      },
      CATALOGO_LISTA_MODELOS: {
        'voltar': 'VOLTAR_CATALOGO_MENU',
      },
      // Adicionar outros estados conforme necessário
    };

    return responses[state] || null;
  }

  async generateResponse(state, intent, clienteId) {
    try {
      // Buscar textos do CMS
      const cmsText = await this.getCmsTextForState(state.state);
      
      if (cmsText) {
        // Substituir variáveis no texto
        const populatedText = await this.populateTemplate(cmsText, clienteId);
        return {
          type: 'message',
          message: populatedText,
          state: state.state,
          intent,
        };
      }

      // Fallback para textos padrão
      const defaultResponses = {
        MENU_PRINCIPAL: await this.buildMainMenu(),
        CATALOGO_MENU: await this.buildCatalogoMenu(),
        CATALOGO_LISTA_MODELOS: await this.buildCatalogoLista(),
        HUMANO_FILA: 'Sua solicitação foi encaminhada para nossa equipe. Em breve um atendente entrará em contato.',
        AVALIAR_ESCALONAMENTO: 'Analisando sua solicitação...',
      };

      const response = defaultResponses[state.state] || 
                      'Como posso ajudar você hoje?';
      
      return {
        type: 'message',
        message: response,
        state: state.state,
        intent,
      };
    } catch (error) {
      logger.error(`Erro ao gerar resposta: ${error.message}`);
      return {
        type: 'message',
        message: 'Desculpe, ocorreu um erro ao processar sua mensagem.',
        error: true,
      };
    }
  }

  async getCmsTextForState(state) {
    try {
      const texto = await db.TextoCms.findOne({
        where: {
          workspace_id: this.workspaceId,
          chave: `estado.${state.toLowerCase()}`,
          ativo: true,
        }
      });
      
      return texto ? texto.conteudo : null;
    } catch (error) {
      logger.error(`Erro ao buscar texto CMS: ${error.message}`);
      return null;
    }
  }

  async populateTemplate(template, clienteId) {
    // Implementar substituição de variáveis como {nome}, {telefone}, etc.
    // Por enquanto, retorna o template sem modificações
    return template;
  }

  async buildMainMenu() {
    try {
      const textos = await db.TextoCms.findAll({
        where: {
          workspace_id: this.workspaceId,
          chave: {
            [db.Sequelize.Op.like]: 'menu.principal.%'
          },
          ativo: true,
        },
        order: [['chave', 'ASC']]
      });

      if (textos.length > 0) {
        return textos.map(t => t.conteudo).join('\n');
      }

      // Menu padrão
      return `🤖 *Bem-vindo à Reis Celulares* 🤖

Escolha uma opção:
        
1️⃣ *Catálogo* - Ver modelos de iPhone
2️⃣ *Acessórios* - Capas, carregadores e mais
3️⃣ *Assistência Técnica* - Conserto e reparos
4️⃣ *Serviços* - Manutenção preventiva
5️⃣ *Pós-venda e Garantia*
6️⃣ *Falar com Atendente*
        
Digite o número da opção desejada.`;
    } catch (error) {
      logger.error(`Erro ao construir menu principal: ${error.message}`);
      return 'Bem-vindo! Como posso ajudar?';
    }
  }

  async buildCatalogoMenu() {
    return `📱 *Catálogo de iPhones*
    
Escolha uma categoria:
    
1. iPhone 15 (Novo)
2. iPhone 14 (Semi-novo)
3. iPhone 13 (Excelente estado)
4. Outros modelos
5. Voltar
    
Digite o número da opção desejada.`;
  }

  async buildCatalogoLista() {
    try {
      const itens = await db.CatalogoItem.findAll({
        where: {
          workspace_id: this.workspaceId,
          ativo: true,
        },
        order: [['familia', 'ASC'], ['variante', 'ASC']],
        limit: 20,
      });

      if (itens.length === 0) {
        return '📭 Nenhum item disponível no catálogo no momento.';
      }

      let response = '📋 *Catálogo Disponíveis*\n━━━━━━━━━━━━━━━━━━\n\n';
      
      itens.forEach((item, index) => {
        const icon = this.getIconForVariant(item.variante);
        const price = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(item.preco);
        
        response += `${icon} *${index + 1}. ${item.familia} ${item.variante}* ${item.capacidade}\n`;
        response += `   💰 ${price}\n\n`;
      });

      response += '━━━━━━━━━━━━━━━━━━\n';
      response += 'Digite o *número* do item para ver detalhes.\n';
      response += 'Digite *voltar* para retornar.';

      return response;
    } catch (error) {
      logger.error(`Erro ao construir lista de catálogo: ${error.message}`);
      return '❌ Erro ao carregar catálogo. Tente novamente.';
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
}

module.exports = Router;