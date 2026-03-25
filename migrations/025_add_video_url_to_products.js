exports.up = function (knex) {
  return knex.schema.table('products', function (table) {
    table.string('video_url').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('products', function (table) {
    table.dropColumn('video_url');
  });
};

