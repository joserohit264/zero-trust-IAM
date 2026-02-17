import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
    const { user, logout, hasRole, hasAnyRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="dashboard">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🔐</div>
                    <span className="sidebar-logo-text">IAM System</span>
                </div>

                <nav className="sidebar-nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-item-icon">📊</span>
                        Dashboard
                    </NavLink>

                    {hasRole('admin') && (
                        <NavLink
                            to="/users"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">👥</span>
                            Users
                        </NavLink>
                    )}

                    {hasRole('admin') && (
                        <NavLink
                            to="/logs"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">📋</span>
                            Audit Logs
                        </NavLink>
                    )}

                    <NavLink
                        to="/profile"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-item-icon">👤</span>
                        Profile
                    </NavLink>

                    {!user?.mfaEnabled && (
                        <NavLink
                            to="/mfa-setup"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">🔑</span>
                            Enable MFA
                        </NavLink>
                    )}
                </nav>

                {/* User Info & Logout */}
                <div style={{
                    marginTop: 'auto',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-color)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: 'var(--bg-glass)',
                        borderRadius: 'var(--radius-md)'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-700) 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}>
                            {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                        </div>
                        <div>
                            <div style={{ fontWeight: '500', fontSize: '0.9375rem' }}>
                                {user?.firstName} {user?.lastName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {user?.roles?.map(r => r.name).join(', ')}
                            </div>
                        </div>
                    </div>

                    <button onClick={handleLogout} className="btn btn-ghost w-full">
                        <span>🚪</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
};

export default Layout;
