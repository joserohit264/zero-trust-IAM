import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await login(username, password);

            if (result.requiresMfa) {
                navigate('/mfa-verify');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Logo and Header */}
                <div className="login-header">
                    <div className="login-logo">
                        <div className="login-logo-icon">🔐</div>
                    </div>
                    <h1 className="login-title">IAM System</h1>
                    <p className="login-subtitle">Identity & Access Management</p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="alert alert-danger">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            className="input"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoComplete="username"
                            autoFocus
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Demo Credentials */}
                <div className="login-demo">
                    <p className="demo-title">Demo Credentials</p>
                    <div className="demo-credentials">
                        <div className="demo-item">
                            <span className="demo-role">Admin:</span>
                            <code>admin / Admin123!</code>
                        </div>
                        <div className="demo-item">
                            <span className="demo-role">User:</span>
                            <code>testuser / User123!</code>
                        </div>
                        <div className="demo-item">
                            <span className="demo-role">Auditor:</span>
                            <code>auditor / Auditor123!</code>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p>Enterprise-grade security with RBAC & MFA</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
