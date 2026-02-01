import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const Profile = () => {
    const { user, checkAuth } = useAuth();
    const [editing, setEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            setSuccess('Profile updated successfully');
            setEditing(false);
            checkAuth(); // Refresh user data
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/profile/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            setSuccess('Password changed successfully. Please login again.');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return dateString ? new Date(dateString).toLocaleString() : 'Never';
    };

    return (
        <Layout>
            <div className="page-header">
                <h1 className="page-title">Profile Settings</h1>
                <p className="page-subtitle">Manage your account information and security settings</p>
            </div>

            {/* Messages */}
            {error && <div className="alert alert-danger mb-4"><span>⚠️</span> {error}</div>}
            {success && <div className="alert alert-success mb-4"><span>✓</span> {success}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Profile Information */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h3>Profile Information</h3>
                        {!editing && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                                ✏️ Edit
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <form onSubmit={handleProfileUpdate}>
                            <div className="flex flex-col gap-4">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="input-group">
                                        <label>First Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        />
                                    </div>
                                    <div className="input-group">
                                        <label>Last Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        className="input"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>Username</div>
                                <div style={{ fontWeight: '500' }}>{user?.username}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>Full Name</div>
                                <div style={{ fontWeight: '500' }}>{user?.firstName} {user?.lastName}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>Email</div>
                                <div style={{ fontWeight: '500' }}>{user?.email}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>Roles</div>
                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                                    {user?.roles?.map(role => (
                                        <span key={role.id} className="badge badge-info">
                                            {role.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>Last Login</div>
                                <div style={{ fontWeight: '500' }}>{formatDate(user?.lastLogin)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Security Settings */}
                <div className="card">
                    <h3 className="mb-4">Security</h3>

                    {/* MFA Status */}
                    <div style={{
                        padding: '1rem',
                        background: 'var(--bg-glass)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '1.5rem'
                    }}>
                        <div className="flex justify-between items-center">
                            <div>
                                <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                                    Multi-Factor Authentication
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                    {user?.mfaEnabled
                                        ? 'Your account is protected with MFA'
                                        : 'Add an extra layer of security to your account'
                                    }
                                </div>
                            </div>
                            <span className={`badge ${user?.mfaEnabled ? 'badge-success' : 'badge-warning'}`}>
                                {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        {!user?.mfaEnabled && (
                            <a href="/mfa-setup" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                                🔑 Enable MFA
                            </a>
                        )}
                    </div>

                    {/* Change Password */}
                    <h4 className="mb-3">Change Password</h4>
                    <form onSubmit={handlePasswordChange}>
                        <div className="flex flex-col gap-3">
                            <div className="input-group">
                                <label>Current Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>New Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    required
                                    placeholder="Min 8 chars, uppercase, number, special char"
                                />
                            </div>
                            <div className="input-group">
                                <label>Confirm New Password</label>
                                <input
                                    type="password"
                                    className="input"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default Profile;
