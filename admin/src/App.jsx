import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import UploadProducts from './pages/uploadproducts';
import SalesManagement from './pages/SalesManagement';
import Orders from './pages/Orders';
import Customers from './pages/Customers';
import Categories from './pages/Categories';
import Login from './pages/Login';
import AdminManagement from './pages/AdminManagement';
import Banners from './pages/Banners';
import Settings from './pages/Settings';
import Coupons from './pages/Coupons';
import AdminReturns from './pages/Returns';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    const [authInitialized, setAuthInitialized] = useState(false);

    useEffect(() => {
        let initialized = false;

        const markInitialized = () => {
            if (!initialized) {
                initialized = true;
                setAuthInitialized(true);
            }
        };

        // Hard fallback: unblock after 4s no matter what
        const timeoutId = setTimeout(markInitialized, 4000);

        const checkAdminRole = async (session) => {
            if (!session) {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('adminEmail');
                markInitialized();
                return;
            }

            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (profile && profile.role === 'admin') {
                    localStorage.setItem('isAuthenticated', 'true');
                    localStorage.setItem('adminEmail', session.user.email);
                } else {
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('adminEmail');
                    // Don't await — avoids re-entrant listener cycle
                    supabase.auth.signOut().catch(err => console.error("SignOut error:", err));
                }
            } catch (err) {
                console.error('Role check failed:', err);
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('adminEmail');
            } finally {
                markInitialized();
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
                checkAdminRole(session);
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('adminEmail');
                markInitialized();
            } else {
                markInitialized();
            }
        });

        return () => {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const isValid = (val) => val && val !== 'undefined' && val !== 'null' && val.length > 10;
    const isConfigMissing = !isValid(import.meta.env.VITE_SUPABASE_URL) || !isValid(import.meta.env.VITE_SUPABASE_ANON_KEY);

    if (isConfigMissing) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 rounded-full border-2 border-brand-orange flex items-center justify-center text-4xl mb-8 animate-pulse">⚠️</div>
                <h1 className="text-2xl font-bold text-white uppercase tracking-[0.2em] mb-4">Configuration Error</h1>
                <p className="text-white/60 max-w-md leading-relaxed mb-8 uppercase text-xs tracking-widest">
                    The portal cannot initialize. Your Supabase environment variables are missing in Vercel.
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left w-full max-w-lg">
                    <p className="text-[10px] font-bold text-brand-orange uppercase mb-4 tracking-widest">Action Required:</p>
                    <ol className="text-[10px] text-white/50 space-y-3 uppercase tracking-wider list-decimal pl-4">
                        <li>Go to Vercel Project Settings</li>
                        <li>Add <code className="text-white">VITE_SUPABASE_URL</code></li>
                        <li>Add <code className="text-white">VITE_SUPABASE_ANON_KEY</code></li>
                        <li>Redeploy your application</li>
                    </ol>
                </div>
            </div>
        );
    }

    if (!authInitialized) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-brand-orange uppercase tracking-[0.2em] text-sm animate-pulse font-medium">Authenticating Portal...</div>
            </div>
        );
    }


    return (
        <Router>
            <div className="min-h-screen text-brand-dark bg-[#F9FAFB] font-sans relative selection:bg-brand-orange selection:text-white">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Dashboard />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/products" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Products />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/upload-product" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <UploadProducts />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/sales-management" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <SalesManagement />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/orders" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Orders />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/customers" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Customers />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/categories" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Categories />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/coupons" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Coupons />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/banners" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Banners />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <Settings />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/admin-management" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <AdminManagement />
                            </main>
                        </ProtectedRoute>
                    } />
                    <Route path="/returns" element={
                        <ProtectedRoute>
                            <Header />
                            <main className="p-10">
                                <AdminReturns />
                            </main>
                        </ProtectedRoute>
                    } />
                </Routes>
            </div>
        </Router>
    )
}

export default App
