exports.seed = function (knex) {
  return knex('hamper_boxes')
    .del()
    .then(function () {
      return knex('hamper_boxes').insert([
        { name: 'Pinewood Tray', base_price: 499, description: 'Classic wooden tray', icon: '📦', sort_order: 1 },
        { name: 'Kappa Board Box', base_price: 349, description: 'Lightweight sturdy box', icon: '📦', sort_order: 2 },
        { name: 'Suede Box', base_price: 599, description: 'Premium suede finish', icon: '🎁', sort_order: 3 },
        { name: 'Acrylic Box', base_price: 699, description: 'Clear acrylic display', icon: '✨', sort_order: 4 },
      ]);
    });
};
