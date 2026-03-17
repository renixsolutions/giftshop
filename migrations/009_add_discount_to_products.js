exports.up = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.decimal('original_price', 10, 2);
    table.integer('discount_percentage').defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.dropColumn('original_price');
    table.dropColumn('discount_percentage');
  });
};

