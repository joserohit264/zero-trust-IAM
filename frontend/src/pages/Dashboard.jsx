import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Dashboard = () => {
    const { user, hasRole, hasAnyRole } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        mfaEnabled: 0,
        recentLogins: 0
    });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch users count if admin
            if (hasRole('admin')) {
                const usersRes = await fetch('/api/users?limit=1', { credentials: 'include' });
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setStats(prev => ({ ...prev, totalUsers: usersData.data.total }));
                }
            }

            // Fetch recent logs if admin or auditor
            if (hasAnyRole('admin', 'auditor')) {
                const logsRes = await fetch('/api/logs?limit=10', { credentials: 'include' });
                if (logsRes.ok) {
                    const logsData = await logsRes.json();
                    setRecentLogs(logsData.data.logs || []);

                    // Count recent logins
                    const loginCount = logsData.data.logs.filter(
                        l => l.action_type === 'LOGIN_SUCCESS'
                    ).length;
                    setStats(prev => ({ ...prev, recentLogins: loginCount }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getActionBadge = (action) => {
        const badges = {
            'LOGIN_SUCCESS': 'badge-success',
            'LOGIN_FAILURE': 'badge-danger',
            'MFA_VERIFY_SUCCESS': 'badge-success',
            'MFA_VERIFY_FAILURE': 'badge-danger',
            'USER_CREATED': 'badge-info',
            'USER_DELETED': 'badge-danger',
            'ROLE_ASSIGNED': 'badge-info',
            'ROLE_REVOKED': 'badge-warning'
        };
        return badges[action] || 'badge-info';
    };

    return (
        <Layout>
            <div className="page-header">
                <h1 className="page-title">
                    Welcome back, {user?.firstName || user?.username}! 👋
                </h1>
                <p className="page-subtitle">
                    Here's what's happening in your IAM system today.
                </p>
            </div>

            {/* Stats Grid - Admin Only */}
            {hasRole('admin') && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon blue">👥</div>
                        </div>
                        <div className="stat-value">{stats.totalUsers}</div>
                        <div className="stat-label">Total Users</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon green">✅</div>
                        </div>
                        <div className="stat-value">{stats.recentLogins}</div>
                        <div className="stat-label">Recent Logins</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon yellow">🔐</div>
                        </div>
                        <div className="stat-value">{user?.mfaEnabled ? '✓' : '✗'}</div>
                        <div className="stat-label">MFA Status</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-header">
                            <div className="stat-card-icon purple">🛡️</div>
                        </div>
                        <div className="stat-value">{user?.roles?.length || 0}</div>
                        <div className="stat-label">Your Roles</div>
                    </div>
                </div>
            )}

            {/* User Info Card for Non-Admins */}
            {!hasRole('admin') && (
                <div className="card mb-6">
                    <h3 className="mb-4">Your Account</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <div className="text-muted mb-1">Username</div>
                            <div style={{ fontWeight: '500' }}>{user?.username}</div>
                        </div>
                        <div>
                            <div className="text-muted mb-1">Email</div>
                            <div style={{ fontWeight: '500' }}>{user?.email}</div>
                        </div>
                        <div>
                            <div className="text-muted mb-1">Roles</div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {user?.roles?.map(role => (
                                    <span key={role.id} className="badge badge-info">
                                        {role.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted mb-1">MFA Status</div>
                            <span className={`badge ${user?.mfaEnabled ? 'badge-success' : 'badge-warning'}`}>
                                {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Activity - Admin/Auditor Only */}
            {hasAnyRole('admin', 'auditor') && (
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3>Recent Activity</h3>
                        <a href="/logs" className="btn btn-ghost btn-sm">View All →</a>
                    </div>

                    {loading ? (
                        <div className="flex justify-center" style={{ padding: '2rem' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : recentLogs.length > 0 ? (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Action</th>
                                        <th>User</th>
                                        <th>Resource</th>
                                        <th>IP Address</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentLogs.slice(0, 5).map((log) => (
                                        <tr key={log.id}>
                                            <td>
                                                <span className={`badge ${getActionBadge(log.action_type)}`}>
                                                    {log.action_type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td>{log.username || '-'}</td>
                                            <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {log.resource}
                                            </td>
                                            <td><code>{log.ip_address}</code></td>
                                            <td className="text-muted">{formatDate(log.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted text-center" style={{ padding: '2rem' }}>
                            No recent activity
                        </p>
                    )}
                </div>
            )}

            {/* Quick Actions */}
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h3 className="mb-4">Quick Actions</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <a href="/profile" className="btn btn-secondary">
                        👤 Edit Profile
                    </a>
                    {!user?.mfaEnabled && (
                        <a href="/mfa-setup" className="btn btn-primary">
                            🔑 Enable MFA
                        </a>
                    )}
                    {hasRole('admin') && (
                        <a href="/users" className="btn btn-secondary">
                            👥 Manage Users
                        </a>
                    )}
                    {hasAnyRole('admin', 'auditor') && (
                        <a href="/logs" className="btn btn-secondary">
                            📋 View Logs
                        </a>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default Dashboard;
