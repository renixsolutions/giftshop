exports.up = function (knex) {
  return knex.schema.alterTable('order_items', function (table) {
    table.integer('product_id').unsigned().nullable().alter();
    table.string('item_type', 20).defaultTo('product'); // 'product' | 'hamper'
    table.jsonb('hamper_data').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('order_items', function (table) {
    table.dropColumn('item_type');
    table.dropColumn('hamper_data');
    table.integer('product_id').unsigned().notNullable().alter();
  });
};
