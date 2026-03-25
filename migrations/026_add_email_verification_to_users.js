exports.up = function (knex) {
  return knex.schema.table('users', function (table) {
    // For backwards compatibility with existing users:
    // if this column is NULL, treat it as already verified in the app logic.
    table.boolean('email_verified').nullable();
    table.string('email_verification_token').unique().nullable();
    table.timestamp('email_verification_expires_at').nullable();
    table.timestamp('email_verified_at').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table('users', function (table) {
    table.dropColumn('email_verified');
    table.dropColumn('email_verification_token');
    table.dropColumn('email_verification_expires_at');
    table.dropColumn('email_verified_at');
  });
};

