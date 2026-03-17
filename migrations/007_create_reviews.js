exports.up = function(knex) {
  return knex.schema.createTable('reviews', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('product_id').unsigned().notNullable();
    table.integer('rating').notNullable();
    table.text('message');
    table.timestamps(true, true);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.foreign('product_id').references('id').inTable('products').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('reviews');
};

