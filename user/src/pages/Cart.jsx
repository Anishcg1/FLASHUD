import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [selected, setSelected] = useState(new Set()); // indices of checked items
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(null);
    const [isApplying, setIsApplying] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const u = session?.user || null;
            setUser(u);
            if (u) {
                await fetchCartFromSupabase(u.id);
            } else {
                const stored = JSON.parse(localStorage.getItem('cart') || '[]');
                setCartItems(stored);
                setSelected(new Set(stored.map((_, i) => i))); // select all by default
            }
        };
        init();
    }, []);

    const fetchCartFromSupabase = async (userId) => {
        const { data } = await supabase
            .from('cart_items')
            .select('*, products(*)')
            .eq('user_id', userId);
        if (data) {
            const formatted = data.map(item => ({
                id: item.product_id,
                name: item.products?.name || 'Unknown',
                price: item.products?.discounted_price || 0,
                size: item.size,
                image: item.products?.images?.[0],
                quantity: item.quantity,
                supabase_id: item.id,
            }));
            setCartItems(formatted);
            setSelected(new Set(formatted.map((_, i) => i))); // select all by default
            localStorage.setItem('cart', JSON.stringify(formatted));
        }
    };

    const toggleSelect = (index) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(index) ? next.delete(index) : next.add(index);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === cartItems.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(cartItems.map((_, i) => i)));
        }
    };

    const updateQuantity = async (index, delta) => {
        const newCart = [...cartItems];
        newCart[index].quantity = Math.max(1, newCart[index].quantity + delta);
        setCartItems(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        if (user) {
            await supabase.from('cart_items').update({ quantity: newCart[index].quantity })
                .match({ user_id: user.id, product_id: newCart[index].id, size: newCart[index].size });
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('cartUpdated'));
    };

    const removeItem = async (index) => {
        const item = cartItems[index];
        const newCart = cartItems.filter((_, i) => i !== index);
        // Remap selection indices after removal
        setSelected(prev => {
            const next = new Set();
            prev.forEach(i => { if (i < index) next.add(i); else if (i > index) next.add(i - 1); });
            return next;
        });
        setCartItems(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        if (user) {
            await supabase.from('cart_items').delete()
                .match({ user_id: user.id, product_id: item.id, size: item.size });
        }
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new Event('cartUpdated'));
    };

    // Items included in the order summary (checked ones only)
    const selectedItems = cartItems.filter((_, i) => selected.has(i));
    const subtotal = selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const applyCoupon = async () => {
        if (!couponCode) return;
        setIsApplying(true);
        const { data } = await supabase.from('coupons').select('*')
            .eq('code', couponCode.toUpperCase()).eq('is_active', true).single();
        if (data) {
            if (subtotal < data.min_bill_amount) {
                alert(`Minimum bill of ₹${data.min_bill_amount} required`);
                setCouponDiscount(null);
            } else {
                setCouponDiscount(data);
            }
        } else {
            alert('Invalid or expired promo code');
            setCouponDiscount(null);
        }
        setIsApplying(false);
    };

    const calcDiscount = () => {
        if (!couponDiscount) return 0;
        return couponDiscount.discount_type === 'percentage'
            ? (subtotal * couponDiscount.discount_value) / 100
            : couponDiscount.discount_value;
    };

    const total = subtotal - calcDiscount();

    // Checkout only selected items
    const handleCheckout = () => {
        navigate('/checkout', { state: { coupon: couponDiscount, items: selectedItems } });
    };

    return (
        <div className="max-w-5xl mx-auto pt-32 pb-24 px-6 selection:bg-brand-orange selection:text-white">
            <div className="mb-12 border-b border-black/5 pb-8">
                <h2 className="text-5xl md:text-7xl font-light tracking-tight leading-none text-brand-dark">
                    Your <span className="font-bold text-brand-orange">Cart</span>
                </h2>
                <div className="flex items-center gap-4 mt-6">
                    <span className="w-10 h-px bg-brand-orange"></span>
                    <span className="text-[10px] font-semibold text-brand-dark/50 uppercase tracking-[0.3em]">Safe and secure checkout</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
                {/* Items */}
                <div className="lg:col-span-2 space-y-4">

                    {cartItems.length > 0 && (
                        // Select-all row
                        <div className="flex items-center gap-3 px-1 pb-2">
                            <input
                                type="checkbox"
                                checked={selected.size === cartItems.length && cartItems.length > 0}
                                onChange={toggleSelectAll}
                                className="w-4 h-4 accent-brand-orange cursor-pointer"
                                id="select-all"
                            />
                            <label htmlFor="select-all" className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-widest cursor-pointer select-none">
                                Select all ({cartItems.length})
                            </label>
                            {selected.size > 0 && selected.size < cartItems.length && (
                                <span className="text-[10px] text-brand-orange font-bold uppercase tracking-widest">
                                    {selected.size} selected
                                </span>
                            )}
                        </div>
                    )}

                    {cartItems.length > 0 ? cartItems.map((item, index) => (
                        <div
                            key={index}
                            className={`flex gap-4 p-4 bg-white border rounded-2xl group shadow-sm transition-all duration-200 ${selected.has(index) ? 'border-brand-orange/30 shadow-[0_0_0_1px_rgba(255,123,0,0.15)]' : 'border-black/5'}`}
                        >
                            {/* Checkbox */}
                            <div className="flex items-start pt-1 flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={selected.has(index)}
                                    onChange={() => toggleSelect(index)}
                                    className="w-4 h-4 accent-brand-orange cursor-pointer mt-1"
                                />
                            </div>

                            {/* Image */}
                            <div className="w-24 h-32 bg-black/5 rounded-xl overflow-hidden flex-shrink-0">
                                {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] text-black/20 uppercase">No image</div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-2">
                                        <h3 className="font-medium text-base uppercase tracking-[0.08em] text-brand-dark truncate">{item.name}</h3>
                                        <button
                                            onClick={() => removeItem(index)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-black/5 text-brand-dark/30 hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <span className="text-[9px] font-bold text-brand-dark/40 bg-black/5 px-2 py-1 rounded-full uppercase tracking-[0.15em]">Size: {item.size}</span>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                                    {/* Qty */}
                                    <div className="flex items-center bg-white border border-black/10 rounded-full h-8 shadow-sm">
                                        <button onClick={() => updateQuantity(index, -1)} className="w-8 h-full flex items-center justify-center text-brand-dark/50 hover:text-brand-orange transition-colors">−</button>
                                        <span className="w-7 text-center font-bold text-sm text-brand-dark">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(index, 1)} className="w-8 h-full flex items-center justify-center text-brand-dark/50 hover:text-brand-orange transition-colors">+</button>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Price */}
                                        <span className="text-base font-bold text-brand-orange">₹{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="py-24 border border-black/5 rounded-3xl flex flex-col items-center justify-center bg-white shadow-sm">
                            <svg className="w-10 h-10 text-brand-dark/10 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                            <p className="font-medium uppercase tracking-[0.2em] text-brand-dark/40 text-sm mb-6">Your cart is empty</p>
                            <Link to="/shop" className="px-10 py-4 rounded-full bg-brand-dark text-white font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-black hover:-translate-y-0.5 transition-all">
                                Back to shop
                            </Link>
                        </div>
                    )}
                </div>

                {/* Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-black/5 p-7 rounded-3xl sticky top-28 shadow-xl space-y-5">
                        <h3 className="text-lg font-light tracking-[0.2em] uppercase text-brand-dark border-b border-black/5 pb-4">Order Summary</h3>

                        {/* Selected count */}
                        <div className="flex justify-between text-xs">
                            <span className="font-semibold text-brand-dark/50 uppercase tracking-[0.1em]">Selected items</span>
                            <span className="font-bold text-brand-dark">{selected.size} of {cartItems.length}</span>
                        </div>

                        <div className="flex justify-between text-sm">
                            <span className="font-semibold text-brand-dark/50 uppercase tracking-[0.1em]">Subtotal</span>
                            <span className="font-bold text-brand-dark">₹{subtotal.toLocaleString()}</span>
                        </div>

                        {/* Promo */}
                        <div className="pt-2 border-t border-black/5">
                            <label className="block text-[9px] font-bold tracking-[0.2em] uppercase text-brand-dark/40 mb-2">Promo code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="FLASH20"
                                    value={couponCode}
                                    onChange={(e) => setCouponCode(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white border border-black/10 rounded-xl text-sm font-medium focus:outline-none focus:border-brand-orange/50 transition-all text-brand-dark placeholder-brand-dark/20 uppercase"
                                />
                                <button
                                    onClick={applyCoupon}
                                    disabled={isApplying || !couponCode}
                                    className="w-10 rounded-xl bg-brand-dark text-white hover:bg-brand-orange transition-all disabled:opacity-30 flex items-center justify-center"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </button>
                            </div>
                        </div>

                        {couponDiscount && (
                            <div className="flex justify-between items-center bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-3 text-brand-orange text-[10px] font-bold uppercase tracking-widest">
                                <span>Promo: {couponDiscount.code}</span>
                                <span>−₹{calcDiscount().toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-black/5">
                            <span className="text-sm font-semibold text-brand-dark/60 uppercase tracking-[0.1em]">Total</span>
                            <span className="text-2xl font-bold text-brand-orange">₹{total.toLocaleString()}</span>
                        </div>

                        <button
                            onClick={handleCheckout}
                            disabled={selected.size === 0}
                            className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm hover:bg-brand-dark hover:-translate-y-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                        >
                            Checkout {selected.size > 0 && `(${selected.size})`}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </button>

                        <p className="text-[8px] font-medium text-brand-dark/30 flex items-center justify-center gap-1.5 uppercase tracking-[0.2em]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                            Secure checkout
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
