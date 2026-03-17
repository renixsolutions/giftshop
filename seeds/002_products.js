exports.seed = async function(knex) {
  await knex('products').del();
  
  await knex('products').insert([
    {
      id: 1,
      title: 'Silk Kanjivaram Saree',
      description: 'Beautiful traditional Kanjivaram silk saree with intricate zari work. Perfect for weddings and special occasions.',
      price: 15000.00,
      image: 'https://via.placeholder.com/400x600?text=Silk+Kanjivaram',
      stock: 25,
      category: 'Silk',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      title: 'Banarasi Silk Saree',
      description: 'Elegant Banarasi silk saree with gold and silver brocade. A timeless piece for traditional celebrations.',
      price: 12000.00,
      image: 'https://via.placeholder.com/400x600?text=Banarasi+Silk',
      stock: 30,
      category: 'Silk',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 3,
      title: 'Cotton Handloom Saree',
      description: 'Comfortable and stylish cotton handloom saree. Ideal for daily wear and casual occasions.',
      price: 2500.00,
      image: 'https://via.placeholder.com/400x600?text=Cotton+Handloom',
      stock: 50,
      category: 'Cotton',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 4,
      title: 'Chiffon Designer Saree',
      description: 'Modern chiffon designer saree with contemporary patterns. Perfect for parties and formal events.',
      price: 4500.00,
      image: 'https://via.placeholder.com/400x600?text=Chiffon+Designer',
      stock: 40,
      category: 'Chiffon',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 5,
      title: 'Georgette Embroidered Saree',
      description: 'Elegant georgette saree with beautiful embroidery work. Lightweight and graceful for any occasion.',
      price: 3500.00,
      image: 'https://via.placeholder.com/400x600?text=Georgette+Embroidered',
      stock: 35,
      category: 'Georgette',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
};

