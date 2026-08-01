import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import Login from './pages/Login';
import Wishlist from './pages/Wishlist';
import Returns from './pages/Returns';

const UserProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-2 border-brand-orange/20 border-t-brand-orange rounded-full animate-spin mb-6"></div>
                <p className="font-medium text-[10px] text-brand-dark/50 uppercase tracking-[0.3em]">Checking secure channel...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <ScrollToTop />
                <div className="min-h-screen flex flex-col">
                    <Header />
                    <main className="flex-grow">
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/shop" element={<Shop />} />
                            <Route path="/new-arrivals" element={<Shop isNewArrivalsOnly={true} />} />
                            <Route path="/product/:id" element={<ProductDetail />} />
                            <Route path="/cart" element={
                                <UserProtectedRoute>
                                    <Cart />
                                </UserProtectedRoute>
                            } />
                            <Route path="/checkout" element={
                                <UserProtectedRoute>
                                    <Checkout />
                                </UserProtectedRoute>
                            } />
                            <Route path="/account" element={
                                <UserProtectedRoute>
                                    <Account />
                                </UserProtectedRoute>
                            } />
                            <Route path="/login" element={<Login />} />
                            <Route path="/wishlist" element={<Wishlist />} />
                            <Route path="/returns" element={
                                <UserProtectedRoute>
                                    <Returns />
                                </UserProtectedRoute>
                            } />
                        </Routes>
                    </main>
                    <Footer />
                </div>
            </Router>
        </AuthProvider>
    )
}

export default App
