exports.up = function (knex) {
  return knex.schema.table('products', function (table) {
    table.boolean('is_personalized').defaultTo(false);
    table.string('personalization_type', 20).nullable(); // 'text' | 'image'
    table.boolean('is_hamper_item').defaultTo(false);
    table.string('hamper_gender', 20).nullable(); // 'male' | 'female' | 'unisex'
  });
};

exports.down = function (knex) {
  return knex.schema.table('products', function (table) {
    table.dropColumn('is_personalized');
    table.dropColumn('personalization_type');
    table.dropColumn('is_hamper_item');
    table.dropColumn('hamper_gender');
  });
};
