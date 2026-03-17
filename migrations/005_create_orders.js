exports.up = function(knex) {
  return knex.schema.createTable('orders', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.decimal('total_amount', 10, 2).notNullable();
    table.string('status').defaultTo('pending');
    table.timestamps(true, true);
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('orders');
};

