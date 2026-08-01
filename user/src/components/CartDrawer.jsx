import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

const CartDrawer = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState([]);

    // Keep cart in sync with localStorage changes (add/remove from product pages)
    useEffect(() => {
        const syncCart = () => {
            if (user) {
                setCartItems(JSON.parse(localStorage.getItem('cart') || '[]'));
            } else {
                setCartItems([]);
            }
        };

        syncCart();
        window.addEventListener('storage', syncCart);
        window.addEventListener('cartUpdated', syncCart);
        return () => {
            window.removeEventListener('storage', syncCart);
            window.removeEventListener('cartUpdated', syncCart);
        };
    }, [user]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const removeItem = (index) => {
        const newCart = cartItems.filter((_, i) => i !== index);
        localStorage.setItem('cart', JSON.stringify(newCart));
        setCartItems(newCart);
        window.dispatchEvent(new Event('storage'));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Drawer Panel */}
            <div className="relative w-full max-w-md bg-white border-l border-black/5 h-full flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.1)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-black/5">
                    <h2 className="text-xl font-light uppercase tracking-[0.2em] text-brand-dark">
                        Your <span className="font-bold text-brand-orange">Cart</span>
                        {user && (
                            <span className="ml-3 text-[10px] bg-black/5 px-2 py-1 rounded-full text-brand-dark">
                                {cartItems.length}
                            </span>
                        )}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-brand-dark/50 hover:text-brand-dark hover:bg-black/10 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Not logged in */}
                {!user ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                        <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-6">
                            <svg className="w-8 h-8 text-brand-dark/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                        </div>
                        <p className="font-medium uppercase tracking-[0.2em] text-brand-dark/50 text-sm mb-2">Sign in to view your cart</p>
                        <p className="text-[10px] text-brand-dark/30 uppercase tracking-widest mb-8">Your saved items will appear here</p>
                        <button
                            onClick={() => { onClose(); navigate('/login'); }}
                            className="px-10 py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-brand-dark hover:-translate-y-0.5 transition-all"
                        >
                            Sign In
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {cartItems.length > 0 ? cartItems.map((item, index) => (
                                <div key={index} className="flex gap-4 group">
                                    <Link to={`/product/${item.id}`} onClick={onClose} className="w-20 h-28 bg-black/5 rounded-xl overflow-hidden relative shadow-inner flex-shrink-0">
                                        {item.image ? (
                                            <img src={item.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-medium opacity-20 uppercase tracking-[0.2em] text-[8px] text-center px-1">Coming soon</div>
                                        )}
                                    </Link>
                                    <div className="flex-1 py-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start gap-2">
                                                <Link to={`/product/${item.id}`} onClick={onClose} className="font-medium text-sm uppercase tracking-[0.1em] text-brand-dark hover:text-brand-orange transition-colors truncate">
                                                    {item.name}
                                                </Link>
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    className="text-brand-dark/30 hover:text-red-500 transition-colors flex-shrink-0"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-[0.1em] mt-1">Size: {item.size}</p>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <p className="text-xs font-medium text-brand-dark/60">QTY: {item.quantity}</p>
                                            <p className="text-sm font-bold tracking-wider text-brand-orange">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                                    <div className="w-16 h-16 rounded-full bg-black/5 flex items-center justify-center mb-6">
                                        <svg className="w-8 h-8 text-brand-dark/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                    </div>
                                    <p className="font-medium uppercase tracking-[0.2em] text-brand-dark/40 text-sm mb-6">Your cart is empty</p>
                                    <button
                                        onClick={onClose}
                                        className="px-8 py-3 rounded-full bg-black/5 text-brand-dark font-bold uppercase tracking-[0.2em] text-[10px] hover:text-white hover:bg-brand-orange hover:-translate-y-0.5 transition-all"
                                    >
                                        Discover products
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {cartItems.length > 0 && (
                            <div className="p-6 border-t border-black/5 bg-gray-50 space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-semibold text-brand-dark/50 tracking-[0.1em] uppercase">Subtotal</span>
                                    <span className="font-bold tracking-wider text-brand-dark">₹{subtotal.toFixed(2)}</span>
                                </div>
                                <p className="text-[9px] text-brand-dark/40 uppercase tracking-[0.1em]">Shipping & taxes calculated at checkout.</p>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <button
                                        onClick={() => { onClose(); navigate('/cart'); }}
                                        className="py-4 rounded-full bg-black/5 text-brand-dark font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-black/10 transition-all text-center"
                                    >
                                        View Cart
                                    </button>
                                    <button
                                        onClick={() => { onClose(); navigate('/cart'); }}
                                        className="py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-brand-dark transition-all text-center"
                                    >
                                        Checkout
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CartDrawer;
