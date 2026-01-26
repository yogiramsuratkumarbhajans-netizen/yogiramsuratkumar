import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getActiveNamaAccounts } from '../services/namaService';
import PasswordInput from '../components/PasswordInput';
import { validateName, validatePhone, validateEmail, validatePassword, validatePasswordMatch, formatPhoneNumber, formatName, validateLocation } from '../utils/validation';
import './RegisterPage.css';

const RegisterPage = () => {
    const { register } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        whatsapp: '',
        email: '',
        password: '',
        confirmPassword: '',
        city: '',
        state: '',
        country: ''
    });
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [namaAccounts, setNamaAccounts] = useState([]);
    const [selectedAccounts, setSelectedAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [accountsLoading, setAccountsLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [countryCode, setCountryCode] = useState('+91'); // Default to India

    // Common country codes
    const COUNTRY_CODES = [
        { code: '+91', country: 'IN', label: '🇮🇳 India (+91)' },
        { code: '+1', country: 'US', label: '🇺🇸 USA (+1)' },
        { code: '+44', country: 'GB', label: '🇬🇧 UK (+44)' },
        { code: '+971', country: 'AE', label: '🇦🇪 UAE (+971)' },
        { code: '+65', country: 'SG', label: '🇸🇬 Singapore (+65)' },
        { code: '+60', country: 'MY', label: '🇲🇾 Malaysia (+60)' },
        { code: '+61', country: 'AU', label: '🇦🇺 Australia (+61)' },
        { code: '+49', country: 'DE', label: '🇩🇪 Germany (+49)' },
        { code: '+33', country: 'FR', label: '🇫🇷 France (+33)' },
        { code: '+81', country: 'JP', label: '🇯🇵 Japan (+81)' },
        { code: '+86', country: 'CN', label: '🇨🇳 China (+86)' },
        { code: '+27', country: 'ZA', label: '🇿🇦 South Africa (+27)' },
        { code: '+234', country: 'NG', label: '🇳🇬 Nigeria (+234)' },
        { code: '+254', country: 'KE', label: '🇰🇪 Kenya (+254)' },
        { code: '+966', country: 'SA', label: '🇸🇦 Saudi Arabia (+966)' },
        { code: '+974', country: 'QA', label: '🇶🇦 Qatar (+974)' },
        { code: '+968', country: 'OM', label: '🇴🇲 Oman (+968)' },
        { code: '+973', country: 'BH', label: '🇧🇭 Bahrain (+973)' },
        { code: '+965', country: 'KW', label: '🇰🇼 Kuwait (+965)' },
        { code: '+94', country: 'LK', label: '🇱🇰 Sri Lanka (+94)' },
        { code: '+977', country: 'NP', label: '🇳🇵 Nepal (+977)' },
        { code: '+880', country: 'BD', label: '🇧🇩 Bangladesh (+880)' },
    ];

    useEffect(() => {
        loadNamaAccounts();
    }, []);

    const loadNamaAccounts = async () => {
        try {
            const accounts = await getActiveNamaAccounts();
            setNamaAccounts(accounts);
        } catch (err) {
            console.error('Error loading accounts:', err);
        } finally {
            setAccountsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        // Format input based on field type
        if (name === 'name') {
            formattedValue = formatName(value);
        } else if (name === 'whatsapp') {
            formattedValue = formatPhoneNumber(value);
        }

        setFormData(prev => ({ ...prev, [name]: formattedValue }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                error('Photo size must be less than 2MB');
                return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
                error('Please select an image file');
                return;
            }

            setProfilePhoto(file);

            // Create preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const removePhoto = () => {
        setProfilePhoto(null);
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAccountToggle = (accountId) => {
        setSelectedAccounts(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    };

    const validate = () => {
        const newErrors = {};

        const nameValidation = validateName(formData.name);
        if (!nameValidation.valid) newErrors.name = nameValidation.error;

        const phoneValidation = validatePhone(formData.whatsapp);
        if (!phoneValidation.valid) newErrors.whatsapp = phoneValidation.error;

        // Optional email validation - but if entered, must be valid
        // Actually, let's make it mandatory for password reset flow?
        // User request "Through email validation to reset password" implies email is needed.
        // So I will make it mandatory.
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.valid) newErrors.email = emailValidation.error;

        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.valid) newErrors.password = passwordValidation.error;

        const confirmValidation = validatePasswordMatch(formData.password, formData.confirmPassword);
        if (!confirmValidation.valid) newErrors.confirmPassword = confirmValidation.error;

        // Validate location fields (now mandatory)
        const locationValidation = validateLocation(formData.city, formData.state, formData.country);
        if (!locationValidation.valid) {
            Object.assign(newErrors, locationValidation.errors);
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setLoading(true);

        // Convert photo to base64 for storage (simplified approach)
        let photoData = null;
        if (profilePhoto && photoPreview) {
            photoData = photoPreview; // Base64 string
        }

        // Properly format whatsapp number - only keep digits from user input
        const digitsOnly = formData.whatsapp.replace(/[^\d]/g, '');
        // Get country code digits for checking duplicates
        const countryCodeDigits = countryCode.replace(/[^\d]/g, '');
        // Check if user already included country code in their input
        let localNumber = digitsOnly;
        if (digitsOnly.startsWith(countryCodeDigits) && digitsOnly.length > 10) {
            // User entered country code, remove it to avoid duplication
            localNumber = digitsOnly.substring(countryCodeDigits.length);
        }
        // Final formatted number: +countrycode + local number
        const formattedWhatsapp = countryCode + localNumber;
        
        console.log('Registration phone formatting:', {
            input: formData.whatsapp,
            digitsOnly,
            countryCode,
            countryCodeDigits,
            localNumber,
            formattedWhatsapp
        });

        const result = await register(
            {
                name: formData.name.trim(),
                whatsapp: formattedWhatsapp,
                email: formData.email.trim(),
                password: formData.password,
                city: formData.city.trim(),
                state: formData.state.trim(),
                country: formData.country.trim(),
                profile_photo: photoData
            },
            selectedAccounts
        );

        setLoading(false);

        if (result.success) {
            success('Account created successfully! Please login to continue.');
            navigate('/login');
        } else {
            error(result.error || 'Registration failed. Please try again.');
        }
    };

    return (
        <div className="register-page page-enter">
            <div className="register-container">
                <Link to="/" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Home
                </Link>

                <div className="register-card">
                    <div className="register-header">
                        <div className="om-symbol">ॐ</div>
                        <h1>New Devotee</h1>
                        <p>Create your devotional account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="register-form">
                        {/* Profile Photo */}
                        <div className="form-section">
                            <h3 className="section-title">Profile Photo <span className="optional">(Optional)</span></h3>
                            <div className="photo-upload-area">
                                {photoPreview ? (
                                    <div className="photo-preview">
                                        <img src={photoPreview} alt="Profile preview" />
                                        <button
                                            type="button"
                                            className="remove-photo-btn"
                                            onClick={removePhoto}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="photo-upload-label">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            hidden
                                        />
                                        <div className="upload-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                        </div>
                                        <span>Click to upload photo</span>
                                        <small>Max 2MB, JPG/PNG</small>
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Name */}
                        <div className="form-group">
                            <label className="form-label">Full Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className={`form-input ${errors.name ? 'error' : ''}`}
                                placeholder="Enter your full name"
                            />
                            {errors.name && <span className="form-error">{errors.name}</span>}
                        </div>

                        {/* WhatsApp */}
                        <div className="form-group">
                            <label className="form-label">WhatsApp Number <span className="required">*</span></label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={countryCode}
                                    onChange={(e) => setCountryCode(e.target.value)}
                                    className="form-input"
                                    style={{ width: '160px', flexShrink: 0 }}
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
                                    style={{ flex: 1 }}
                                />
                            </div>
                            {errors.whatsapp && <span className="form-error">{errors.whatsapp}</span>}
                            <span className="form-hint">Used for important updates</span>
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <label className="form-label">Email Address <span className="required">*</span></label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`form-input ${errors.email ? 'error' : ''}`}
                                placeholder="john@example.com"
                            />
                            {errors.email && <span className="form-error">{errors.email}</span>}
                            <span className="form-hint">This will be your login identifier</span>
                        </div>

                        {/* Password */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Password <span className="required">*</span></label>
                                <PasswordInput
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    error={errors.password}
                                />
                                {errors.password && <span className="form-error">{errors.password}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm Password <span className="required">*</span></label>
                                <PasswordInput
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm password"
                                    error={errors.confirmPassword}
                                />
                                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
                            </div>
                        </div>

                        {/* Location (Now Mandatory) */}
                        <div className="form-section">
                            <h3 className="section-title">Location <span className="required">*</span></h3>
                            <p className="section-subtitle">Required for publishing reports</p>
                            <div className="form-row form-row-3">
                                <div className="form-group">
                                    <label className="form-label">City <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        className={`form-input ${errors.city ? 'error' : ''}`}
                                        placeholder="City"
                                    />
                                    {errors.city && <span className="form-error">{errors.city}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="state"
                                        value={formData.state}
                                        onChange={handleChange}
                                        className={`form-input ${errors.state ? 'error' : ''}`}
                                        placeholder="State"
                                    />
                                    {errors.state && <span className="form-error">{errors.state}</span>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Country <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className={`form-input ${errors.country ? 'error' : ''}`}
                                        placeholder="Country"
                                    />
                                    {errors.country && <span className="form-error">{errors.country}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Namavruksha Sankalpa Selection */}
                        <div className="form-section">
                            <h3 className="section-title">Select Namavruksha Sankalpa</h3>
                            <p className="section-subtitle">Choose which Sankalpas you want to contribute to</p>

                            {accountsLoading ? (
                                <div className="accounts-loading">
                                    <span className="loader loader-sm"></span>
                                    <span>Loading accounts...</span>
                                </div>
                            ) : namaAccounts.length === 0 ? (
                                <p className="no-accounts">No Namavruksha Sankalpas available yet.</p>
                            ) : (
                                <div className="checkbox-group">
                                    {namaAccounts.map(account => (
                                        <label key={account.id} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedAccounts.includes(account.id)}
                                                onChange={() => handleAccountToggle(account.id)}
                                            />
                                            <span>{account.name}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
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
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="register-footer">
                        <p>
                            Already have an account?{' '}
                            <Link to="/login">Login here</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
