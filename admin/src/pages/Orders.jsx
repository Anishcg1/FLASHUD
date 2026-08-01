import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ORDER_STATUSES } from '../lib/constants';

const statusStyle = (status) =>
    ORDER_STATUSES.find(s => s.value === status)?.color || 'border-black/10 text-brand-dark/40';

const STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [itemsCache, setItemsCache] = useState({});
    const [isUpdating, setIsUpdating] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [adminMessages, setAdminMessages] = useState({});

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*, profiles(full_name, email)')
            .order('created_at', { ascending: false });
        if (error) console.error('Orders fetch error:', error);
        if (data) setOrders(data);
        setIsLoading(false);
    };

    const fetchItems = async (orderId) => {
        if (itemsCache[orderId]) return;
        const { data } = await supabase
            .from('order_items')
            .select('*, products(name, images, discounted_price)')
            .eq('order_id', orderId);
        if (data) setItemsCache(prev => ({ ...prev, [orderId]: data }));
    };

    const toggleExpand = (orderId) => {
        if (expandedId === orderId) {
            setExpandedId(null);
        } else {
            setExpandedId(orderId);
            fetchItems(orderId);
        }
    };

    const updateStatus = async (orderId, newStatus) => {
        setIsUpdating(orderId);
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) {
            alert('Update failed: ' + error.message);
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
        }
        setIsUpdating(null);
    };

    const handleVerifyPayment = async (orderId, newStatus, message) => {
        setIsUpdating(orderId);
        const { error } = await supabase
            .from('orders')
            .update({ 
                status: newStatus,
                admin_message: message 
            })
            .eq('id', orderId);
            
        if (error) {
            alert('Verification failed: ' + error.message);
        } else {
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, admin_message: message } : o));
            alert(`Order status set to ${newStatus.toUpperCase()}`);
        }
        setIsUpdating(null);
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const stepIdx = (s) => STEPS.indexOf(s);

    const filtered = orders.filter(o => {
        const matchSearch =
            !searchTerm ||
            (o.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (o.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || o.status === filterStatus;
        return matchSearch && matchStatus;
    });

    return (
        <div className="max-w-7xl mx-auto selection:bg-brand-orange selection:text-white pb-20">

            {/* Header */}
            <div className="mb-10">
                <h2 className="text-3xl font-light text-brand-dark tracking-[0.2em]">
                    ORDER <span className="font-bold text-brand-orange">MANAGEMENT</span>
                </h2>
                <div className="h-px w-24 bg-gradient-to-r from-brand-orange to-transparent mt-4"></div>
                <p className="text-brand-dark/40 text-sm mt-2 uppercase tracking-widest">View and manage all customer orders</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                {[{ label: 'All', value: 'all', count: orders.length }, ...ORDER_STATUSES.map(s => ({ label: s.label, value: s.value, count: orders.filter(o => o.status === s.value).length }))].map(s => (
                    <button
                        key={s.value}
                        onClick={() => setFilterStatus(s.value)}
                        className={`bg-white border rounded-2xl p-3 text-center transition-all ${filterStatus === s.value ? 'border-brand-orange shadow-sm' : 'border-black/10 hover:border-black/20'}`}
                    >
                        <div className={`text-xl font-bold mb-0.5 ${filterStatus === s.value ? 'text-brand-orange' : 'text-brand-dark/60'}`}>{s.count}</div>
                        <div className="text-[9px] text-brand-dark/30 uppercase tracking-widest">{s.label}</div>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by customer name, email or order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-lg px-5 py-3 rounded-xl bg-white border border-black/10 text-brand-dark placeholder:text-brand-dark/30 focus:outline-none focus:border-brand-orange/50 transition-all text-sm shadow-sm"
                />
            </div>

            {/* Order rows */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="p-20 text-center text-brand-dark/40 uppercase tracking-widest">Loading orders...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-16 text-center bg-white border border-black/5 rounded-3xl text-brand-dark/30 uppercase tracking-widest">No orders found</div>
                ) : filtered.map(order => {
                    const isOpen = expandedId === order.id;
                    const items = itemsCache[order.id] || [];
                    const curStep = stepIdx(order.status);

                    return (
                        <div key={order.id} className={`bg-white border rounded-2xl overflow-hidden transition-all duration-300 ${isOpen ? 'border-brand-orange/50 shadow-sm' : 'border-black/5 hover:border-black/10'}`}>

                            {/* Row header — always visible */}
                            <button
                                onClick={() => toggleExpand(order.id)}
                                className="w-full text-left p-5 flex flex-col md:flex-row md:items-center gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-brand-orange text-[9px] font-bold uppercase tracking-[0.3em] mb-1">
                                        #{order.id.substring(0, 12).toUpperCase()}
                                    </div>
                                    <div className="text-brand-dark font-semibold text-base uppercase tracking-wide truncate">
                                        {order.profiles?.full_name || 'Anonymous'}
                                    </div>
                                    <div className="text-brand-dark/40 text-[10px] mt-0.5 truncate">
                                        {order.profiles?.email || '—'} · {fmt(order.created_at)}
                                    </div>
                                </div>

                                <div className="flex items-center gap-5 flex-shrink-0">
                                    <div className="text-right">
                                        <div className="text-[9px] text-brand-dark/30 uppercase tracking-widest">Amount</div>
                                        <div className="text-lg font-bold text-brand-dark">₹{order.total_amount?.toLocaleString()}</div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${statusStyle(order.status)}`}>
                                        {order.status}
                                    </span>
                                    <svg className={`w-4 h-4 text-brand-dark/30 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>

                            {/* Expanded detail panel */}
                            {isOpen && (
                                <div className="border-t border-black/5 p-5 grid grid-cols-1 lg:grid-cols-2 gap-8">

                                    {/* Left — customer + shipping + timeline */}
                                    <div className="space-y-5">

                                        {/* Customer info */}
                                        <div className="bg-gray-50 rounded-2xl border border-black/5 p-4 space-y-3">
                                            <p className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest">Customer</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-brand-orange/20 border border-brand-orange/30 flex items-center justify-center text-brand-orange font-bold text-base flex-shrink-0">
                                                    {(order.profiles?.full_name || 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-brand-dark font-semibold text-sm truncate">{order.profiles?.full_name || '—'}</p>
                                                    <p className="text-brand-dark/40 text-[10px] truncate">{order.profiles?.email || '—'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shipping address */}
                                        {order.shipping_address && (
                                            <div className="bg-gray-50 rounded-2xl border border-black/5 p-4">
                                                <p className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest mb-2">Shipping Address</p>
                                                <p className="text-brand-dark/70 text-sm leading-relaxed">{order.shipping_address}</p>
                                            </div>
                                        )}

                                        {/* Manual Payment Verification */}
                                        {order.payment_reference && (
                                            <div className="bg-white border border-brand-orange/20 rounded-2xl p-4 space-y-4 shadow-sm">
                                                <p className="text-[9px] font-bold text-brand-orange uppercase tracking-widest flex items-center gap-2">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                                    Manual QR Payment Proof
                                                </p>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <span className="text-[8px] font-bold text-brand-dark/40 uppercase tracking-widest">Transaction UTR / ID</span>
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-xs font-bold text-brand-dark select-all bg-gray-50 px-2.5 py-1.5 rounded-lg border border-black/5 tracking-wider block">{order.payment_reference}</code>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(order.payment_reference);
                                                                    alert('Transaction ID Copied');
                                                                }}
                                                                className="p-1.5 rounded-lg border border-black/10 hover:border-brand-orange hover:text-brand-orange transition-all"
                                                                title="Copy to Clipboard"
                                                            >
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {order.payment_screenshot_url && (
                                                        <div className="space-y-1">
                                                            <span className="text-[8px] font-bold text-brand-dark/40 uppercase tracking-widest block">Receipt Screenshot</span>
                                                            <a
                                                                href={order.payment_screenshot_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 text-[9px] font-bold text-brand-orange hover:underline uppercase tracking-wider"
                                                            >
                                                                View Full Proof 
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>

                                                {order.payment_screenshot_url && (
                                                    <div className="w-full max-h-40 rounded-xl overflow-hidden border border-black/5 bg-gray-50 flex items-center justify-center p-1 group relative">
                                                        <img
                                                            src={order.payment_screenshot_url}
                                                            alt="Payment Proof"
                                                            className="max-w-full max-h-36 object-contain rounded-lg transition-transform group-hover:scale-105"
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-2 border-t border-black/5 pt-3">
                                                    <label className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest ml-0.5">Message / Note to Customer</label>
                                                    <textarea
                                                        rows="2"
                                                        value={adminMessages[order.id] !== undefined ? adminMessages[order.id] : `Your payment of ₹${order.total_amount?.toLocaleString()} has been verified successfully. Your order is now in processing!`}
                                                        onChange={(e) => setAdminMessages(prev => ({ ...prev, [order.id]: e.target.value }))}
                                                        placeholder="Enter approval/rejection notes..."
                                                        className="w-full px-4 py-2.5 rounded-xl border border-black/10 text-xs font-medium focus:border-brand-orange/50 focus:outline-none transition-all placeholder:text-brand-dark/30 shadow-inner"
                                                    />
                                                </div>

                                                <div className="flex gap-3">
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating === order.id}
                                                        onClick={() => {
                                                            const msg = adminMessages[order.id] !== undefined ? adminMessages[order.id] : `Your payment of ₹${order.total_amount?.toLocaleString()} has been verified successfully. Your order is now in processing!`;
                                                            handleVerifyPayment(order.id, 'processing', msg);
                                                        }}
                                                        className="flex-1 py-2.5 rounded-xl bg-brand-orange text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                        Approve & Process
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating === order.id}
                                                        onClick={() => {
                                                            const msg = adminMessages[order.id] !== undefined ? adminMessages[order.id] : 'Payment verification failed. Invalid Transaction Reference ID. Order has been cancelled.';
                                                            handleVerifyPayment(order.id, 'cancelled', msg);
                                                        }}
                                                        className="py-2.5 px-4 rounded-xl border border-red-200 text-red-500 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        Reject
                                                    </button>
                                                </div>
                                                
                                                {order.admin_message && (
                                                    <div className="bg-gray-50 border border-black/5 rounded-xl p-3 text-[10px] font-semibold text-brand-dark/50 uppercase tracking-wide">
                                                        <span className="font-bold text-[8px] text-brand-orange tracking-widest block mb-1">Current Active message:</span>
                                                        {order.admin_message}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Status timeline */}
                                        {order.status !== 'cancelled' && (
                                            <div className="bg-gray-50 rounded-2xl border border-black/5 p-4">
                                                <p className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest mb-4">Progress</p>
                                                <div className="flex items-center">
                                                    {STEPS.map((step, i) => {
                                                        const done = i <= curStep;
                                                        const active = i === curStep;
                                                        return (
                                                            <div key={step} className="flex items-center flex-1 last:flex-none">
                                                                 <div className="flex flex-col items-center">
                                                                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-bold transition-all ${done ? 'bg-brand-orange border-brand-orange text-white' : 'bg-transparent border-black/10 text-brand-dark/20'} ${active ? 'shadow-sm' : ''}`}>
                                                                         {done ? '✓' : i + 1}
                                                                     </div>
                                                                     <span className={`text-[7px] font-bold uppercase tracking-wider mt-1 ${done ? 'text-brand-orange' : 'text-brand-dark/20'}`}>
                                                                         {step}
                                                                     </span>
                                                                 </div>
                                                                 {i < STEPS.length - 1 && (
                                                                     <div className={`flex-1 h-px mx-1 mb-3 ${i < curStep ? 'bg-brand-orange' : 'bg-black/10'}`} />
                                                                 )}
                                                             </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Status update */}
                                        <div className="bg-gray-50 rounded-2xl border border-black/5 p-4">
                                            <p className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest mb-3">Update Status</p>
                                            <div className="flex flex-wrap gap-2">
                                                {ORDER_STATUSES.map(s => (
                                                    <button
                                                        key={s.value}
                                                        disabled={isUpdating === order.id}
                                                        onClick={() => updateStatus(order.id, s.value)}
                                                        className={`px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase tracking-widest transition-all ${order.status === s.value ? s.color + ' ring-1 ring-brand-orange' : 'border-black/10 text-brand-dark/30 hover:bg-gray-50 hover:text-brand-dark/60'} disabled:opacity-40`}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right — ordered items */}
                                    <div className="bg-gray-50 rounded-2xl border border-black/5 p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest">Items Ordered</p>
                                            <span className="text-[9px] font-bold text-brand-orange uppercase tracking-widest">
                                                Total: ₹{order.total_amount?.toLocaleString()}
                                            </span>
                                        </div>

                                        {items.length === 0 ? (
                                            <div className="flex items-center gap-2 py-6 justify-center">
                                                <div className="w-4 h-4 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
                                                <span className="text-[10px] text-brand-dark/30 uppercase tracking-widest">Loading...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {items.map((item, i) => (
                                                    <div key={i} className="flex gap-3 items-center p-3 bg-white rounded-xl border border-black/5">
                                                        <div className="w-12 h-14 rounded-lg overflow-hidden bg-gray-50 border border-black/5 flex-shrink-0">
                                                            {item.products?.images?.[0] ? (
                                                                <img src={item.products.images[0]} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[7px] text-brand-dark/20 uppercase">No img</div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-brand-dark text-xs font-semibold uppercase tracking-wide truncate">
                                                                {item.products?.name || 'Unknown'}
                                                            </p>
                                                            <p className="text-brand-dark/40 text-[10px] mt-0.5">Qty: {item.quantity}</p>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-brand-orange font-bold text-sm">₹{item.price?.toLocaleString()}</p>
                                                            <p className="text-brand-dark/20 text-[9px] mt-0.5">per item</p>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Item subtotal */}
                                                <div className="flex justify-between items-center pt-3 border-t border-black/5 mt-2">
                                                    <span className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest">
                                                        {items.length} item{items.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="text-sm font-bold text-brand-dark">
                                                        ₹{items.reduce((a, it) => a + (it.price * it.quantity), 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
