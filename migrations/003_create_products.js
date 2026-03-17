exports.up = function(knex) {
  return knex.schema.createTable('products', function(table) {
    table.increments('id').primary();
    table.string('title', 500).notNullable();
    table.text('description').notNullable();
    table.decimal('price', 10, 2).notNullable();
    table.text('image');
    table.integer('stock').defaultTo(0);
    table.string('category', 100).notNullable();
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('products');
};

