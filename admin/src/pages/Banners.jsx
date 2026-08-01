import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { STORAGE_BUCKET } from '../lib/constants';

const Banners = () => {
    const [banners, setBanners] = useState([]);
    const [newBanner, setNewBanner] = useState({ image_url: '', title: '', subtitle: '', link_url: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Hero Setting State
    const [heroImageDesktop, setHeroImageDesktop] = useState('');
    const [heroImageMobile, setHeroImageMobile] = useState('');
    const [isSavingHero, setIsSavingHero] = useState(false);
    const [isUploadingHeroDesktop, setIsUploadingHeroDesktop] = useState(false);
    const [isUploadingHeroMobile, setIsUploadingHeroMobile] = useState(false);

    useEffect(() => {
        fetchBanners();
        fetchHeroSetting();
    }, []);

    const fetchHeroSetting = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('name', '_HERO_IMAGE_')
            .single();
        if (data && data.images && data.images.length > 0) {
            setHeroImageDesktop(data.images[0]);
            if (data.images.length > 1) {
                setHeroImageMobile(data.images[1]);
            }
        }
    };

    const saveHeroSetting = async (e) => {
        e.preventDefault();
        setIsSavingHero(true);
        // Check if exists
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('name', '_HERO_IMAGE_')
            .single();

        try {
            if (existing) {
                const { error } = await supabase.from('products').update({
                    images: [heroImageDesktop, heroImageMobile],
                    is_archived: false
                }).eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').insert([{
                    name: '_HERO_IMAGE_',
                    description: 'Hero Image Setting',
                    original_price: 0,
                    discounted_price: 0,
                    category_id: null,
                    is_archived: false,
                    stock: { 'S': 0, 'M': 0, 'L': 0, 'XL': 0 },
                    images: [heroImageDesktop, heroImageMobile]
                }]);
                if (error) throw error;
            }
            setIsSavingHero(false);
            alert('Hero images updated successfully. Refresh the user storefront to view.');
        } catch (err) {
            setIsSavingHero(false);
            console.error('Failed to save hero setting:', err);
            alert('Error updating Hero: ' + err.message);
        }
    };

    const handleHeroUpload = async (e, type = 'desktop') => {
        const file = e.target.files[0];
        if (!file) return;

        if (type === 'desktop') setIsUploadingHeroDesktop(true);
        if (type === 'mobile') setIsUploadingHeroMobile(true);

        try {
            const fileExt = file.name.split('.').pop();
            const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            const fileName = `hero_${uniqueId}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, file);

            if (uploadError) {
                if (uploadError.message.includes('Bucket not found')) {
                    alert(`CRITICAL ERROR: Supabase bucket "${STORAGE_BUCKET}" not found. Please create it in your Supabase Dashboard.`);
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(filePath);

            if (type === 'desktop') setHeroImageDesktop(publicUrl);
            if (type === 'mobile') setHeroImageMobile(publicUrl);
        } catch (error) {
            console.error('Hero upload error:', error);
            alert('Error uploading hero: ' + error.message);
        } finally {
            if (type === 'desktop') setIsUploadingHeroDesktop(false);
            if (type === 'mobile') setIsUploadingHeroMobile(false);
            e.target.value = null;
        }
    };

    const fetchBanners = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from('banners')
            .select('*')
            .order('display_order', { ascending: true });
        if (data) setBanners(data);
        setIsLoading(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const uniqueId = Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            const fileName = `${uniqueId}.${fileExt}`;
            const filePath = `banners/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, file);

            if (uploadError) {
                if (uploadError.message.includes('Bucket not found')) {
                    alert(`CRITICAL ERROR: Supabase bucket "${STORAGE_BUCKET}" not found. Please create it in your Supabase Dashboard.`);
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(filePath);

            setNewBanner(prev => ({ ...prev, image_url: publicUrl }));
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading banner: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddBanner = async (e) => {
        e.preventDefault();
        if (!newBanner.image_url) return;
        setIsSaving(true);
        const { error } = await supabase
            .from('banners')
            .insert([newBanner]);

        if (error) {
            alert('UPLOAD ERROR: ' + error.message);
        } else {
            setNewBanner({ image_url: '', title: '', subtitle: '', link_url: '' });
            fetchBanners();
        }
        setIsSaving(false);
    };

    const deleteBanner = async (id) => {
        if (!window.confirm('Remove this banner from circulation?')) return;
        const { error } = await supabase.from('banners').delete().eq('id', id);
        if (error) alert('Error');
        else fetchBanners();
    };

    return (
        <div className="max-w-5xl mx-auto selection:bg-brand-orange selection:text-white pb-20">
            <div className="mb-12">
                <h2 className="text-3xl font-light text-brand-dark tracking-[0.2em] relative inline-block">
                    HERO <span className="font-bold text-brand-orange">CAROUSEL</span>
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
            </div>

            {/* STOREFRONT HERO SETTINGS (Desktop & Mobile) */}
            <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm mb-16">
                <h3 className="text-xl font-light text-brand-dark mb-6 tracking-widest uppercase flex items-center gap-4">
                    Storefront <span className="text-brand-orange font-bold">Hero Settings</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                </h3>
                <form onSubmit={saveHeroSetting} className="flex flex-col gap-8">
                    {/* Desktop Hero Layout */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Desktop Hero — Image or Video</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1 bg-gray-50 border border-black/10 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-all group">
                                    <input
                                        type="file"
                                        accept="image/*,video/mp4,video/webm,video/ogg"
                                        onChange={(e) => handleHeroUpload(e, 'desktop')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={isUploadingHeroDesktop}
                                    />
                                    <div className="px-5 py-4 text-sm font-medium text-brand-dark/40 flex items-center justify-center gap-3">
                                        <svg className="w-5 h-5 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                        <span className="group-hover:text-brand-dark transition-colors">
                                            {isUploadingHeroDesktop ? 'UPLOADING...' : 'CHOOSE IMAGE OR VIDEO'}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-brand-dark/20 self-center font-bold">// OR //</span>
                                <input
                                    type="url"
                                    value={heroImageDesktop?.startsWith('data:') ? '' : heroImageDesktop}
                                    onChange={(e) => setHeroImageDesktop(e.target.value)}
                                    placeholder="https://example.com/hero.mp4 or hero.jpg"
                                    className="flex-1 bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:border-brand-orange/50 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile Hero Layout */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2 w-full">
                            <label className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Mobile Hero — Image or Video</label>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1 bg-gray-50 border border-black/10 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-all group">
                                    <input
                                        type="file"
                                        accept="image/*,video/mp4,video/webm,video/ogg"
                                        onChange={(e) => handleHeroUpload(e, 'mobile')}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={isUploadingHeroMobile}
                                    />
                                    <div className="px-5 py-4 text-sm font-medium text-brand-dark/40 flex items-center justify-center gap-3">
                                        <svg className="w-5 h-5 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                        <span className="group-hover:text-brand-dark transition-colors">
                                            {isUploadingHeroMobile ? 'UPLOADING...' : 'CHOOSE IMAGE OR VIDEO'}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-brand-dark/20 self-center font-bold">// OR //</span>
                                <input
                                    type="url"
                                    value={heroImageMobile?.startsWith('data:') ? '' : heroImageMobile}
                                    onChange={(e) => setHeroImageMobile(e.target.value)}
                                    placeholder="https://example.com/hero-mobile.mp4 or .jpg"
                                    className="flex-1 bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:border-brand-orange/50 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSavingHero || isUploadingHeroDesktop || isUploadingHeroMobile}
                        className="px-8 py-4 mt-2 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-brand-dark transition-all disabled:opacity-50 h-[54px] whitespace-nowrap self-end shadow-md"
                    >
                        {isUploadingHeroDesktop || isUploadingHeroMobile ? 'UPLOADING...' : isSavingHero ? 'SAVING...' : 'UPDATE HERO IMAGES'}
                    </button>
                </form>

                {/* Previews */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {heroImageDesktop && (() => {
                        const isVid = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(heroImageDesktop);
                        return (
                            <div className="col-span-1 md:col-span-2 relative aspect-[21/9] w-full rounded-2xl overflow-hidden border border-black/5 shadow-sm bg-gray-50">
                                {isVid ? (
                                    <video src={heroImageDesktop} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={heroImageDesktop} alt="Desktop Preview" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6 pointer-events-none">
                                    <span className="text-[10px] font-bold text-white/70 tracking-[0.2em] uppercase">
                                        DESKTOP — {isVid ? '🎬 VIDEO' : '🖼 IMAGE'}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}
                    {heroImageMobile && (() => {
                        const isVid = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(heroImageMobile);
                        return (
                            <div className="col-span-1 relative aspect-[9/16] w-full max-w-sm mx-auto md:max-w-none rounded-2xl overflow-hidden border border-black/5 shadow-sm bg-gray-50">
                                {isVid ? (
                                    <video src={heroImageMobile} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                                ) : (
                                    <img src={heroImageMobile} alt="Mobile Preview" className="w-full h-full object-cover" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6 pointer-events-none">
                                    <span className="text-[10px] font-bold text-white/70 tracking-[0.2em] uppercase">
                                        MOBILE — {isVid ? '🎬 VIDEO' : '🖼 IMAGE'}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Add Banner Form */}
            <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm mb-16">
                <h3 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                    Deploy New Asset <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                </h3>
                <form onSubmit={handleAddBanner} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Banner Asset</label>

                            <div className="relative h-14 bg-gray-50 border border-black/10 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-all group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isUploading}
                                />
                                <div className="px-5 py-4 text-[10px] font-bold text-brand-dark/40 flex items-center justify-center gap-3">
                                    {isUploading ? (
                                        <span className="animate-pulse tracking-widest uppercase">Uploading Asset...</span>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <span className="group-hover:text-brand-dark transition-colors tracking-widest uppercase">Choose Local Image</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-black/5"></div>
                                <span className="text-[8px] font-bold text-brand-dark/20 uppercase tracking-[0.3em]">OR URL</span>
                                <div className="h-px flex-1 bg-black/5"></div>
                            </div>

                            <input
                                type="text"
                                placeholder="IMAGE URL (E.G. HTTPS://...)"
                                value={newBanner.image_url}
                                onChange={(e) => setNewBanner({ ...newBanner, image_url: e.target.value })}
                                className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all placeholder:text-brand-dark/30 shadow-sm"
                                required
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Destination URL</label>
                                <input
                                    type="text"
                                    placeholder="TARGET URL (DESTINATION)"
                                    value={newBanner.link_url}
                                    onChange={(e) => setNewBanner({ ...newBanner, link_url: e.target.value })}
                                    className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all placeholder:text-brand-dark/30 shadow-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Main Heading</label>
                                    <input
                                        type="text"
                                        placeholder="TITLE"
                                        value={newBanner.title}
                                        onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                                        className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all placeholder:text-brand-dark/30 shadow-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Subtitle</label>
                                    <input
                                        type="text"
                                        placeholder="SUBTITLE"
                                        value={newBanner.subtitle}
                                        onChange={(e) => setNewBanner({ ...newBanner, subtitle: e.target.value })}
                                        className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all placeholder:text-brand-dark/30 shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {newBanner.image_url && (
                        <div className="relative aspect-[21/9] rounded-2xl overflow-hidden border border-black/5 bg-gray-50">
                            <img src={newBanner.image_url} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-white text-[10px] font-bold uppercase tracking-widest">Live Preview</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSaving || isUploading}
                        className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] shadow-md hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-50"
                    >
                        {isSaving ? 'DEPLOYING...' : 'SAVE TO CAROUSEL'}
                    </button>
                </form>
            </div>

            {/* Banner List */}
            <div className="grid grid-cols-1 gap-8">
                {isLoading ? (
                    <div className="p-20 text-center text-brand-dark/40 animate-pulse uppercase tracking-widest">Scanning Vault...</div>
                ) : banners.length > 0 ? banners.map((banner) => (
                    <div key={banner.id} className="relative aspect-[21/9] rounded-3xl overflow-hidden group border border-black/5 shadow-md">
                        <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10">
                            <h4 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">{banner.title}</h4>
                            <p className="text-white/70 uppercase tracking-widest text-sm">{banner.subtitle}</p>
                            <div className="absolute top-6 right-6">
                                <button
                                    onClick={() => deleteBanner(banner.id)}
                                    className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/30 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="p-20 text-center bg-white border border-black/5 rounded-3xl text-brand-dark/30 uppercase tracking-[0.2em]">No Active Banners Found</div>
                )}
            </div>
        </div>
    );
};

export default Banners;

