/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('orders', function(table) {
    table.string('razorpay_order_id').nullable();
    table.string('razorpay_payment_id').nullable();
    table.string('razorpay_signature').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('orders', function(table) {
    table.dropColumn('razorpay_order_id');
    table.dropColumn('razorpay_payment_id');
    table.dropColumn('razorpay_signature');
  });
};
