import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [actionTypes, setActionTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Filters
    const [filters, setFilters] = useState({
        actionType: '',
        startDate: '',
        endDate: '',
        search: '',
        success: ''
    });

    useEffect(() => {
        fetchLogs();
        fetchActionTypes();
    }, [page, filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 25,
                ...(filters.actionType && { actionType: filters.actionType }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
                ...(filters.search && { search: filters.search }),
                ...(filters.success !== '' && { success: filters.success })
            });

            const res = await fetch(`/api/logs?${params}`, { credentials: 'include' });
            const data = await res.json();

            if (data.success) {
                setLogs(data.data.logs);
                setTotal(data.data.total);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActionTypes = async () => {
        try {
            const res = await fetch('/api/logs/action-types', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setActionTypes(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch action types:', err);
        }
    };

    const handleExport = async (format) => {
        try {
            const params = new URLSearchParams({
                format,
                ...(filters.actionType && { actionType: filters.actionType }),
                ...(filters.startDate && { startDate: filters.startDate }),
                ...(filters.endDate && { endDate: filters.endDate }),
                ...(filters.search && { search: filters.search }),
                ...(filters.success !== '' && { success: filters.success })
            });

            const res = await fetch(`/api/logs/export?${params}`, { credentials: 'include' });

            if (!res.ok) throw new Error('Export failed');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_logs.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({
            actionType: '',
            startDate: '',
            endDate: '',
            search: '',
            success: ''
        });
        setPage(1);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getActionBadge = (action, success) => {
        if (!success) return 'badge-danger';

        const badges = {
            'LOGIN_SUCCESS': 'badge-success',
            'LOGIN_FAILURE': 'badge-danger',
            'LOGOUT': 'badge-info',
            'MFA_VERIFY_SUCCESS': 'badge-success',
            'MFA_VERIFY_FAILURE': 'badge-danger',
            'MFA_ENABLED': 'badge-success',
            'MFA_DISABLED': 'badge-warning',
            'USER_CREATED': 'badge-info',
            'USER_UPDATED': 'badge-info',
            'USER_DELETED': 'badge-danger',
            'ROLE_ASSIGNED': 'badge-info',
            'ROLE_REVOKED': 'badge-warning',
            'LOGS_VIEWED': 'badge-info',
            'LOGS_EXPORTED': 'badge-info'
        };
        return badges[action] || 'badge-info';
    };

    return (
        <Layout>
            <div className="page-header">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="page-title">Audit Logs</h1>
                        <p className="page-subtitle">View and export system activity logs</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => handleExport('csv')}>
                            📄 Export CSV
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleExport('json')}>
                            📋 Export JSON
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Search</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Search logs..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Action Type</label>
                        <select
                            className="input"
                            value={filters.actionType}
                            onChange={(e) => handleFilterChange('actionType', e.target.value)}
                        >
                            <option value="">All actions</option>
                            {actionTypes.map(type => (
                                <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Status</label>
                        <select
                            className="input"
                            value={filters.success}
                            onChange={(e) => handleFilterChange('success', e.target.value)}
                        >
                            <option value="">All</option>
                            <option value="true">Success</option>
                            <option value="false">Failed</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Start Date</label>
                        <input
                            type="date"
                            className="input"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>End Date</label>
                        <input
                            type="date"
                            className="input"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>&nbsp;</label>
                        <button className="btn btn-ghost w-full" onClick={clearFilters}>
                            Clear Filters
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs Table */}
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
                                        <th>Timestamp</th>
                                        <th>Action</th>
                                        <th>User</th>
                                        <th>Resource</th>
                                        <th>IP Address</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td>
                                                <span className={`badge ${getActionBadge(log.action_type, log.success)}`}>
                                                    {log.action_type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td>{log.username || '-'}</td>
                                            <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.resource || '-'}
                                            </td>
                                            <td>
                                                <code style={{ fontSize: '0.75rem' }}>{log.ip_address || '-'}</code>
                                            </td>
                                            <td>
                                                {log.success ? (
                                                    <span className="text-success">✓</span>
                                                ) : (
                                                    <span className="text-danger" title={log.error_message}>✗</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {logs.length === 0 && (
                            <p className="text-muted text-center" style={{ padding: '2rem' }}>
                                No logs found matching your filters
                            </p>
                        )}

                        {/* Pagination */}
                        <div className="flex justify-between items-center" style={{ marginTop: '1rem', padding: '0 1rem' }}>
                            <span className="text-muted">
                                Showing {logs.length} of {total} logs
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
                                    disabled={logs.length < 25}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Logs;
