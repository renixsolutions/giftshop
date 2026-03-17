exports.up = function(knex) {
  return knex.schema.createTable('categories', function(table) {
    table.increments('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description').nullable();
    table.string('slug', 100).notNullable().unique();
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('categories');
};

