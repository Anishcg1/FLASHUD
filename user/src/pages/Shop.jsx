import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';

const Shop = ({ isNewArrivalsOnly = false }) => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const catParam = searchParams.get('category');
        if (catParam) {
            setSelectedCategory(catParam);
        }
    }, [searchParams]);

    useEffect(() => {
        fetchData();
    }, [selectedCategory, sortBy, isNewArrivalsOnly]);

    const fetchData = async () => {
        setIsLoading(true);

        // Fetch Categories
        const { data: catData } = await supabase.from('categories').select('*');
        if (catData) setCategories(catData);

        // Fetch Products
        let query = supabase.from('products').select('*').eq('is_archived', false);

        if (isNewArrivalsOnly) {
            query = query.eq('is_new_in', true);
        } else if (selectedCategory !== 'all') {
            query = query.eq('category_id', selectedCategory);
        }

        if (sortBy === 'price-low') query = query.order('discounted_price', { ascending: true });
        else if (sortBy === 'price-high') query = query.order('discounted_price', { ascending: false });
        else query = query.order('created_at', { ascending: false });

        const { data: prodData } = await query;
        if (prodData) {
            // Filter out internal setting products like _HERO_IMAGE_
            setProducts(prodData.filter(p => p.name !== '_HERO_IMAGE_'));
        }

        setIsLoading(false);
    };

    return (
        <div className="max-w-7xl mx-auto selection:bg-brand-orange selection:text-white pb-20 px-6 pt-32">
            {/* Shop Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-black/5 pb-8">
                <div>
                    <h1 className="text-5xl md:text-7xl font-light uppercase tracking-[0.1em] leading-none text-brand-dark">
                        {isNewArrivalsOnly
                            ? <>New <span className="font-bold text-brand-orange">Arrivals</span></>
                            : <>Our <span className="font-bold text-brand-orange">Collection</span></>
                        }
                    </h1>
                    <p className="text-[10px] font-semibold text-brand-dark/50 uppercase tracking-[0.4em] mt-4 flex items-center gap-3">
                        <span className="w-8 h-px bg-brand-orange"></span>
                        {isNewArrivalsOnly ? 'Fresh drops, just in' : 'Premium products for you'}
                    </p>
                </div>

                {!isNewArrivalsOnly && (
                    <div className="flex flex-wrap gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-initial">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-6 py-3.5 bg-white border border-black/5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] text-brand-dark shadow-sm focus:outline-none focus:border-brand-orange/50 transition-all appearance-none cursor-pointer pr-12 hover:bg-gray-50"
                            >
                                <option value="all" className="bg-white text-brand-dark">All categories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id} className="bg-white text-brand-dark">{cat.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-orange">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="relative flex-1 md:flex-initial">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="w-full px-6 py-3.5 bg-white border border-black/5 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] text-brand-dark shadow-sm focus:outline-none focus:border-brand-orange/50 transition-all appearance-none cursor-pointer pr-12 hover:bg-gray-50"
                            >
                                <option value="newest" className="bg-white text-brand-dark">Newest</option>
                                <option value="price-low" className="bg-white text-brand-dark">Price: low-high</option>
                                <option value="price-high" className="bg-white text-brand-dark">Price: high-low</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brand-orange">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Product Grid */}
            {isLoading ? (
                <div className="py-32 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin mb-6"></div>
                    <p className="font-medium text-[10px] text-brand-dark/50 uppercase tracking-[0.3em]">Loading products...</p>
                </div>
            ) : products.length === 0 ? (
                <div className="py-32 text-center border border-black/5 rounded-3xl bg-white shadow-sm">
                    <p className="font-medium uppercase tracking-[0.2em] text-brand-dark/50 text-sm">No assets found matching current parameters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Shop;
