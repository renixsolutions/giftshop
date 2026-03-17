exports.up = function(knex) {
  return knex.raw(`
    ALTER TABLE products 
    ALTER COLUMN title TYPE VARCHAR(500),
    ALTER COLUMN image TYPE TEXT,
    ALTER COLUMN category TYPE VARCHAR(100);
  `);
};

exports.down = function(knex) {
  return knex.raw(`
    ALTER TABLE products 
    ALTER COLUMN title TYPE VARCHAR(255),
    ALTER COLUMN image TYPE VARCHAR(255),
    ALTER COLUMN category TYPE VARCHAR(255);
  `);
};

