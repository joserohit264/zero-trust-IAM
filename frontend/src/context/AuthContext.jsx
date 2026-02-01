import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requiresMfa, setRequiresMfa] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.data);
                setRequiresMfa(false);
            } else if (response.status === 403) {
                const data = await response.json();
                if (data.requiresMfa) {
                    setRequiresMfa(true);
                } else {
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        if (data.data.requiresMfa) {
            setRequiresMfa(true);
            return { requiresMfa: true };
        }

        setUser(data.data.user);
        setRequiresMfa(false);
        return { requiresMfa: false, user: data.data.user };
    };

    const verifyMfa = async (token) => {
        const response = await fetch('/api/auth/verify-mfa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'MFA verification failed');
        }

        // Fetch user data after MFA
        await checkAuth();
        setRequiresMfa(false);
        return data;
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setRequiresMfa(false);
        }
    };

    const hasRole = (role) => {
        return user?.roles?.some(r => r.name === role) || false;
    };

    const hasAnyRole = (...roles) => {
        return roles.some(role => hasRole(role));
    };

    const value = {
        user,
        loading,
        requiresMfa,
        login,
        verifyMfa,
        logout,
        hasRole,
        hasAnyRole,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
