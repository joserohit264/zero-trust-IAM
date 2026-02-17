import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import MfaVerify from './pages/MfaVerify';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Logs from './pages/Logs';
import Profile from './pages/Profile';
import MfaSetup from './pages/MfaSetup';

// Protected Route Component
const ProtectedRoute = ({ children, roles }) => {
    const { user, loading, requiresMfa } = useAuth();

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
            </div>
        );
    }

    if (!user && !requiresMfa) {
        return <Navigate to="/login" replace />;
    }

    if (requiresMfa) {
        return <Navigate to="/mfa-verify" replace />;
    }

    if (roles && !roles.some(role => user.roles?.some(r => r.name === role))) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// Guest Route (only for non-authenticated users)
const GuestRoute = ({ children }) => {
    const { user, loading, requiresMfa } = useAuth();

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
            </div>
        );
    }

    if (requiresMfa) {
        return <Navigate to="/mfa-verify" replace />;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

// MFA Route (for users who need to verify MFA)
const MfaRoute = ({ children }) => {
    const { user, loading, requiresMfa } = useAuth();

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
            </div>
        );
    }

    if (!requiresMfa) {
        if (user) {
            return <Navigate to="/dashboard" replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return children;
};

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route
                        path="/login"
                        element={
                            <GuestRoute>
                                <Login />
                            </GuestRoute>
                        }
                    />

                    {/* MFA Verification Route */}
                    <Route
                        path="/mfa-verify"
                        element={
                            <MfaRoute>
                                <MfaVerify />
                            </MfaRoute>
                        }
                    />

                    {/* Protected Routes */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <Users />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/logs"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <Logs />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <Profile />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/mfa-setup"
                        element={
                            <ProtectedRoute>
                                <MfaSetup />
                            </ProtectedRoute>
                        }
                    />

                    {/* Default Redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
