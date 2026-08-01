import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const statusStyles = {
    pending:  'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    completed:'bg-gray-100 text-brand-dark/50 border-black/5',
};

// Generates a human-readable ticket code
const generateTicket = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'RET-';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
};

export default function AdminReturns() {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [actionLoading, setActionLoading] = useState(null);
    const [rejectNote, setRejectNote] = useState('');
    const [rejectingId, setRejectingId] = useState(null);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('return_requests')
            .select('*, profiles(email, full_name)')
            .order('created_at', { ascending: false });

        if (error) console.error('Fetch error:', error);
        if (data) setRequests(data);
        setIsLoading(false);
    };

    const handleApprove = async (req) => {
        setActionLoading(req.id);
        const ticket = generateTicket();
        const { error } = await supabase
            .from('return_requests')
            .update({ status: 'approved', ticket_code: ticket, updated_at: new Date().toISOString() })
            .eq('id', req.id);

        if (error) alert('Error: ' + error.message);
        else fetchRequests();
        setActionLoading(null);
    };

    const handleReject = async (req) => {
        if (!rejectNote.trim()) { alert('Please add a note explaining the rejection.'); return; }
        setActionLoading(req.id);
        const { error } = await supabase
            .from('return_requests')
            .update({ status: 'rejected', admin_note: rejectNote.trim(), updated_at: new Date().toISOString() })
            .eq('id', req.id);

        if (error) alert('Error: ' + error.message);
        else { fetchRequests(); setRejectingId(null); setRejectNote(''); }
        setActionLoading(null);
    };

    const handleComplete = async (req) => {
        setActionLoading(req.id);
        const { error } = await supabase
            .from('return_requests')
            .update({ status: 'completed', ticket_code: null, updated_at: new Date().toISOString() })
            .eq('id', req.id);

        if (error) alert('Error: ' + error.message);
        else fetchRequests();
        setActionLoading(null);
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const formatId = (id) => id?.substring(0, 8).toUpperCase();

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
    const counts = {
        pending:  requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        completed:requests.filter(r => r.status === 'completed').length,
    };

    return (
        <div className="max-w-6xl mx-auto selection:bg-brand-orange selection:text-white pb-20">

            {/* Header */}
            <div className="mb-10">
                <h2 className="text-3xl font-light text-brand-dark tracking-[0.2em]">
                    RETURN <span className="font-bold text-brand-orange">REQUESTS</span>
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
                <p className="text-brand-dark/40 text-sm mt-2 uppercase tracking-widest">Review and process customer return requests</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                    { key: 'pending',   label: 'Pending',   color: 'text-yellow-600' },
                    { key: 'approved',  label: 'Approved',  color: 'text-green-600' },
                    { key: 'rejected',  label: 'Rejected',  color: 'text-red-600' },
                    { key: 'completed', label: 'Completed', color: 'text-brand-dark/50' },
                ].map(s => (
                    <div key={s.key} className="bg-white border border-black/5 rounded-2xl p-4 text-center shadow-sm">
                        <div className={`text-2xl font-bold mb-1 ${s.color}`}>{counts[s.key]}</div>
                        <div className="text-[10px] text-brand-dark/40 uppercase tracking-widest">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-8 flex-wrap">
                {['all', 'pending', 'approved', 'rejected', 'completed'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            filter === f
                                ? 'bg-brand-orange text-white border-brand-orange shadow-md'
                                : 'bg-white border-black/10 text-brand-dark/60 hover:text-brand-dark hover:bg-gray-50 shadow-sm'
                        }`}
                    >
                        {f} {f !== 'all' && `(${counts[f] ?? 0})`}
                    </button>
                ))}
            </div>

            {/* Requests list */}
            {isLoading ? (
                <div className="p-20 text-center text-brand-dark/40 uppercase tracking-widest text-sm">Loading...</div>
            ) : filtered.length === 0 ? (
                <div className="p-16 text-center bg-white border border-black/5 rounded-3xl">
                    <p className="text-brand-dark/30 uppercase tracking-widest text-sm">No {filter} requests</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map(req => (
                        <div key={req.id} className="bg-white border border-black/5 rounded-2xl p-6 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-start gap-4">

                                {/* Info */}
                                <div className="flex-1 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusStyles[req.status]}`}>
                                            {req.status}
                                        </span>
                                        {req.ticket_code && req.status === 'approved' && (
                                            <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-green-50 border border-green-200 text-green-700">
                                                🎫 {req.ticket_code}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                                        <div>
                                            <span className="text-brand-dark/30 uppercase tracking-widest text-[9px] font-bold">Customer</span>
                                            <p className="text-brand-dark font-medium mt-0.5">{req.profiles?.full_name || req.profiles?.email || 'Unknown'}</p>
                                            <p className="text-brand-dark/40 text-[10px]">{req.profiles?.email}</p>
                                        </div>
                                        <div>
                                            <span className="text-brand-dark/30 uppercase tracking-widest text-[9px] font-bold">Order</span>
                                            <p className="text-brand-dark font-medium mt-0.5">#{formatId(req.order_id)}</p>
                                            <p className="text-brand-dark/40 text-[10px]">{formatDate(req.created_at)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-brand-dark/30 uppercase tracking-widest text-[9px] font-bold">Reason</span>
                                        <p className="text-brand-dark/80 text-sm mt-1 leading-relaxed">{req.reason}</p>
                                    </div>

                                    {req.admin_note && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                            <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">Your note: </span>
                                            <span className="text-red-700 text-xs">{req.admin_note}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 md:w-44 flex-shrink-0">
                                    {req.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleApprove(req)}
                                                disabled={actionLoading === req.id}
                                                className="w-full py-2.5 rounded-xl bg-brand-orange text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-dark transition-all disabled:opacity-40 shadow-md"
                                            >
                                                {actionLoading === req.id ? '...' : '✓ Approve & Generate Ticket'}
                                            </button>
                                            {rejectingId === req.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={rejectNote}
                                                        onChange={(e) => setRejectNote(e.target.value)}
                                                        placeholder="Reason for rejection..."
                                                        rows={2}
                                                        className="w-full px-3 py-2 rounded-xl bg-white border border-black/10 text-brand-dark text-xs focus:outline-none focus:border-red-500 resize-none placeholder-brand-dark/30 shadow-sm"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleReject(req)}
                                                            disabled={actionLoading === req.id}
                                                            className="flex-1 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                                                        >
                                                            Confirm
                                                        </button>
                                                        <button
                                                            onClick={() => { setRejectingId(null); setRejectNote(''); }}
                                                            className="flex-1 py-2 rounded-xl bg-white border border-black/10 text-brand-dark/40 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setRejectingId(req.id)}
                                                    className="w-full py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-100 transition-all"
                                                >
                                                    ✕ Reject
                                                </button>
                                            )}
                                        </>
                                    )}

                                    {req.status === 'approved' && (
                                        <button
                                            onClick={() => handleComplete(req)}
                                            disabled={actionLoading === req.id}
                                            className="w-full py-2.5 rounded-xl bg-white border border-black/10 text-brand-dark/60 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-40 shadow-sm"
                                        >
                                            {actionLoading === req.id ? '...' : 'Mark as Received — Expire Ticket'}
                                        </button>
                                    )}

                                    {(req.status === 'rejected' || req.status === 'completed') && (
                                        <span className="text-center text-[9px] text-brand-dark/20 uppercase tracking-widest">No actions</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
