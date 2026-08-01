import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { STORAGE_BUCKET } from '../lib/constants';

const Categories = () => {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState({ name: '', thumbnail_url: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [previewError, setPreviewError] = useState(false);
    const [previewLoaded, setPreviewLoaded] = useState(false);

    // Inline edit state — stores { id, thumbnail_url } of the row being edited
    const [editingId, setEditingId] = useState(null);
    const [editUrl, setEditUrl] = useState('');
    const [editUploading, setEditUploading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('name');

        if (error) console.error('Fetch error:', error);
        if (data) setCategories(data);
        setIsLoading(false);
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory.name) return;
        setIsSaving(true);

        const slug = newCategory.name.toLowerCase().replace(/ /g, '-');
        const { error } = await supabase
            .from('categories')
            .insert([{ name: newCategory.name, slug, thumbnail_url: newCategory.thumbnail_url.trim() || null }]);

        if (error) {
            console.error('Insert error:', error);
            alert('Error creating collection: ' + error.message);
        } else {
            setNewCategory({ name: '', thumbnail_url: '' });
            setPreviewError(false);
            setPreviewLoaded(false);
            fetchCategories();
        }
        setIsSaving(false);
    };

    // Upload a file to storage and return the public URL
    const uploadFile = async (file, prefix = '') => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `categories/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file);

        if (uploadError) {
            if (uploadError.message.includes('Bucket not found')) {
                alert(`Storage bucket "${STORAGE_BUCKET}" not found. Create it in Supabase Dashboard → Storage.`);
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    alert('Session expired. Please log out and back in.');
                } else {
                    alert('Upload error: ' + uploadError.message);
                }
            }
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        return publicUrl;
    };

    // File upload for new category form
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const url = await uploadFile(file);
            setNewCategory(prev => ({ ...prev, thumbnail_url: url }));
            setPreviewError(false);
            setPreviewLoaded(false);
        } catch (_) {
            // error already alerted inside uploadFile
        } finally {
            setIsUploading(false);
            e.target.value = null;
        }
    };

    // File upload for inline edit
    const handleEditFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setEditUploading(true);
        try {
            const url = await uploadFile(file);
            setEditUrl(url);
        } catch (_) {
            // error already alerted
        } finally {
            setEditUploading(false);
            e.target.value = null;
        }
    };

    // Save edited thumbnail_url back to Supabase
    const handleSaveEdit = async (id) => {
        const trimmed = editUrl.trim();
        const { error } = await supabase
            .from('categories')
            .update({ thumbnail_url: trimmed || null })
            .eq('id', id);

        if (error) {
            console.error('Update error:', error);
            alert('Error saving thumbnail: ' + error.message);
        } else {
            setEditingId(null);
            setEditUrl('');
            fetchCategories();
        }
    };

    const deleteCategory = async (id) => {
        if (!window.confirm('Delete this collection? This may affect linked products.')) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) alert('Error deleting category: ' + error.message);
        else fetchCategories();
    };

    return (
        <div className="max-w-4xl mx-auto selection:bg-brand-orange selection:text-white pb-20">
            <div className="mb-12">
                <h2 className="text-3xl font-light text-brand-dark tracking-[0.2em]">
                    COLLECTION <span className="font-bold text-brand-orange">MATRIX</span>
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
                <p className="text-xs font-medium text-brand-dark/40 uppercase tracking-[0.1em] mt-3">
                    Categorize your luxury inventory
                </p>
            </div>

            {/* Add Category Form */}
            <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm mb-16">
                <h3 className="text-sm font-bold text-brand-dark/60 uppercase tracking-widest mb-6">New Collection</h3>
                <form onSubmit={handleAddCategory} className="flex flex-col gap-5">
                    {/* Name */}
                    <input
                        type="text"
                        placeholder="COLLECTION NAME (E.G. SUMMER '25)"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 transition-all placeholder:text-brand-dark/30 shadow-sm"
                        required
                    />

                    {/* Thumbnail — file OR URL */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest ml-1">Thumbnail Image</label>

                        {/* File upload */}
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
                                    <span className="animate-pulse tracking-widest text-brand-orange">UPLOADING...</span>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        <span className="group-hover:text-brand-dark transition-colors tracking-widest">UPLOAD LOCAL FILE</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-black/5"></div>
                            <span className="text-[8px] font-bold text-brand-dark/20 uppercase tracking-[0.3em]">or paste URL</span>
                            <div className="h-px flex-1 bg-black/5"></div>
                        </div>

                        {/* URL input */}
                        <input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            value={newCategory.thumbnail_url}
                            onChange={(e) => {
                                setNewCategory({ ...newCategory, thumbnail_url: e.target.value });
                                setPreviewError(false);
                                setPreviewLoaded(false);
                            }}
                            className="w-full px-5 py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-medium tracking-wide focus:outline-none focus:border-brand-orange/50 transition-all placeholder:text-brand-dark/30 shadow-sm"
                        />
                    </div>

                    {/* Preview */}
                    {newCategory.thumbnail_url && (
                        <div className="w-full h-36 rounded-xl border border-black/5 bg-gray-50 overflow-hidden relative">
                            {!previewError ? (
                                <>
                                    {!previewLoaded && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-brand-dark/20 border-t-brand-orange rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    <img
                                        src={newCategory.thumbnail_url}
                                        alt="Preview"
                                        className={`w-full h-full object-cover transition-opacity duration-300 ${previewLoaded ? 'opacity-100' : 'opacity-0'}`}
                                        onLoad={() => setPreviewLoaded(true)}
                                        onError={() => { setPreviewError(true); setPreviewLoaded(false); }}
                                    />
                                </>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                    <svg className="w-7 h-7 text-red-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                    <span className="text-[9px] font-bold text-red-500/60 uppercase tracking-widest">Cannot load — verify URL</span>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-widest hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        {isSaving ? 'Saving...' : 'Initialize Collection'}
                    </button>
                </form>
            </div>

            {/* Categories List */}
            <div className="space-y-4">
                <h3 className="text-lg font-light text-brand-dark uppercase tracking-[0.2em] mb-6 flex items-center gap-6">
                    Active Collections
                    <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent"></div>
                </h3>

                {isLoading ? (
                    <div className="p-10 text-center font-medium uppercase tracking-[0.2em] text-brand-dark/40">Scanning...</div>
                ) : categories.length > 0 ? categories.map((cat) => (
                    <div key={cat.id} className="bg-white border border-black/5 p-6 rounded-2xl group hover:bg-gray-50/50 transition-all duration-300 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                            {/* Thumbnail + info */}
                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                <div className="w-16 h-16 rounded-xl border border-black/5 overflow-hidden flex-shrink-0 bg-gray-100">
                                    {cat.thumbnail_url ? (
                                        <img
                                            src={cat.thumbnail_url}
                                            alt={cat.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.replaceWith(Object.assign(document.createElement('div'), { className: 'w-full h-full flex items-center justify-center', innerHTML: '<span style="font-size:9px;color:rgba(0,0,0,0.2);text-transform:uppercase;letter-spacing:0.1em">No img</span>' })); }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[9px] text-brand-dark/20 uppercase tracking-wider">No img</div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-semibold text-brand-dark uppercase tracking-wider mb-0.5 group-hover:text-brand-orange transition-colors truncate">
                                        {cat.name}
                                    </div>
                                    <code className="text-[10px] font-medium text-brand-dark/30 uppercase tracking-[0.1em]">
                                        {cat.slug}
                                    </code>
                                    {cat.thumbnail_url && (
                                        <p className="text-[9px] text-brand-dark/20 truncate max-w-xs mt-0.5">{cat.thumbnail_url}</p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 flex-shrink-0">
                                <button
                                    onClick={() => { setEditingId(cat.id); setEditUrl(cat.thumbnail_url || ''); }}
                                    className="px-3 py-1.5 rounded-lg bg-white border border-black/10 text-brand-dark/60 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange hover:text-white hover:border-brand-orange transition-all"
                                >
                                    Edit Image
                                </button>
                                <button
                                    onClick={() => deleteCategory(cat.id)}
                                    className="w-9 h-9 rounded-lg flex items-center justify-center border border-black/10 text-brand-dark/40 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
                                >
                                    <span className="text-lg leading-none">×</span>
                                </button>
                            </div>
                        </div>

                        {/* Inline edit panel */}
                        {editingId === cat.id && (
                            <div className="mt-5 pt-5 border-t border-black/5 space-y-3">
                                <label className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest">Update Thumbnail</label>

                                {/* File upload for edit */}
                                <div className="relative h-12 bg-gray-50 border border-black/10 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-all group/edit">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleEditFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        disabled={editUploading}
                                    />
                                    <div className="px-4 h-full text-[10px] font-bold text-brand-dark/40 flex items-center justify-center gap-2">
                                        {editUploading ? (
                                            <span className="animate-pulse text-brand-orange tracking-widest">Uploading...</span>
                                        ) : (
                                            <span className="group-hover/edit:text-brand-dark transition-colors tracking-widest uppercase">Upload New File</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="h-px flex-1 bg-black/5"></div>
                                    <span className="text-[8px] font-bold text-brand-dark/20 uppercase tracking-[0.3em]">or URL</span>
                                    <div className="h-px flex-1 bg-black/5"></div>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={editUrl}
                                        onChange={(e) => setEditUrl(e.target.value)}
                                        placeholder="https://example.com/image.jpg"
                                        className="flex-1 px-4 py-3 rounded-xl bg-white border border-black/10 text-brand-dark text-sm font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder:text-brand-dark/30 shadow-sm"
                                    />
                                    <button
                                        onClick={() => handleSaveEdit(cat.id)}
                                        className="px-5 py-3 rounded-xl bg-brand-orange text-white text-xs font-bold uppercase tracking-widest hover:bg-brand-dark hover:-translate-y-0.5 transition-all shadow-md"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => { setEditingId(null); setEditUrl(''); }}
                                        className="px-4 py-3 rounded-xl bg-white border border-black/10 text-brand-dark/60 text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {/* Edit preview */}
                                {editUrl && (
                                    <div className="w-full h-28 rounded-xl border border-black/5 bg-gray-50 overflow-hidden">
                                        <img
                                            src={editUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => { e.currentTarget.style.opacity = '0.2'; }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="p-20 text-center bg-white border border-black/5 rounded-3xl">
                        <div className="font-medium text-brand-dark/40 uppercase tracking-[0.2em]">No collections yet</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Categories;
