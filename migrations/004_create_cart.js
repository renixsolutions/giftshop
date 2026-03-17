exports.up = function(knex) {
  return knex.schema.createTable('cart', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.integer('quantity').defaultTo(1);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
    table.unique(['user_id', 'product_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('cart');
};

