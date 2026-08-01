import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import ProductCard from '../components/ProductCard';
import { useLocalOrRemoteUrl } from '../lib/mediaResolver';

// Pin source.unsplash.com URLs to a fixed seed so they don't change on refresh
const stableImageUrl = (url, seed) => {
    if (!url || typeof url !== 'string') return url;
    if (url.includes('source.unsplash.com')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}sig=${encodeURIComponent(seed)}`;
    }
    return url;
};

const ProductDetailImage = ({ src, alt, className }) => {
    const resolvedSrc = useLocalOrRemoteUrl(src);
    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
        />
    );
};

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [relatedProducts, setRelatedProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSize, setSelectedSize] = useState(null);
    const [activeImage, setActiveImage] = useState(0);
    const [isInWishlist, setIsInWishlist] = useState(false);
    
    // Location state sync for display
    const [userLocation, setUserLocation] = useState('Select your address');

    useEffect(() => {
        fetchProduct();

        const saved = localStorage.getItem('userLocation');
        if (saved) setUserLocation(saved);
        
        const handleLocationUpdate = () => {
            const updated = localStorage.getItem('userLocation');
            if (updated) setUserLocation(updated);
        };
        window.addEventListener('locationUpdated', handleLocationUpdate);
        
        const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setIsInWishlist(wishlist.some(item => item.id === id));
        
        return () => window.removeEventListener('locationUpdated', handleLocationUpdate);
    }, [id]);

    const fetchProduct = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (data) {
            setProduct(data);
            // Select first available size by default
            const firstSize = Object.entries(data.stock || {}).find(([size, qty]) => qty > 0);
            if (firstSize) setSelectedSize(firstSize[0]);
            
            // Fetch related products from same category if possible, else recent ones
            const { data: relatedData } = await supabase
                .from('products')
                .select('*')
                .eq('is_archived', false)
                .neq('name', '_HERO_IMAGE_')
                .neq('id', id)
                .limit(6);
            if (relatedData) setRelatedProducts(relatedData);
        }
        setIsLoading(false);
        setActiveImage(0);
    };

    const addToCart = async () => {
        if (!user) {
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }

        if (!selectedSize) {
            alert('PLEASE SELECT A SIZE VARIANT');
            return;
        }

        const cartItem = {
            id: product.id,
            name: product.name,
            price: product.discounted_price,
            size: selectedSize,
            image: stableImageUrl(product.images?.[0], product.id),
            quantity: 1
        };

        // Local Storage Sync with Deduplication
        const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
        const existingItemIndex = existingCart.findIndex(item => item.id === product.id && item.size === selectedSize);
        if (existingItemIndex > -1) {
            existingCart[existingItemIndex].quantity += 1;
        } else {
            existingCart.push(cartItem);
        }
        localStorage.setItem('cart', JSON.stringify(existingCart));

        // Supabase Sync with Deduplication
        try {
            const { data: dbItems, error: fetchErr } = await supabase
                .from('cart_items')
                .select('quantity')
                .eq('user_id', user.id)
                .eq('product_id', product.id)
                .eq('size', selectedSize);

            let newQty = 1;
            if (!fetchErr && dbItems && dbItems.length > 0) {
                newQty = dbItems[0].quantity + 1;
            }

            await supabase.from('cart_items').upsert({
                user_id: user.id,
                product_id: product.id,
                size: selectedSize,
                quantity: newQty
            }, { onConflict: 'user_id,product_id,size' });
        } catch (err) {
            console.error('Database sync error:', err);
        }

        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('cartUpdated'));
        window.dispatchEvent(new Event('openCart'));
    };

    const handleBuyNow = () => {
        if (!user) {
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }
        if (!selectedSize) {
            alert('PLEASE SELECT A SIZE VARIANT');
            return;
        }
        const item = {
            id: product.id,
            name: product.name,
            price: product.discounted_price,
            size: selectedSize,
            image: stableImageUrl(product.images?.[0], product.id),
            quantity: 1,
        };
        navigate('/checkout', { state: { items: [item], buyNow: true } });
    };

    const handleWishlist = async () => {
        if (!user) {
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }

        let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
        if (isInWishlist) {
            wishlist = wishlist.filter(item => item.id !== id);
            setIsInWishlist(false);
            
            // Supabase Sync (Remove)
            const { error } = await supabase.from('wishlist_items').delete().match({ user_id: user.id, product_id: id });
            if (error) {
                console.error('Wishlist sync error:', error);
                alert('Database sync error. Please check if wishlist table exists.');
            }
        } else {
            wishlist.push({
                id: product.id,
                name: product.name,
                price: product.discounted_price,
                image: stableImageUrl(product.images?.[0], product.id)
            });
            setIsInWishlist(true);

            // Supabase Sync (Add)
            const { error } = await supabase.from('wishlist_items').upsert({
                user_id: user.id,
                product_id: product.id
            });
            if (error) {
                console.error('Wishlist sync error:', error);
                alert('Database sync error. Please check if wishlist table exists.');
            }
        }
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        window.dispatchEvent(new Event('storage'));
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: product.name,
                    text: `Check out ${product.name} on Flashud!`,
                    url: window.location.href
                });
            } catch (error) {
                console.error('Error sharing', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    if (isLoading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin mb-6"></div>
            <p className="font-medium text-[10px] text-brand-dark/50 uppercase tracking-[0.3em]">Loading details...</p>
        </div>
    );
    if (!product) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
            <h2 className="text-4xl font-light text-brand-dark mb-4 tracking-[0.1em] uppercase">Asset <span className="text-brand-orange font-bold">Not Found</span></h2>
            <p className="font-medium uppercase tracking-[0.2em] text-brand-dark/50 text-xs">The requested item may have been archived or removed from the vault.</p>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto pt-24 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-orange selection:text-white">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                
                {/* GALLERY SECTION */}
                <div className="space-y-3">
                    {/* Main Preview */}
                    <div className="w-full aspect-[4/5] md:aspect-square max-h-[45vh] md:max-h-none bg-gray-50 rounded-xl border border-gray-100 relative overflow-hidden flex items-center justify-center">
                        {product.images?.[activeImage] ? (
                            <ProductDetailImage 
                                src={stableImageUrl(product.images[activeImage], `${product.id}-${activeImage}`)} 
                                alt={product.name} 
                                className="w-full h-full object-cover" 
                            />
                        ) : (
                            <div className="text-gray-400 font-medium text-[8px] uppercase tracking-widest">No preview</div>
                        )}
                        <div className="absolute top-3 left-3">
                            <span className="bg-black/80 backdrop-blur-md text-white text-[7px] font-bold px-2 py-1 rounded-full uppercase tracking-widest">
                                Flashud Original
                            </span>
                        </div>
                    </div>

                    {/* Thumbnails Below (4 images) - Tight Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {(product.images || []).slice(0, 4).map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => setActiveImage(idx)}
                                className={`aspect-square rounded-lg overflow-hidden border transition-all duration-200 ${activeImage === idx ? 'border-brand-orange shadow-sm scale-95' : 'border-black/5 hover:border-brand-orange/30'}`}
                            >
                                <ProductDetailImage src={stableImageUrl(img, `${product.id}-${idx}`)} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* INFO SECTION */}
                <div className="flex flex-col">
                    <div className="lg:sticky lg:top-32 space-y-4">
                        {/* Compact Header */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-4 h-px bg-brand-orange"></span>
                                <span className="text-[7px] font-extrabold text-brand-orange uppercase tracking-[.2em]">Product Details</span>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-kindred text-brand-dark leading-tight lowercase">
                                {product.name}
                            </h1>
                            <div className="flex items-center gap-3">
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold text-brand-dark">₹{product.discounted_price?.toLocaleString()}</span>
                                    {product.original_price > product.discounted_price && (
                                        <span className="text-[10px] font-medium text-brand-dark/20 line-through">₹{product.original_price?.toLocaleString()}</span>
                                    )}
                                </div>
                                <div className="text-[7px] font-bold text-brand-orange uppercase tracking-widest bg-brand-orange/5 px-2 py-0.5 rounded-full border border-brand-orange/10">
                                    {product.original_price > product.discounted_price ? `${Math.round((1 - product.discounted_price / product.original_price) * 100)}% off` : 'Rare'}
                                </div>
                            </div>
                        </div>

                        {/* Size Selection - Ultra Compact */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[8px] font-bold text-brand-dark uppercase tracking-widest">Select size</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {product.stock && Object.entries(product.stock).map(([size, qty]) => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        disabled={qty === 0}
                                        className={`px-4 py-2.5 rounded-lg border font-bold text-[9px] transition-all
                                            ${qty === 0 
                                                ? 'bg-gray-50 text-gray-200 border-gray-100 cursor-not-allowed' 
                                                : (selectedSize === size 
                                                    ? 'bg-brand-dark border-brand-dark text-white shadow-md' 
                                                    : 'bg-white border-black/5 text-brand-dark hover:border-brand-orange'
                                                )}`}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Desktop Actions */}
                        <div className="hidden lg:block space-y-3 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={addToCart}
                                    disabled={!selectedSize || product.stock[selectedSize] <= 0}
                                    className={`py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all ${(!selectedSize || product.stock[selectedSize] <= 0) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-brand-dark text-white hover:bg-black shadow-md shadow-black/10'}`}
                                >
                                    Add to Cart
                                </button>
                                <button
                                    onClick={handleBuyNow}
                                    disabled={!selectedSize || product.stock[selectedSize] <= 0}
                                    className={`py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all ${(!selectedSize || product.stock[selectedSize] <= 0) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-brand-orange text-white hover:bg-orange-600 shadow-md shadow-brand-orange/20 hover:-translate-y-0.5'}`}
                                >
                                    Buy Now
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleWishlist} className="flex items-center justify-center gap-2 py-3 border border-black/5 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:border-brand-orange hover:text-brand-orange transition-all">
                                    <svg className={`w-4 h-4 ${isInWishlist ? 'fill-brand-orange text-brand-orange' : 'fill-none text-current'}`} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                                    {isInWishlist ? 'Saved' : 'Wishlist'}
                                </button>
                                <button onClick={handleShare} className="flex items-center justify-center gap-2 py-3 border border-black/5 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:border-brand-orange hover:text-brand-orange transition-all">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                                    Share
                                </button>
                            </div>
                        </div>

                        {/* Details Tab Compact */}
                        <div className="pt-6 border-t border-black/5 space-y-4">
                            <div>
                                <h4 className="text-[9px] font-bold text-brand-dark uppercase tracking-widest mb-2">Description</h4>
                                <p className="text-[11px] text-brand-dark/60 leading-relaxed font-medium">
                                    {product.description || 'This premium item is part of our core permanent collection, made for lasting quality and comfort.'}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                    Secure delivery
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-orange"></div>
                                    100% Original
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations Section */}
            {relatedProducts.length > 0 && (
                <div className="mt-24">
                    <div className="flex items-center gap-6 mb-10">
                        <h2 className="text-xl font-bold text-brand-dark uppercase tracking-widest">You may also like</h2>
                        <div className="h-px flex-1 bg-gradient-to-r from-black/5 to-transparent"></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {relatedProducts.map(related => (
                            <ProductCard key={related.id} product={related} />
                        ))}
                    </div>
                </div>
            )}

            {/* MOBILE STICKY FOOTER */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-black/5 z-[40] px-4 py-4 safe-area-inset-bottom">
                <div className="flex gap-3">
                    <button
                        onClick={handleWishlist}
                        className="w-14 h-14 flex items-center justify-center border border-black/5 rounded-2xl bg-white shadow-sm flex-shrink-0"
                    >
                        <svg className={`w-6 h-6 ${isInWishlist ? 'fill-brand-orange text-brand-orange' : 'fill-none text-brand-dark'}`} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                    </button>
                    <button
                        onClick={addToCart}
                        disabled={!selectedSize || product.stock[selectedSize] <= 0}
                        className={`flex-1 flex items-center justify-center rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all active:scale-95 ${(!selectedSize || product.stock[selectedSize] <= 0) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-brand-dark text-white hover:bg-black shadow-lg shadow-black/10'}`}
                    >
                        {(!selectedSize || product.stock[selectedSize] <= 0) ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button
                        onClick={handleBuyNow}
                        disabled={!selectedSize || product.stock[selectedSize] <= 0}
                        className={`flex-1 flex items-center justify-center rounded-2xl font-bold uppercase tracking-widest text-[11px] transition-all active:scale-95 ${(!selectedSize || product.stock[selectedSize] <= 0) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'}`}
                    >
                        Buy Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
