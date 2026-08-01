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
        // onAuthStateChange fires INITIAL_SESSION on mount with the restored session.
        // This is the single source of truth — no separate getSession() needed.
        // Having both causes a race condition on refresh that can double-fire state updates.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);

            // Sync cart/wishlist from DB to localStorage on initial load OR sign in
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && newSession?.user) {
                fetchAndSyncLocal(newSession.user.id);
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
