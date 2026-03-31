exports.up = function(knex) {
  return knex.schema.createTable('store_settings', table => {
    table.increments('id').primary();
    table.string('key').unique();
    table.text('value');
    table.timestamps(true, true);
  }).then(() => {
    return knex('store_settings').insert({
      key: 'pause_orders',
      value: JSON.stringify({
        enabled: false,
        startDate: null,
        endDate: null,
        message: 'Sorry, we are currently facing high demand bulk orders so at the moment we are not taking any orders.'
      })
    });
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('store_settings');
};
