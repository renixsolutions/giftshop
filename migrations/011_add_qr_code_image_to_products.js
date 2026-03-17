exports.up = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.text('qr_code_image');
    // Increase barcode column size to store full URLs
    table.string('barcode', 500).alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.dropColumn('qr_code_image');
    table.string('barcode', 100).alter();
  });
};

