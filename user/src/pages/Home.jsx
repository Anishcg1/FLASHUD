import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import CollectionsGallery from '../components/CollectionsGallery';
import ProductCard from '../components/ProductCard';
import { useLocalOrRemoteUrl, isVideo } from '../lib/mediaResolver';

// Defined at module level so React sees the SAME component type on every render.
// If defined inside Home(), React would create a new type each render → unmount/remount → blank flash.
const HeroMedia = ({ src, className }) => {
    const resolvedSrc = useLocalOrRemoteUrl(src);
    if (!resolvedSrc) return null;
    if (isVideo(resolvedSrc)) {
        return (
            <video
                src={resolvedSrc}
                className={className}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
            />
        );
    }
    return (
        <img
            src={resolvedSrc}
            alt="Flashud Hero"
            className={`${className} animate-hero-zoom`}
        />
    );
};

const Home = () => {
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [heroDesktop, setHeroDesktop] = useState(null);
    const [heroMobile, setHeroMobile] = useState(null);

    useEffect(() => {
        fetchFeatured();
        fetchHero();
    }, []);

    const fetchHero = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('name', '_HERO_IMAGE_')
            .single();
        if (data?.images?.length > 0) {
            setHeroDesktop(data.images[0] || null);
            setHeroMobile(data.images[1] || data.images[0] || null);
        }
    };

    const fetchFeatured = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('is_archived', false)
            .neq('name', '_HERO_IMAGE_')
            .limit(4);
        if (data) setFeaturedProducts(data);
    };

    const marqueeText = "LIFETIME WEAR AND TEAR WARRANTY — ";
    const marqueeItems = Array(10).fill(marqueeText);

    return (
        <div className="mx-auto selection:bg-brand-orange selection:text-white pb-20 bg-white">
            {/* Hero Section */}
            <section className="relative w-full h-[100vh] overflow-hidden shadow-sm">
                <div className="absolute inset-0 w-full h-full">
                    {heroDesktop ? (
                        <>
                            {/* Desktop */}
                            <HeroMedia
                                src={heroDesktop}
                                className="hidden md:block w-full h-full object-cover"
                            />
                            {/* Mobile */}
                            <HeroMedia
                                src={heroMobile || heroDesktop}
                                className="block md:hidden w-full h-full object-cover"
                                isMobileSlot
                            />
                        </>
                    ) : (
                        <div className="w-full h-full bg-black/5 flex items-center justify-center">
                            <span className="text-brand-dark/20 uppercase tracking-[0.2em] font-medium">Coming soon</span>
                        </div>
                    )}
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/20"></div>

                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
                    <h1 className="text-4xl md:text-8xl font-light mb-6 md:mb-8 tracking-[0.1em] leading-tight md:leading-none text-white uppercase drop-shadow-lg">
                        Upgrade <span className="font-bold text-brand-orange">your</span> style
                    </h1>
                    <p className="text-[10px] md:text-sm font-medium tracking-[0.2em] mb-8 md:mb-12 text-white/90 uppercase max-w-2xl mx-auto drop-shadow-md">
                        Premium formal wear for the modern individual.
                    </p>
                    <Link to="/shop" className="inline-block px-10 md:px-14 py-4 md:py-5 rounded-full bg-white text-brand-dark font-bold uppercase tracking-widest text-[10px] md:text-sm hover:bg-brand-orange hover:text-white hover:-translate-y-1 transition-all shadow-xl">
                        Shop Collection
                    </Link>
                </div>

                <div className="absolute bottom-12 right-12 font-medium text-[10px] text-white/70 uppercase tracking-[0.3em] hidden md:block drop-shadow-sm">
                    Authentic • Innovative • Refined
                </div>
            </section>

            {/* Marquee */}
            <div className="w-full overflow-hidden border-b border-black/5 flex items-center h-12 md:h-16 select-none bg-white/50 py-2 mb-12 md:mb-24">
                <div className="flex w-max animate-marquee whitespace-nowrap">
                    {marqueeItems.map((text, idx) => (
                        <span
                            key={idx}
                            className="text-brand-orange font-kindred text-2xl md:text-3xl uppercase tracking-widest px-4 font-bold"
                            style={{ WebkitTextStroke: '1px #000000', color: 'transparent' }}
                        >
                            {text}
                        </span>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6">
                <CollectionsGallery />

                <section>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-14 border-b border-black/5 pb-6">
                        <div className="mb-4 md:mb-0">
                            <h2 className="text-2xl md:text-3xl font-light uppercase tracking-[0.2em] text-brand-dark">Featured <span className="font-bold text-brand-orange">Items</span></h2>
                            <p className="text-[9px] md:text-[10px] font-semibold text-brand-dark/50 uppercase tracking-[0.2em] mt-3">Limited availability • Zero compromise</p>
                        </div>
                        <Link to="/shop" className="text-[10px] font-bold text-brand-dark/60 hover:text-brand-orange transition-colors uppercase tracking-[0.2em] flex items-center gap-2">
                            View All
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-8">
                        {featuredProducts.length > 0 ? featuredProducts.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        )) : (
                            [1, 2, 3, 4].map((i) => (
                                <div key={i} className="animate-pulse bg-white border border-black/5 rounded-2xl p-4">
                                    <div className="aspect-[3/4] bg-black/5 rounded-xl mb-6"></div>
                                    <div className="h-4 bg-black/10 rounded-full w-3/4 mb-3"></div>
                                    <div className="h-3 bg-black/5 rounded-full w-1/4"></div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <div className="mt-32 pt-10 border-t border-black/5 text-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.5em] text-brand-dark/30">© FLASHUD STOREFRONT • SECURE LUXURY SHOPPING</span>
                </div>
            </div>
        </div>
    );
};

export default Home;
