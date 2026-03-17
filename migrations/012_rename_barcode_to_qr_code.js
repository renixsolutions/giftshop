exports.up = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.renameColumn('barcode', 'qr_code');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('products', function(table) {
    table.renameColumn('qr_code', 'barcode');
  });
};

