import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import PasswordInput from '../components/PasswordInput';
import { validateWhatsApp } from '../utils/validation';
import './LoginPage.css';

const LoginPage = () => {
    const { login } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        whatsapp: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [countryCode, setCountryCode] = useState('+91'); // Default to India

    // Common country codes (same as RegisterPage)
    const COUNTRY_CODES = [
        { code: '+91', country: 'IN', label: '🇮🇳 +91' },
        { code: '+1', country: 'US', label: '🇺🇸 +1' },
        { code: '+44', country: 'GB', label: '🇬🇧 +44' },
        { code: '+971', country: 'AE', label: '🇦🇪 +971' },
        { code: '+65', country: 'SG', label: '🇸🇬 +65' },
        { code: '+60', country: 'MY', label: '🇲🇾 +60' },
        { code: '+61', country: 'AU', label: '🇦🇺 +61' },
        { code: '+49', country: 'DE', label: '🇩🇪 +49' },
        { code: '+33', country: 'FR', label: '🇫🇷 +33' },
        { code: '+81', country: 'JP', label: '🇯🇵 +81' },
        { code: '+86', country: 'CN', label: '🇨🇳 +86' },
        { code: '+27', country: 'ZA', label: '🇿🇦 +27' },
        { code: '+234', country: 'NG', label: '🇳🇬 +234' },
        { code: '+254', country: 'KE', label: '🇰🇪 +254' },
        { code: '+966', country: 'SA', label: '🇸🇦 +966' },
        { code: '+974', country: 'QA', label: '🇶🇦 +974' },
        { code: '+968', country: 'OM', label: '🇴🇲 +968' },
        { code: '+973', country: 'BH', label: '🇧🇭 +973' },
        { code: '+965', country: 'KW', label: '🇰🇼 +965' },
        { code: '+94', country: 'LK', label: '🇱🇰 +94' },
        { code: '+977', country: 'NP', label: '🇳🇵 +977' },
        { code: '+880', country: 'BD', label: '🇧🇩 +880' },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        const whatsappValidation = validateWhatsApp(formData.whatsapp);
        if (!whatsappValidation.valid) newErrors.whatsapp = whatsappValidation.error;

        // Password validation can be less strict for login, just check if present
        if (!formData.password) newErrors.password = 'Password is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        try {
            // Look up email from WhatsApp number using Appwrite
            const rawNumber = formData.whatsapp.trim();
            const rawDigitsOnly = rawNumber.replace(/[^\d]/g, '');
            const fullNumber = countryCode + rawDigitsOnly; // e.g., +91 + 9043057101 = +919043057101

            console.log('Login attempt:', { countryCode, rawNumber, fullNumber, rawDigitsOnly }); // Debug log

            // Try multiple formats to find the user
            let userData = null;
            
            // Method 1: Try with full number (countryCode + number)
            let response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.USERS,
                [
                    Query.equal('whatsapp', fullNumber),
                    Query.limit(1)
                ]
            );
            console.log('Search with fullNumber:', fullNumber, 'Found:', response.documents.length);

            if (response.documents.length > 0) {
                userData = response.documents[0];
            }

            // Method 2: Try with raw number as entered
            if (!userData) {
                response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    [
                        Query.equal('whatsapp', rawNumber),
                        Query.limit(1)
                    ]
                );
                console.log('Search with rawNumber:', rawNumber, 'Found:', response.documents.length);
                if (response.documents.length > 0) {
                    userData = response.documents[0];
                }
            }

            // Method 3: Try with just digits
            if (!userData && rawDigitsOnly.length >= 10) {
                response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    [
                        Query.equal('whatsapp', rawDigitsOnly),
                        Query.limit(1)
                    ]
                );
                console.log('Search with rawDigitsOnly:', rawDigitsOnly, 'Found:', response.documents.length);
                if (response.documents.length > 0) {
                    userData = response.documents[0];
                }
            }

            // Method 4: Try with + prefix
            if (!userData) {
                const withPlus = '+' + rawDigitsOnly;
                response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    [
                        Query.equal('whatsapp', withPlus),
                        Query.limit(1)
                    ]
                );
                console.log('Search with +prefix:', withPlus, 'Found:', response.documents.length);
                if (response.documents.length > 0) {
                    userData = response.documents[0];
                }
            }

            if (!userData) {
                setLoading(false);
                error('No account found with this WhatsApp number. Please check the number or register first.');
                return;
            }

            console.log('Found user:', userData.email, userData.name, 'WhatsApp stored as:', userData.whatsapp); // Debug log

            // Check if user is active
            if (!userData.is_active) {
                setLoading(false);
                error('Your account has been disabled. Please contact admin.');
                return;
            }

            if (!userData.email) {
                setLoading(false);
                error('Account found but missing email. Please contact support.');
                return;
            }

            // Use found email for login
            const result = await login(userData.email, formData.password);

            setLoading(false);

            if (result.success) {
                success('Welcome back! Hari Om');
                navigate('/dashboard');
            } else {
                // More specific error message
                if (result.error.includes('Invalid credentials') || result.error.includes('Invalid password')) {
                    error('Incorrect password. Please try again.');
                } else {
                    error(result.error || 'Login failed. Please try again.');
                }
            }
        } catch (err) {
            setLoading(false);
            console.error('Login error:', err);
            error('Login failed. Please try again.');
        }
    };

    return (
        <div className="login-page page-enter">
            <div className="login-container">
                <Link to="/" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Home
                </Link>

                <div className="login-card">
                    <div className="login-header">
                        <div className="om-symbol">ॐ</div>
                        <h1>Welcome Back</h1>
                        <p>Continue your devotion</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
                        {/* WhatsApp Number */}
                        <div className="form-group">
                            <label className="form-label">WhatsApp Number</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="form-input"
                                    style={{ width: '100px', flexShrink: 0 }}
                                >
                                    {COUNTRY_CODES.map(cc => (
                                        <option key={cc.code} value={cc.code}>{cc.label}</option>
                                    ))}
                                </select>
                                <input
                                    type="tel"
                                    name="whatsapp"
                                    value={formData.whatsapp}
                                    onChange={handleChange}
                                    className={`form-input ${errors.whatsapp ? 'error' : ''}`}
                                    placeholder="9876543210"
                                    autoComplete="tel"
                                    style={{ flex: 1 }}
                                />
                            </div>
                            {errors.whatsapp && <span className="form-error">{errors.whatsapp}</span>}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <PasswordInput
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                error={errors.password}
                            />
                            {errors.password && <span className="form-error">{errors.password}</span>}
                            <div className="text-right mt-1">
                                <Link to="/forgot-password" style={{ fontSize: '0.9rem', color: 'var(--primary-color)', textDecoration: 'none' }}>
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="loader loader-sm"></span>
                                    Logging in...
                                </>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>

                    <div className="login-footer">
                        <p>
                            New devotee?{' '}
                            <Link to="/register">Create an account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
