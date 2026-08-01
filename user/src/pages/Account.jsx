import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';

const statusColors = {
    pending:    'bg-yellow-50 text-yellow-600 border-yellow-200',
    processing: 'bg-blue-50 text-blue-600 border-blue-200',
    shipped:    'bg-purple-50 text-purple-600 border-purple-200',
    delivered:  'bg-green-50 text-green-600 border-green-200',
    completed:  'bg-green-50 text-green-600 border-green-200',
    cancelled:  'bg-red-50 text-red-500 border-red-200',
};

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered'];

export default function Account() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [orderItems, setOrderItems] = useState({}); // keyed by order id

    useEffect(() => {
        if (user) fetchOrders(user.id);
    }, [user]);

    const fetchOrders = async (userId) => {
        setIsLoading(true);
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (data) setOrders(data);
        setIsLoading(false);
    };

    const fetchOrderItems = async (orderId) => {
        if (orderItems[orderId]) return; // already loaded
        const { data } = await supabase
            .from('order_items')
            .select('*, products(name, images, discounted_price)')
            .eq('order_id', orderId);
        if (data) {
            setOrderItems(prev => ({ ...prev, [orderId]: data }));
        }
    };

    const toggleExpand = (orderId) => {
        if (expandedId === orderId) {
            setExpandedId(null);
        } else {
            setExpandedId(orderId);
            fetchOrderItems(orderId);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const stepIdx = (status) => STATUS_STEPS.indexOf(status);

    if (isLoading) return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin"></div>
            <p className="mt-6 text-[10px] font-bold tracking-[0.3em] uppercase text-brand-dark/50">Loading profile...</p>
        </div>
    );
    if (!user) return null;

    return (
        <div className="max-w-7xl mx-auto pt-32 pb-24 px-6 selection:bg-brand-orange selection:text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8 border-b border-black/5 pb-12">
                <div>
                    <h1 className="text-5xl md:text-7xl font-light uppercase tracking-[0.2em] leading-none text-brand-dark">
                        My <span className="font-bold text-brand-orange">Account</span>
                    </h1>
                    <p className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-[0.5em] mt-4 pl-1">Your personal dashboard</p>
                </div>
                <button
                    onClick={handleSignOut}
                    className="px-8 py-4 rounded-full bg-white border border-black/10 text-brand-dark font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center gap-2 shadow-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Sign out
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
                {/* Profile sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-black/5 p-8 rounded-3xl shadow-xl sticky top-28">
                        <h3 className="text-xl font-light text-brand-dark mb-8 uppercase tracking-[0.2em] border-b border-black/5 pb-4">
                            Profile <span className="font-bold text-brand-orange">Info</span>
                        </h3>
                        <div className="space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-brand-orange flex items-center justify-center text-3xl font-bold text-white">
                                    {user?.email?.charAt(0).toUpperCase() || 'P'}
                                </div>
                                <div className="truncate flex-1">
                                    <div className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em] mb-1">Email</div>
                                    <div className="font-medium text-base truncate text-brand-dark">{user?.email}</div>
                                    <div className="text-[10px] text-green-500 mt-1 uppercase tracking-widest font-semibold flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Verified
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-6 border-t border-black/5">
                                <div className="flex justify-between">
                                    <span className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Member status</span>
                                    <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/5 border border-brand-orange/20 px-3 py-1 rounded-full uppercase tracking-widest">VIP Member</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Total orders</span>
                                    <span className="text-[10px] font-bold text-brand-dark">{orders.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Member since</span>
                                    <span className="text-[10px] font-bold text-brand-dark">{new Date(user.created_at || Date.now()).getFullYear()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Order history */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-2xl font-light text-brand-dark uppercase tracking-[0.2em] mb-8 flex items-center gap-4">
                        Order <span className="font-bold">History</span>
                        <span className="h-px flex-1 bg-gradient-to-r from-brand-orange/50 to-transparent ml-4"></span>
                    </h3>

                    {orders.length > 0 ? orders.map(order => {
                        const isOpen = expandedId === order.id;
                        const items = orderItems[order.id] || [];
                        const currentStep = stepIdx(order.status);

                        return (
                            <div key={order.id} className="bg-white border border-black/5 rounded-2xl shadow-sm overflow-hidden transition-all">
                                {/* Order row — always visible */}
                                <button
                                    onClick={() => toggleExpand(order.id)}
                                    className="w-full text-left p-6 flex flex-col md:flex-row md:items-center gap-4 group hover:bg-gray-50/50 transition-colors"
                                >
                                    {/* Orange accent */}
                                    <div className="absolute left-0 w-1 h-full bg-brand-orange/40 group-hover:bg-brand-orange transition-colors rounded-l-2xl" />

                                    <div className="flex-1 pl-2">
                                        <div className="text-brand-orange font-bold text-[10px] uppercase tracking-widest mb-1 flex items-center gap-2">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            #{order.id.substring(0, 12).toUpperCase()}
                                        </div>
                                        <div className="font-semibold text-base text-brand-dark uppercase tracking-wide">{fmt(order.created_at)}</div>
                                        {order.shipping_address && (
                                            <div className="text-[10px] text-brand-dark/40 mt-1 truncate max-w-xs">{order.shipping_address}</div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        <div className="text-right">
                                            <div className="text-[9px] text-brand-dark/40 uppercase tracking-widest">Amount</div>
                                            <div className="text-xl font-bold text-brand-dark">₹{order.total_amount}</div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${statusColors[order.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                            {order.status}
                                        </span>
                                        <svg className={`w-4 h-4 text-brand-dark/30 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </button>

                                {/* Expanded detail panel */}
                                {isOpen && (
                                    <div className="border-t border-black/5 px-6 pb-6 pt-5 space-y-6">

                                        {/* Status timeline */}
                                        {order.status !== 'cancelled' && (
                                            <div>
                                                <p className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest mb-4">Order Progress</p>
                                                <div className="flex items-center gap-0">
                                                    {STATUS_STEPS.map((step, i) => {
                                                        const done = i <= currentStep;
                                                        const active = i === currentStep;
                                                        return (
                                                            <div key={step} className="flex items-center flex-1 last:flex-none">
                                                                <div className="flex flex-col items-center">
                                                                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold transition-all ${done ? 'bg-brand-orange border-brand-orange text-white' : 'bg-white border-black/10 text-brand-dark/20'} ${active ? 'scale-110 shadow-[0_0_8px_rgba(255,123,0,0.4)]' : ''}`}>
                                                                        {done ? '✓' : i + 1}
                                                                    </div>
                                                                    <span className={`text-[8px] font-bold uppercase tracking-wider mt-1.5 ${done ? 'text-brand-orange' : 'text-brand-dark/20'}`}>
                                                                        {step}
                                                                    </span>
                                                                </div>
                                                                {i < STATUS_STEPS.length - 1 && (
                                                                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentStep ? 'bg-brand-orange' : 'bg-black/5'}`} />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Order items */}
                                        <div>
                                            <p className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest mb-3">Items Ordered</p>
                                            {items.length === 0 ? (
                                                <div className="flex items-center gap-2 py-4">
                                                    <div className="w-4 h-4 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
                                                    <span className="text-xs text-brand-dark/30">Loading items...</span>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {items.map((item, i) => (
                                                        <div key={i} className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-black/5">
                                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-black/5 flex-shrink-0">
                                                                {item.products?.images?.[0] ? (
                                                                    <img src={item.products.images[0]} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-black/20">No img</div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm text-brand-dark truncate">{item.products?.name || 'Product'}</p>
                                                                <p className="text-[10px] text-brand-dark/40 uppercase tracking-wider mt-0.5">Qty: {item.quantity}</p>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <p className="font-bold text-brand-orange text-sm">₹{item.price}</p>
                                                                <p className="text-[10px] text-brand-dark/30 mt-0.5">per item</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Shipping address */}
                                        {order.shipping_address && (
                                            <div className="p-4 bg-gray-50 rounded-xl border border-black/5">
                                                <p className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest mb-1">Shipping Address</p>
                                                <p className="text-sm text-brand-dark font-medium">{order.shipping_address}</p>
                                            </div>
                                        )}

                                        {/* Payment Reference */}
                                        {order.payment_reference && (
                                            <div className="p-4 bg-gray-50 rounded-xl border border-black/5 flex justify-between items-center">
                                                <div>
                                                    <p className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest mb-1">Transaction UTR / ID</p>
                                                    <code className="text-xs font-semibold text-brand-dark select-all tracking-wider">{order.payment_reference}</code>
                                                </div>
                                                {order.payment_screenshot_url && (
                                                    <a
                                                        href={order.payment_screenshot_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[9px] font-bold text-brand-orange hover:underline uppercase tracking-wider flex items-center gap-1"
                                                    >
                                                        Receipt
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {/* Message from Store */}
                                        {order.admin_message && (
                                            <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 text-[11px] font-medium leading-relaxed text-brand-orange/90 uppercase tracking-wide">
                                                <span className="font-bold text-[9px] text-brand-orange tracking-widest block mb-1">Message from Store:</span>
                                                {order.admin_message}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="py-24 border border-black/5 rounded-3xl flex flex-col items-center justify-center bg-white shadow-sm">
                            <svg className="w-10 h-10 text-brand-dark/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            <p className="font-medium uppercase tracking-[0.2em] text-brand-dark/40 text-sm">No orders yet</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-24 pt-8 border-t border-black/5 text-center">
                <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-brand-dark/30">© FLASHUD MEMBER PORTAL</span>
            </div>
        </div>
    );
}
