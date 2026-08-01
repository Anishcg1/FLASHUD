import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import { useLocalOrRemoteUrl } from '../lib/mediaResolver';

const CheckoutImage = ({ src, alt, className }) => {
    const resolvedSrc = useLocalOrRemoteUrl(src);
    return (
        <img
            src={resolvedSrc}
            alt={alt}
            className={className}
        />
    );
};

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    // Manual Payment & Step-by-Step Checkout states
    const [step, setStep] = useState(1); // 1 = Shipping, 2 = Payment QR
    const [paymentSettings, setPaymentSettings] = useState({
        qr_url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&auto=format&fit=crop&q=80',
        number: 'flashud@upi',
        instructions: 'Scan QR code and confirm payee is FLASHUD. Enter UTR reference below.'
    });
    const [transactionId, setTransactionId] = useState('');
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [screenshotUploading, setScreenshotUploading] = useState(false);
    const [screenshotUrl, setScreenshotUrl] = useState('');
    const [copied, setCopied] = useState(false);

    // Fetch Payment settings
    useEffect(() => {
        const fetchPaymentSettings = async () => {
            try {
                const { data } = await supabase.from('settings').select('*');
                if (data) {
                    const payment = data.find(s => s.key === 'payment_settings');
                    if (payment && payment.value) {
                        setPaymentSettings(prev => ({
                            qr_url: payment.value.qr_url || prev.qr_url,
                            number: payment.value.number || prev.number,
                            instructions: payment.value.instructions || prev.instructions
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching payment settings from db:', err);
            }
        };
        fetchPaymentSettings();
    }, []);

    // Receive coupon from Cart page via router state
    const couponDiscount = location.state?.coupon || null;

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        address: '',
        city: '',
        zip: '',
        country: 'India',
        phone: ''
    });

    // Load cart: from Supabase if logged in, else localStorage
    useEffect(() => {
        const loadCart = async () => {
            if (user) {
                const { data } = await supabase
                    .from('cart_items')
                    .select('*, products(*)')
                    .eq('user_id', user.id);

                if (data && data.length > 0) {
                    const formattedCart = data
                        .filter(item => item.products)
                        .map(item => ({
                            id: item.product_id,
                            name: item.products?.name || 'Unknown Product',
                            price: item.products?.discounted_price || 0,
                            size: item.size,
                            image: item.products?.images?.[0],
                            quantity: item.quantity,
                            supabase_id: item.id
                        }));
                    if (formattedCart.length === 0) navigate('/shop');
                    setCartItems(formattedCart);
                    return;
                }
            }
            // Fallback to localStorage
            const storedCart = JSON.parse(localStorage.getItem('cart') || '[]');
            if (storedCart.length === 0) navigate('/shop');
            setCartItems(storedCart);
        };

        loadCart();
    }, [user, navigate]);

    // Prefill name and email from the logged-in user
    useEffect(() => {
        if (user) {
            const fullName = user.user_metadata?.full_name || '';
            const parts = fullName.split(' ');
            setFormData(prev => ({
                ...prev,
                firstName: parts[0] || '',
                lastName: parts.slice(1).join(' ') || '',
                email: user.email || ''
            }));
        }
    }, [user]);

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const calculateDiscount = () => {
        if (!couponDiscount) return 0;
        if (couponDiscount.discount_type === 'percentage') {
            return (subtotal * couponDiscount.discount_value) / 100;
        }
        return couponDiscount.discount_value;
    };

    const discountAmount = calculateDiscount();
    const totalBeforeeTax = subtotal - discountAmount;
    const tax = totalBeforeeTax * 0.08;
    const total = totalBeforeeTax + tax;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleShippingSubmit = (e) => {
        e.preventDefault();
        if (!formData.firstName || !formData.lastName || !formData.address || !formData.city || !formData.zip || !formData.phone) {
            alert('Please fill in all shipping details.');
            return;
        }
        setStep(2);
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        if (!user) {
            alert('AUTH ERROR: Please log in to complete checkout.');
            setIsLoading(false);
            return;
        }

        if (!transactionId.trim()) {
            alert('PAYMENT ERROR: Please enter your UPI / Transaction Reference ID.');
            setIsLoading(false);
            return;
        }

        try {
            let finalScreenshotUrl = screenshotUrl.trim();

            if (screenshotFile) {
                setScreenshotUploading(true);
                const fileExt = screenshotFile.name.split('.').pop();
                const fileName = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
                const filePath = `payment_proofs/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(filePath, screenshotFile);

                if (uploadError) {
                    console.error('Screenshot upload error:', uploadError);
                    alert('Warning: Proof screenshot upload failed. We will submit your Transaction ID for validation.');
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('product-images')
                        .getPublicUrl(filePath);
                    finalScreenshotUrl = publicUrl;
                }
                setScreenshotUploading(false);
            }

            const fullAddress = `${formData.firstName} ${formData.lastName}, ${formData.address}, ${formData.city}, ${formData.zip}, ${formData.country}. Phone: ${formData.phone}`;

            // 1. Create Order
            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert([{
                    total_amount: total,
                    status: 'pending',
                    user_id: user.id,
                    shipping_address: fullAddress,
                    payment_reference: transactionId.trim(),
                    payment_screenshot_url: finalScreenshotUrl || null
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Create Order Items
            const orderItems = cartItems.map(item => ({
                order_id: order.id,
                product_id: item.id,
                quantity: item.quantity,
                price: item.price
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // 3. Clear Cart
            const { error: deleteError } = await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) {
                console.error('Database Cart Deletion Error:', deleteError);
            }

            localStorage.removeItem('cart');
            setCartItems([]);
            window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('cartUpdated'));

            setOrderSuccess(true);
            setTimeout(() => navigate('/account'), 3000);

        } catch (error) {
            alert('ORDER ERROR: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (orderSuccess) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 selection:bg-brand-orange selection:text-white">
                <div className="w-24 h-24 bg-green-50 border border-green-200 text-green-500 flex items-center justify-center text-4xl rounded-full mb-8 animate-bounce shadow-sm">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-4xl font-light tracking-tight mb-4 text-brand-dark text-center">Order <span className="font-bold text-brand-orange">Confirmed</span></h2>
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-ping"></div>
                    <p className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-[0.3em]">Redirecting to your account...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto pt-32 pb-24 px-6 selection:bg-brand-orange selection:text-white">
            <div className="mb-16 border-b border-black/5 pb-8">
                <h1 className="text-5xl md:text-7xl font-light uppercase tracking-[0.2em] leading-none text-brand-dark">
                    Secure <span className="font-bold text-brand-orange">Checkout</span>
                </h1>
                <div className="flex items-center gap-4 mt-6">
                    <span className="w-10 h-px bg-brand-orange"></span>
                    <span className="text-[10px] font-semibold text-brand-dark/50 uppercase tracking-[0.3em]">Safe and secure checkout</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
                {/* Left Panel: Shipping or Payment Step */}
                <div>
                    {step === 1 ? (
                        <div>
                            <h2 className="text-xl font-light uppercase tracking-[0.2em] mb-8 text-brand-dark flex items-center gap-4">
                                Shipping <span className="font-bold">Info</span>
                                <span className="h-px flex-1 bg-gradient-to-r from-brand-orange/50 to-transparent"></span>
                            </h2>

                            <form onSubmit={handleShippingSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">First name</label>
                                        <input name="firstName" required value={formData.firstName} onChange={handleInputChange} type="text" placeholder="First Name" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">Last name</label>
                                        <input name="lastName" required value={formData.lastName} onChange={handleInputChange} type="text" placeholder="Last Name" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">Email address</label>
                                        <input name="email" required value={formData.email} onChange={handleInputChange} type="email" placeholder="Email" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">Phone number</label>
                                        <input name="phone" required value={formData.phone} onChange={handleInputChange} type="tel" placeholder="Phone" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">Shipping address</label>
                                    <input name="address" required value={formData.address} onChange={handleInputChange} type="text" placeholder="Street Address" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">City</label>
                                        <input name="city" required value={formData.city} onChange={handleInputChange} type="text" placeholder="City" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">Country</label>
                                        <input name="country" required value={formData.country} onChange={handleInputChange} type="text" placeholder="Country" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                    </div>
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-dark/50">Zip code</label>
                                        <input name="zip" required value={formData.zip} onChange={handleInputChange} type="text" placeholder="Zip" className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all" />
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <button
                                        type="submit"
                                        className="w-full py-5 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm transition-all hover:bg-brand-dark hover:-translate-y-1 flex items-center justify-center gap-3 shadow-md"
                                    >
                                        <span>Proceed to Payment</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div>
                            <h2 className="text-xl font-light uppercase tracking-[0.2em] mb-8 text-brand-dark flex items-center gap-4">
                                Secure <span className="font-bold">Payment</span>
                                <span className="h-px flex-1 bg-gradient-to-r from-brand-orange/50 to-transparent"></span>
                            </h2>

                            <form onSubmit={handlePlaceOrder} className="space-y-8">
                                {/* Instructions banner */}
                                <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-2xl p-5 text-[11px] font-medium tracking-wide leading-relaxed text-brand-orange/90 uppercase">
                                    <p className="font-bold text-xs mb-1">Payment Instructions:</p>
                                    <p>{paymentSettings.instructions || 'Please scan the QR code or transfer to the UPI ID provided below. Once done, enter the transaction reference ID (UTR) and upload your payment receipt below for admin approval.'}</p>
                                </div>

                                {/* QR code presentation */}
                                <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center gap-4">
                                    <span className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-widest">Scan QR Code to Pay</span>
                                    {paymentSettings.qr_url ? (
                                        <div className="w-48 h-48 border border-black/5 rounded-2xl p-2 bg-gray-50 flex items-center justify-center">
                                            <CheckoutImage
                                                src={paymentSettings.qr_url}
                                                alt="Payment QR Code"
                                                className="max-w-full max-h-full object-contain"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-48 h-48 border-2 border-dashed border-black/10 rounded-2xl flex flex-col items-center justify-center text-center p-4">
                                            <svg className="w-8 h-8 text-brand-dark/20 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 20h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="text-[9px] font-bold text-brand-dark/30 uppercase tracking-wider">No QR Code Uploaded</span>
                                        </div>
                                    )}
                                </div>

                                {/* UPI / Phone Copy card */}
                                <div className="bg-white border border-black/5 rounded-3xl p-6 shadow-sm flex items-center justify-between gap-4">
                                    <div className="min-w-0">
                                        <span className="text-[9px] font-bold text-brand-dark/40 uppercase tracking-widest block mb-1">Transfer directly to UPI / Number</span>
                                        <code className="text-sm font-bold text-brand-dark select-all tracking-wider break-all">{paymentSettings.number || 'No payment number configured'}</code>
                                    </div>
                                    {paymentSettings.number && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(paymentSettings.number);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                            className={`px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${copied ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-black/10 hover:border-brand-orange hover:text-brand-orange'}`}
                                        >
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                    )}
                                </div>

                                {/* UTR / Transaction ID (Required) */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-dark/50 ml-1">Transaction ID / Reference UTR (Required)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="ENTER 12-DIGIT TRANSACTION REFERENCE ID"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                                        className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-semibold text-brand-dark tracking-widest placeholder-brand-dark/30 shadow-sm uppercase focus:outline-none focus:border-brand-orange/50 transition-all animate-pulse focus:animate-none"
                                    />
                                </div>

                                {/* Payment Screenshot (Optional) */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-dark/50 ml-1">Upload Receipt Screenshot (Optional)</label>
                                    
                                    {/* File Input */}
                                    <div className="relative h-14 bg-white border border-black/10 rounded-xl overflow-hidden hover:border-brand-orange/50 transition-all group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) setScreenshotFile(file);
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="px-5 py-4 text-[10px] font-bold text-brand-dark/40 flex items-center justify-center gap-3">
                                            <svg className="w-5 h-5 group-hover:text-brand-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            <span className="group-hover:text-brand-dark transition-colors tracking-widest truncate">
                                                {screenshotFile ? screenshotFile.name.toUpperCase() : 'UPLOAD PAYMENT RECEIPT'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-black/5"></div>
                                        <span className="text-[8px] font-bold text-brand-dark/20 uppercase tracking-[0.3em]">or paste screenshot URL</span>
                                        <div className="h-px flex-1 bg-black/5"></div>
                                    </div>

                                    {/* URL Input */}
                                    <input
                                        type="url"
                                        placeholder="https://example.com/receipt-proof.jpg"
                                        value={screenshotUrl}
                                        onChange={(e) => setScreenshotUrl(e.target.value)}
                                        className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm font-medium text-brand-dark placeholder-brand-dark/30 shadow-sm focus:outline-none focus:border-brand-orange/50 transition-all"
                                    />
                                </div>

                                {/* Form Submission / Navigation Actions */}
                                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="w-full sm:w-1/3 py-5 rounded-full bg-white border border-black/10 text-brand-dark/60 font-bold uppercase tracking-[0.2em] text-xs transition-all hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                        <span>Back</span>
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isLoading || screenshotUploading}
                                        className="w-full sm:w-2/3 py-5 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm transition-all hover:bg-brand-dark hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-3 shadow-md"
                                    >
                                        {isLoading || screenshotUploading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span>Submitting Payment...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Submit Order & Payment</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Summary Panel */}
                <div>
                    <div className="bg-white border border-black/5 p-8 md:p-10 rounded-3xl shadow-xl sticky top-28">
                        <h2 className="text-xl font-light uppercase tracking-[0.2em] mb-8 text-brand-dark border-b border-black/5 pb-4">Order <span className="font-bold">Summary</span></h2>

                        <div className="space-y-6 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {cartItems.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center gap-4 bg-white p-3 rounded-xl border border-black/5 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-16 bg-black/5 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.image ? (
                                                <CheckoutImage src={item.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-20 text-[6px] text-brand-dark">IMG</div>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium tracking-[0.1em] text-brand-dark truncate max-w-[150px] uppercase">{item.name}</div>
                                            <div className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em] mt-1">Size: {item.size} // Qty: {item.quantity}</div>
                                        </div>
                                    </div>
                                    <div className="font-bold text-sm text-brand-orange">₹{(item.price * item.quantity).toFixed(2)}</div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 pt-6">
                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="opacity-40 tracking-[0.2em] uppercase text-brand-dark/50">Subtotal</span>
                                <span className="text-brand-dark tracking-wider">₹{subtotal.toFixed(2)}</span>
                            </div>

                            {couponDiscount && (
                                <div className="flex justify-between items-center bg-brand-orange/10 border border-brand-orange/20 rounded-xl p-3 text-brand-orange">
                                    <span className="text-[10px] font-bold tracking-[0.1em] uppercase flex items-center gap-2">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                        PROMO: {couponDiscount.code}
                                    </span>
                                    <span className="font-bold text-[10px]">-₹{discountAmount.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-[10px] font-bold">
                                <span className="opacity-40 tracking-[0.2em] uppercase text-brand-dark/50">Shipping</span>
                                <span className="text-green-500 tracking-wider">FREE</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold border-b border-black/5 pb-6">
                                <span className="opacity-40 tracking-[0.2em] uppercase text-brand-dark/50">Taxes (8%)</span>
                                <span className="text-brand-dark">₹{tax.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-end pt-2">
                                <span className="text-sm font-bold tracking-[0.1em] uppercase text-brand-dark/70">Total amount</span>
                                <span className="text-3xl font-bold tracking-wider text-brand-orange">₹{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-8 p-4 rounded-xl border border-brand-orange/20 bg-brand-orange/5 text-[9px] font-medium text-brand-orange/80 leading-relaxed text-center tracking-[0.1em] uppercase">
                            <div className="flex justify-center mb-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            By placing an order, you agree to our terms of service and refund policy.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
