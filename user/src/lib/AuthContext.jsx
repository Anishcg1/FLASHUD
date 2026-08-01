import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { fetchAndSyncLocal } from './syncHelpers';

const AuthContext = createContext({
    user: null,
    session: null,
    loading: true,
    signOut: async () => {},
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) {
                fetchAndSyncLocal(session.user.id);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);

            if (event === 'SIGNED_IN' && newSession?.user) {
                await fetchAndSyncLocal(newSession.user.id);
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem('cart');
                localStorage.removeItem('wishlist');
                window.dispatchEvent(new Event('storage'));
                window.dispatchEvent(new Event('cartUpdated'));
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        user,
        session,
        loading,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
