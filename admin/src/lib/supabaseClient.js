import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const forceMock = import.meta.env.VITE_USE_MOCK_SUPABASE === 'true';

const isValid = (val) => val && val !== 'undefined' && val !== 'null' && val.length > 10;

const supabaseUrl = isValid(rawUrl) ? rawUrl : null;
const supabaseAnonKey = isValid(rawKey) ? rawKey : null;

// Mock Query Builder mimicking Supabase Client PostgREST chaining
class MockQueryBuilder {
  constructor(tableName, selectFields = '*') {
    this.tableName = tableName;
    this.selectFields = selectFields;
    this.filters = [];
    this.sortColumn = null;
    this.sortAscending = true;
    this.limitCount = null;
    this.isSingle = false;
    this.isDelete = false;
    this.isUpdate = false;
    this.isInsert = false;
    this.isUpsert = false;
    this.upsertData = null;
    this.updateData = null;
    this.insertData = null;
  }

  eq(column, value) {
    this.filters.push(item => item[column] === value);
    return this;
  }

  neq(column, value) {
    this.filters.push(item => item[column] !== value);
    return this;
  }

  order(column, options = {}) {
    this.sortColumn = column;
    this.sortAscending = options.ascending !== false;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  match(filterObject) {
    Object.entries(filterObject).forEach(([column, value]) => {
      this.eq(column, value);
    });
    return this;
  }

  async then(resolve, reject) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  async execute() {
    const dbKey = `mock_db_${this.tableName}`;
    let items = [];
    try {
      const stored = localStorage.getItem(dbKey);
      items = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error(`Error parsing mock DB for ${this.tableName}`, e);
    }

    if (this.isInsert) {
      const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];
      const insertedRows = rows.map(row => ({
        id: row.id || 'mock_id_' + Math.random().toString(36).substring(2, 11),
        created_at: row.created_at || new Date().toISOString(),
        ...row
      }));
      items = [...insertedRows, ...items];
      localStorage.setItem(dbKey, JSON.stringify(items));
      window.dispatchEvent(new Event('storage'));
      return { data: this.isSingle ? insertedRows[0] : insertedRows, error: null };
    }

    if (this.isUpsert) {
      const rows = Array.isArray(this.upsertData) ? this.upsertData : [this.upsertData];
      const upsertedRows = [];
      
      rows.forEach(row => {
        let matchIndex = -1;
        if (this.tableName === 'cart_items' || this.tableName === 'wishlist_items') {
          matchIndex = items.findIndex(item => 
            item.user_id === row.user_id && 
            item.product_id === row.product_id && 
            (!row.size || item.size === row.size)
          );
        } else {
          matchIndex = items.findIndex(item => item.id === row.id);
        }

        if (matchIndex >= 0) {
          items[matchIndex] = {
            ...items[matchIndex],
            ...row,
            updated_at: new Date().toISOString()
          };
          upsertedRows.push(items[matchIndex]);
        } else {
          const newRow = {
            id: row.id || 'mock_id_' + Math.random().toString(36).substring(2, 11),
            created_at: row.created_at || new Date().toISOString(),
            ...row
          };
          items.unshift(newRow);
          upsertedRows.push(newRow);
        }
      });
      
      localStorage.setItem(dbKey, JSON.stringify(items));
      window.dispatchEvent(new Event('storage'));
      return { data: this.isSingle ? upsertedRows[0] : upsertedRows, error: null };
    }

    if (this.isUpdate) {
      let updatedCount = 0;
      const updatedRows = [];
      items = items.map(item => {
        const matches = this.filters.every(filterFn => filterFn(item));
        if (matches) {
          updatedCount++;
          const updatedItem = {
            ...item,
            ...this.updateData,
            updated_at: new Date().toISOString()
          };
          updatedRows.push(updatedItem);
          return updatedItem;
        }
        return item;
      });

      if (updatedCount > 0) {
        localStorage.setItem(dbKey, JSON.stringify(items));
        window.dispatchEvent(new Event('storage'));
      }
      return { data: this.isSingle ? updatedRows[0] : updatedRows, error: null };
    }

    if (this.isDelete) {
      const beforeCount = items.length;
      const deletedRows = items.filter(item => this.filters.every(filterFn => filterFn(item)));
      items = items.filter(item => !this.filters.every(filterFn => filterFn(item)));

      if (items.length !== beforeCount) {
        localStorage.setItem(dbKey, JSON.stringify(items));
        window.dispatchEvent(new Event('storage'));
      }
      return { data: deletedRows, error: null };
    }

    let resultData = items.filter(item => this.filters.every(filterFn => filterFn(item)));

    if (this.sortColumn) {
      resultData.sort((a, b) => {
        let valA = a[this.sortColumn];
        let valB = b[this.sortColumn];
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'string') {
          return this.sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          return this.sortAscending ? valA - valB : valB - valA;
        }
      });
    }

