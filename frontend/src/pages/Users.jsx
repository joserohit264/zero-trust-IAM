import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form state for new/edit user
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        roleId: ''
    });

    useEffect(() => {
        fetchUsers();
        fetchRoles();
    }, [page, search]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?page=${page}&limit=10&search=${search}`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.data.users);
                setTotal(data.data.total);
            }
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const fetchRoles = async () => {
        try {
            const res = await fetch('/api/roles', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setRoles(data.data);
            }
        } catch (err) {
            console.error('Failed to load roles');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
            const method = editingUser ? 'PATCH' : 'POST';

            const body = editingUser
                ? { email: formData.email, firstName: formData.firstName, lastName: formData.lastName }
                : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            setSuccess(editingUser ? 'User updated successfully' : 'User created successfully');
            setShowModal(false);
            resetForm();
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (userId, username) => {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;

        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            setSuccess('User deleted successfully');
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        try {
            const res = await fetch(`/api/users/${userId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ active: !currentStatus })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            setSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDisableMfa = async (userId, username) => {
        if (!confirm(`Disable MFA for user "${username}"?`)) return;

        try {
            const res = await fetch(`/api/users/${userId}/mfa`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ enabled: false })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            setSuccess('MFA disabled successfully');
            fetchUsers();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '',
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            roleId: user.roles[0]?.id || ''
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            roleId: ''
        });
        setEditingUser(null);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <Layout>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">User Management</h1>
                        <p className="page-subtitle">Create, edit, and manage user accounts</p>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => { resetForm(); setShowModal(true); }}
                    >
                        + Create User
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && <div className="alert alert-danger mb-4"><span>⚠️</span> {error}</div>}
            {success && <div className="alert alert-success mb-4"><span>✓</span> {success}</div>}

            {/* Search */}
            <div className="card mb-6">
                <input
                    type="text"
                    className="input"
                    placeholder="Search users by username, email, or name..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
            </div>

            {/* Users Table */}
            <div className="card">
                {loading ? (
                    <div className="flex justify-center" style={{ padding: '3rem' }}>
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Roles</th>
                                        <th>MFA</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div>
                                                    <div style={{ fontWeight: '500' }}>
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '0.8125rem' }}>
                                                        @{user.username} · {user.email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                                    {user.roles.map(role => (
                                                        <span key={role.id} className="badge badge-info">
                                                            {role.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.mfa_enabled ? 'badge-success' : 'badge-warning'}`}>
                                                    {user.mfa_enabled ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="text-muted">{formatDate(user.created_at)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => openEditModal(user)}
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                                                        title={user.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        {user.is_active ? '🚫' : '✅'}
                                                    </button>
                                                    {user.mfa_enabled && (
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleDisableMfa(user.id, user.username)}
                                                            title="Disable MFA"
                                                        >
                                                            🔓
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-ghost btn-sm text-danger"
                                                        onClick={() => handleDelete(user.id, user.username)}
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex justify-between items-center" style={{ marginTop: '1rem', padding: '0 1rem' }}>
                            <span className="text-muted">
                                Showing {users.length} of {total} users
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    Previous
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={users.length < 10}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {editingUser ? 'Edit User' : 'Create User'}
                            </h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="flex flex-col gap-4">
                                    {!editingUser && (
                                        <div className="input-group">
                                            <label>Username</label>
                                            <input
                                                type="text"
                                                className="input"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className="input-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            className="input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>

                                    {!editingUser && (
                                        <div className="input-group">
                                            <label>Password</label>
                                            <input
                                                type="password"
                                                className="input"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                                placeholder="Min 8 chars, uppercase, number, special char"
                                            />
                                        </div>
                                    )}

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

                                    {!editingUser && (
                                        <div className="input-group">
                                            <label>Role</label>
                                            <select
                                                className="input"
                                                value={formData.roleId}
                                                onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                                            >
                                                <option value="">Select role...</option>
                                                {roles.map(role => (
                                                    <option key={role.id} value={role.id}>{role.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingUser ? 'Save Changes' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Users;
