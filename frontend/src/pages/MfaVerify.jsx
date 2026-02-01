import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const MfaVerify = () => {
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { verifyMfa } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await verifyMfa(token);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTokenChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setToken(value);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                {/* Logo and Header */}
                <div className="login-header">
                    <div className="login-logo">
                        <div className="login-logo-icon">🔑</div>
                    </div>
                    <h1 className="login-title">Verify Identity</h1>
                    <p className="login-subtitle">Enter the code from your authenticator app</p>
                </div>

                {/* MFA Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {error && (
                        <div className="alert alert-danger">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <div className="input-group">
                        <label htmlFor="token">Verification Code</label>
                        <input
                            id="token"
                            type="text"
                            className="input"
                            placeholder="000000"
                            value={token}
                            onChange={handleTokenChange}
                            required
                            autoFocus
                            style={{
                                textAlign: 'center',
                                fontSize: '1.5rem',
                                letterSpacing: '0.5rem',
                                fontFamily: 'monospace'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-full"
                        disabled={loading || token.length !== 6}
                    >
                        {loading ? (
                            <>
                                <div className="spinner"></div>
                                Verifying...
                            </>
                        ) : (
                            'Verify Code'
                        )}
                    </button>
                </form>

                {/* Help Text */}
                <div className="login-footer">
                    <p>Open your authenticator app (Google Authenticator, Microsoft Authenticator, or Authy) and enter the 6-digit code.</p>
                </div>
            </div>
        </div>
    );
};

export default MfaVerify;
