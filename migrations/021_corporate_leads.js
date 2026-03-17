exports.up = function (knex) {
  return knex.schema.createTable('corporate_leads', function (table) {
    table.increments('id').primary();
    table.string('company_name', 200).nullable();
    table.string('contact_person', 200).nullable();
    table.string('email', 200).notNullable();
    table.string('phone', 50).nullable();
    table.text('message').nullable();
    table.string('status', 30).defaultTo('new'); // 'new' | 'in_progress' | 'closed'
    table.text('admin_notes').nullable();
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('corporate_leads');
};
