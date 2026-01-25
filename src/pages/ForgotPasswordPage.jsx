import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { validateEmail } from '../utils/validation';
import './LoginPage.css';

const ForgotPasswordPage = () => {
    const { requestPasswordReset } = useAuth();
    const { success, error } = useToast();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [validationError, setValidationError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validation = validateEmail(email);
        if (!validation.valid) {
            setValidationError(validation.error);
            return;
        }
        setValidationError('');

        setLoading(true);
        const result = await requestPasswordReset(email.trim());
        setLoading(false);

        if (result.success) {
            setEmailSent(true);
            success('Reset instructions sent to your email.');
        } else {
            error(result.error || 'Failed to request password reset.');
        }
    };

    return (
        <div className="login-page page-enter">
            <div className="login-container">
                <Link to="/login" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Login
                </Link>

                <div className="login-card">
                    <div className="login-header">
                        <div className="om-symbol">ॐ</div>
                        <h1>Forgot Password</h1>
                        <p>{emailSent ? 'Check your email' : 'Enter your email to reset password'}</p>
                    </div>

                    {!emailSent ? (
                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`form-input ${validationError ? 'error' : ''}`}
                                    placeholder="Enter your registered email"
                                />
                                {validationError && <span className="form-error">{validationError}</span>}
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg w-full"
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Send Reset Instructions'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <div className="mb-4" style={{ color: 'var(--success-color)', fontSize: '3rem' }}>✓</div>
                            <p className="mb-4">
                                instructions have been sent to <strong>{email}</strong>
                            </p>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Please click the link in that email to set a new password. If you don't see it, check your spam folder.
                            </p>
                            <button
                                onClick={() => setEmailSent(false)}
                                className="btn btn-link mt-4"
                            >
                                Try another email
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
