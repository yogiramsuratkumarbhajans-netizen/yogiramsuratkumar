import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { account } from '../appwriteClient';
import PasswordInput from '../components/PasswordInput';
import { validatePassword, validatePasswordMatch } from '../utils/validation';
import './LoginPage.css';

const ResetPasswordPage = () => {
    const { updatePassword } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Session state
    const [sessionUser, setSessionUser] = useState(null);
    const [checkingSession, setCheckingSession] = useState(true);
    const [errorDescription, setErrorDescription] = useState('');

    // Safety flag to prevent double success
    const successTriggered = useRef(false);

    // Get userId and secret from URL params (Appwrite format)
    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    const handleSuccess = () => {
        if (successTriggered.current) return;
        successTriggered.current = true;
        setLoading(false);
        success('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
            navigate('/login');
        }, 1500);
    };

    // Check if we have valid recovery params from Appwrite
    useEffect(() => {
        console.log('RESET_PAGE: Initialization started...');
        console.log('RESET_PAGE: userId:', userId, 'secret:', secret ? '[present]' : '[missing]');

        // Check for explicit error in URL
        const errorParam = searchParams.get('error');
        if (errorParam) {
            const errorDesc = searchParams.get('error_description') || 'Invalid or expired link';
            console.log('RESET_PAGE: URL error detected:', errorDesc);
            setErrorDescription(errorDesc.replace(/\+/g, ' '));
            setCheckingSession(false);
            return;
        }

        // Appwrite recovery links have userId and secret params
        if (userId && secret) {
            console.log('RESET_PAGE: Recovery params found, proceeding...');
            // We have what we need to complete the recovery
            setSessionUser({ id: userId });
            setCheckingSession(false);
            return;
        }

        // Try to check if user is already logged in
        const checkSession = async () => {
            try {
                console.log('RESET_PAGE: Checking existing session...');
                const user = await account.get();
                if (user) {
                    console.log('RESET_PAGE: Found logged-in user');
                    setSessionUser(user);
                }
            } catch (err) {
                console.log('RESET_PAGE: No active session found');
                // If no userId/secret and no session, link is invalid
                if (!userId || !secret) {
                    setErrorDescription('Invalid password reset link. Please request a new one.');
                }
            } finally {
                setCheckingSession(false);
            }
        };

        checkSession();
    }, [userId, secret, searchParams]);

    const handleChange = (e) => {
        if (e.target.name === 'password') setPassword(e.target.value);
        if (e.target.name === 'confirmPassword') setConfirmPassword(e.target.value);

        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) newErrors.password = passwordValidation.error;

        const matchValidation = validatePasswordMatch(password, confirmPassword);
        if (!matchValidation.valid) newErrors.confirmPassword = matchValidation.error;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log('RESET_PAGE: handleSubmit triggered');

        if (!sessionUser && (!userId || !secret)) {
            console.error('RESET_PAGE: No session or recovery params during submit');
            error('Session expired or invalid. Please request a new link.');
            navigate('/forgot-password');
            return;
        }

        if (!validate()) {
            console.log('RESET_PAGE: Validation failed');
            return;
        }

        setLoading(true);
        console.log('RESET_PAGE: Starting updatePassword process...');

        try {
            // Use the updatePassword from AuthContext which handles both cases
            const result = await updatePassword(password, userId, secret);
            console.log('RESET_PAGE: updatePassword result:', result);

            if (result.success) {
                console.log('RESET_PAGE: Password update success returned');
                handleSuccess();
            } else {
                console.error('RESET_PAGE: Password update error returned:', result.error);
                setLoading(false);
                error(result.error || 'Failed to update password.');
            }
        } catch (err) {
            console.error('RESET_PAGE: Submission exception:', err);
            setLoading(false);
            error('An unforeseen error occurred. Please try again.');
        }
    };

    if (checkingSession) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-card text-center py-5">
                        <span className="loader loader-sm mb-3"></span>
                        <p>Verifying recovery session...</p>
                        <p style={{ fontSize: '12px', color: '#888', marginTop: '10px' }}>
                            Validating your password reset link...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!sessionUser && (!userId || !secret)) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <div className="login-card">
                        <div className="login-header">
                            <div className="om-symbol">ॐ</div>
                            <h1>Link Expired</h1>
                            <p className="text-danger">
                                {errorDescription || 'This password reset link is invalid or has already been used.'}
                            </p>
                            <button onClick={() => navigate('/forgot-password')} className="btn btn-primary mt-4 w-full">
                                Request New Link
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page page-enter">
            <div className="login-container">
                <div className="login-card">
                    <div className="login-header">
                        <div className="om-symbol">ॐ</div>
                        <h1>Set New Password</h1>
                        <p style={{ fontSize: '0.9rem', color: 'var(--primary-color)' }}>
                            Enter your new password below
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <PasswordInput
                                name="password"
                                value={password}
                                onChange={handleChange}
                                placeholder="Enter new password"
                                error={errors.password}
                            />
                            {errors.password && <span className="form-error">{errors.password}</span>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm Password</label>
                            <PasswordInput
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm new password"
                                error={errors.confirmPassword}
                            />
                            {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="loader loader-sm mr-2"></span>
                                    Saving...
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
