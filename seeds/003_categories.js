/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Check if categories table exists
  const hasTable = await knex.schema.hasTable('categories');
  if (!hasTable) {
    console.log('Categories table does not exist. Please run migrations first.');
    return;
  }

  // Delete all existing entries
  await knex('categories').del();
  
  // Helper function to generate slug
  const generateSlug = (name) => {
    return name.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Insert seed categories
  const categories = [
    {
      name: 'Jeans',
      slug: generateSlug('Jeans'),
      description: 'Comfortable and stylish jeans for all occasions',
      is_active: true,
      sort_order: 1
    },
    {
      name: 'Shirt',
      slug: generateSlug('Shirt'),
      description: 'Formal and casual shirts for men and women',
      is_active: true,
      sort_order: 2
    },
    {
      name: 'Sarees',
      slug: generateSlug('Sarees'),
      description: 'Traditional and modern sarees in various fabrics',
      is_active: true,
      sort_order: 3
    },
    {
      name: 'Lehenga',
      slug: generateSlug('Lehenga'),
      description: 'Elegant lehengas for weddings and special occasions',
      is_active: true,
      sort_order: 4
    },
    {
      name: 'Suits',
      slug: generateSlug('Suits'),
      description: 'Formal suits and blazers for professional wear',
      is_active: true,
      sort_order: 5
    },
    {
      name: 'Kurti',
      slug: generateSlug('Kurti'),
      description: 'Comfortable and trendy kurtis for everyday wear',
      is_active: true,
      sort_order: 6
    },
    {
      name: 'Dress',
      slug: generateSlug('Dress'),
      description: 'Beautiful dresses for all occasions',
      is_active: true,
      sort_order: 7
    },
    {
      name: 'Tops',
      slug: generateSlug('Tops'),
      description: 'Casual and formal tops for women',
      is_active: true,
      sort_order: 8
    },
    {
      name: 'Trousers',
      slug: generateSlug('Trousers'),
      description: 'Comfortable trousers for men and women',
      is_active: true,
      sort_order: 9
    },
    {
      name: 'Skirts',
      slug: generateSlug('Skirts'),
      description: 'Stylish skirts for casual and formal wear',
      is_active: true,
      sort_order: 10
    }
  ];

  // Insert categories
  await knex('categories').insert(categories);
  
  console.log(`✓ Seeded ${categories.length} categories successfully!`);
};

