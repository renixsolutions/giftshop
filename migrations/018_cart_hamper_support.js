exports.up = function (knex) {
  return knex.schema.alterTable('cart', function (table) {
    table.dropUnique(['user_id', 'product_id']);
    table.string('item_type', 20).defaultTo('product'); // 'product' | 'hamper'
    table.jsonb('hamper_data').nullable(); // { boxId, items: [{productId, qty, personalization}], giftNote, deliveryDate, total }
    table.integer('product_id').unsigned().nullable().alter();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('cart', function (table) {
    table.unique(['user_id', 'product_id']);
    table.dropColumn('item_type');
    table.dropColumn('hamper_data');
    table.integer('product_id').unsigned().notNullable().alter();
  });
};
