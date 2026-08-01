import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const ProtectedRoute = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkAdminRole = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    if (isMounted) {
                        setIsAdmin(false);
                        setIsLoading(false);
                    }
                    return;
                }

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();

                if (isMounted) {
                    if (profile && profile.role === 'admin') {
                        setIsAdmin(true);
                        localStorage.setItem('isAuthenticated', 'true');
                        localStorage.setItem('adminEmail', session.user.email);
                    } else {
                        setIsAdmin(false);
                        localStorage.removeItem('isAuthenticated');
                        localStorage.removeItem('adminEmail');
                        supabase.auth.signOut().catch(err => console.error("SignOut error:", err));
                    }
                }
            } catch (err) {
                console.error('Error checking admin role:', err);
                if (isMounted) {
                    setIsAdmin(false);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        checkAdminRole();

        return () => {
            isMounted = false;
        };
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-brand-orange uppercase tracking-[0.2em] text-sm animate-pulse font-medium">Verifying Credentials...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
