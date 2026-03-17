const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  await knex('admins').del();
  
  await knex('admins').insert([
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@shubhamcollection.com',
      password: hashedPassword,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};

