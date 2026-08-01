import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Pin source.unsplash.com URLs to a fixed seed so they don't change on refresh
const stableImageUrl = (url, seed) => {
    if (!url) return url;
    if (url.includes('source.unsplash.com')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}sig=${encodeURIComponent(seed)}`;
    }
    return url;
};

const CollectionsGallery = () => {
    const [collections, setCollections] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchCollections();
    }, []);

    const fetchCollections = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (data) setCollections(data);
        setIsLoading(false);
    };

    if (isLoading) return (
        <div className="w-full h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div>
        </div>
    );

    if (collections.length === 0) return null;

    return (
        <section className="w-full mb-20 overflow-hidden">
            <div className="flex items-center justify-between mb-8 px-2">
                <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-brand-dark/40">EXPLORE COLLECTIONS</h2>
                <div className="h-px flex-1 bg-black/5 mx-6"></div>
            </div>

            <div className="flex gap-8 overflow-x-auto pb-8 snap-x no-scrollbar">
                {collections.map((collection) => (
                    <Link
                        key={collection.id}
                        to={`/shop?category=${collection.id}`}
                        className="flex-shrink-0 w-28 md:w-36 group snap-start"
                    >
                        <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden relative mb-4 border border-black/5 bg-black/5 mx-auto">
                            {collection.thumbnail_url ? (
                                <img
                                    src={stableImageUrl(collection.thumbnail_url, collection.id)}
                                    alt={collection.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-black/20 uppercase tracking-widest">
                                    No Visual
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                        </div>
                        <div className="text-center px-2">
                            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-brand-dark group-hover:text-brand-orange transition-colors">
                                {collection.name}
                            </h3>
                            <div className="w-0 h-px bg-brand-orange mx-auto mt-2 group-hover:w-1/2 transition-all duration-500"></div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
};

export default CollectionsGallery;
