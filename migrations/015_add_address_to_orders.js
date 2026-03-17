/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.up = function(knex) {
  return knex.schema.table('orders', function(table) {
    table.string('customer_name', 255).nullable();
    table.string('customer_phone', 20).nullable();
    table.text('shipping_address').nullable();
    table.string('city', 100).nullable();
    table.string('state', 100).nullable();
    table.string('pincode', 10).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.down = function(knex) {
  return knex.schema.table('orders', function(table) {
    table.dropColumn('customer_name');
    table.dropColumn('customer_phone');
    table.dropColumn('shipping_address');
    table.dropColumn('city');
    table.dropColumn('state');
    table.dropColumn('pincode');
  });
};

