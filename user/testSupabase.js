import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://migzjgwywerfczsaopow.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pZ3pqZ3d5d2VyZmN6c2FvcG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4ODQ0NTMsImV4cCI6MjA5NzQ2MDQ1M30.mXMBgSylJAVmUxqsjuv1LgyFBmgn2mdZMiVtWN5lZD8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Testing Supabase Queries ---');
  
  // 1. Fetch Categories
  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*');
  console.log('Categories:', catError ? `Error: ${catError.message}` : categories);
  
  // 2. Fetch Products
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*');
  console.log('Products:', prodError ? `Error: ${prodError.message}` : products);

  // 3. Fetch Coupons
  const { data: coupons, error: coupError } = await supabase
    .from('coupons')
    .select('*');
  console.log('Coupons:', coupError ? `Error: ${coupError.message}` : coupons);
  
  // 4. Fetch Profiles
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('*');
  console.log('Profiles:', profError ? `Error: ${profError.message}` : profiles);
}

run();
