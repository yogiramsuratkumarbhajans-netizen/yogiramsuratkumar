// Input validation utilities

/**
 * Validates phone number - must be 10+ digits, can include country code
 * Updated to allow up to 20 digits for international WhatsApp numbers
 */
export const validatePhone = (phone) => {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    const phoneRegex = /^\+?[0-9]{10,20}$/;

    if (!phone.trim()) {
        return { valid: false, error: 'Phone number is required' };
    }

    if (!phoneRegex.test(cleaned)) {
        return { valid: false, error: 'Enter a valid phone number (10-20 digits)' };
    }

    return { valid: true, error: null };
};

/**
 * Alias for WhatsApp validation (same as phone validation)
 */
export const validateWhatsApp = validatePhone;


/**
 * Validates name - allows letters, numbers, spaces, and common name characters
 * Numbers allowed for elderly users who may prefer using numbers
 */
export const validateName = (name) => {
    if (!name.trim()) {
        return { valid: false, error: 'Name is required' };
    }

    if (name.trim().length < 2) {
        return { valid: false, error: 'Name must be at least 2 characters' };
    }

    return { valid: true, error: null };
};

/**
 * Validates password - minimum 4 characters
 */
export const validatePassword = (password) => {
    if (!password) {
        return { valid: false, error: 'Password is required' };
    }

    if (password.length < 4) {
        return { valid: false, error: 'Password must be at least 4 characters' };
    }

    return { valid: true, error: null };
};

/**
 * Validates password confirmation
 */
export const validatePasswordMatch = (password, confirmPassword) => {
    if (!confirmPassword) {
        return { valid: false, error: 'Please confirm your password' };
    }

    if (password !== confirmPassword) {
        return { valid: false, error: 'Passwords do not match' };
    }

    return { valid: true, error: null };
};

/**
 * Formats phone number - keeps only digits and +
 */
export const formatPhoneNumber = (value) => {
    // Remove all non-digits except +
    const cleaned = value.replace(/[^\d+]/g, '');
    return cleaned;
};

/**
 * Formats name - no longer removes numbers (allowed for elderly)
 */
export const formatName = (value) => {
    return value;
};

/**
 * Validates location fields (city, state, country) - all required
 */
export const validateLocation = (city, state, country) => {
    const errors = {};

    if (!city?.trim()) {
        errors.city = 'City is required';
    }

    if (!state?.trim()) {
        errors.state = 'State is required';
    }

    if (!country?.trim()) {
        errors.country = 'Country is required';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validates email address
 */
export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        return { valid: false, error: 'Email is required' };
    }

    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Please enter a valid email address' };
    }

    return { valid: true, error: null };
};
