import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://migzjgwywerfczsaopow.supabase.co';
const rawKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ3pqZ3d5d2VyZmN6c2FvcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODQ0NTMsImV4cCI6MjA5NzQ2MDQ1M30.mXMBgSylJAVmUxqsjuv1LgyFBmgn2mdZMiVtWN5lZD8';

const supabase = createClient(supabaseUrl, rawKey);

async function seed() {
  console.log('--- Starting Complete 4-Row Database Seeding ---');

  // Authenticate as Admin to bypass client RLS block
  const email = 'admin@flashud.com';
  const password = 'admin123';

  console.log(`Authenticating as admin user: ${email}...`);
  let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.log('Admin user does not exist or login failed. Attempting signup...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: 'Seed Admin',
          role: 'admin'
        }
      }
    });

    if (signUpError) {
      console.error('Failed to sign up admin:', signUpError.message);
      console.log('Falling back to direct seeding attempt...');
    } else {
      console.log('Admin user created successfully.');
      authData = signUpData;
    }
  } else {
    console.log('Logged in successfully as admin.');
  }

  const userId = authData?.user?.id || authData?.data?.user?.id;
  if (!userId) {
    console.error('WARNING: Seeding without authenticated user session. Might fail RLS.');
  } else {
    console.log(`Using User ID: ${userId} for user-related table seeds.`);
  }

  // 1. Seed Categories (at least 4)
  const categoriesToSeed = [
    { name: 'Formal Wear', slug: 'formal-wear', thumbnail_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80' },
    { name: 'Casual Wear', slug: 'casual-wear', thumbnail_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80' },
    { name: 'Accessories', slug: 'accessories', thumbnail_url: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=600&auto=format&fit=crop&q=80' },
    { name: 'Activewear', slug: 'activewear', thumbnail_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80' }
  ];

  console.log('Seeding categories...');
  const categoryIds = {};
  for (const cat of categoriesToSeed) {
    const { data, error } = await supabase
      .from('categories')
      .upsert(cat, { onConflict: 'slug' })
      .select('id, name')
      .single();
    
    if (error) {
      console.error(`Error seeding category ${cat.name}:`, error.message);
    } else {
      console.log(`Seeded category: ${data.name} (ID: ${data.id})`);
      categoryIds[data.name] = data.id;
    }
  }

  // 2. Seed Products (at least 4 regular products + hero image)
  const productsToSeed = [
    {
      name: '_HERO_IMAGE_',
      description: 'Hero Image Setting',
      original_price: 0,
      discounted_price: 0,
      category_id: null,
      is_archived: false,
      stock: { S: 0, M: 0, L: 0, XL: 0 },
      images: [
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&auto=format&fit=crop&q=80'
      ],
      is_featured: false,
      is_new_in: false
    },
    {
      name: 'Premium Oxford Shirt',
      description: 'Immaculately tailored classic white Oxford shirt made from premium long-staple cotton.',
      original_price: 2499,
      discounted_price: 1899,
      category_id: categoryIds['Formal Wear'] || null,
      stock: { S: 10, M: 8, L: 15, XL: 5 },
      images: [
        'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80'
      ],
      is_archived: false,
      is_featured: true,
      is_new_in: true,
      new_in_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      name: 'Slim Fit Charcoal Suit',
      description: 'A modern silhouette crafted from high-grade wool blend, perfect for formal occasions.',
      original_price: 8999,
      discounted_price: 6999,
      category_id: categoryIds['Formal Wear'] || null,
      stock: { S: 4, M: 5, L: 6, XL: 2 },
      images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80'
      ],
      is_archived: false,
      is_featured: true,
      is_new_in: false
    },
    {
      name: 'Luxe Cashmere Knitwear',
      description: 'Ultra-soft cashmere crewneck sweater, designed for cozy elegance and warmth.',
      original_price: 4500,
      discounted_price: 3499,
      category_id: categoryIds['Casual Wear'] || null,
      stock: { S: 12, M: 10, L: 8, XL: 4 },
      images: [
        'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
      ],
      is_archived: false,
      is_featured: true,
      is_new_in: true,
      new_in_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      name: 'Classic Silk Tie',
      description: 'Pure mulberry silk tie with elegant micro-patterning, handmade with precision.',
      original_price: 1999,
      discounted_price: 1299,
      category_id: categoryIds['Accessories'] || null,
      stock: { S: 20, M: 20, L: 20, XL: 20 },
      images: [
        'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=600&auto=format&fit=crop&q=80'
      ],
      is_archived: false,
      is_featured: true,
      is_new_in: false
    },
    {
      name: 'Tech Stretch Joggers',
      description: 'Premium stretch fit athletic joggers for high performance or casual lounge.',
      original_price: 2999,
      discounted_price: 1999,
      category_id: categoryIds['Activewear'] || null,
      stock: { S: 15, M: 20, L: 10, XL: 8 },
      images: [
        'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'
      ],
      is_archived: false,
      is_featured: true,
      is_new_in: false
    }
  ];

  console.log('Seeding products...');
  const seededProducts = [];
  for (const prod of productsToSeed) {
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('name', prod.name);
    
    let prodId;
    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('products')
        .update(prod)
        .eq('name', prod.name)
        .select('id, name')
        .single();
      if (error) {
        console.error(`Error updating product ${prod.name}:`, error.message);
      } else {
        console.log(`Updated product: ${data.name} (ID: ${data.id})`);
        prodId = data.id;
      }
    } else {
      const { data, error } = await supabase
        .from('products')
        .insert([prod])
        .select('id, name')
        .single();
      if (error) {
        console.error(`Error inserting product ${prod.name}:`, error.message);
      } else {
        console.log(`Inserted product: ${data.name} (ID: ${data.id})`);
        prodId = data.id;
      }
    }
    if (prodId && prod.name !== '_HERO_IMAGE_') {
      seededProducts.push({ id: prodId, price: prod.discounted_price });
    }
  }

  // 3. Seed Coupons (at least 4)
  const couponsToSeed = [
    { code: 'FLASH50', discount_type: 'percentage', discount_value: 50, min_bill_amount: 0, is_active: true },
    { code: 'FIRST10', discount_type: 'percentage', discount_value: 10, min_bill_amount: 0, is_active: true },
    { code: 'FLASH20', discount_type: 'percentage', discount_value: 20, min_bill_amount: 0, is_active: true },
    { code: 'WELCOME15', discount_type: 'percentage', discount_value: 15, min_bill_amount: 0, is_active: true }
  ];

  console.log('Seeding coupons...');
  for (const coup of couponsToSeed) {
    const { data, error } = await supabase
      .from('coupons')
      .upsert(coup, { onConflict: 'code' })
      .select('id, code')
      .single();
    if (error) {
      console.error(`Error seeding coupon ${coup.code}:`, error.message);
    } else {
      console.log(`Seeded coupon: ${data.code} (ID: ${data.id})`);
    }
  }

  // 4. Seed Banners (at least 4)
  const bannersToSeed = [
    { title: 'SUMMER CAROUSEL 2026', subtitle: 'Step into light tailored layers', image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80', display_order: 1 },
    { title: 'WINTER ARCHIVE 2026', subtitle: 'Warm layers and tailored coats', image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&auto=format&fit=crop&q=80', display_order: 2 },
    { title: 'ELEGANT ACCESSORIES', subtitle: 'Finish the silhouette', image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&auto=format&fit=crop&q=80', display_order: 3 },
    { title: 'ACTIVE ESCAPE', subtitle: 'Perform in premium luxury', image_url: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=1200&auto=format&fit=crop&q=80', display_order: 4 }
  ];

  console.log('Seeding banners...');
  for (const banner of bannersToSeed) {
    const { data: existing } = await supabase
      .from('banners')
      .select('id')
      .eq('title', banner.title);
    
    if (existing && existing.length > 0) {
      const { data, error } = await supabase
        .from('banners')
        .update(banner)
        .eq('title', banner.title)
        .select('id, title')
        .single();
      if (error) {
        console.error(`Error updating banner ${banner.title}:`, error.message);
      } else {
        console.log(`Updated banner: ${data.title} (ID: ${data.id})`);
      }
    } else {
      const { data, error } = await supabase
        .from('banners')
        .insert([banner])
        .select('id, title')
        .single();
      if (error) {
        console.error(`Error inserting banner ${banner.title}:`, error.message);
      } else {
        console.log(`Inserted banner: ${data.title} (ID: ${data.id})`);
      }
    }
  }

  // Seeding User-dependent tables if userId is available
  if (userId && seededProducts.length >= 4) {
    // 5. Seed Orders (at least 4)
    console.log('Seeding orders...');
    const ordersToSeed = [
      { user_id: userId, total_amount: 1899, status: 'completed', shipping_address: '123 Luxury Avenue, Mumbai' },
      { user_id: userId, total_amount: 6999, status: 'pending', shipping_address: '123 Luxury Avenue, Mumbai' },
      { user_id: userId, total_amount: 3499, status: 'processing', shipping_address: '123 Luxury Avenue, Mumbai' },
      { user_id: userId, total_amount: 1999, status: 'delivered', shipping_address: '123 Luxury Avenue, Mumbai' }
    ];

    const orderIds = [];
    for (const order of ordersToSeed) {
      const { data, error } = await supabase
        .from('orders')
        .insert([order])
        .select('id')
        .single();
      if (error) {
        console.error('Error inserting order:', error.message);
      } else {
        console.log(`Inserted order (ID: ${data.id})`);
        orderIds.push(data.id);
      }
    }

    // 6. Seed Order Items (at least 4)
    if (orderIds.length >= 4) {
      console.log('Seeding order items...');
      const orderItemsToSeed = [
        { order_id: orderIds[0], product_id: seededProducts[0].id, quantity: 1, price: seededProducts[0].price },
        { order_id: orderIds[1], product_id: seededProducts[1].id, quantity: 1, price: seededProducts[1].price },
        { order_id: orderIds[2], product_id: seededProducts[2].id, quantity: 1, price: seededProducts[2].price },
        { order_id: orderIds[3], product_id: seededProducts[4].id, quantity: 1, price: seededProducts[4].price }
      ];

      for (const item of orderItemsToSeed) {
        const { error } = await supabase.from('order_items').insert([item]);
        if (error) console.error('Error seeding order item:', error.message);
      }
      console.log('Seeded order items successfully.');
    }

    // 7. Seed Cart Items (at least 4)
    console.log('Seeding cart items...');
    const cartItemsToSeed = [
      { user_id: userId, product_id: seededProducts[0].id, size: 'M', quantity: 1 },
      { user_id: userId, product_id: seededProducts[2].id, size: 'S', quantity: 2 },
      { user_id: userId, product_id: seededProducts[3].id, size: 'L', quantity: 1 },
      { user_id: userId, product_id: seededProducts[4].id, size: 'XL', quantity: 1 }
    ];

    for (const item of cartItemsToSeed) {
      const { error } = await supabase.from('cart_items').upsert(item, { onConflict: 'user_id,product_id,size' });
      if (error) console.error('Error seeding cart item:', error.message);
    }
    console.log('Seeded cart items.');

    // 8. Seed Wishlist Items (at least 4)
    console.log('Seeding wishlist items...');
    const wishlistItemsToSeed = [
      { user_id: userId, product_id: seededProducts[0].id },
      { user_id: userId, product_id: seededProducts[1].id },
      { user_id: userId, product_id: seededProducts[2].id },
      { user_id: userId, product_id: seededProducts[4].id }
    ];

    for (const item of wishlistItemsToSeed) {
      const { error } = await supabase.from('wishlist_items').upsert(item, { onConflict: 'user_id,product_id' });
      if (error) console.error('Error seeding wishlist item:', error.message);
    }
    console.log('Seeded wishlist items.');
  }

  // 9. Seed Sales (at least 4)
  if (seededProducts.length >= 4) {
    console.log('Seeding sales logs...');
    const salesToSeed = [
      { product_id: seededProducts[0].id, product_name: 'Premium Oxford Shirt', size: 'M', quantity: 1, price: seededProducts[0].price, total: seededProducts[0].price },
      { product_id: seededProducts[1].id, product_name: 'Slim Fit Charcoal Suit', size: 'L', quantity: 1, price: seededProducts[1].price, total: seededProducts[1].price },
      { product_id: seededProducts[2].id, product_name: 'Luxe Cashmere Knitwear', size: 'S', quantity: 2, price: seededProducts[2].price, total: seededProducts[2].price * 2 },
      { product_id: seededProducts[4].id, product_name: 'Tech Stretch Joggers', size: 'M', quantity: 1, price: seededProducts[4].price, total: seededProducts[4].price }
    ];

    for (const sale of salesToSeed) {
      const { error } = await supabase.from('sales').insert([sale]);
      if (error) console.error('Error seeding sale log:', error.message);
    }
    console.log('Seeded sales logs.');
  }

  console.log('--- Seeding Completed! ---');
}

seed();