    if (this.limitCount !== null) {
      resultData = resultData.slice(0, this.limitCount);
    }

    if (this.selectFields && this.selectFields.includes('profiles')) {
      const profiles = JSON.parse(localStorage.getItem('mock_db_profiles') || '[]');
      resultData = resultData.map(order => {
        const profile = profiles.find(p => p.id === order.user_id) || { full_name: 'Mock Customer' };
        return { ...order, profiles: profile };
      });
    }

    if (this.selectFields && this.selectFields.includes('order_items')) {
      const orderItems = JSON.parse(localStorage.getItem('mock_db_order_items') || '[]');
      const products = JSON.parse(localStorage.getItem('mock_db_products') || '[]');
      resultData = resultData.map(order => {
        const itemsForOrder = orderItems.filter(item => item.order_id === order.id).map(item => {
          const product = products.find(p => p.id === item.product_id) || null;
          return { ...item, products: product };
        });
        return { ...order, order_items: itemsForOrder };
      });
    }

    if (this.isSingle) {
      return { data: resultData[0] || null, error: resultData[0] ? null : { message: 'Row not found' } };
    }

    return { data: resultData, error: null };
  }
}

const authListeners = {};
const triggerAuthStateChange = (event, session) => {
  Object.values(authListeners).forEach(callback => {
    try {
      callback(event, session);
    } catch (e) {
      console.error('Error in auth listener callback:', e);
    }
  });
};

const mockAuth = {
  signUp: async ({ email, password, options }) => {
    console.log('Mock auth: signUp', email);
    const users = JSON.parse(localStorage.getItem('mock_auth_users') || '[]');
    if (users.some(u => u.email === email)) {
      return { data: null, error: { message: 'User already exists' } };
    }
    const newUser = {
      id: 'mock_usr_' + Math.random().toString(36).substring(2, 11),
      email: email,
      role: options?.data?.role || 'user',
      user_metadata: options?.data || {},
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('mock_auth_users', JSON.stringify(users));

    const profiles = JSON.parse(localStorage.getItem('mock_db_profiles') || '[]');
    profiles.push({
      id: newUser.id,
      email: email,
      full_name: options?.data?.full_name || 'Mock Customer',
      role: newUser.role,
      created_at: newUser.created_at
    });
    localStorage.setItem('mock_db_profiles', JSON.stringify(profiles));

    const session = {
      access_token: 'mock_token_' + Math.random().toString(36).substring(2),
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock_refresh_' + Math.random().toString(36).substring(2),
      user: newUser,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };
    localStorage.setItem('mock_auth_session', JSON.stringify(session));
    triggerAuthStateChange('SIGNED_IN', session);

    return { data: { user: newUser, session }, error: null };
  },

  signInWithPassword: async ({ email, password }) => {
    console.log('Mock auth: signIn', email);
    const users = JSON.parse(localStorage.getItem('mock_auth_users') || '[]');
    let user = users.find(u => u.email === email);

    if (!user) {
      // Dynamic fake credentials: auto-create the user!
      const is_admin = email.toLowerCase().includes('admin');
      user = {
        id: is_admin ? 'mock_admin_' + Math.random().toString(36).substring(2, 11) : 'mock_usr_' + Math.random().toString(36).substring(2, 11),
        email: email,
        role: is_admin ? 'admin' : 'user',
        user_metadata: {
          full_name: is_admin ? 'Mock Admin' : 'Mock Customer',
          role: is_admin ? 'admin' : 'user'
        },
        created_at: new Date().toISOString()
      };
      users.push(user);
      localStorage.setItem('mock_auth_users', JSON.stringify(users));

      const profiles = JSON.parse(localStorage.getItem('mock_db_profiles') || '[]');
      if (!profiles.some(p => p.id === user.id)) {
        profiles.push({
          id: user.id,
          email: user.email,
          full_name: is_admin ? 'Mock Admin' : 'Mock Customer',
          role: user.role,
          created_at: user.created_at
        });
        localStorage.setItem('mock_db_profiles', JSON.stringify(profiles));
      }
    }

    const session = {
      access_token: 'mock_token_' + Math.random().toString(36).substring(2),
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock_refresh_' + Math.random().toString(36).substring(2),
      user,
      expires_at: Math.floor(Date.now() / 1000) + 3600
    };

    localStorage.setItem('mock_auth_session', JSON.stringify(session));
    triggerAuthStateChange('SIGNED_IN', session);
    return { data: { user, session }, error: null };
  },

  signOut: async () => {
    console.log('Mock auth: signOut');
    localStorage.removeItem('mock_auth_session');
    // Fire async so it doesn't re-enter a currently-running listener call
    setTimeout(() => triggerAuthStateChange('SIGNED_OUT', null), 0);
    return { error: null };
  },

  getSession: async () => {
    const sessionStr = localStorage.getItem('mock_auth_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    return { data: { session }, error: null };
  },

  onAuthStateChange: (callback) => {
    const id = Math.random().toString(36).substring(2);
    authListeners[id] = callback;

    const sessionStr = localStorage.getItem('mock_auth_session');
    const session = sessionStr ? JSON.parse(sessionStr) : null;
    // Fire INITIAL_SESSION (not SIGNED_IN) to match real Supabase behavior on page load/refresh.
    // This avoids triggering a full re-auth flow when restoring an existing session.
    setTimeout(() => {
      callback('INITIAL_SESSION', session);
    }, 0);

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            delete authListeners[id];
          }
        }
      }
    };
  }
};

