import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthContext';
import CartDrawer from './CartDrawer';

const Header = () => {
    const { user } = useAuth();
    const location = useLocation();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [cartCount, setCartCount] = useState(0);
    const [scrolled, setScrolled] = useState(false);
    const [categories, setCategories] = useState([]);
    const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
    const megaMenuTimer = useRef(null);

    // Location State
    const [userLocation, setUserLocation] = useState('Select address');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [manualPincode, setManualPincode] = useState('');
    const [isLocating, setIsLocating] = useState(false);

    // Is the current page Home where we need transparent header initially?
    const isHome = location.pathname === '/';
    const isTransparent = isHome && !scrolled && !isMenuOpen;

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Update cart count from localStorage or Supabase
    useEffect(() => {
        const checkCart = async () => {
            if (user) {
                const { data } = await supabase
                    .from('cart_items')
                    .select('quantity')
                    .eq('user_id', user.id);

                if (data) {
                    const count = data.reduce((acc, item) => acc + item.quantity, 0);
                    setCartCount(count);
                }
            } else {
                setCartCount(0);
            }
        };

        checkCart();
        window.addEventListener('storage', checkCart);
        // Also listen for a custom event if cart is updated without storage event (same-tab)
        window.addEventListener('cartUpdated', checkCart);

        return () => {
            window.removeEventListener('storage', checkCart);
            window.removeEventListener('cartUpdated', checkCart);
        };
    }, [isCartOpen, user]);

    // Handle Location globally
    useEffect(() => {
        const saved = localStorage.getItem('userLocation');
        if (saved) setUserLocation(saved);

        const handleLocationUpdate = () => {
            const updated = localStorage.getItem('userLocation');
            if (updated) setUserLocation(updated);
        };
        const openModalEvent = () => setShowLocationModal(true);
        const openCartEvent = () => setIsCartOpen(true);

        window.addEventListener('locationUpdated', handleLocationUpdate);
        window.addEventListener('openLocationModal', openModalEvent);
        window.addEventListener('openCart', openCartEvent);
        return () => {
            window.removeEventListener('locationUpdated', handleLocationUpdate);
            window.removeEventListener('openLocationModal', openModalEvent);
            window.removeEventListener('openCart', openCartEvent);
        };
    }, []);

    // Fetch Categories for Mega Menu
    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('categories').select('*').limit(6);
            if (data) setCategories(data);
        };
        fetchCategories();
    }, []);

    const handleMegaMenuEnter = () => {
        if (megaMenuTimer.current) clearTimeout(megaMenuTimer.current);
        setIsMegaMenuOpen(true);
    };

    const handleMegaMenuLeave = () => {
        megaMenuTimer.current = setTimeout(() => {
            setIsMegaMenuOpen(false);
        }, 150); // Small delay to allow moving mouse into dropdown
    };

    const handleAutoLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
                    const data = await response.json();

                    if (data && data.address) {
                        const city = data.address.city || data.address.town || data.address.village || data.address.state_district || 'India';
                        const pincode = data.address.postcode || '';

                        const locText = `${city} ${pincode}`.trim();
                        setUserLocation(locText);
                        localStorage.setItem('userLocation', locText);
                        window.dispatchEvent(new Event('locationUpdated'));
                    } else {
                        alert('Could not determine address from location.');
                    }
                } catch (error) {
                    console.error("Geocoding error:", error);
                    alert('Error getting location details. Please enter manually.');
                } finally {
                    setIsLocating(false);
                    setShowLocationModal(false);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                setIsLocating(false);
                alert('Location access denied or unavailable. Please enter manually.');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    };

    const handleManualLocation = (e) => {
        e.preventDefault();
        if (manualPincode.length > 3) {
            const loc = `India ${manualPincode}`;
            setUserLocation(loc);
            localStorage.setItem('userLocation', loc);
            window.dispatchEvent(new Event('locationUpdated'));
            setShowLocationModal(false);
        }
    };

    // Dynamic styling based on scroll state
    const headerClasses = `w-full h-20 md:h-24 fixed top-0 z-[60] transition-all duration-700 ease-in-out flex items-center justify-between px-6 md:px-10 ${isTransparent
        ? 'bg-transparent text-white'
        : 'bg-white/95 backdrop-blur-md text-brand-dark shadow-sm'
        }`;

    // SVG Icons
    const GlobeIcon = () => <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" /></svg>;
    const PinIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>;
    const SearchIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
    const UserIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
    const BookmarkIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>;
    const BagIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
    const MenuIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" /></svg>;
    const XIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

    return (
        <>
            <div className={`fixed top-0 w-full z-[60] transition-all duration-700 ease-in-out ${isTransparent && !scrolled ? 'bg-transparent text-white' : 'bg-white/95 backdrop-blur-md text-brand-dark shadow-sm'}`}>
                {/* Main Header Row */}
                <header className="w-full h-20 md:h-24 flex items-center justify-between px-6 md:px-10 relative z-20">
                    {/* Left Side: Links (Hidden on mobile) */}
                    <nav className="hidden md:flex items-center gap-6 lg:gap-8 w-[40%] h-full">
                        <Link to="/new-arrivals" className={`text-sm font-medium tracking-wide transition-colors ${isTransparent && !isMegaMenuOpen ? 'hover:text-white/70' : 'hover:text-brand-orange'}`}>New in</Link>

                        <div
                            className="h-full flex items-center"
                            onMouseEnter={handleMegaMenuEnter}
                            onMouseLeave={handleMegaMenuLeave}
                        >
                            <Link
                                to="/shop"
                                className={`text-sm font-medium tracking-wide transition-colors flex items-center gap-2 ${isTransparent && !isMegaMenuOpen ? 'hover:text-white/70' : 'hover:text-brand-orange'} ${isMegaMenuOpen ? 'text-brand-orange' : ''}`}
                            >
                                Collections
                                <svg className={`w-3 h-3 transition-transform duration-300 ${isMegaMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </Link>
                        </div>
                    </nav>

                    {/* Mobile Menu Button (Visible on mobile) */}
                    <div className="flex items-center w-1/3 md:hidden">
                        <button onClick={() => setIsMenuOpen(true)} className="hover:text-brand-orange transition-colors">
                            <MenuIcon />
                        </button>
                    </div>

                    {/* Center: Brand Logo */}
                    <div className="flex justify-center flex-1 md:w-1/5">
                        <Link to="/" className="flex items-center gap-3 relative z-20 group">
                            <div className="relative">
                                <img
                                    src="/flashudlogo.png"
                                    alt="Flashud"
                                    className={`h-10 md:h-12 object-contain transition-all duration-500 ${(!isTransparent || isMegaMenuOpen) ? 'brightness-0' : ''}`}
                                />
                                <div className="absolute inset-0 bg-brand-orange opacity-0 group-hover:opacity-20 transition-opacity rounded-full blur-xl"></div>
                            </div>
                            <h1 className={`text-2xl md:text-3xl tracking-tighter font-kindred leading-none mt-1 lowercase transition-colors duration-500 ${(!isTransparent || isMegaMenuOpen) ? 'text-brand-dark' : 'text-white'}`}>
                                flashud
                            </h1>
                        </Link>
                    </div>

                    {/* Right Side: Icons */}
                    <div className="flex justify-end items-center gap-2 md:gap-4 w-1/3 md:w-[40%]">
                        <div className="hidden md:flex items-center justify-end gap-2 xl:gap-4">
                            {/* Location */}
                            <button
                                onClick={() => setShowLocationModal(true)}
                                className="flex items-center gap-2 hover:text-brand-orange transition-all shrink-0 group bg-transparent px-2 py-2 rounded-full cursor-pointer overflow-hidden"
                            >
                                <PinIcon />
                                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 transition-all duration-500 ease-out">{userLocation}</span>
                            </button>

                            {/* Search */}
                            <button className="flex items-center gap-2 hover:text-brand-orange transition-all shrink-0 group bg-transparent px-2 py-2 rounded-full cursor-pointer overflow-hidden">
                                <SearchIcon />
                                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-out">Search</span>
                            </button>

                            {/* Wishlist */}
                            <Link to="/wishlist" className="flex items-center gap-2 hover:text-brand-orange transition-all shrink-0 group bg-transparent px-2 py-2 rounded-full cursor-pointer overflow-hidden">
                                <BookmarkIcon />
                                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-out">Wishlist</span>
                            </Link>

                            {/* Account */}
                            <Link to="/account" className="flex items-center gap-2 hover:text-brand-orange transition-all shrink-0 group bg-transparent px-2 py-2 rounded-full cursor-pointer overflow-hidden">
                                <UserIcon />
                                <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-out">Account</span>
                            </Link>
                        </div>

                        {/* Cart */}
                        <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-2 hover:text-brand-orange transition-all shrink-0 group bg-transparent px-2 py-2 rounded-full cursor-pointer overflow-hidden text-left pl-2 md:pl-0">
                            <div className="relative">
                                <BagIcon />
                                {cartCount > 0 && (
                                    <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 text-white text-[8px] font-bold rounded-full flex items-center justify-center ${isTransparent && !isMegaMenuOpen ? 'bg-white/20' : 'bg-brand-orange'}`}>
                                        {cartCount}
                                    </span>
                                )}
                            </div>
                            <span className="hidden md:inline-block text-xs font-bold uppercase tracking-widest whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[100px] group-hover:opacity-100 transition-all duration-500 ease-out">Cart</span>
                        </button>
                    </div>
                </header>

                {/* --- 3D MEGA MENU --- */}
                {/* We use a combination of origin-top, rotateX, and opacity to create a subtle 3D swing down effect */}
                <div
                    className={`absolute top-full left-0 w-full bg-white border-t border-black/5 shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] origin-top z-10 ${isMegaMenuOpen ? 'opacity-100 rotate-x-0 translate-y-0 visible shadow-[0_30px_60px_rgba(0,0,0,0.12)]' : 'opacity-0 -rotate-x-12 -translate-y-4 invisible'}`}
                    style={{ perspective: '1000px' }}
                    onMouseEnter={handleMegaMenuEnter}
                    onMouseLeave={handleMegaMenuLeave}
                >
                    <div className="max-w-7xl mx-auto px-10 py-12">
                        <div className="flex items-center justify-between border-b border-black/5 pb-4 mb-8">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-dark/40">EXPLORE COLLECTIONS</h3>
                            <Link to="/shop" className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-dark hover:text-brand-orange transition-colors">
                                View All Collections →
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
                            {categories.map((cat, idx) => (
                                <Link
                                    key={cat.id}
                                    to={`/shop?category=${cat.id}`}
                                    style={{ transitionDelay: `${idx * 50}ms` }}
                                    className={`group flex flex-col items-center transition-all duration-300 ${isMegaMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                                    onClick={() => setIsMegaMenuOpen(false)}
                                >
                                    <div className="w-full aspect-[4/5] bg-black/5 mb-4 overflow-hidden relative">
                                        {cat.thumbnail_url ? (
                                            <img src={cat.thumbnail_url} alt={cat.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-black/20 uppercase tracking-widest whitespace-nowrap">No Visual</div>
                                        )}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-[0.1em] text-center text-brand-dark group-hover:text-brand-orange transition-colors">{cat.name}</span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar Drawer */}
            <div className={`fixed inset-0 z-[100] transition-opacity duration-500 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
                <div className={`absolute left-0 top-0 bottom-0 w-[80%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex justify-between items-center p-6 border-b border-black/5 flex-shrink-0">
                        <Link to="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-3">
                            <img src="/flashudlogo.png" alt="Flashud" className="h-7 object-contain brightness-0" />
                            <h2 className="text-2xl font-kindred lowercase tracking-wide mt-1">flashud</h2>
                        </Link>
                        <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <XIcon />
                        </button>
                    </div>

                    <nav className="flex-grow py-8 px-6 space-y-6 overflow-y-auto">
                        <Link to="/new-arrivals" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-light tracking-widest hover:text-brand-orange transition-colors">New in</Link>
                        <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-light tracking-widest hover:text-brand-orange transition-colors">Collections</Link>
                        <Link to="/shop" onClick={() => setIsMenuOpen(false)} className="block text-2xl font-light tracking-widest hover:text-brand-orange transition-colors">Shop</Link>

                        <div className="pt-8 border-t border-black/5 space-y-4">
                            <Link to="/account" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 text-sm font-medium tracking-widest hover:text-brand-orange transition-colors">
                                <UserIcon /> Account
                            </Link>
                            <button onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 text-sm font-medium tracking-widest hover:text-brand-orange transition-colors w-full text-left">
                                <SearchIcon /> Search
                            </button>
                            <button onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 text-sm font-medium tracking-widest hover:text-brand-orange transition-colors w-full text-left">
                                <PinIcon /> Stores
                            </button>
                        </div>
                    </nav>

                    <div className="p-6 bg-black text-white flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-60">Premium Experience</span>
                        </div>
                    </div>
                </div>
            </div>

            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

            {/* GLOBAL LOCATION UPDATE MODAL */}
            {showLocationModal && (
                <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200 text-brand-dark">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gray-100 px-5 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-gray-900">Choose your location</h3>
                            <button onClick={() => setShowLocationModal(false)} className="text-gray-500 hover:text-black transition-colors rounded-full hover:bg-gray-200 p-1">
                                <XIcon />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                                Delivery options and delivery speeds may vary for different locations.
                            </p>

                            <button
                                onClick={handleAutoLocation}
                                disabled={isLocating}
                                className="w-full mb-4 bg-brand-orange text-white py-2.5 rounded-lg font-medium text-sm hover:bg-neutral-900 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {isLocating ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Detecting Location...
                                    </>
                                ) : "Automatically detect my location"}
                            </button>

                            <div className="relative flex items-center justify-center my-6">
                                <span className="absolute bg-white px-2 text-xs font-semibold text-gray-400 uppercase">or</span>
                                <div className="w-full h-px bg-gray-200"></div>
                            </div>

                            <form onSubmit={handleManualLocation}>
                                <label className="block text-sm font-bold text-gray-800 mb-2">Enter an Indian Pincode or City</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        value={manualPincode}
                                        onChange={(e) => setManualPincode(e.target.value)}
                                        placeholder="e.g. 500003 or Hyderabad"
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Cart Button for Mobile/Convenience */}
            <button
                onClick={() => setIsCartOpen(true)}
                className={`fixed bottom-24 right-6 z-[45] w-14 h-14 bg-brand-orange text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 md:hidden ${scrolled ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}
            >
                <div className="relative">
                    <BagIcon />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-brand-orange text-[9px] font-bold rounded-full flex items-center justify-center border border-brand-orange">
                            {cartCount}
                        </span>
                    )}
                </div>
            </button>
        </>
    );
};

export default Header;
