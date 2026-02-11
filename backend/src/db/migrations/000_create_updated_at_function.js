module.exports = {
  async up(pgm) {
    pgm.sql(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = current_timestamp;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  },

  async down(pgm) {
    pgm.sql('DROP FUNCTION IF EXISTS update_updated_at_column();');
  },
};
