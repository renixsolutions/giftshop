exports.up = function(knex) {
  return knex.schema.table('products', function(table) {
    table.integer('category_id').nullable().references('id').inTable('categories').onDelete('SET NULL');
    // Keep the category column for backward compatibility, we'll migrate data later
  });
};

exports.down = function(knex) {
  return knex.schema.table('products', function(table) {
    table.dropColumn('category_id');
  });
};

