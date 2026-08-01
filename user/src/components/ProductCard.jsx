import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocalOrRemoteUrl } from '../lib/mediaResolver';

// Stabilize any Unsplash URL that doesn't already pin a specific photo.
// source.unsplash.com URLs serve random images on each request unless
// given a fixed seed. We use the product id so it's always the same image.
const stableImageUrl = (url, seed) => {
    if (!url) return url;
    // source.unsplash.com/... — add a sig param to pin the image
    if (url.includes('source.unsplash.com')) {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}sig=${encodeURIComponent(seed)}`;
    }
    return url;
};

const ProductImage = ({ src, alt, className }) => {
    const resolvedSrc = useLocalOrRemoteUrl(src);
    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
        />
    );
};

const ProductCard = ({ product }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    // Check if any size has stock > 0
    const isInStock = product.stock && Object.entries(product.stock).some(([size, qty]) => qty > 0);

    const images = (product.images || []).map(url => stableImageUrl(url, product.id));

    return (
        <Link to={`/product/${product.id}`} className="group relative block overflow-hidden bg-white rounded-2xl transition-all shadow-sm hover:shadow-md">
            {/* Image */}
            <div className="aspect-[4/5] bg-brand-dark relative overflow-hidden rounded-2xl flex items-center justify-center">
                {images.length > 0 ? (
                    <>
                        <ProductImage
                            src={images[currentImageIndex]}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        />
                        
                        {/* Hover Arrows for Image Cycling */}
                        {images.length > 1 && (
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-2 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                                    }}
                                    className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                                    }}
                                    className="w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/60 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            </div>
                        )}

                        {/* Image Indicators */}
                        {images.length > 1 && (
                            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {images.map((_, idx) => (
                                    <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-white scale-125' : 'bg-white/40'}`}></span>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="font-medium opacity-50 uppercase tracking-[0.2em] text-xs px-4 text-center text-white/50">
                        Coming soon
                    </div>
                )}

                {/* Sold Out specific styling (Top Right or Center) */}
                {!isInStock && (
                    <div className="absolute top-4 right-4 z-10">
                        <span className="bg-white text-black font-semibold px-4 py-1.5 text-xs tracking-wider shadow-sm">
                            Sold out
                        </span>
                    </div>
                )}
            </div>

            {/* Product info */}
            <div className="bg-white py-3 px-3 md:py-4 md:px-4 space-y-1.5 md:space-y-2 rounded-b-2xl">
                <h3 className="font-semibold uppercase tracking-wider text-[9px] md:text-[11px] text-brand-dark group-hover:text-brand-orange transition-colors truncate">
                    {product.name}
                </h3>

                <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-xs md:text-sm font-bold tracking-wider text-brand-dark">
                        ₹ {product.discounted_price?.toLocaleString()}
                    </span>
                    {product.original_price > product.discounted_price && (
                        <span className="text-[9px] md:text-[10px] font-semibold text-brand-dark/30 line-through">
                            ₹ {product.original_price?.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
