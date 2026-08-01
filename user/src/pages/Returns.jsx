import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

const RETURN_REASONS = [
    'Wrong size / doesn\'t fit',
    'Wrong item received',
    'Item is damaged or defective',
    'Item not as described',
    'Changed my mind',
    'Other',
];

const statusStyles = {
    pending:  'bg-yellow-50 text-yellow-600 border-yellow-200',
    approved: 'bg-green-50 text-green-600 border-green-200',
    rejected: 'bg-red-50 text-red-500 border-red-200',
    completed:'bg-gray-50 text-gray-500 border-gray-200',
};

export default function Returns() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [selectedOrder, setSelectedOrder] = useState('');
    const [selectedReason, setSelectedReason] = useState('');
    const [customReason, setCustomReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // Ticket modal
    const [ticketRequest, setTicketRequest] = useState(null);

    useEffect(() => {
        if (!user) return;
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setIsLoading(true);
        const [ordersRes, requestsRes] = await Promise.all([
            supabase
                .from('orders')
                .select('id, total_amount, status, created_at')
                .eq('user_id', user.id)
                .in('status', ['delivered', 'completed'])
                .order('created_at', { ascending: false }),
            supabase
                .from('return_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false }),
        ]);
        if (ordersRes.data) setOrders(ordersRes.data);
        if (requestsRes.data) setMyRequests(requestsRes.data);
        setIsLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedOrder) return;
        const reason = selectedReason === 'Other' ? customReason.trim() : selectedReason;
        if (!reason) { alert('Please provide a reason.'); return; }

        setIsSubmitting(true);
        const { error } = await supabase.from('return_requests').insert([{
            user_id: user.id,
            order_id: selectedOrder,
            reason,
            status: 'pending',
        }]);

        if (error) {
            alert('Failed to submit request: ' + error.message);
        } else {
            setSubmitSuccess(true);
            setSelectedOrder('');
            setSelectedReason('');
            setCustomReason('');
            fetchData();
            setTimeout(() => setSubmitSuccess(false), 4000);
        }
        setIsSubmitting(false);
    };

    const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const formatId = (id) => id?.substring(0, 8).toUpperCase();

    // Orders that don't already have a pending/approved return request
    const existingRequestOrderIds = new Set(
        myRequests.filter(r => r.status !== 'rejected' && r.status !== 'completed').map(r => r.order_id)
    );
    const eligibleOrders = orders.filter(o => !existingRequestOrderIds.has(o.id));

    if (isLoading) return (
        <div className="min-h-[60vh] flex items-center justify-center pt-32">
            <div className="w-10 h-10 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pt-32 pb-24 px-6 selection:bg-brand-orange selection:text-white">

            {/* Header */}
            <div className="mb-14 border-b border-black/5 pb-10">
                <h1 className="text-5xl md:text-6xl font-light tracking-tight text-brand-dark">
                    Returns & <span className="font-bold text-brand-orange">Exchanges</span>
                </h1>
                <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.3em] mt-4">
                    Request a return for any delivered order within 7 days
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                {/* ── Submit Form ── */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-dark mb-6">New Return Request</h2>

                    {eligibleOrders.length === 0 ? (
                        <div className="p-8 rounded-2xl border border-black/5 bg-white text-center shadow-sm">
                            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-brand-dark/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <p className="text-xs font-bold text-brand-dark/40 uppercase tracking-widest">No eligible orders for return</p>
                            <button onClick={() => navigate('/account')} className="mt-4 text-[10px] font-bold text-brand-orange uppercase tracking-wider hover:text-brand-dark transition-colors">
                                View my orders →
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="bg-white border border-black/5 rounded-2xl p-6 shadow-sm space-y-5">

                            {submitSuccess && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-xs font-bold uppercase tracking-widest text-center">
                                    Request submitted! We'll review it shortly.
                                </div>
                            )}

                            {/* Order select */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Select Order</label>
                                <select
                                    value={selectedOrder}
                                    onChange={(e) => setSelectedOrder(e.target.value)}
                                    required
                                    className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all"
                                >
                                    <option value="">Choose an order...</option>
                                    {eligibleOrders.map(o => (
                                        <option key={o.id} value={o.id}>
                                            #{formatId(o.id)} — ₹{o.total_amount} — {formatDate(o.created_at)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Reason */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Reason for Return</label>
                                <div className="space-y-2">
                                    {RETURN_REASONS.map(reason => (
                                        <label key={reason} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedReason === reason ? 'border-brand-orange bg-brand-orange/5' : 'border-black/5 hover:border-black/10'}`}>
                                            <input
                                                type="radio"
                                                name="reason"
                                                value={reason}
                                                checked={selectedReason === reason}
                                                onChange={() => setSelectedReason(reason)}
                                                className="accent-brand-orange"
                                            />
                                            <span className="text-xs font-medium text-brand-dark">{reason}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Custom reason */}
                            {selectedReason === 'Other' && (
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Describe your reason</label>
                                    <textarea
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        required
                                        rows={3}
                                        placeholder="Please describe the issue..."
                                        className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all resize-none placeholder-brand-dark/30"
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
                            </button>
                        </form>
                    )}
                </div>

                {/* ── My Requests ── */}
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-brand-dark mb-6">My Requests</h2>

                    {myRequests.length === 0 ? (
                        <div className="p-8 rounded-2xl border border-black/5 bg-white text-center shadow-sm">
                            <p className="text-xs font-bold text-brand-dark/30 uppercase tracking-widest">No return requests yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {myRequests.map(req => (
                                <div key={req.id} className="bg-white border border-black/5 rounded-2xl p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest mb-0.5">Order</p>
                                            <p className="text-xs font-bold text-brand-dark">#{formatId(req.order_id)}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusStyles[req.status] || statusStyles.pending}`}>
                                            {req.status}
                                        </span>
                                    </div>

                                    <p className="text-xs text-brand-dark/60 mb-3 leading-relaxed">{req.reason}</p>
                                    <p className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-wider">{formatDate(req.created_at)}</p>

                                    {/* Approved ticket */}
                                    {req.status === 'approved' && req.ticket_code && (
                                        <button
                                            onClick={() => setTicketRequest(req)}
                                            className="mt-4 w-full py-3 rounded-xl bg-green-50 border border-green-200 text-green-600 text-[10px] font-bold uppercase tracking-widest hover:bg-green-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                            </svg>
                                            View Return Ticket
                                        </button>
                                    )}

                                    {req.status === 'rejected' && req.admin_note && (
                                        <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                            <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Admin Note</p>
                                            <p className="text-xs text-red-500">{req.admin_note}</p>
                                        </div>
                                    )}

                                    {req.status === 'completed' && (
                                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-center">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Return completed — ticket expired</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Ticket Modal ── */}
            {ticketRequest && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setTicketRequest(null)}>
                    <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        {/* Ticket top strip */}
                        <div className="bg-brand-orange px-8 py-6 text-white text-center">
                            <div className="text-[9px] font-bold uppercase tracking-[0.4em] mb-2 opacity-80">Return Ticket</div>
                            <div className="text-3xl font-bold tracking-widest">{ticketRequest.ticket_code}</div>
                            <div className="text-[9px] mt-2 opacity-70 uppercase tracking-widest">Present this to courier / store</div>
                        </div>

                        {/* Dashed divider */}
                        <div className="flex items-center px-6 py-2">
                            <div className="w-5 h-5 rounded-full bg-gray-100 -ml-9"></div>
                            <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-2"></div>
                            <div className="w-5 h-5 rounded-full bg-gray-100 -mr-9"></div>
                        </div>

                        {/* Ticket details */}
                        <div className="px-8 pb-8 space-y-4">
                            <div className="flex justify-between text-xs">
                                <span className="text-brand-dark/40 uppercase tracking-widest font-bold">Order</span>
                                <span className="font-bold text-brand-dark">#{formatId(ticketRequest.order_id)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-brand-dark/40 uppercase tracking-widest font-bold">Reason</span>
                                <span className="font-medium text-brand-dark text-right max-w-[180px]">{ticketRequest.reason}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-brand-dark/40 uppercase tracking-widest font-bold">Approved on</span>
                                <span className="font-bold text-brand-dark">{formatDate(ticketRequest.updated_at || ticketRequest.created_at)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-brand-dark/40 uppercase tracking-widest font-bold">Status</span>
                                <span className="font-bold text-green-500 uppercase tracking-widest">Active</span>
                            </div>

                            <div className="pt-4 text-[9px] text-brand-dark/30 text-center uppercase tracking-widest border-t border-black/5">
                                Ticket expires once return is received & confirmed
                            </div>

                            <button
                                onClick={() => setTicketRequest(null)}
                                className="w-full py-3 rounded-full bg-brand-dark text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-orange transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
