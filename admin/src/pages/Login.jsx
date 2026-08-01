import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        setIsAnimating(true);

        const handleContextMenu = (e) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);

        const handleKeyDown = (e) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u')
            ) {
                e.preventDefault();
                alert('View Source is disabled for security reasons.');
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        console.log("%c© Copyright by Flashud Portfolio. All Rights Reserved.", "color: #FFD700; background: #000000; font-size: 16px; font-weight: bold; padding: 10px;");

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (signInError) {
                setError(signInError.message || 'Invalid credentials.');
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profileError || !profile || profile.role !== 'admin') {
                setError('Unauthorized: Portal access is restricted to admins only.');
                localStorage.removeItem('isAuthenticated');
                localStorage.removeItem('adminEmail');
                await supabase.auth.signOut();
            } else {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('adminEmail', data.user.email);
                navigate('/');
            }
        } catch {
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (error) throw error;
        } catch (err) {
            setError('Google login failed: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4 overflow-hidden relative selection:bg-brand-orange selection:text-white">
            {/* Background ambient glow */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-gold/5 rounded-full filter blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold/10 rounded-full filter blur-[100px] pointer-events-none"></div>

            <div className={`max-w-md w-full relative z-10 transition-all duration-1000 transform ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

                {/* Logo */}
                <div className={`text-center mb-10 transition-all duration-1000 delay-300 ${isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
                    <div className="w-16 h-16 rounded-2xl bg-brand-gradient mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        F
                    </div>
                    <h1 className="text-4xl font-light text-brand-dark uppercase tracking-[0.1em]">
                        Flashud <span className="font-bold text-brand-orange">Admin</span>
                    </h1>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.3em] mt-4">
                        Secure Portal Access
                    </p>
                </div>

                {/* Card */}
                <div className={`bg-white border border-black/5 p-10 rounded-3xl transition-all duration-1000 delay-700 shadow-xl ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                    <h2 className="text-xs font-bold text-brand-dark/40 mb-8 uppercase tracking-[0.2em] text-center">
                        Identity Verification
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs font-medium text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em] mb-2 pl-1">
                                Identity (Email)
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                placeholder="flashud@gmail.com"
                                className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 shadow-sm"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2 pl-1">
                                <label className="block text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">
                                    Security Code (Password)
                                </label>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    placeholder="••••••••"
                                    className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 tracking-widest shadow-sm pr-16"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-brand-dark/40 text-[10px] font-bold uppercase tracking-wider hover:text-brand-orange transition-colors"
                                    disabled={isLoading}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 space-y-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm transition-all hover:bg-brand-dark hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md"
                            >
                                {isLoading ? 'Authenticating...' : 'Sign In To Portal'}
                            </button>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl bg-white border border-black/10 text-brand-dark font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-sm"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-12 text-brand-dark/30 font-medium text-[10px] space-y-2 uppercase tracking-[0.2em]">
                    <p>© Copyright by Flashud Portfolio</p>
                    <p className="opacity-50 tracking-wider">Secure Access Only</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
