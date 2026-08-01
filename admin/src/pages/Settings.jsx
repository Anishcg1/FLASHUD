import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Settings = () => {
    const [storeInfo, setStoreInfo] = useState({ name: '', email: '', phone: '', address: '' });
    const [seoMetadata, setSeoMetadata] = useState({ title: '', description: '', keywords: '' });
    const [paymentSettings, setPaymentSettings] = useState({ qr_url: '', number: '', instructions: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        const { data } = await supabase.from('settings').select('*');
        if (data) {
            const info = data.find(s => s.key === 'store_info');
            const seo = data.find(s => s.key === 'seo_metadata');
            const payment = data.find(s => s.key === 'payment_settings');
            if (info) setStoreInfo(info.value);
            if (seo) setSeoMetadata(seo.value);
            if (payment) setPaymentSettings(payment.value);
        }
        setIsLoading(false);
    };

    const handleQRUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `payment_qr_${Date.now()}.${fileExt}`;
            const filePath = `settings/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) {
                alert('Upload error: ' + uploadError.message);
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setPaymentSettings(prev => ({ ...prev, qr_url: publicUrl }));
        } catch (error) {
            console.error('QR upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (key, value) => {
        setIsSaving(true);
        const { error } = await supabase
            .from('settings')
            .upsert({ key, value, updated_at: new Date().toISOString() });

        if (error) {
            alert('SAVE ERROR: ' + error.message);
        } else {
            alert('CONFIGURATION UPDATED IN VAULT');
        }
        setIsSaving(false);
    };

    if (isLoading) return <div className="p-20 text-center text-brand-dark/50 uppercase tracking-widest">Loading Configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto selection:bg-brand-orange selection:text-white pb-20">
            <div className="mb-12">
                <h2 className="text-3xl font-light text-brand-dark tracking-[0.2em] relative inline-block">
                    SYSTEM <span className="font-bold text-brand-orange">CONFIG</span>
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
            </div>

            <div className="space-y-10">
                {/* Store Info */}
                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Store Identity <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Brand Name</label>
                            <input
                                type="text"
                                value={storeInfo.name}
                                onChange={(e) => setStoreInfo({ ...storeInfo, name: e.target.value })}
                                className="w-full px-5 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Contact Email</label>
                            <input
                                type="email"
                                value={storeInfo.email}
                                onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                                className="w-full px-5 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => handleSave('store_info', storeInfo)}
                        disabled={isSaving}
                        className="mt-8 px-8 py-3 rounded-full bg-brand-orange text-white font-bold uppercase tracking-widest text-xs hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-md"
                    >
                        Save Identity
                    </button>
                </div>

                {/* Manual Payment Credentials */}
                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Manual Payment Setup <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h3>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">UPI ID or Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g. pay@upi or +91 9876543210"
                                    value={paymentSettings.number || ''}
                                    onChange={(e) => setPaymentSettings({ ...paymentSettings, number: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all shadow-sm placeholder:text-brand-dark/30"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Payment Instructions</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Scan the QR code and send verification"
                                    value={paymentSettings.instructions || ''}
                                    onChange={(e) => setPaymentSettings({ ...paymentSettings, instructions: e.target.value })}
                                    className="w-full px-5 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all shadow-sm placeholder:text-brand-dark/30"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Payment QR Code</label>
                            
                            {/* File upload */}
                            <div className="relative h-14 bg-gray-50 border border-black/10 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-all group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleQRUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isUploading}
                                />
                                <div className="px-5 py-4 text-[10px] font-bold text-brand-dark/40 flex items-center justify-center gap-3">
                                    {isUploading ? (
                                        <span className="animate-pulse tracking-widest text-brand-orange">UPLOADING...</span>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <span className="group-hover:text-brand-dark transition-colors tracking-widest">UPLOAD QR IMAGE</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-black/5"></div>
                                <span className="text-[8px] font-bold text-brand-dark/20 uppercase tracking-[0.3em]">or paste QR URL</span>
                                <div className="h-px flex-1 bg-black/5"></div>
                            </div>

                            {/* URL input */}
                            <input
                                type="url"
                                placeholder="https://example.com/qr.jpg"
                                value={paymentSettings.qr_url || ''}
                                onChange={(e) => setPaymentSettings({ ...paymentSettings, qr_url: e.target.value })}
                                className="w-full px-5 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all shadow-sm placeholder:text-brand-dark/30"
                            />
                        </div>

                        {/* QR Code Preview */}
                        {paymentSettings.qr_url && (
                            <div className="w-36 h-36 rounded-xl border border-black/5 bg-gray-50 overflow-hidden relative flex items-center justify-center p-2">
                                <img
                                    src={paymentSettings.qr_url}
                                    alt="QR Code Preview"
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => { e.target.style.opacity = '0.2'; }}
                                />
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => handleSave('payment_settings', paymentSettings)}
                        disabled={isSaving || isUploading}
                        className="mt-8 px-8 py-3 rounded-full bg-brand-orange text-white font-bold uppercase tracking-widest text-xs hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-md"
                    >
                        Save Payment Credentials
                    </button>
                </div>

                {/* SEO Metadata */}
                <div className="bg-white border border-black/5 rounded-3xl p-8 shadow-sm">
                    <h3 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        SEO Strategy <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                    </h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Meta Title</label>
                            <input
                                type="text"
                                value={seoMetadata.title}
                                onChange={(e) => setSeoMetadata({ ...seoMetadata, title: e.target.value })}
                                className="w-full px-5 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] ml-1">Meta Description</label>
                            <textarea
                                value={seoMetadata.description}
                                onChange={(e) => setSeoMetadata({ ...seoMetadata, description: e.target.value })}
                                rows="3"
                                className="w-full px-5 py-3.5 rounded-xl bg-white border border-black/10 text-brand-dark font-medium focus:border-brand-orange/50 focus:outline-none transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => handleSave('seo_metadata', seoMetadata)}
                        disabled={isSaving}
                        className="mt-8 px-8 py-3 rounded-full bg-brand-orange text-white font-bold uppercase tracking-widest text-xs hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 shadow-md"
                    >
                        Apply SEO
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
