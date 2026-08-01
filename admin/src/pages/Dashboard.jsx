import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const Dashboard = () => {
    const [stats, setStats] = useState({ revenue: 0, orders: 0, products: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [itemsCache, setItemsCache] = useState({});

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: ordersData } = await supabase.from('orders').select('total_amount, status');
            const totalRevenue = (ordersData || [])
                .filter(o => o.status === 'completed' || o.status === 'delivered')
                .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
            const activeOrders = (ordersData || [])
                .filter(o => o.status !== 'cancelled' && o.status !== 'delivered').length;
            const { count: productCount } = await supabase
                .from('products').select('*', { count: 'exact', head: true }).neq('name', '_HERO_IMAGE_');
            setStats({ revenue: totalRevenue, orders: activeOrders, products: productCount || 0 });

            const { data: recent } = await supabase
                .from('orders')
                .select('*, profiles(full_name, email)')
                .order('created_at', { ascending: false })
                .limit(5);
            setRecentOrders(recent || []);
        } catch (err) {
            console.error('Dashboard error:', err);
        }
    };

    const toggleExpand = async (orderId) => {
        if (expandedId === orderId) { setExpandedId(null); return; }
        setExpandedId(orderId);
        if (itemsCache[orderId]) return;
        const { data } = await supabase
            .from('order_items')
            .select('*, products(name, images, discounted_price)')
            .eq('order_id', orderId);
        if (data) setItemsCache(prev => ({ ...prev, [orderId]: data }));
    };

    const statusClass = (s) => s === 'completed' || s === 'delivered'
        ? 'bg-green-50 text-green-600 border-green-200'
        : 'bg-brand-orange/5 text-brand-orange border-brand-orange/20';

    return (
        <div className="max-w-7xl mx-auto pb-20 selection:bg-brand-orange selection:text-white">
            <div className="mb-10 border-b border-black/5 pb-8">
                <h2 className="text-3xl md:text-4xl font-light text-brand-dark tracking-[0.1em] uppercase">
                    Mission <span className="font-bold text-brand-orange">Control</span>
                </h2>
                <div className="h-px w-16 bg-gradient-to-r from-brand-orange to-transparent mt-3"></div>
                <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.3em] mt-3">Admin overview</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
                {[
                    { label: 'Total Revenue', value: `₹${stats.revenue.toLocaleString()}`, sub: 'Completed & delivered' },
                    { label: 'Active Orders', value: stats.orders, sub: 'Real-time processing' },
                    { label: 'Inventory', value: stats.products, sub: 'Active products' },
                ].map((s, i) => (
                    <div key={i} className="bg-white border border-black/5 p-8 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <span className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.2em] block mb-3">{s.label}</span>
                        <span className="text-4xl font-light text-brand-dark tracking-wider">{s.value}</span>
                        <div className="mt-3 text-[10px] font-semibold text-brand-dark/30 uppercase tracking-[0.15em]">{s.sub}</div>
                    </div>
                ))}
            </div>

            {/* Recent Orders */}
            <div>
                <h3 className="text-xl font-light text-brand-dark uppercase tracking-[0.2em] mb-6 flex items-center gap-4">
                    Recent Orders
                    <div className="h-px flex-1 bg-gradient-to-r from-brand-orange/30 to-transparent"></div>
                </h3>

                <div className="bg-white border border-black/5 rounded-3xl overflow-hidden shadow-sm divide-y divide-black/5">
                    {recentOrders.length > 0 ? recentOrders.map((order) => {
                        const isOpen = expandedId === order.id;
                        const items = itemsCache[order.id] || [];
                        return (
                            <div key={order.id}>
                                <div className={`p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${isOpen ? 'bg-gray-50/70' : 'hover:bg-gray-50/50'}`}>
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center font-bold text-brand-orange text-sm flex-shrink-0">
                                            {order.id.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-sm text-brand-dark uppercase tracking-wide truncate">
                                                Order #{order.id.substring(0, 8).toUpperCase()}
                                            </div>
                                            <div className="text-[10px] text-brand-dark/40 mt-0.5 truncate">
                                                {order.profiles?.full_name || 'Anonymous'}
                                                {order.profiles?.email && <> · {order.profiles.email}</>}
                                                {' '}· ₹{order.total_amount?.toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase tracking-widest ${statusClass(order.status)}`}>
                                            {order.status}
                                        </span>
                                        <button
                                            onClick={() => toggleExpand(order.id)}
                                            className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${isOpen ? 'border-brand-orange text-brand-orange bg-brand-orange/5' : 'border-black/10 text-brand-dark/50 hover:border-brand-orange/30 hover:text-brand-orange'}`}
                                        >
                                            {isOpen ? 'Hide' : 'Details'}
                                            <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {isOpen && (
                                    <div className="px-6 pb-6 border-t border-black/5 bg-gray-50/30">
                                        <p className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest mt-4 mb-3">Items Ordered</p>
                                        {items.length === 0 ? (
                                            <div className="flex items-center gap-2 py-3">
                                                <div className="w-4 h-4 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin" />
                                                <span className="text-xs text-brand-dark/30">Loading...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="space-y-3">
                                                    {items.map((item, i) => (
                                                        <div key={i} className="flex gap-4 items-center p-4 bg-white rounded-2xl border border-black/5 shadow-sm">
                                                            <div className="w-16 h-20 rounded-xl overflow-hidden bg-black/5 border border-black/5 flex-shrink-0">
                                                                {item.products?.images?.[0] ? (
                                                                    <img src={item.products.images[0]} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-brand-dark/20 uppercase">No img</div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-brand-dark font-semibold text-sm uppercase tracking-wide truncate">
                                                                    {item.products?.name || 'Unknown'}
                                                                </p>
                                                                <p className="text-brand-dark/40 text-xs mt-0.5">Qty: {item.quantity}</p>
                                                                <p className="text-brand-orange font-bold text-base mt-1">₹{item.price?.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-black/5">
                                                    <span className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-widest">
                                                        {items.length} item{items.length !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="text-sm font-bold text-brand-dark">
                                                        Total: ₹{order.total_amount?.toLocaleString()}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="p-16 text-center text-sm font-medium uppercase tracking-[0.2em] text-brand-dark/30">
                            No orders yet
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-16 pt-8 border-t border-black/5 text-center">
                <span className="text-[9px] font-bold uppercase tracking-[0.5em] text-brand-dark/20">© Flashud Admin Portal</span>
            </div>
        </div>
    );
};

export default Dashboard;
