exports.up = function (knex) {
  return knex.schema.createTable('hamper_boxes', function (table) {
    table.increments('id').primary();
    table.string('name', 200).notNullable();
    table.decimal('base_price', 10, 2).notNullable();
    table.text('description').nullable();
    table.string('image', 500).nullable();
    table.string('icon', 50).nullable(); // emoji or icon name for UI
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('hamper_boxes');
};
