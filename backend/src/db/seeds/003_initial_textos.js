const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    // Tenta buscar pelo workspace específico do pack 'iphone_store'
    let [workspace] = await queryInterface.sequelize.query(
      "SELECT id FROM workspaces WHERE vertical_key = 'iphone_store' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    // Fallback: Se não achar o específico, pega o primeiro disponível (ambiente dev)
    if (!workspace) {
      [workspace] = await queryInterface.sequelize.query(
        'SELECT id FROM workspaces LIMIT 1',
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
    }

    if (!workspace) {
      console.warn('Nenhum workspace encontrado. Pulando seed de textos.');
      return;
    }

    const textos = [
      // Menu Principal
      { chave: 'menu.principal.titulo', conteudo: '🤖 *Bem-vindo à Reis Celulares* 🤖' },
      { chave: 'menu.principal.opcoes', conteudo: 'Escolha uma opção:\n\n1️⃣ *Catálogo* - Ver modelos de iPhone\n2️⃣ *Acessórios* - Capas, carregadores e mais\n3️⃣ *Assistência Técnica* - Conserto e reparos\n4️⃣ *Serviços* - Manutenção preventiva\n5️⃣ *Pós-venda e Garantia*\n6️⃣ *Falar com Atendente*\n\nDigite o número da opção desejada.' },
      
      // Estados FSM
      { chave: 'estado.inicio_sessao', conteudo: '👋 Olá! Bem-vindo à Reis Celulares. Estou preparando seu atendimento...' },
      { chave: 'estado.menu_principal', conteudo: 'Por favor, escolha uma das opções acima.' },
      
      // Fluxo Catálogo
      { chave: 'catalogo.menu.titulo', conteudo: '📱 *Catálogo de iPhones*' },
      { chave: 'catalogo.menu.opcoes', conteudo: 'Escolha uma categoria:\n\n1. iPhone 15 (Novo)\n2. iPhone 14 (Semi-novo)\n3. iPhone 13 (Excelente estado)\n4. Outros modelos\n5. Voltar\n\nDigite o número da opção desejada.' },
      
      // Mensagens de erro
      { chave: 'sistema.erro.fallback', conteudo: 'Desculpe, estou com problemas técnicos. Por favor, tente novamente em alguns instantes.' },
      { chave: 'sistema.erro.opcao_invalida', conteudo: '❌ Opção inválida. Por favor, escolha uma das opções listadas.' },
      
      // Escalonamento humano
      { chave: 'escalamento.humano.confirmacao', conteudo: '✅ Sua solicitação foi encaminhada para nossa equipe. Em breve um atendente entrará em contato.' },
      { chave: 'escalamento.humano.em_fila', conteudo: '⏳ Você está na fila de atendimento. Aguarde por favor.' },
      
      // Encerramento
      { chave: 'encerramento.obrigado', conteudo: 'Obrigado por entrar em contato com a Reis Celulares! Tenha um ótimo dia! 👋' },
    ];

    const textosComIds = textos.map(texto => ({
      id: uuidv4(),
      workspace_id: workspace.id,
      ...texto,
      ativo: true,
      updated_at: new Date(),
    }));

    await queryInterface.bulkInsert('textos_cms', textosComIds, {});
  },

  async down(queryInterface) {
    // Buscar workspace_id
    const [workspace] = await queryInterface.sequelize.query(
      'SELECT id FROM workspaces LIMIT 1',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (workspace) {
      await queryInterface.bulkDelete('textos_cms', { workspace_id: workspace.id }, {});
    }
  },
};