const path = require('path');
const fs = require('fs');
const db = require('../models');

async function runSeeds() {
  const queryInterface = db.sequelize.getQueryInterface();
  const seedsDir = __dirname;
  const seedFiles = fs
    .readdirSync(seedsDir)
    .filter((file) => file !== 'runner.js' && file.endsWith('.js'))
    .sort();

  for (const file of seedFiles) {
    const seedPath = path.join(seedsDir, file);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const seed = require(seedPath);

    if (typeof seed.up === 'function') {
      // eslint-disable-next-line no-console
      console.log(`🌱 Executando seed: ${file}`);
      await seed.up(queryInterface);
    }
  }
}

runSeeds()
  .then(async () => {
    await db.sequelize.close();
    // eslint-disable-next-line no-console
    console.log('✅ Seeds executados com sucesso');
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error('❌ Erro ao executar seeds:', error);
    await db.sequelize.close();
    process.exit(1);
  });
