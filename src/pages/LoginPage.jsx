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
    const [loginMethod, setLoginMethod] = useState('whatsapp'); // 'whatsapp' or 'email'

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

        if (loginMethod === 'whatsapp') {
            const whatsappValidation = validateWhatsApp(formData.whatsapp);
            if (!whatsappValidation.valid) newErrors.whatsapp = whatsappValidation.error;
        } else {
            // Email validation
            if (!formData.whatsapp.trim()) {
                newErrors.whatsapp = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.whatsapp.trim())) {
                newErrors.whatsapp = 'Please enter a valid email address';
            }
        }

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
            let userData = null;
            
            // If login method is email, search directly by email
            if (loginMethod === 'email') {
                const emailInput = formData.whatsapp.trim().toLowerCase();
                console.log('Login with email:', emailInput);
                
                try {
                    const response = await databases.listDocuments(
                        DATABASE_ID,
                        COLLECTIONS.USERS,
                        [
                            Query.equal('email', emailInput),
                            Query.limit(1)
                        ]
                    );
                    
                    if (response.documents.length > 0) {
                        userData = response.documents[0];
                        console.log('Found user by email:', userData.email);
                    }
                } catch (emailErr) {
                    console.error('Email search error:', emailErr);
                }
                
                if (!userData) {
                    setLoading(false);
                    error('No account found with this email address.');
                    return;
                }
            } else {
                // WhatsApp login - existing logic
            // Look up email from WhatsApp number using Appwrite
            const rawNumber = formData.whatsapp.trim();
            // Remove all non-digit characters except +
            const cleanedNumber = rawNumber.replace(/[^\d+]/g, '');
            // Get only digits (no + sign)
            const rawDigitsOnly = rawNumber.replace(/[^\d]/g, '');
            
            // Get country code digits without +
            const countryCodeDigits = countryCode.replace(/[^\d]/g, '');
            
            // Build full number with country code
            const fullNumber = countryCode + rawDigitsOnly; // e.g., +91 + 9043057101 = +919043057101
            const fullNumberNoPlus = countryCodeDigits + rawDigitsOnly; // e.g., 919043057101
            
            // Also try if user already included country code in their input
            const inputHasCountryCode = rawDigitsOnly.startsWith(countryCodeDigits);
            const numberWithoutInputCountryCode = inputHasCountryCode ? rawDigitsOnly.substring(countryCodeDigits.length) : rawDigitsOnly;

            console.log('Login attempt:', { 
                countryCode, 
                rawNumber, 
                fullNumber, 
                fullNumberNoPlus,
                rawDigitsOnly,
                inputHasCountryCode,
                numberWithoutInputCountryCode
            });

            // Generate all possible number formats to search
            const searchFormats = [
                fullNumber,                                    // +919043057101
                fullNumberNoPlus,                              // 919043057101
                rawDigitsOnly,                                 // 9043057101 (or full if user entered it)
                '+' + rawDigitsOnly,                           // +9043057101
                rawNumber,                                     // as entered
                cleanedNumber,                                 // cleaned version
                countryCode + numberWithoutInputCountryCode,   // +91 + number without duplicate country code
                countryCodeDigits + numberWithoutInputCountryCode, // 91 + number without duplicate country code
                numberWithoutInputCountryCode,                 // just the local number
                '+' + numberWithoutInputCountryCode,           // +local number
            ];

            // Remove duplicates
            const uniqueFormats = [...new Set(searchFormats.filter(f => f && f.length >= 10))];
            console.log('Searching with formats:', uniqueFormats);
            
            for (const searchFormat of uniqueFormats) {
                if (userData) break;
                
                try {
                    const response = await databases.listDocuments(
                        DATABASE_ID,
                        COLLECTIONS.USERS,
                        [
                            Query.equal('whatsapp', searchFormat),
                            Query.limit(1)
                        ]
                    );
                    console.log('Search with:', searchFormat, 'Found:', response.documents.length);
                    
                    if (response.documents.length > 0) {
                        userData = response.documents[0];
                        console.log('Found user with format:', searchFormat, 'Stored whatsapp:', userData.whatsapp);
                    }
                } catch (searchErr) {
                    console.warn('Search error for format:', searchFormat, searchErr.message);
                }
            }

            // If still not found, try a broader search approach - get last 10 digits and search
            if (!userData && rawDigitsOnly.length >= 10) {
                const last10Digits = rawDigitsOnly.slice(-10);
                console.log('Trying broader search with last 10 digits:', last10Digits);
                
                // Try searching with common patterns using last 10 digits
                const broadSearchFormats = [
                    last10Digits,
                    '+91' + last10Digits,
                    '91' + last10Digits,
                    '+' + last10Digits,
                ];
                
                for (const searchFormat of broadSearchFormats) {
                    if (userData) break;
                    
                    try {
                        const response = await databases.listDocuments(
                            DATABASE_ID,
                            COLLECTIONS.USERS,
                            [
                                Query.equal('whatsapp', searchFormat),
                                Query.limit(1)
                            ]
                        );
                        console.log('Broad search with:', searchFormat, 'Found:', response.documents.length);
                        
                        if (response.documents.length > 0) {
                            userData = response.documents[0];
                            console.log('Found user with broad format:', searchFormat, 'Stored whatsapp:', userData.whatsapp);
                        }
                    } catch (searchErr) {
                        console.warn('Broad search error:', searchErr.message);
                    }
                }
            }

            // If still not found, try searching with partial matches for corrupted data
            // Some old records have truncated phone numbers due to a bug
            if (!userData && rawDigitsOnly.length >= 6) {
                console.log('Trying partial match search for corrupted phone numbers...');
                
                // Get the last 6-8 digits which might be in the corrupted record
                const suffixesToTry = [
                    rawDigitsOnly.slice(-6),  // Last 6 digits
                    rawDigitsOnly.slice(-7),  // Last 7 digits
                    rawDigitsOnly.slice(-8),  // Last 8 digits
                ];
                
                // Also try with country code prefixes
                const partialFormats = [];
                for (const suffix of suffixesToTry) {
                    partialFormats.push('+91' + suffix);
                    partialFormats.push('+1' + suffix);
                    partialFormats.push('+44' + suffix);
                    partialFormats.push(suffix);
                }
                
                const uniquePartialFormats = [...new Set(partialFormats)];
                console.log('Trying partial formats:', uniquePartialFormats);
                
                for (const searchFormat of uniquePartialFormats) {
                    if (userData) break;
                    
                    try {
                        const response = await databases.listDocuments(
                            DATABASE_ID,
                            COLLECTIONS.USERS,
                            [
                                Query.equal('whatsapp', searchFormat),
                                Query.limit(1)
                            ]
                        );
                        
                        if (response.documents.length > 0) {
                            userData = response.documents[0];
                            console.log('Found user with partial format:', searchFormat, 'Stored whatsapp:', userData.whatsapp);
                        }
                    } catch (searchErr) {
                        // Continue to next format
                    }
                }
            }
            
            // Last resort: Try to find by email pattern if user's phone contains enough digits
            if (!userData && rawDigitsOnly.length >= 10) {
                console.log('Trying email-based search as last resort...');
                try {
                    // Try common email patterns with the phone number
                    const emailPatterns = [
                        rawDigitsOnly + '@',
                        rawDigitsOnly.slice(-10) + '@',
                    ];
                    
                    for (const emailPattern of emailPatterns) {
                        if (userData) break;
                        
                        const response = await databases.listDocuments(
                            DATABASE_ID,
                            COLLECTIONS.USERS,
                            [
                                Query.startsWith('email', emailPattern),
                                Query.limit(1)
                            ]
                        );
                        
                        if (response.documents.length > 0) {
                            userData = response.documents[0];
                            console.log('Found user by email pattern:', emailPattern);
                        }
                    }
                } catch (emailErr) {
                    console.warn('Email pattern search failed:', emailErr.message);
                }
            }

            if (!userData) {
                setLoading(false);
                error('No account found with this WhatsApp number. Please check the number or register first.');
                return;
            }
            } // End of WhatsApp login else block

            console.log('Found user:', userData.email, userData.name, 'WhatsApp stored as:', userData?.whatsapp); // Debug log

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
                        {/* Login Method Toggle */}
                        <div className="form-group">
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                <button
                                    type="button"
                                    onClick={() => { setLoginMethod('whatsapp'); setFormData(prev => ({ ...prev, whatsapp: '' })); setErrors({}); }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: loginMethod === 'whatsapp' ? '2px solid var(--primary-color)' : '1px solid #ddd',
                                        borderRadius: '8px',
                                        background: loginMethod === 'whatsapp' ? 'var(--primary-light)' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: loginMethod === 'whatsapp' ? 'bold' : 'normal'
                                    }}
                                >
                                    📱 WhatsApp
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setLoginMethod('email'); setFormData(prev => ({ ...prev, whatsapp: '' })); setErrors({}); }}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        border: loginMethod === 'email' ? '2px solid var(--primary-color)' : '1px solid #ddd',
                                        borderRadius: '8px',
                                        background: loginMethod === 'email' ? 'var(--primary-light)' : 'white',
                                        cursor: 'pointer',
                                        fontWeight: loginMethod === 'email' ? 'bold' : 'normal'
                                    }}
                                >
                                    ✉️ Email
                                </button>
                            </div>
                        </div>

                        {/* WhatsApp Number or Email */}
                        <div className="form-group">
                            <label className="form-label">{loginMethod === 'whatsapp' ? 'WhatsApp Number' : 'Email Address'}</label>
                            {loginMethod === 'whatsapp' ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={countryCode}
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className="form-input"
                                        style={{ width: '120px', flexShrink: 0 }}
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
                            ) : (
                                <input
                                    type="email"
                                    name="whatsapp"
                                    value={formData.whatsapp}
                                    onChange={handleChange}
                                    className={`form-input ${errors.whatsapp ? 'error' : ''}`}
                                    placeholder="your.email@example.com"
                                    autoComplete="email"
                                />
                            )}
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
