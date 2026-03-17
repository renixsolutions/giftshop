exports.up = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.string('barcode', 100).unique();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.dropColumn('barcode');
  });
};

