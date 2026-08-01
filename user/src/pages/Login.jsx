import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { syncLocalStorageToSupabase } from '../lib/syncHelpers';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const from = location.state?.from?.pathname || '/account';

    const switchMode = (newMode) => {
        setMode(newMode);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === 'reset') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/account`,
                });
                if (error) throw error;
                setSuccess('Password reset link sent! Check your email.');
                return;
            }

            if (mode === 'signup') {
                if (!fullName.trim()) { setError('Please enter your full name.'); return; }
                if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName.trim() } }
                });
                if (error) throw error;

                if (data?.user && !data?.session) {
                    // Email confirmation required
                    setSuccess('Account created! Check your email to verify before signing in.');
                } else if (data?.session) {
                    await syncLocalStorageToSupabase(data.user.id);
                    navigate(from, { replace: true });
                }
                return;
            }

            // Sign in
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            await syncLocalStorageToSupabase(data.user.id);
            navigate(from, { replace: true });

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: `${window.location.origin}/account` }
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const titles = {
        signin: { heading: 'Welcome Back', sub: 'Sign in to your account' },
        signup: { heading: 'Join Flashud', sub: 'Create your account' },
        reset:  { heading: 'Reset Password', sub: 'We\'ll send a link to your email' },
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 selection:bg-brand-orange selection:text-white pt-32">
            <div className="w-full max-w-md">

                {/* Heading */}
                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-brand-dark">
                        {titles[mode].heading.split(' ').slice(0, -1).join(' ')}{' '}
                        <span className="font-bold text-brand-orange">
                            {titles[mode].heading.split(' ').slice(-1)}
                        </span>
                    </h1>
                    <p className="text-[10px] font-bold text-brand-dark/50 uppercase tracking-[0.3em] mt-4">
                        {titles[mode].sub}
                    </p>
                </div>

                <div className="bg-white border border-black/5 p-8 md:p-10 rounded-3xl shadow-xl">

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-500 text-xs font-medium tracking-wide text-center">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-600 text-xs font-medium tracking-wide text-center">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Full name — signup only */}
                        {mode === 'signup' && (
                            <div className="space-y-2">
                                <label className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Full Name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="Your name"
                                    className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 shadow-sm"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Email address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="you@example.com"
                                className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 shadow-sm"
                            />
                        </div>

                        {/* Password — signin & signup only */}
                        {mode !== 'reset' && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em]">Password</label>
                                    {mode === 'signin' && (
                                        <button
                                            type="button"
                                            onClick={() => switchMode('reset')}
                                            className="text-[9px] font-bold text-brand-orange hover:text-brand-dark transition-colors uppercase tracking-[0.1em]"
                                        >
                                            Forgot?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                                        className="w-full bg-white border border-black/10 rounded-xl p-4 pr-16 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 tracking-widest shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-brand-dark/40 uppercase tracking-wider hover:text-brand-orange transition-colors"
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm transition-all hover:bg-brand-dark hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isLoading ? (
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    mode === 'signin' ? 'Sign In' :
                                    mode === 'signup' ? 'Create Account' :
                                    'Send Reset Link'
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Google — not on reset screen */}
                    {mode !== 'reset' && (
                        <div className="mt-6 pt-6 border-t border-black/5">
                            <button
                                onClick={handleGoogle}
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
                    )}

                    {/* Mode switchers */}
                    <div className="mt-6 flex flex-col items-center gap-3">
                        {mode === 'signin' && (
                            <button onClick={() => switchMode('signup')} className="text-[10px] font-bold text-brand-dark/40 hover:text-brand-orange uppercase tracking-[0.15em] transition-colors">
                                Don't have an account? <span className="text-brand-orange">Create one</span>
                            </button>
                        )}
                        {mode === 'signup' && (
                            <button onClick={() => switchMode('signin')} className="text-[10px] font-bold text-brand-dark/40 hover:text-brand-orange uppercase tracking-[0.15em] transition-colors">
                                Already have an account? <span className="text-brand-orange">Sign in</span>
                            </button>
                        )}
                        {mode === 'reset' && (
                            <button onClick={() => switchMode('signin')} className="text-[10px] font-bold text-brand-dark/40 hover:text-brand-orange uppercase tracking-[0.15em] transition-colors">
                                ← Back to sign in
                            </button>
                        )}
                    </div>
                </div>

                <p className="text-center mt-8 text-[9px] font-medium text-brand-dark/30 tracking-[0.2em] uppercase">
                    Secure • Private • Encrypted
                </p>
            </div>
        </div>
    );
};

export default Login;