const mockStorage = {
  from: (bucket) => ({
    upload: async (filePath, file) => {
      console.log('Mock storage upload', { bucket, filePath });
      return { data: { path: filePath }, error: null };
    },
    getPublicUrl: (filePath) => {
      let publicUrl = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80';
      if (filePath.includes('category') || filePath.includes('categories')) {
        publicUrl = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80';
      } else if (filePath.includes('banner')) {
        publicUrl = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80';
      } else if (filePath.includes('hero')) {
        publicUrl = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80';
      }
      return { data: { publicUrl } };
    }
  })
};

const mockSupabase = {
  auth: mockAuth,
  storage: mockStorage,
  from: (tableName) => {
    return {
      select: (fields) => {
        const builder = new MockQueryBuilder(tableName, fields);
        builder.isSelect = true;
        return builder;
      },
      insert: (data) => {
        const builder = new MockQueryBuilder(tableName);
        builder.isInsert = true;
        builder.insertData = data;
        return builder;
      },
      upsert: (data) => {
        const builder = new MockQueryBuilder(tableName);
        builder.isUpsert = true;
        builder.upsertData = data;
        return builder;
      },
      update: (data) => {
        const builder = new MockQueryBuilder(tableName);
        builder.isUpdate = true;
        builder.updateData = data;
        return builder;
      },
      delete: () => {
        const builder = new MockQueryBuilder(tableName);
        builder.isDelete = true;
        return builder;
      }
    };
  }
};

