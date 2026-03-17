exports.up = function (knex) {
  return knex.schema.createTable('occasions', function (table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('slug').notNullable().unique();
    table.text('description').nullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').nullable();
  }).then(() =>
    knex.schema.table('products', function (table) {
      table.integer('occasion_id').unsigned().nullable()
        .references('id').inTable('occasions').onDelete('SET NULL');
      table.string('occasion').nullable();
    })
  );
};

exports.down = function (knex) {
  return knex.schema.table('products', function (table) {
    table.dropColumn('occasion_id');
    table.dropColumn('occasion');
  }).then(() =>
    knex.schema.dropTableIfExists('occasions')
  );
};

