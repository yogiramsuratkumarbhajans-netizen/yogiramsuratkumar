import { createContext, useContext, useState, useEffect } from 'react';
import { account, databases, ID, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';

const AuthContext = createContext(null);

// Hard-coded admin credentials (5 admin accounts as per specification)
const ADMIN_CREDENTIALS = [
    { username: 'admin', password: 'namabank2024' },
    { username: 'admin1', password: 'namabank2024' },
    { username: 'admin2', password: 'namabank2024' },
    { username: 'admin3', password: 'namabank2024' },
    { username: 'admin4', password: 'namabank2024' }
];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [moderator, setModerator] = useState(null);
    const [loading, setLoading] = useState(true);
    const [linkedAccounts, setLinkedAccounts] = useState([]);

    useEffect(() => {
        // Check for existing session on mount
        checkSession();
    }, []);

    const ensureUserProfile = async (session) => {
        try {
            // Try to find existing profile
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.USERS,
                [Query.equal('email', session.email), Query.limit(1)]
            );

            if (response.documents.length > 0) {
                const userData = response.documents[0];
                setUser(userData);
                fetchLinkedAccounts(userData.$id);
                return userData;
            } else {
                console.log('User authenticated but no profile found. Creating base profile...');
                // Create a base profile for existing Auth user if missing (recovery flow)
                // We use session name if available, or extract from email, or default
                const baseName = session.name || session.email.split('@')[0];

                const newProfile = await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    ID.unique(),
                    {
                        name: baseName,
                        email: session.email,
                        auth_id: session.$id,
                        is_active: true,
                        created_at: new Date().toISOString()
                    }
                );

                setUser(newProfile);
                return newProfile;
            }
        } catch (error) {
            console.error('Error ensuring user profile:', error);
            return null;
        }
    };

    const checkSession = async () => {
        try {
            // Check for admin/moderator in localStorage
            checkOtherRoles();

            // Check for database-authenticated user in localStorage
            const storedDbUser = localStorage.getItem('namabank_db_user');
            if (storedDbUser) {
                try {
                    const dbUserData = JSON.parse(storedDbUser);
                    // Verify user still exists in database
                    const response = await databases.listDocuments(
                        DATABASE_ID,
                        COLLECTIONS.USERS,
                        [Query.equal('email', dbUserData.email), Query.limit(1)]
                    );
                    if (response.documents.length > 0) {
                        const freshUser = response.documents[0];
                        setUser(freshUser);
                        fetchLinkedAccounts(freshUser.$id);
                        setLoading(false);
                        return;
                    } else {
                        // User no longer exists, clear storage
                        localStorage.removeItem('namabank_db_user');
                    }
                } catch (e) {
                    localStorage.removeItem('namabank_db_user');
                }
            }

            // Try to get current Appwrite session
            const session = await account.get();
            if (session) {
                // Ensure profile exists (recovers from DB wipes)
                await ensureUserProfile(session);
            }
        } catch (error) {
            // No active session, that's fine
            console.log('No active session');
        } finally {
            setLoading(false);
        }
    };

    const checkOtherRoles = () => {
        const storedAdmin = localStorage.getItem('namabank_admin');
        const storedModerator = localStorage.getItem('namabank_moderator');

        if (storedAdmin === 'true') {
            setIsAdmin(true);
        }

        if (storedModerator) {
            try {
                setModerator(JSON.parse(storedModerator));
            } catch (e) {
                localStorage.removeItem('namabank_moderator');
            }
        }
    };

    const loadUserProfile = async (email) => {
        // This function is now redundant for checkSession but useful for refreshes
        // We'll keep it simple or delegate to ensureUserProfile if we had the session object
        // But for compatibility with existing calls, we'll leave it as a simple fetch
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.USERS,
                [Query.equal('email', email), Query.limit(1)]
            );

            if (response.documents.length > 0) {
                const userData = response.documents[0];
                setUser(userData);
                fetchLinkedAccounts(userData.$id);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    const fetchLinkedAccounts = async (userId) => {
        try {
            // Get user's linked account IDs
            const linksResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.USER_ACCOUNT_LINKS,
                [Query.equal('user_id', userId)]
            );

            if (linksResponse.documents.length === 0) {
                setLinkedAccounts([]);
                return;
            }

            // Get the account details for each linked account
            const accountIds = linksResponse.documents.map(link => link.account_id);
            const accountsResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.NAMA_ACCOUNTS,
                [Query.equal('is_active', true)]
            );

            // Filter to only include linked accounts
            const accounts = accountsResponse.documents.filter(acc =>
                accountIds.includes(acc.$id)
            ).map(acc => ({
                id: acc.$id,
                name: acc.name,
                is_active: acc.is_active
            }));

            setLinkedAccounts(accounts);
        } catch (error) {
            console.error('Error fetching linked accounts:', error);
        }
    };

    const login = async (emailOrPhone, password) => {
        try {
            // Clear any existing session first
            try {
                await account.deleteSession('current');
            } catch (e) {
                // No active session, that's fine
            }
            // Clear any stored database user
            localStorage.removeItem('namabank_db_user');

            // Normalize input - could be email or phone number
            const input = String(emailOrPhone).trim().toLowerCase();
            
            // First, try database-based authentication (for bulk-uploaded users)
            try {
                let dbUser = null;
                
                // Try to find user by email first
                let dbUsers = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    [Query.equal('email', input), Query.limit(1)]
                );
                
                if (dbUsers.documents.length > 0) {
                    dbUser = dbUsers.documents[0];
                } else {
                    // Try to find by whatsapp number - comprehensive search
                    const phoneDigits = input.replace(/[^\d]/g, '');
                    const phoneWithPlus = input.replace(/[^\d+]/g, '');
                    
                    if (phoneDigits.length >= 10) {
                        // Generate multiple search formats
                        const last10Digits = phoneDigits.slice(-10);
                        const searchFormats = [
                            phoneDigits,                    // All digits
                            '+' + phoneDigits,              // With + prefix
                            phoneWithPlus,                  // Original with + if present
                            last10Digits,                   // Last 10 digits only
                            '+91' + last10Digits,           // Common India format
                            '91' + last10Digits,            // Without +
                            '+' + last10Digits,             // Just + and local
                        ];
                        
                        // Remove duplicates
                        const uniqueFormats = [...new Set(searchFormats.filter(f => f && f.length >= 10))];
                        console.log('AuthContext login - searching phone formats:', uniqueFormats);
                        
                        for (const searchFormat of uniqueFormats) {
                            if (dbUser) break;
                            try {
                                dbUsers = await databases.listDocuments(
                                    DATABASE_ID,
                                    COLLECTIONS.USERS,
                                    [Query.equal('whatsapp', searchFormat), Query.limit(1)]
                                );
                                if (dbUsers.documents.length > 0) {
                                    dbUser = dbUsers.documents[0];
                                    console.log('Found user with format:', searchFormat);
                                }
                            } catch (searchErr) {
                                console.warn('Search error:', searchErr.message);
                            }
                        }
                    }
                }

                if (dbUser) {
                    console.log('Found user in database:', dbUser.email, dbUser.name);
                    
                    // Check if user is active
                    if (!dbUser.is_active) {
                        return { success: false, error: 'Your account has been disabled. Please contact admin.' };
                    }
                    
                    // Check if password matches (stored in database)
                    const storedPassword = String(dbUser.password || '').trim();
                    const inputPassword = String(password).trim();
                    
                    console.log('Comparing passwords:', { stored: storedPassword ? '[SET]' : '[NULL/EMPTY]', inputLength: inputPassword.length });
                    
                    // If password is stored in database, compare directly
                    if (storedPassword && storedPassword === inputPassword) {
                        console.log('Database authentication successful for:', dbUser.email);
                        
                        // Store user in localStorage for session persistence
                        localStorage.setItem('namabank_db_user', JSON.stringify({
                            $id: dbUser.$id,
                            email: dbUser.email,
                            name: dbUser.name
                        }));
                        
                        // Check if user has an auth_id (Appwrite Auth account)
                        if (dbUser.auth_id) {
                            // Try Appwrite Auth login
                            try {
                                await account.createEmailPasswordSession(dbUser.email, password);
                            } catch (authErr) {
                                console.warn('Appwrite session creation failed, using database auth:', authErr.message);
                            }
                        }
                        
                        // Set user from database
                        setUser(dbUser);
                        fetchLinkedAccounts(dbUser.$id);
                        return { success: true };
                    } else if (!storedPassword && dbUser.auth_id) {
                        // Password not in database but user has Appwrite Auth - try Appwrite Auth
                        console.log('No password in database, trying Appwrite Auth for:', dbUser.email);
                        try {
                            await account.createEmailPasswordSession(dbUser.email, inputPassword);
                            
                            // Success! Update database with password for future logins
                            try {
                                await databases.updateDocument(
                                    DATABASE_ID,
                                    COLLECTIONS.USERS,
                                    dbUser.$id,
                                    { password: inputPassword }
                                );
                                console.log('Updated password in database for:', dbUser.email);
                            } catch (updateErr) {
                                console.warn('Could not update password in database:', updateErr.message);
                            }
                            
                            // Store user in localStorage
                            localStorage.setItem('namabank_db_user', JSON.stringify({
                                $id: dbUser.$id,
                                email: dbUser.email,
                                name: dbUser.name
                            }));
                            
                            setUser(dbUser);
                            fetchLinkedAccounts(dbUser.$id);
                            return { success: true };
                        } catch (authErr) {
                            console.log('Appwrite Auth also failed:', authErr.message);
                            return { success: false, error: 'Invalid password. Please check your password and try again.' };
                        }
                    } else if (storedPassword && storedPassword !== inputPassword) {
                        console.log('Password mismatch for user:', dbUser.email);
                        return { success: false, error: 'Invalid password. Please check your password and try again.' };
                    }
                }
            } catch (dbErr) {
                console.log('Database auth check failed, trying Appwrite Auth:', dbErr.message);
            }

            // If database auth didn't work, try Appwrite Auth
            await account.createEmailPasswordSession(input, password);

            // Get session details to ensure profile
            const session = await account.get();
            await ensureUserProfile(session);

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Invalid email/phone or password. Please check your credentials.' };
        }
    };

    const loginAdmin = (username, password) => {
        const isValidAdmin = ADMIN_CREDENTIALS.some(
            cred => cred.username === username && cred.password === password
        );

        if (isValidAdmin) {
            localStorage.setItem('namabank_admin', 'true');
            setIsAdmin(true);
            return { success: true };
        }
        return { success: false, error: 'Invalid admin credentials.' };
    };

    const loginModerator = async (username, password) => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.MODERATORS,
                [Query.equal('username', username), Query.limit(1)]
            );

            if (response.documents.length === 0) {
                return { success: false, error: 'Invalid moderator credentials.' };
            }

            const modData = response.documents[0];

            if (modData.password_hash !== password) {
                return { success: false, error: 'Invalid password.' };
            }

            if (!modData.is_active) {
                return { success: false, error: 'Moderator account is disabled.' };
            }

            const modSession = {
                id: modData.$id,
                name: modData.name,
                username: modData.username
            };

            localStorage.setItem('namabank_moderator', JSON.stringify(modSession));
            setModerator(modSession);

            return { success: true };
        } catch (error) {
            console.error('Moderator login error:', error);
            return { success: false, error: 'An error occurred during login.' };
        }
    };

    const register = async (userData, selectedAccountIds) => {
        let authUser = null;

        try {
            // 0. Clear any existing session first
            try {
                await account.deleteSession('current');
            } catch (e) {
                // No active session, that's fine
            }

            // 1. Create Appwrite Auth account
            try {
                authUser = await account.create(
                    ID.unique(),
                    userData.email,
                    userData.password,
                    userData.name
                );
            } catch (authError) {
                if (authError.code === 409) {
                    return { success: false, error: 'Account with this email already exists. Please login.' };
                }
                throw authError;
            }

            // 2. Create email/password session
            try {
                await account.createEmailPasswordSession(userData.email, userData.password);
            } catch (sessionError) {
                // Session might already exist from account.create, that's ok
                console.log('Session creation:', sessionError.message);
            }

            // 3. Create profile in 'users' collection
            // Build document - only include optional fields if they have values
            const userDocument = {
                auth_id: authUser.$id,
                name: userData.name,
                email: userData.email,
                password: userData.password, // Store password for database-based authentication
                is_active: true,
                created_at: new Date().toISOString()
            };

            // Add optional string fields only if they exist and are valid
            if (userData.whatsapp) userDocument.whatsapp = userData.whatsapp;
            if (userData.city) userDocument.city = userData.city;
            if (userData.state) userDocument.state = userData.state;
            if (userData.country) userDocument.country = userData.country;
            if (userData.profile_photo && typeof userData.profile_photo === 'string' && userData.profile_photo.length <= 500) {
                userDocument.profile_photo = userData.profile_photo;
            }

            const newUser = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.USERS,
                ID.unique(),
                userDocument
            );

            // 4. Link selected accounts
            if (selectedAccountIds.length > 0) {
                for (const accountId of selectedAccountIds) {
                    await databases.createDocument(
                        DATABASE_ID,
                        COLLECTIONS.USER_ACCOUNT_LINKS,
                        ID.unique(),
                        {
                            user_id: newUser.$id,
                            account_id: accountId,
                            created_at: new Date().toISOString()
                        }
                    );
                }
            }

            // 5. Send notification email to admin
            try {
                const { sendNotificationEmail } = await import('../services/emailService');
                await sendNotificationEmail({
                    to: 'yogiramsuratkumarbhajans@gmail.com',
                    subject: 'New Sankalpa Registration',
                    message: `A new user has joined Sankalpa.\n\nName: ${userData.name}\nEmail: ${userData.email}\nWhatsApp: ${userData.whatsapp || ''}\nCity: ${userData.city || ''}\nState: ${userData.state || ''}\nCountry: ${userData.country || ''}`
                });
            } catch (emailErr) {
                console.error('Failed to send admin notification email:', emailErr);
            }

            setUser(newUser);
            await fetchLinkedAccounts(newUser.$id);

            return { success: true, user: newUser };
        } catch (error) {
            console.error('Registration error:', error);

            // Check for duplicate user
            if (error.code === 409) {
                return { success: false, error: 'User with this email already exists.' };
            }

            return { success: false, error: error.message || 'An error occurred during registration.' };
        }
    };

    const requestPasswordReset = async (email) => {
        try {
            const PRODUCTION_URL = 'https://nama-bank-webapp-client.vercel.app';

            await account.createRecovery(
                email,
                `${PRODUCTION_URL}/reset-password`
            );

            return { success: true, message: 'Password reset instructions sent to your email.' };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message || 'Failed to request password reset.' };
        }
    };

    const updatePassword = async (newPassword, userId = null, secret = null) => {
        try {
            if (userId && secret) {
                // Complete password recovery with userId and secret from URL
                await account.updateRecovery(userId, secret, newPassword);
            } else {
                // Update password for logged-in user
                await account.updatePassword(newPassword);
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            // Delete current session from Appwrite
            await account.deleteSession('current');
        } catch (error) {
            console.log('Logout error (may already be logged out):', error);
        }

        // Clear local storage for admin/moderator and database user
        localStorage.removeItem('namabank_admin');
        localStorage.removeItem('namabank_moderator');
        localStorage.removeItem('namabank_db_user');

        setUser(null);
        setIsAdmin(false);
        setModerator(null);
        setLinkedAccounts([]);
    };

    const value = {
        user,
        isAdmin,
        moderator,
        loading,
        linkedAccounts,
        login,
        loginAdmin,
        loginModerator,
        register,
        logout,
        fetchLinkedAccounts,
        requestPasswordReset,
        updatePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
