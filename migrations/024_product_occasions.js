exports.up = function (knex) {
  return knex.schema.createTable('product_occasions', function (table) {
    table.increments('id').primary();
    table
      .integer('product_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('products')
      .onDelete('CASCADE');
    table
      .integer('occasion_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('occasions')
      .onDelete('CASCADE');
    table.integer('sort_order').defaultTo(0);
    table.unique(['product_id', 'occasion_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('product_occasions');
};

