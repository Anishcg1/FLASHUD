import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const AdminManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setIsAnimating(true);
        loadAdmins();
    }, []);

    const loadAdmins = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'admin')
            .order('created_at', { ascending: false });

        if (data) setAdmins(data);
    };

    const filteredAdmins = admins.filter(admin =>
        (admin.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (admin.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    return (
        <div className="max-w-6xl mx-auto selection:bg-brand-orange selection:text-white">

            {/* Header */}
            <div className={`mb-10 transition-all duration-1000 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <h2 className="text-3xl font-light text-brand-dark tracking-[0.2em]">
                    ADMIN <span className="font-bold text-brand-orange">ACCOUNTS</span>
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
                <p className="text-brand-dark/40 text-sm mt-2 uppercase tracking-widest">Registered admin accounts</p>
            </div>

            {/* Search */}
            <div className={`mb-8 transition-all duration-1000 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: '200ms' }}>
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-sm px-5 py-3 rounded-xl bg-white border border-black/10 text-brand-dark placeholder-brand-dark/30 focus:outline-none focus:border-brand-orange/50 transition-all shadow-sm"
                />
            </div>

            {/* Admins Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAdmins.map((admin, index) => (
                    <div
                        key={admin.id || index}
                        className={`bg-white border border-black/5 p-6 rounded-2xl relative overflow-hidden transition-all duration-700 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} shadow-sm hover:shadow-md`}
                        style={{ transitionDelay: `${300 + index * 100}ms` }}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange rounded-full filter blur-2xl opacity-5 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-orange text-white flex items-center justify-center font-bold text-xl">
                                    {(admin.full_name || 'A').charAt(0).toUpperCase()}
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-widest">
                                    Active
                                </span>
                            </div>

                            <h3 className="font-semibold text-brand-dark text-base mb-0.5 truncate">{admin.full_name || '—'}</h3>
                            <p className="text-brand-dark/40 text-xs mb-1 truncate">{admin.email}</p>
                            <p className="text-brand-dark/30 text-[10px] uppercase tracking-wider">
                                Since {formatDate(admin.created_at)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {filteredAdmins.length === 0 && (
                <div className={`text-center py-16 transition-all duration-1000 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
                    style={{ transitionDelay: '400ms' }}>
                    <div className="text-6xl mb-4">👤</div>
                    <p className="text-brand-dark/40 text-sm uppercase tracking-widest">No admin accounts found</p>
                </div>
            )}

            {/* Stats */}
            <div className={`mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm transition-all duration-1000 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
                style={{ transitionDelay: '600ms' }}>
                <div className="bg-white border border-black/5 rounded-2xl p-5 text-center shadow-sm">
                    <div className="text-3xl font-bold text-brand-orange mb-1">{admins.length}</div>
                    <div className="text-[10px] text-brand-dark/40 uppercase tracking-widest">Total Admins</div>
                </div>
                <div className="bg-white border border-black/5 rounded-2xl p-5 text-center shadow-sm">
                    <div className="text-3xl font-bold text-green-600 mb-1">{admins.length}</div>
                    <div className="text-[10px] text-brand-dark/40 uppercase tracking-widest">Active</div>
                </div>
            </div>
        </div>
    );
};

export default AdminManagement;
