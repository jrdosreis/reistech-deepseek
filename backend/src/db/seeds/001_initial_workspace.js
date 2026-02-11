const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('workspaces', [{
      id: uuidv4(),
      slug: 'reis-celulares',
      nome: 'Reis Celulares',
      vertical_key: 'iphone_store',
      timezone: 'America/Sao_Paulo',
      moeda: 'BRL',
      ativo: true,
      config: JSON.stringify({
        whatsapp: {
          welcome_message: true,
          auto_reply: true,
          business_hours: {
            enabled: true,
            timezone: 'America/Sao_Paulo',
            schedule: {
              monday: { from: '09:00', to: '18:00' },
              tuesday: { from: '09:00', to: '18:00' },
              wednesday: { from: '09:00', to: '18:00' },
              thursday: { from: '09:00', to: '18:00' },
              friday: { from: '09:00', to: '18:00' },
              saturday: { from: '09:00', to: '13:00' },
              sunday: { from: '00:00', to: '00:00' },
            },
            out_of_hours_message: 'Estamos fora do horário de atendimento. Responderemos assim que possível.'
          }
        },
        catalogo: {
          format: 'whatsapp',
          show_prices: true,
          group_by_family: true,
          currency_format: 'R$',
          decimal_separator: ',',
          thousand_separator: '.',
        },
        fsm: {
          timeout_minutes: 30,
          max_retries: 3,
          auto_escalation: {
            enabled: true,
            conditions: [
              { intent: 'HUMANO_SOLICITADO', immediate: true },
              { dossier_completeness: 0.8, priority: 'medium' },
              { timeout: 300, priority: 'low' }
            ]
          }
        }
      }),
      created_at: new Date(),
      updated_at: new Date(),
    }], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('workspaces', { slug: 'reis-celulares' }, {});
  },
};