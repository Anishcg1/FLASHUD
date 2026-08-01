import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        setIsAnimating(true);
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(''); // Clear error when user types
        setSuccess(''); // Clear success when user types
    };

    const validateForm = () => {
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }

        // Password validation
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }

        // Password confirmation
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email.trim(),
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        role: 'admin'
                    }
                }
            });

            if (signUpError) {
                setError(signUpError.message);
                setIsLoading(false);
                return;
            }

            // In case RLS/Triggers allow direct profile insert, attempt to upsert profile record
            if (data?.user) {
                try {
                    await supabase.from('profiles').upsert({
                        id: data.user.id,
                        full_name: formData.name,
                        email: formData.email.trim(),
                        role: 'admin'
                    });
                } catch (profileErr) {
                    console.warn('Direct profile insert failed, relying on DB triggers:', profileErr);
                }
            }

            setSuccess('Admin account created successfully! Please check your email or log in.');
            
            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setError('Registration failed. Please try again.');
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
                {/* Logo/Brand */}
                <div className={`text-center mb-8 transition-all duration-1000 delay-300 ${isAnimating ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
                    <div className="w-16 h-16 rounded-2xl bg-brand-gradient mx-auto mb-6 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                        F
                    </div>
                    <h1 className="text-4xl font-light text-brand-dark uppercase tracking-[0.1em]">
                        Flashud <span className="font-bold text-brand-orange">Admin</span>
                    </h1>
                    <p className="text-[10px] font-bold text-brand-dark/40 uppercase tracking-[0.3em] mt-4">Admin Registration</p>
                </div>

                {/* Registration Form */}
                <div className={`bg-white border border-black/5 p-8 md:p-10 rounded-3xl shadow-xl transition-all duration-1000 delay-700 ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
                    <h2 className="text-xs font-bold text-brand-dark/40 mb-8 uppercase tracking-[0.2em] text-center">
                        Create Admin Account
                    </h2>

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs font-medium text-center animate-pulse">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs font-medium text-center animate-pulse">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em] mb-2 pl-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter your full name"
                                className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 shadow-sm"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em] mb-2 pl-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="admin@example.com"
                                className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 shadow-sm"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em] mb-2 pl-1">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Min. 6 characters"
                                    className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 tracking-widest shadow-sm pr-12"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-dark/40 text-[10px] font-bold uppercase tracking-wider hover:text-brand-orange transition-colors"
                                    disabled={isLoading}
                                >
                                    {showPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[9px] font-bold text-brand-dark/50 uppercase tracking-[0.2em] mb-2 pl-1">
                                Confirm Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="Confirm your password"
                                    className="w-full bg-white border border-black/10 rounded-xl p-4 text-sm text-brand-dark font-medium focus:outline-none focus:border-brand-orange/50 transition-all placeholder-brand-dark/30 tracking-widest shadow-sm pr-12"
                                    required
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-brand-dark/40 text-[10px] font-bold uppercase tracking-wider hover:text-brand-orange transition-colors"
                                    disabled={isLoading}
                                >
                                    {showConfirmPassword ? 'Hide' : 'Show'}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 rounded-full bg-brand-orange text-white font-bold uppercase tracking-[0.2em] text-sm transition-all hover:bg-brand-dark hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-md"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creating Account...
                                </span>
                            ) : (
                                'Create Admin Account'
                            )}
                        </button>

                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="text-[10px] font-bold text-brand-dark/40 hover:text-brand-orange uppercase tracking-[0.15em] transition-colors"
                            >
                                Already have an account? <span className="text-brand-orange">Sign In</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className={`text-center mt-12 text-brand-dark/30 font-medium text-[10px] space-y-2 uppercase tracking-[0.2em] transition-all duration-1000 delay-1000 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}>
                    <p>© 2024 FlashUD Admin Portal</p>
                </div>
            </div>
        </div>
    );
};

export default Register;
