exports.up = function (knex) {
  return knex.schema.table('orders', function (table) {
    table.date('delivery_date').nullable();
    table.string('payment_mode', 30).nullable(); // 'cod' | 'partial_cod' | 'full_online'
    table.decimal('advanced_paid_amount', 10, 2).defaultTo(0);
    table.text('gift_note').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('orders', function (table) {
    table.dropColumn('delivery_date');
    table.dropColumn('payment_mode');
    table.dropColumn('advanced_paid_amount');
    table.dropColumn('gift_note');
  });
};
