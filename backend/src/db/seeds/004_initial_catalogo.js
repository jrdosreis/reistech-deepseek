const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    // Buscar workspace_id
    const [workspace] = await queryInterface.sequelize.query(
      'SELECT id FROM workspaces WHERE slug = ?',
      { replacements: ['reis-celulares'], type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (!workspace) {
      throw new Error('Workspace reis-celulares não encontrado');
    }

    const catalogoItens = [
      {
        numero: 1,
        familia: 'iPhone 15',
        variante: 'Pro Max',
        capacidade: '256GB',
        preco: 8500.00,
      },
      {
        numero: 2,
        familia: 'iPhone 15',
        variante: 'Pro',
        capacidade: '256GB',
        preco: 7500.00,
      },
      {
        numero: 3,
        familia: 'iPhone 15',
        variante: 'Plus',
        capacidade: '128GB',
        preco: 6000.00,
      },
      {
        numero: 4,
        familia: 'iPhone 14',
        variante: 'Pro Max',
        capacidade: '256GB',
        preco: 6500.00,
      },
      {
        numero: 5,
        familia: 'iPhone 14',
        variante: 'Pro',
        capacidade: '128GB',
        preco: 5500.00,
      },
      {
        numero: 6,
        familia: 'iPhone 13',
        variante: 'Pro Max',
        capacidade: '256GB',
        preco: 5000.00,
      },
      {
        numero: 7,
        familia: 'iPhone 13',
        variante: 'Pro',
        capacidade: '128GB',
        preco: 4200.00,
      },
      {
        numero: 8,
        familia: 'iPhone 12',
        variante: 'Pro Max',
        capacidade: '256GB',
        preco: 3800.00,
      },
    ];

    const itensComIds = catalogoItens.map(item => ({
      id: uuidv4(),
      workspace_id: workspace.id,
      ...item,
      ativo: true,
      metadata: JSON.stringify({}),
      updated_at: new Date(),
    }));

    await queryInterface.bulkInsert('catalogo_itens', itensComIds, {});
  },

  async down(queryInterface) {
    // Buscar workspace_id
    const [workspace] = await queryInterface.sequelize.query(
      'SELECT id FROM workspaces WHERE slug = ?',
      { replacements: ['reis-celulares'], type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (workspace) {
      await queryInterface.bulkDelete('catalogo_itens', { workspace_id: workspace.id }, {});
    }
  },
};