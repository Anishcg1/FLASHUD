import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { STORAGE_BUCKET } from '../lib/constants';


const UploadProducts = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        original_price: '',
        discounted_price: '',
        stock: {
            'S': 0,
            'M': 0,
            'L': 0,
            'XL': 0
        },
        images: [],
        is_archived: false,
        category_id: null,
        is_new_in: false,
        new_in_duration: 7
    });
    const [newSize, setNewSize] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [isUploadingImages, setIsUploadingImages] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetchCategories();
        if (editId) {
            fetchProductForEdit();
        }
    }, [editId]);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*');
        if (data) setCategories(data);
    };

    const fetchProductForEdit = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', editId)
            .single();

        if (data) {
            setFormData({
                ...data,
                images: data.images || [],
                is_new_in: data.is_new_in || false,
                new_in_duration: data.new_in_until
                    ? Math.max(0, Math.ceil((new Date(data.new_in_until) - new Date()) / (1000 * 60 * 60 * 24)))
                    : 7
            });
        }
        setIsLoading(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleStockChange = (size, value) => {
        setFormData(prev => ({
            ...prev,
            stock: {
                ...prev.stock,
                [size]: parseInt(value) || 0
            }
        }));
    };

    const handleBatchUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        setIsUploadingImages(true);
        const uploadedUrls = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                setUploadProgress(`${i + 1}/${files.length}`);
                
                const fileExt = file.name.split('.').pop();
                const fileName = `batch_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(filePath, file);

                if (uploadError) {
                    if (uploadError.message.includes('Bucket not found')) {
                        alert(`CRITICAL ERROR: Supabase bucket "${STORAGE_BUCKET}" not found. Please create it in your Supabase Dashboard under Storage -> New Bucket.`);
                    }
                    console.error('SUPABASE STORAGE ERROR:', uploadError);
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            }

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...uploadedUrls]
            }));
            
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading sequence: ' + error.message);
        } finally {
            setIsUploadingImages(false);
            setUploadProgress('');
            // Reset input so the same files can trigger onChange again
            e.target.value = null;
        }
    };

    const handleAddUrl = () => {
        if (!newImageUrl.trim()) return;
        setFormData(prev => ({
            ...prev,
            images: [...prev.images, newImageUrl.trim()]
        }));
        setNewImageUrl('');
    };

    const removeImage = (indexToRemove) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    const moveImage = (index, direction) => {
        setFormData(prev => {
            const newImages = [...prev.images];
            const targetIndex = index + direction;
            if (targetIndex >= 0 && targetIndex < newImages.length) {
                // Swap
                const temp = newImages[targetIndex];
                newImages[targetIndex] = newImages[index];
                newImages[index] = temp;
            }
            return { ...prev, images: newImages };
        });
    };

    const addCustomSize = () => {
        if (!newSize.trim()) return;
        setFormData(prev => ({
            ...prev,
            stock: {
                ...prev.stock,
                [newSize.toUpperCase()]: 0
            }
        }));
        setNewSize('');
    };

    const removeSize = (size) => {
        setFormData(prev => {
            const newStock = { ...prev.stock };
            delete newStock[size];
            return { ...prev, stock: newStock };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            ...formData,
            original_price: parseFloat(formData.original_price),
            discounted_price: parseFloat(formData.discounted_price),
            images: formData.images.filter(img => img.trim() !== ''),
            new_in_until: formData.is_new_in
                ? new Date(Date.now() + formData.new_in_duration * 24 * 60 * 60 * 1000).toISOString()
                : null
        };

        // Remove helper field from payload
        delete payload.new_in_duration;

        if (payload.images.length < 4) {
            alert('STRATEGIC REQUIREMENT: Please provide AT LEAST 4 product image URLs for a premium appearance.');
            setIsLoading(false);
            return;
        }

        try {
            let result;
            if (editId) {
                result = await supabase
                    .from('products')
                    .update(payload)
                    .eq('id', editId);
            } else {
                result = await supabase
                    .from('products')
                    .insert([payload]);
            }

            if (result.error) throw result.error;

            alert(editId ? 'ASSET UPDATED SUCCESSFULLY' : 'ASSET UPLOADED TO VAULT');
            navigate('/products');
        } catch (error) {
            console.error('Error saving product:', error);
            alert('VAULT ERROR: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto selection:bg-brand-orange selection:text-white pb-20">
            <div className="mb-12">
                <h1 className="text-3xl font-light text-brand-dark tracking-[0.2em] relative inline-block">
                    {editId ? 'UPDATE' : 'UPLOAD'} <span className="font-bold text-brand-orange">ASSET</span>
                </h1>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
                <p className="text-xs font-medium text-brand-dark/40 uppercase tracking-[0.1em] mt-3">
                    {editId ? `Editing Product ID: ${editId}` : 'Onboarding new inventory item'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
                {/* Visual Identity (Images) */}
                <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm">
                    <h2 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Asset Gallery (Min 4) <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h2>
                    
                    <div className="space-y-6">
                        {/* Master Upload Region */}
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                            <div className="flex-1 w-full space-y-3">
                                <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">
                                    BATCH UPLOAD LOCAL FILES
                                </label>
                                <div className="relative h-14 bg-gray-50 border border-black/10 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-all group">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleBatchUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={isUploadingImages}
                                    />
                                    <div className="px-4 py-4 text-xs font-bold text-brand-dark/40 flex items-center justify-center gap-3">
                                        {isUploadingImages ? (
                                            <span className="animate-pulse text-brand-orange">UPLOADING ASSETS... ({uploadProgress})</span>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                <span className="group-hover:text-brand-dark transition-colors uppercase tracking-widest">DRAG & DROP OR CHOOSE FILES</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 text-brand-dark/20 font-bold w-full md:w-auto justify-center">
                                <div className="h-px w-8 bg-black/5 md:hidden"></div>
                                <span className="text-[10px] tracking-[0.3em] uppercase">OR URL</span>
                                <div className="h-px w-8 bg-black/5 md:hidden"></div>
                            </div>
                            
                            <div className="flex-1 w-full space-y-3">
                                <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">
                                    ADD FROM URL
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="https://example.com/asset.jpg"
                                        value={newImageUrl}
                                        onChange={(e) => setNewImageUrl(e.target.value)}
                                        className="w-full px-5 py-3.5 bg-white border border-black/10 rounded-xl focus:outline-none focus:border-brand-orange/50 text-brand-dark transition-all text-sm placeholder:text-brand-dark/30 shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddUrl}
                                        className="px-6 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange hover:text-white hover:border-brand-orange transition-all h-[46px]"
                                    >
                                        ADD
                                    </button>
                                </div>
                            </div>
                        </div>
 
                        {/* Image Grid Preview */}
                        {formData.images.length > 0 && (
                            <div className="mt-8">
                                <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-4 ml-1">
                                    ASSET SEQUENCE ({formData.images.length})
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                                    {formData.images.map((imgUrl, index) => (
                                        <div key={index} className="relative aspect-square rounded-xl bg-gray-50 border border-black/5 overflow-hidden shadow-inner group/preview">
                                            <img src={imgUrl} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                            
                                            {index === 0 && (
                                                <div className="absolute top-2 left-2 bg-brand-orange text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                    PRIMARY
                                                </div>
                                            )}
 
                                            {/* Top right actions (Delete) */}
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity hover:bg-red-500 text-xs shadow-md"
                                                title="Remove Image"
                                            >
                                                ×
                                            </button>
 
                                            {/* Bottom actions (Reorder) */}
                                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    disabled={index === 0}
                                                    onClick={() => moveImage(index, -1)}
                                                    className="w-7 h-7 rounded bg-black/80 text-white flex items-center justify-center hover:bg-brand-orange disabled:opacity-30 disabled:hover:bg-black/80 transition-colors shadow-md"
                                                    title="Move Left"
                                                >
                                                    ←
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={index === formData.images.length - 1}
                                                    onClick={() => moveImage(index, 1)}
                                                    className="w-7 h-7 rounded bg-black/80 text-white flex items-center justify-center hover:bg-brand-orange disabled:opacity-30 disabled:hover:bg-black/80 transition-colors shadow-md"
                                                    title="Move Right"
                                                >
                                                    →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Technical Specifications */}
                <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm">
                    <h2 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Specifications <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h2>
 
                    <div className="space-y-8">
                        <div>
                            <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Asset Nomenclature (Name)</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                                required
                            />
                        </div>
 
                        <div>
                            <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Strategic Overview (Description)</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="4"
                                className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                                required
                            />
                        </div>
 
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Category</label>
                                <select
                                    name="category_id"
                                    value={formData.category_id || ''}
                                    onChange={handleInputChange}
                                    className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                                >
                                    <option value="">SELECT COLLECTION</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-4 p-4 rounded-2xl bg-gray-50 border border-black/5">
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={formData.is_new_in}
                                                onChange={(e) => setFormData(prev => ({ ...prev, is_new_in: e.target.checked }))}
                                                className="w-6 h-6 rounded-md border border-black/20 bg-white appearance-none cursor-pointer checked:bg-brand-orange checked:border-brand-orange transition-all peer"
                                            />
                                            <span className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100 font-bold transition-opacity">✓</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-brand-dark/60 uppercase tracking-[0.2em] group-hover:text-brand-dark transition-colors">MARK AS "NEW IN"</span>
                                    </label>
 
                                    {formData.is_new_in && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="block text-[8px] font-bold text-brand-orange uppercase tracking-[0.2em] mb-2 ml-1">DURATION (DAYS)</label>
                                            <input
                                                type="number"
                                                value={formData.new_in_duration}
                                                onChange={(e) => setFormData(prev => ({ ...prev, new_in_duration: parseInt(e.target.value) || 0 }))}
                                                min="1"
                                                className="w-24 px-4 py-2 rounded-lg bg-white border border-black/10 text-brand-dark text-sm focus:outline-none focus:border-brand-orange/50 transition-all"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
 
                {/* Stock Distribution */}
                <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm">
                    <h2 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Stock Allocation <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h2>
 
                    <div className="space-y-8">
                        {/* Dynamic Size Inputs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {Object.entries(formData.stock).map(([size, qty]) => (
                                <div key={size} className="relative group/size">
                                    <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">SIZE {size}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={qty}
                                            onChange={(e) => handleStockChange(size, e.target.value)}
                                            min="0"
                                            className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all text-center"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeSize(size)}
                                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover/size:opacity-100 transition-opacity"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
 
                        {/* Add Custom Size UI */}
                        <div className="pt-6 border-t border-black/5 flex flex-col sm:flex-row items-end gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Add Custom Size Key</label>
                                <input
                                    type="text"
                                    placeholder="e.g. XXL, UK 10, ONE SIZE"
                                    value={newSize}
                                    onChange={(e) => setNewSize(e.target.value.toUpperCase())}
                                    className="w-full px-5 py-3 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all uppercase"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={addCustomSize}
                                className="px-6 py-3 rounded-xl bg-white border border-black/10 text-brand-dark text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange hover:text-white hover:border-brand-orange transition-all whitespace-nowrap h-[46px]"
                            >
                                + ADD SIZE
                            </button>
                        </div>
                    </div>
                </div>
 
                {/* Financial Engineering (Pricing) */}
                <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm">
                    <h2 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Commercial Pricing <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h2>
 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">MSRP (Original Price ₹)</label>
                            <input
                                type="number"
                                name="original_price"
                                value={formData.original_price}
                                onChange={handleInputChange}
                                step="1"
                                className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                                required
                            />
                        </div>
 
                        <div>
                            <label className="block text-[10px] font-semibold text-brand-dark/40 uppercase tracking-[0.2em] mb-2 ml-1">Flash Price (Discounted ₹)</label>
                            <input
                                type="number"
                                name="discounted_price"
                                value={formData.discounted_price}
                                onChange={handleInputChange}
                                step="1"
                                className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 focus:ring-1 focus:ring-brand-orange/50 transition-all"
                                required
                            />
                        </div>
                    </div>
                </div>
 
                {/* Final Verification */}
                <div className="flex flex-col md:flex-row gap-6">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 py-5 rounded-full bg-brand-gradient text-white font-bold uppercase tracking-widest shadow-[0_0_20px_rgba(255,123,0,0.3)] hover:shadow-[0_0_30px_rgba(255,123,0,0.5)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                        {isLoading ? 'EXECUTING TRANSACTION...' : (editId ? 'COMMIT ASSET UPDATE' : 'ONBOARD ASSET TO VAULT')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/products')}
                        className="px-10 py-5 rounded-full bg-white border border-black/10 text-brand-dark/60 font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        ABORT
                    </button>
                </div>
            </form>
        </div>
    );
};
 
export default UploadProducts;