// Seed Mock Data in LocalStorage
const seedMockData = () => {
  if (!localStorage.getItem('mock_db_seeded')) {
    console.log('Seeding Mock Database for Local Testing...');
    
    // Categories (4 rows)
    localStorage.setItem('mock_db_categories', JSON.stringify([
      { id: 'cat1', name: 'Formal Wear', slug: 'formal-wear', thumbnail_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80' },
      { id: 'cat2', name: 'Casual Wear', slug: 'casual-wear', thumbnail_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80' },
      { id: 'cat3', name: 'Accessories', slug: 'accessories', thumbnail_url: 'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=600&auto=format&fit=crop&q=80' },
      { id: 'cat4', name: 'Activewear', slug: 'activewear', thumbnail_url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80' }
    ]));

    // Products (6 rows: hero + 5 products)
    localStorage.setItem('mock_db_products', JSON.stringify([
      {
        id: 'hero',
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
        ]
      },
      {
        id: 'p1',
        name: 'Premium Oxford Shirt',
        description: 'Immaculately tailored classic white Oxford shirt made from premium long-staple cotton.',
        original_price: 2499,
        discounted_price: 1899,
        category_id: 'cat1',
        stock: { S: 10, M: 8, L: 15, XL: 5 },
        images: [
          'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80'
        ],
        is_archived: false,
        is_new_in: true,
        new_in_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      },
      {
        id: 'p2',
        name: 'Slim Fit Charcoal Suit',
        description: 'A modern silhouette crafted from high-grade wool blend, perfect for formal occasions.',
        original_price: 8999,
        discounted_price: 6999,
        category_id: 'cat1',
        stock: { S: 4, M: 5, L: 6, XL: 2 },
        images: [
          'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80'
        ],
        is_archived: false,
        is_new_in: false,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'p3',
        name: 'Luxe Cashmere Knitwear',
        description: 'Ultra-soft cashmere crewneck sweater, designed for cozy elegance and warmth.',
        original_price: 4500,
        discounted_price: 3499,
        category_id: 'cat2',
        stock: { S: 12, M: 10, L: 8, XL: 4 },
        images: [
          'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80'
        ],
        is_archived: false,
        is_new_in: true,
        new_in_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'p4',
        name: 'Classic Silk Tie',
        description: 'Pure mulberry silk tie with elegant micro-patterning, handmade with precision.',
        original_price: 1999,
        discounted_price: 1299,
        category_id: 'cat3',
        stock: { S: 20, M: 20, L: 20, XL: 20 },
        images: [
          'https://images.unsplash.com/photo-1589310243389-96a5483213a8?w=600&auto=format&fit=crop&q=80'
        ],
        is_archived: false,
        is_new_in: false,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'p5',
        name: 'Tech Stretch Joggers',
        description: 'Premium stretch fit athletic joggers for high performance or casual lounge.',
        original_price: 2999,
        discounted_price: 1999,
        category_id: 'cat4',
        stock: { S: 15, M: 20, L: 10, XL: 8 },
        images: [
          'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=600&auto=format&fit=crop&q=80'
        ],
        is_archived: false,
        is_new_in: false,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]));

    // Coupons (4 rows)
    localStorage.setItem('mock_db_coupons', JSON.stringify([
      { id: 'c1', code: 'FLASH50', discount_type: 'percentage', discount_value: 50, min_bill_amount: 0, is_active: true },
      { id: 'c2', code: 'FIRST10', discount_type: 'percentage', discount_value: 10, min_bill_amount: 0, is_active: true },
      { id: 'c3', code: 'FLASH20', discount_type: 'percentage', discount_value: 20, min_bill_amount: 0, is_active: true },
      { id: 'c4', code: 'WELCOME15', discount_type: 'percentage', discount_value: 15, min_bill_amount: 0, is_active: true }
    ]));

    // Banners (4 rows)
    localStorage.setItem('mock_db_banners', JSON.stringify([
      { id: 'b1', title: 'SUMMER CAROUSEL 2026', subtitle: 'Step into light tailored layers', image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80', display_order: 1 },
      { id: 'b2', title: 'WINTER ARCHIVE 2026', subtitle: 'Warm layers and tailored coats', image_url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&auto=format&fit=crop&q=80', display_order: 2 },
      { id: 'b3', title: 'ELEGANT ACCESSORIES', subtitle: 'Finish the silhouette', image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200&auto=format&fit=crop&q=80', display_order: 3 },
      { id: 'b4', title: 'ACTIVE ESCAPE', subtitle: 'Perform in premium luxury', image_url: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=1200&auto=format&fit=crop&q=80', display_order: 4 }
    ]));

    // Profiles (4 rows)
    localStorage.setItem('mock_db_profiles', JSON.stringify([
      { id: 'mock_admin_123', email: 'admin@example.com', full_name: 'Mock Admin', role: 'admin', created_at: new Date().toISOString() },
      { id: 'mock_user_123', email: 'user@example.com', full_name: 'Mock Customer', role: 'user', created_at: new Date().toISOString() },
      { id: 'mock_user_456', email: 'john@example.com', full_name: 'John Doe', role: 'user', created_at: new Date().toISOString() },
      { id: 'mock_user_789', email: 'jane@example.com', full_name: 'Jane Smith', role: 'user', created_at: new Date().toISOString() }
    ]));

    // Settings (3 rows)
    localStorage.setItem('mock_db_settings', JSON.stringify([
      { key: 'store_info', value: { name: 'FLASHUD', email: 'hello@flashud.com', phone: '+919876543210', address: 'Mumbai, India' } },
      { key: 'seo_metadata', value: { title: 'Flashud | Luxury Fashion Store', description: 'Curated elegance for the modern individual.', keywords: 'fashion, luxury, apparel' } },
      { key: 'payment_settings', value: { qr_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80', number: 'flashud@upi', instructions: 'Scan QR code and confirm payee is FLASHUD. Enter UTR reference below.' } }
    ]));

    // Orders (4 rows)
    localStorage.setItem('mock_db_orders', JSON.stringify([
      { id: 'ord1', user_id: 'mock_user_123', total_amount: 1899, status: 'completed', shipping_address: '123 Luxury Avenue, Mumbai', created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'ord2', user_id: 'mock_user_123', total_amount: 6999, status: 'pending', shipping_address: '123 Luxury Avenue, Mumbai', created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), payment_reference: 'UTR9876543210', payment_screenshot_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80' },
      { id: 'ord3', user_id: 'mock_user_456', total_amount: 3499, status: 'processing', shipping_address: '456 Park Road, Bangalore', created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
      { id: 'ord4', user_id: 'mock_user_789', total_amount: 1999, status: 'delivered', shipping_address: '789 Lake View, Delhi', created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() }
    ]));

    // Order Items (4 rows)
    localStorage.setItem('mock_db_order_items', JSON.stringify([
      { id: 'oi1', order_id: 'ord1', product_id: 'p1', quantity: 1, price: 1899 },
      { id: 'oi2', order_id: 'ord2', product_id: 'p2', quantity: 1, price: 6999 },
      { id: 'oi3', order_id: 'ord3', product_id: 'p3', quantity: 1, price: 3499 },
      { id: 'oi4', order_id: 'ord4', product_id: 'p5', quantity: 1, price: 1999 }
    ]));

    // Cart Items (4 rows)
    localStorage.setItem('mock_db_cart_items', JSON.stringify([
      { id: 'cart1', user_id: 'mock_user_123', product_id: 'p1', size: 'M', quantity: 1, created_at: new Date().toISOString() },
      { id: 'cart2', user_id: 'mock_user_123', product_id: 'p3', size: 'S', quantity: 2, created_at: new Date().toISOString() },
      { id: 'cart3', user_id: 'mock_user_456', product_id: 'p4', size: 'L', quantity: 1, created_at: new Date().toISOString() },
      { id: 'cart4', user_id: 'mock_user_789', product_id: 'p2', size: 'XL', quantity: 1, created_at: new Date().toISOString() }
    ]));

    // Wishlist Items (4 rows)
    localStorage.setItem('mock_db_wishlist_items', JSON.stringify([
      { id: 'w1', user_id: 'mock_user_123', product_id: 'p2', created_at: new Date().toISOString() },
      { id: 'w2', user_id: 'mock_user_123', product_id: 'p4', created_at: new Date().toISOString() },
      { id: 'w3', user_id: 'mock_user_456', product_id: 'p1', created_at: new Date().toISOString() },
      { id: 'w4', user_id: 'mock_user_789', product_id: 'p3', created_at: new Date().toISOString() }
    ]));

    // Sales logs (4 rows)
    localStorage.setItem('mock_db_sales', JSON.stringify([
      { id: 1, product_id: 'p1', product_name: 'Premium Oxford Shirt', size: 'M', quantity: 1, price: 1899, total: 1899, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 2, product_id: 'p2', product_name: 'Slim Fit Charcoal Suit', size: 'L', quantity: 1, price: 6999, total: 6999, created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
      { id: 3, product_id: 'p4', product_name: 'Classic Silk Tie', size: 'S', quantity: 3, price: 1299, total: 3897, created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
      { id: 4, product_id: 'p5', product_name: 'Tech Stretch Joggers', size: 'M', quantity: 2, price: 1999, total: 3998, created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() }
    ]));

    localStorage.setItem('mock_db_seeded', 'true');
  }
};

if (forceMock || !supabaseUrl || !supabaseAnonKey) {
  console.warn('SUPABASE CONFIG: Operating in CLIENT-SIDE OFFLINE MOCK MODE.');
  seedMockData();
}

export const supabase = (forceMock || !supabaseUrl || !supabaseAnonKey)
  ? mockSupabase
  : createClient(supabaseUrl, supabaseAnonKey);
