const bcrypt = require('bcryptjs');
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

    const passwordHash = await bcrypt.hash('Admin123!', 10);

    await queryInterface.bulkInsert('users', [{
      id: uuidv4(),
      workspace_id: workspace.id,
      nome: 'Administrador',
      email: 'admin@reiscelulares.com.br',
      password_hash: passwordHash,
      role: 'admin',
      ativo: true,
      config: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    }], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { email: 'admin@reiscelulares.com.br' }, {});
  },
};