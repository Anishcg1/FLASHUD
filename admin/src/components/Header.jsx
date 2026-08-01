import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path) =>
        location.pathname === path
            ? 'text-brand-orange font-bold'
            : 'text-brand-dark/50 hover:text-brand-dark transition-colors';

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('adminEmail');
        navigate('/login');
    };

    const navLinks = [
        { path: '/',                  label: 'Dashboard' },
        { path: '/products',          label: 'Inventory' },
        { path: '/orders',            label: 'Orders' },
        { path: '/customers',         label: 'Customers' },
        { path: '/categories',        label: 'Categories' },
        { path: '/coupons',           label: 'Coupons' },
        { path: '/banners',           label: 'Hero' },
        { path: '/returns',           label: 'Returns' },
        { path: '/settings',          label: 'Settings' },
        { path: '/admin-management',  label: 'Admins' },
    ];

    return (
        <>
            <header className="w-full h-20 bg-white/95 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-6 md:px-10 sticky top-0 z-50 shadow-sm">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
                    <img src="/flashudlogo.png" alt="Flashud" className="h-8 object-contain brightness-0" />
                    <span className="text-xl font-kindred lowercase tracking-wide text-brand-dark hidden sm:block">
                        flashud
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
                    {navLinks.map(link => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${isActive(link.path)}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Right actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={handleLogout}
                        className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-full border border-black/10 text-brand-dark text-xs font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>

                    {/* Mobile hamburger */}
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-black/5 transition-colors">
                        <svg className="w-6 h-6 text-brand-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMobileMenuOpen
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            }
                        </svg>
                    </button>
                </div>
            </header>

            {/* Mobile drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 flex">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="relative w-72 max-w-full h-full bg-white border-r border-black/5 shadow-2xl flex flex-col z-50">
                        <div className="flex items-center justify-between p-6 border-b border-black/5">
                            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                                <img src="/flashudlogo.png" alt="Flashud" className="h-7 object-contain brightness-0" />
                                <span className="text-lg font-kindred lowercase text-brand-dark">flashud <span className="text-brand-orange">admin</span></span>
                            </Link>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-black/5">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                                        location.pathname === link.path
                                            ? 'bg-brand-orange/5 text-brand-orange border border-brand-orange/20'
                                            : 'text-brand-dark/50 hover:bg-black/5 hover:text-brand-dark'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="p-4 border-t border-black/5">
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 rounded-xl border border-black/10 text-brand-dark text-xs font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Header;
