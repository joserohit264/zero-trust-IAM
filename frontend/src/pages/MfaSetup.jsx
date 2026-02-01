import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const MfaSetup = () => {
    const { user, checkAuth } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const startSetup = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/mfa/setup', {
                credentials: 'include'
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            setQrCode(data.data.qrCode);
            setSecret(data.data.secret);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const enableMfa = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/mfa/enable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message);
            }

            await checkAuth();
            setStep(3);
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

    if (user?.mfaEnabled) {
        return (
            <Layout>
                <div className="page-header">
                    <h1 className="page-title">MFA Already Enabled</h1>
                    <p className="page-subtitle">Multi-factor authentication is already active on your account.</p>
                </div>
                <div className="card">
                    <div className="alert alert-success">
                        <span>✓</span>
                        Your account is protected with multi-factor authentication.
                    </div>
                    <a href="/profile" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Go to Profile
                    </a>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-header">
                <h1 className="page-title">Enable Multi-Factor Authentication</h1>
                <p className="page-subtitle">Add an extra layer of security to your account</p>
            </div>

            {error && <div className="alert alert-danger mb-4"><span>⚠️</span> {error}</div>}

            <div className="card" style={{ maxWidth: '600px' }}>
                {/* Step 1: Introduction */}
                {step === 1 && (
                    <div>
                        <h3 className="mb-4">Why enable MFA?</h3>
                        <ul style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
                            <li style={{ marginBottom: '0.5rem' }}>Protects against unauthorized access even if your password is compromised</li>
                            <li style={{ marginBottom: '0.5rem' }}>Uses time-based one-time passwords (TOTP) for verification</li>
                            <li style={{ marginBottom: '0.5rem' }}>Compatible with Google Authenticator, Microsoft Authenticator, Authy, and more</li>
                            <li>Industry standard security measure used by enterprises worldwide</li>
                        </ul>

                        <div className="alert alert-info mb-4">
                            <span>ℹ️</span>
                            <div>
                                <strong>Before you begin:</strong>
                                <p style={{ marginTop: '0.25rem', marginBottom: 0 }}>
                                    Make sure you have an authenticator app installed on your phone.
                                </p>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-lg w-full"
                            onClick={startSetup}
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Start Setup →'}
                        </button>
                    </div>
                )}

                {/* Step 2: QR Code Scan */}
                {step === 2 && (
                    <div>
                        <h3 className="mb-4">Scan QR Code</h3>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            padding: '2rem',
                            marginBottom: '1.5rem',
                            background: 'white',
                            borderRadius: 'var(--radius-lg)'
                        }}>
                            <img src={qrCode} alt="MFA QR Code" style={{ maxWidth: '200px' }} />
                        </div>

                        <div className="alert alert-info mb-4">
                            <span>📱</span>
                            <div>
                                <strong>How to scan:</strong>
                                <ol style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1rem' }}>
                                    <li>Open your authenticator app</li>
                                    <li>Tap "+" or "Add account"</li>
                                    <li>Select "Scan QR code"</li>
                                    <li>Point your camera at the code above</li>
                                </ol>
                            </div>
                        </div>

                        <details style={{ marginBottom: '1.5rem' }}>
                            <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                Can't scan? Enter code manually
                            </summary>
                            <div style={{
                                marginTop: '1rem',
                                padding: '1rem',
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                <code style={{
                                    fontSize: '1rem',
                                    letterSpacing: '0.1rem',
                                    wordBreak: 'break-all'
                                }}>
                                    {secret}
                                </code>
                            </div>
                        </details>

                        <form onSubmit={enableMfa}>
                            <div className="input-group mb-4">
                                <label>Enter the 6-digit code from your app</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="000000"
                                    value={token}
                                    onChange={handleTokenChange}
                                    required
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
                                {loading ? 'Verifying...' : 'Verify & Enable MFA'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="text-center">
                        <div style={{
                            fontSize: '4rem',
                            marginBottom: '1rem',
                            animation: 'float 3s ease-in-out infinite'
                        }}>
                            ✅
                        </div>
                        <h3 className="mb-2">MFA Enabled Successfully!</h3>
                        <p className="text-muted mb-4">
                            Your account is now protected with multi-factor authentication.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/dashboard')}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default MfaSetup;
