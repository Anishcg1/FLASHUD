import { supabase } from './supabaseClient';

export const syncLocalStorageToSupabase = async (userId) => {
    try {
        // 1. Sync Cart
        const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
        if (localCart.length > 0) {
            const cartSyncData = localCart.map(item => ({
                user_id: userId,
                product_id: item.id,
                size: item.size,
                quantity: item.quantity
            }));
            
            // Upsert into cart_items (assuming table exists with unique constraint on user_id, product_id, size)
            await supabase.from('cart_items').upsert(cartSyncData);
            // We keep localStorage for offline/instant access, but database is now source of truth
        }

        // 2. Sync Wishlist
        const localWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        if (localWishlist.length > 0) {
            const wishlistSyncData = localWishlist.map(item => ({
                user_id: userId,
                product_id: item.id
            }));
            
            await supabase.from('wishlist_items').upsert(wishlistSyncData);
        }

        console.log('Sync complete');
    } catch (error) {
        console.error('Error syncing data to Supabase:', error);
    }
};

export const fetchAndSyncLocal = async (userId) => {
    try {
        // Fetch from Supabase and update local storage to match
        const { data: cartData } = await supabase
            .from('cart_items')
            .select('*, products(*)')
            .eq('user_id', userId);

        if (cartData) {
            const formattedCart = cartData
                .filter(item => item.products)
                .map(item => ({
                    id: item.product_id,
                    name: item.products?.name || 'Unknown Product',
                    price: item.products?.discounted_price || 0,
                    size: item.size,
                    image: item.products?.images?.[0],
                    quantity: item.quantity
                }));
            localStorage.setItem('cart', JSON.stringify(formattedCart));
        }

        const { data: wishlistData } = await supabase
            .from('wishlist_items')
            .select('*, products(*)')
            .eq('user_id', userId);

        if (wishlistData) {
            const formattedWishlist = wishlistData
                .filter(item => item.products)
                .map(item => ({
                    id: item.product_id,
                    name: item.products?.name || 'Unknown Product',
                    price: item.products?.discounted_price || 0,
                    image: item.products?.images?.[0]
                }));
            localStorage.setItem('wishlist', JSON.stringify(formattedWishlist));
        }

        window.dispatchEvent(new Event('storage'));
    } catch (error) {
        console.error('Error fetching remote data:', error);
    }
};
