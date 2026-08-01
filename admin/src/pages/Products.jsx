import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Products = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        setIsAnimating(true);
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .neq('name', '_HERO_IMAGE_')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleArchive = async (id, currentStatus) => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_archived: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchProducts();
        } catch (error) {
            alert('Error updating product status');
        }
    };

    const deleteProduct = async (id) => {
        if (!window.confirm('CRITICAL: Are you sure you want to PERMANENTLY delete this product?')) return;

        try {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchProducts();
        } catch (error) {
            alert('Error deleting product');
        }
    };

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto selection:bg-brand-orange selection:text-white pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h2 className="text-3xl font-light text-brand-dark tracking-[0.2em] relative inline-block">
                        INVENTORY <span className="font-bold text-brand-orange">VAULT</span>
                    </h2>
                    <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
                    <p className="text-xs font-medium text-brand-dark/50 uppercase tracking-[0.1em] mt-3">
                        Manage your premium assets
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 w-full md:w-auto mt-6 md:mt-0">
                    <div className="relative flex-1 md:flex-initial min-w-[300px]">
                        <input
                            type="text"
                            placeholder="SEARCH BY PRODUCT NAME..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-5 py-3.5 rounded-full bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 transition-all placeholder:text-brand-dark/30 shadow-sm"
                        />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-dark/50">🔍</span>
                    </div>

                    <button
                        onClick={() => navigate('/upload-product')}
                        className="px-8 py-3.5 rounded-full bg-brand-orange text-white font-bold uppercase tracking-widest hover:bg-brand-dark hover:-translate-y-0.5 transition-all shadow-md"
                    >
                        + ADD NEW ASSET
                    </button>
                </div>
            </div>

            {/* Inventory Overview Grid */}
            <div className="bg-white border border-black/5 rounded-3xl shadow-sm overflow-hidden mb-20">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-black/5">
                                <th className="p-6 text-brand-dark/60 font-semibold uppercase tracking-widest text-xs">Preview</th>
                                <th className="p-6 text-brand-dark/60 font-semibold uppercase tracking-widest text-xs">Product Details</th>
                                <th className="p-6 text-brand-dark/60 font-semibold uppercase tracking-widest text-xs">Inventory</th>
                                <th className="p-6 text-brand-dark/60 font-semibold uppercase tracking-widest text-xs">Pricing</th>
                                <th className="p-6 text-brand-dark/60 font-semibold uppercase tracking-widest text-xs">Status</th>
                                <th className="p-6 text-brand-dark/60 font-semibold uppercase tracking-widest text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center">
                                        <div className="inline-block animate-spin text-4xl mb-4">⚙️</div>
                                        <p className="font-black uppercase tracking-widest">Synchronizing Vault...</p>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-20 text-center font-black uppercase tracking-widest text-gray-400">
                                        No assets found in the inventory.
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((product, index) => (
                                    <tr key={product.id} className={`group hover:bg-gray-50 transition-colors ${product.is_archived ? 'opacity-50 grayscale' : ''}`}>
                                        <td className="p-6">
                                            <div className="w-16 h-20 rounded-lg bg-gray-50 border border-black/5 overflow-hidden relative shadow-inner">
                                                {product.images && product.images[0] ? (
                                                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-medium text-brand-dark/30 uppercase tracking-widest">NO IMG</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-semibold text-brand-dark uppercase tracking-wider mb-1">{product.name}</div>
                                            <div className="text-xs font-medium text-brand-dark/50 uppercase tracking-[0.1em] truncate max-w-[200px]">
                                                {product.description || 'No description provided'}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="space-y-1.5 flex gap-2 flex-wrap">
                                                {product.stock && Object.entries(product.stock).map(([size, qty]) => (
                                                    <div key={size} className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 border border-black/5">
                                                        <span className="text-brand-orange text-[10px] font-bold uppercase">{size}</span>
                                                        <span className="text-brand-dark/70 text-xs font-medium">{qty || 0}</span>
                                                    </div>
                                                ))}
                                                {(!product.stock || Object.keys(product.stock).length === 0) && (
                                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest px-2 py-1 bg-red-50 border border-red-100 rounded">NO STOCK DEFINED</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="text-brand-dark/40 line-through text-xs">₹{product.original_price}</div>
                                            <div className="text-lg font-medium text-brand-dark">₹{product.discounted_price}</div>
                                        </td>
                                        <td className="p-6">
                                            {product.is_archived ? (
                                                <span className="px-3 py-1 bg-black/5 text-brand-dark/50 border border-black/10 text-[10px] font-bold uppercase tracking-widest rounded-full">ARCHIVED</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold uppercase tracking-widest rounded-full">LIVE</span>
                                            )}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/upload-product?edit=${product.id}`)}
                                                    className="w-8 h-8 rounded-full bg-gray-50 border border-black/10 flex items-center justify-center hover:bg-gray-100 hover:text-brand-orange transition-all group"
                                                    title="EDIT ASSET"
                                                >
                                                    <span className="text-sm group-hover:scale-110 transition-transform">🖊️</span>
                                                </button>
                                                <button
                                                    onClick={() => toggleArchive(product.id, product.is_archived)}
                                                    className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all group ${product.is_archived ? 'bg-brand-orange/10 border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20' : 'bg-gray-50 border-black/10 hover:bg-gray-100'}`}
                                                    title={product.is_archived ? "UNARCHIVE" : "ARCHIVE"}
                                                >
                                                    <span className="text-sm group-hover:scale-110 transition-transform">📦</span>
                                                </button>
                                                <button
                                                    onClick={() => deleteProduct(product.id)}
                                                    className="w-8 h-8 rounded-full bg-gray-50 border border-black/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/30 transition-all group"
                                                    title="DELETE PERMANENTLY"
                                                >
                                                    <span className="text-sm group-hover:scale-110 transition-transform">🗑️</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center py-10">
                <p className="text-[10px] font-medium text-brand-dark/30 uppercase tracking-[0.3em]">
                    © FLASHUD PREVIEW PORTAL // SECURE INVENTORY MANAGEMENT
                </p>
            </div>
        </div>
    );
};

export default Products;
