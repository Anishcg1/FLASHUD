import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ProductCard from '../components/ProductCard';

const Wishlist = () => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user || null;
        setUser(currentUser);
        
        if (currentUser) {
            fetchWishlistFromSupabase(currentUser.id);
        } else {
            const localWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
            setWishlistItems(localWishlist);
            setIsLoading(false);
        }
    };

    const fetchWishlistFromSupabase = async (userId) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('wishlist_items')
                .select('*, products(*)')
                .eq('user_id', userId);

            if (error) {
                console.error('Wishlist fetch error:', error);
                // Fallback to local storage if DB fails
                const localWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
                setWishlistItems(localWishlist);
            } else if (data) {
                const formatted = data.map(item => ({
                    id: item.product_id,
                    ...item.products
                })).filter(item => item.name); // Ensure joined product exists
                
                setWishlistItems(formatted);
                localStorage.setItem('wishlist', JSON.stringify(formatted));
            }
        } catch (err) {
            console.error('Wishlist fetch error:', err);
        }
        setIsLoading(false);
    };

    const removeFromWishlist = async (productId) => {
        const updatedWishlist = wishlistItems.filter(item => item.id !== productId);
        setWishlistItems(updatedWishlist);
        localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));

        if (user) {
            await supabase
                .from('wishlist_items')
                .delete()
                .match({ user_id: user.id, product_id: productId });
        }
        window.dispatchEvent(new Event('storage'));
    };

    return (
        <div className="max-w-7xl mx-auto pt-32 pb-24 px-6 selection:bg-brand-orange selection:text-white">
            <div className="mb-16 border-b border-black/5 pb-8">
                <h2 className="text-5xl md:text-7xl font-light tracking-tight leading-none text-brand-dark">
                    Your <span className="font-bold text-brand-orange">Wishlist</span>
                </h2>
                <div className="flex items-center gap-4 mt-6">
                    <span className="w-10 h-px bg-brand-orange"></span>
                    <span className="text-[10px] font-semibold text-brand-dark/50 uppercase tracking-[0.3em]">Saved items for later</span>
                </div>
            </div>

            {isLoading ? (
                <div className="py-32 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin mb-6"></div>
                    <p className="font-medium text-[10px] text-brand-dark/50 uppercase tracking-[0.3em]">Loading wishlist...</p>
                </div>
            ) : wishlistItems.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {wishlistItems.map((product) => (
                        <div key={product.id} className="relative group">
                            <ProductCard product={product} />
                            <button 
                                onClick={(e) => {
                                    e.preventDefault();
                                    removeFromWishlist(product.id);
                                }}
                                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-brand-dark/40 hover:text-red-500 hover:bg-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-24 border border-black/5 rounded-3xl flex flex-col items-center justify-center bg-white shadow-sm">
                    <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-6">
                        <svg className="w-8 h-8 text-brand-dark/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </div>
                    <p className="font-medium uppercase tracking-[0.2em] text-brand-dark/50 text-sm mb-8">Your wishlist is empty</p>
                    <Link to="/shop" className="px-10 py-4 rounded-full bg-brand-dark text-white font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-black hover:-translate-y-1 transition-all">
                        Discover products
                    </Link>
                </div>
            )}
        </div>
    );
};

export default Wishlist;
