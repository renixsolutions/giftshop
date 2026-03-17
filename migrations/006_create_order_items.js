exports.up = function(knex) {
  return knex.schema.createTable('order_items', function(table) {
    table.increments('id').primary();
    table.integer('order_id').unsigned().notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 10, 2).notNullable();
    table.foreign('order_id').references('id').inTable('orders').onDelete('CASCADE');
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('order_items');
};

