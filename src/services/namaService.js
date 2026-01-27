import { databases, storage, ID, Query, DATABASE_ID, COLLECTIONS, MEDIA_BUCKET_ID } from '../appwriteClient';

// ============================================
// Nama Accounts Service
// ============================================

export const getActiveNamaAccounts = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ACCOUNTS,
        [Query.equal('is_active', true), Query.orderAsc('name')]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id })) || [];
};

export const getAllNamaAccounts = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ACCOUNTS,
        [Query.orderAsc('name')]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id })) || [];
};

export const createNamaAccount = async (name, start_date = null, end_date = null, target_goal = null) => {
    const insertData = {
        name,
        is_active: true,
        created_at: new Date().toISOString()
    };

    if (start_date) insertData.start_date = start_date;
    if (end_date) insertData.end_date = end_date;
    if (target_goal) insertData.target_goal = parseInt(target_goal) || null;

    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.NAMA_ACCOUNTS,
        ID.unique(),
        insertData
    );

    return { ...response, id: response.$id };
};

export const updateNamaAccount = async (id, updates) => {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.NAMA_ACCOUNTS,
        id,
        updates
    );
    return { ...response, id: response.$id };
};

export const deleteNamaAccount = async (id) => {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NAMA_ACCOUNTS, id);
};

// ============================================
// Nama Entries Service
// ============================================

export const submitNamaEntry = async (userId, accountId, count, sourceType = 'manual', startDate = null, endDate = null) => {
    const today = new Date().toISOString().split('T')[0];

    const entryData = {
        user_id: userId,
        account_id: accountId,
        count,
        source_type: sourceType,
        entry_date: today,
        created_at: new Date().toISOString()
    };

    if (startDate) entryData.start_date = startDate;
    if (endDate) entryData.end_date = endDate;

    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.NAMA_ENTRIES,
        ID.unique(),
        entryData
    );

    return { ...response, id: response.$id };
};

export const submitMultipleNamaEntries = async (userId, entries, sourceType = 'manual', startDate = null, endDate = null, devoteeCount = null) => {
    // Use startDate if provided, otherwise default to today
    const entryDate = (startDate && typeof startDate === 'string' && startDate.trim() !== '')
        ? startDate
        : new Date().toISOString().split('T')[0];
    const results = [];

    let isFirstEntry = true; // Track if this is the first entry in the batch

    for (const entry of entries) {
        try {
            const entryData = {
                user_id: userId,
                account_id: entry.accountId,
                count: parseInt(entry.count) || 0, // Ensure count is an integer
                source_type: sourceType,
                entry_date: entryDate, // Use calculated entryDate (startDate or today)
                created_at: new Date().toISOString()
            };

            // Only add dates if they have actual values (not empty strings)
            // Appwrite expects dates in ISO format or as date strings
            if (startDate && typeof startDate === 'string' && startDate.trim() !== '') {
                entryData.start_date = startDate;
            }
            if (endDate && typeof endDate === 'string' && endDate.trim() !== '') {
                entryData.end_date = endDate;
            }
            // Add devotee count ONLY on the first entry of the batch
            // This prevents counting the same devotees multiple times
            if (isFirstEntry && devoteeCount && !isNaN(parseInt(devoteeCount))) {
                entryData.devotee_count = parseInt(devoteeCount);
                isFirstEntry = false; // Subsequent entries in this batch won't have devotee_count
            }

            console.log('Submitting entry data:', entryData);

            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.NAMA_ENTRIES,
                ID.unique(),
                entryData
            );
            results.push({ ...response, id: response.$id });
        } catch (error) {
            console.error('Error submitting entry:', error);
            console.error('Entry data was:', entry);

            // enhanced error handling for missing attribute
            if (error.message && error.message.includes('devotee_count')) {
                console.error('SCHEMA ERROR: The "devotee_count" attribute is missing in Appwrite.');
                throw new Error('Please add "devotee_count" (Integer) attribute to "nama_entries" collection in Appwrite Console.');
            }

            throw error; // Re-throw to be handled by the caller
        }
    }

    return results;
};

export const getUserRecentEntries = async (userId, limit = 10) => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ENTRIES,
        [
            Query.equal('user_id', userId),
            Query.orderDesc('entry_date'),
            Query.limit(limit)
        ]
    );

    // Fetch account names for each entry
    const entries = response.documents;
    const accountIds = [...new Set(entries.map(e => e.account_id))];

    // Get accounts
    const accountsMap = {};
    if (accountIds.length > 0) {
        const accountsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.NAMA_ACCOUNTS,
            [Query.limit(100)]
        );
        accountsResponse.documents.forEach(acc => {
            accountsMap[acc.$id] = acc;
        });
    }

    return entries.map(entry => ({
        ...entry,
        id: entry.$id,
        nama_accounts: accountsMap[entry.account_id] ? { name: accountsMap[entry.account_id].name } : null
    }));
};

export const getUserStats = async (userId) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Calculate current week (Monday to Sunday)
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const prevYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
    const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];

    const stats = {
        today: 0,
        currentWeek: 0,
        currentMonth: 0,
        currentYear: 0,
        previousYear: 0,
        overall: 0,
        totalDevotees: 0
    };

    // Early return with default stats if no userId
    if (!userId) return stats;

    // Get all entries for the user
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ENTRIES,
        [Query.equal('user_id', userId), Query.limit(10000)]
    );

    const entries = response.documents || [];

    entries.forEach(entry => {
        const count = entry.count || 0;
        const devoteeCount = entry.devotee_count || 0;

        stats.overall += count;
        stats.totalDevotees += devoteeCount;

        if (entry.entry_date === today) {
            stats.today += count;
        }
        if (entry.entry_date >= weekStartStr) {
            stats.currentWeek += count;
        }
        if (entry.entry_date >= monthStart) {
            stats.currentMonth += count;
        }
        if (entry.entry_date >= yearStart) {
            stats.currentYear += count;
        }
        if (entry.entry_date >= prevYearStart && entry.entry_date <= prevYearEnd) {
            stats.previousYear += count;
        }
    });

    return stats;
};

// Get user entries by date range for custom filtering
export const getUserEntriesByDateRange = async (userId, startDate, endDate) => {
    if (!userId || !startDate || !endDate) {
        return { entries: [], total: 0 };
    }

    console.log('getUserEntriesByDateRange called with:', { userId, startDate, endDate });

    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ENTRIES,
        [
            Query.equal('user_id', userId),
            Query.greaterThanEqual('entry_date', startDate),
            Query.lessThanEqual('entry_date', endDate),
            Query.orderDesc('entry_date'),
            Query.limit(1000)
        ]
    );

    const entries = response.documents || [];
    console.log('Query returned entries:', entries.length, entries.map(e => ({ entry_date: e.entry_date, count: e.count, start_date: e.start_date, end_date: e.end_date })));
    
    const total = entries.reduce((sum, e) => sum + (e.count || 0), 0);

    // Get account names
    const accountIds = [...new Set(entries.map(e => e.account_id))];
    const accountsMap = {};
    if (accountIds.length > 0) {
        const accountsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.NAMA_ACCOUNTS,
            [Query.limit(100)]
        );
        accountsResponse.documents.forEach(acc => {
            accountsMap[acc.$id] = acc;
        });
    }

    return {
        entries: entries.map(entry => ({
            ...entry,
            id: entry.$id,
            nama_accounts: accountsMap[entry.account_id] ? { name: accountsMap[entry.account_id].name } : null
        })),
        total
    };
};

// ============================================
// Admin Services
// ============================================

export const getAllUsers = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS,
        [Query.orderDesc('created_at'), Query.limit(1000)]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id })) || [];
};

export const updateUser = async (id, updates) => {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USERS,
        id,
        updates
    );
    return { ...response, id: response.$id };
};

export const getAllNamaEntries = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ENTRIES,
        [Query.orderDesc('created_at'), Query.limit(1000)]
    );

    // Fetch related user and account data
    const entries = response.documents;
    const userIds = [...new Set(entries.map(e => e.user_id))];
    const accountIds = [...new Set(entries.map(e => e.account_id))];

    // Get users
    const usersMap = {};
    if (userIds.length > 0) {
        const usersResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.USERS,
            [Query.limit(1000)]
        );
        usersResponse.documents.forEach(user => {
            usersMap[user.$id] = user;
        });
    }

    // Get accounts
    const accountsMap = {};
    if (accountIds.length > 0) {
        const accountsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.NAMA_ACCOUNTS,
            [Query.limit(100)]
        );
        accountsResponse.documents.forEach(acc => {
            accountsMap[acc.$id] = acc;
        });
    }

    return entries.map(entry => ({
        ...entry,
        id: entry.$id,
        users: usersMap[entry.user_id] ? { name: usersMap[entry.user_id].name, whatsapp: usersMap[entry.user_id].whatsapp } : null,
        nama_accounts: accountsMap[entry.account_id] ? { name: accountsMap[entry.account_id].name } : null
    }));
};

export const updateNamaEntry = async (id, updates) => {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.NAMA_ENTRIES,
        id,
        updates
    );
    return { ...response, id: response.$id };
};

export const deleteNamaEntry = async (id) => {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, id);
};

export const getAccountStats = async () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Calculate current week (Monday to Sunday)
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const prevYearStart = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
    const prevYearEnd = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];

    // Get all active accounts
    const accountsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ACCOUNTS,
        [Query.equal('is_active', true)]
    );
    const accounts = accountsResponse.documents;

    // Get all entries
    const entriesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ENTRIES,
        [Query.limit(10000)]
    );
    const entries = entriesResponse.documents;

    const accountStats = accounts.map(account => {
        const accountEntries = entries.filter(e => e.account_id === account.$id);

        const stats = {
            today: 0,
            currentWeek: 0,
            currentMonth: 0,
            currentYear: 0,
            previousYear: 0,
            overall: 0
        };

        accountEntries.forEach(entry => {
            const count = entry.count || 0;
            stats.overall += count;

            if (entry.entry_date === today) stats.today += count;
            if (entry.entry_date >= weekStartStr) stats.currentWeek += count;
            if (entry.entry_date >= monthStart) stats.currentMonth += count;
            if (entry.entry_date >= yearStart) stats.currentYear += count;
            if (entry.entry_date >= prevYearStart && entry.entry_date <= prevYearEnd) stats.previousYear += count;
        });

        return {
            id: account.$id,
            name: account.name,
            ...stats
        };
    });

    return accountStats;
};

// ============================================
// User Account Links Service
// ============================================

export const getUserAccountLinks = async (userId) => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_ACCOUNT_LINKS,
        [Query.equal('user_id', userId)]
    );

    // Get account details
    const accountIds = response.documents.map(link => link.account_id);
    const accountsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.NAMA_ACCOUNTS,
        [Query.limit(100)]
    );

    const accountsMap = {};
    accountsResponse.documents.forEach(acc => {
        accountsMap[acc.$id] = acc;
    });

    return response.documents.map(link => ({
        account_id: link.account_id,
        nama_accounts: accountsMap[link.account_id] ? {
            id: accountsMap[link.account_id].$id,
            name: accountsMap[link.account_id].name,
            is_active: accountsMap[link.account_id].is_active
        } : null
    }));
};

export const linkUserToAccount = async (userId, accountId) => {
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_ACCOUNT_LINKS,
        ID.unique(),
        {
            user_id: userId,
            account_id: accountId,
            created_at: new Date().toISOString()
        }
    );
    return { ...response, id: response.$id };
};

export const linkUserToAccounts = async (userId, accountIds) => {
    const results = [];
    for (const accountId of accountIds) {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.USER_ACCOUNT_LINKS,
            ID.unique(),
            {
                user_id: userId,
                account_id: accountId,
                created_at: new Date().toISOString()
            }
        );
        results.push({ ...response, id: response.$id });
    }
    return results;
};

export const unlinkUserFromAccount = async (userId, accountId) => {
    // Find the link document
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_ACCOUNT_LINKS,
        [Query.equal('user_id', userId), Query.equal('account_id', accountId)]
    );

    if (response.documents.length > 0) {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.USER_ACCOUNT_LINKS,
            response.documents[0].$id
        );
    }
};

// ============================================
// Bulk User Creation Service
// ============================================

export const bulkCreateUsers = async (users, defaultAccountIds = [], onProgress = null) => {
    const results = [];
    const errors = [];
    const BATCH_SIZE = 10; // Process 10 users at a time
    const DELAY_BETWEEN_BATCHES = 500; // 500ms delay between batches

    // Helper to delay execution
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    // Helper to normalize WhatsApp number
    const normalizeWhatsApp = (whatsapp) => {
        if (!whatsapp) return '';
        // Keep only digits and + sign
        let normalized = String(whatsapp).replace(/[^\d+]/g, '');
        // If it starts with multiple + signs, keep only one
        normalized = normalized.replace(/^\++/, '+');
        return normalized;
    };

    // Process users in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);

        // Process batch sequentially (to avoid rate limits)
        for (const userData of batch) {
            try {
                // Normalize the WhatsApp number
                const normalizedWhatsApp = normalizeWhatsApp(userData.whatsapp);
                
                // Check if user already exists (by whatsapp number)
                let existingUser = null;
                try {
                    const existingCheck = await databases.listDocuments(
                        DATABASE_ID,
                        COLLECTIONS.USERS,
                        [Query.equal('whatsapp', normalizedWhatsApp), Query.limit(1)]
                    );
                    if (existingCheck.documents.length > 0) {
                        existingUser = existingCheck.documents[0];
                    }
                } catch (checkErr) {
                    // Continue if check fails
                }

                if (existingUser) {
                    errors.push({
                        user: userData,
                        error: `User with WhatsApp ${normalizedWhatsApp} already exists`,
                        type: 'duplicate'
                    });
                    continue;
                }

                // Use provided email if valid, otherwise generate from phone number
                const emailPhone = normalizedWhatsApp.replace(/[^0-9]/g, '');
                
                // Debug: Log the incoming email value
                console.log('Email check for user:', userData.name, '| Provided email:', userData.email, '| Type:', typeof userData.email);
                
                // Check if userData.email is a valid email (contains @ with content before and after)
                const hasValidEmail = userData.email && 
                    String(userData.email).trim() !== '' &&
                    String(userData.email).includes('@') && 
                    String(userData.email).indexOf('@') > 0 && 
                    String(userData.email).indexOf('@') < String(userData.email).length - 1;
                
                const email = hasValidEmail ? String(userData.email).trim() : `${emailPhone}@namavruksha.org`;
                
                console.log('Email decision:', hasValidEmail ? 'Using provided email' : 'Generated from phone', '| Final email:', email);
                
                const passwordStr = String(userData.password).trim();

                console.log('Creating user with data:', { ...userData, whatsapp: normalizedWhatsApp, email }); // Debug log

                // Create database user record
                // Users will login via database authentication (password stored in DB)
                // This works for bulk uploads without needing Appwrite Auth accounts
                const newUser = await databases.createDocument(
                    DATABASE_ID,
                    COLLECTIONS.USERS,
                    ID.unique(),
                    {
                        name: userData.name,
                        email: email,
                        whatsapp: normalizedWhatsApp,
                        password: passwordStr, // Store password for database-based login
                        city: userData.city || null,
                        state: userData.state || null,
                        country: userData.country || null,
                        is_active: true,
                        created_at: new Date().toISOString()
                    }
                );

                // Link to accounts if specified
                const accountsToLink = userData.accountIds || defaultAccountIds;
                if (accountsToLink.length > 0) {
                    try {
                        await linkUserToAccounts(newUser.$id, accountsToLink);
                    } catch (linkErr) {
                        console.error('Error linking accounts for user:', userData.name, linkErr);
                        // User created but linking failed - still count as success
                    }
                }

                results.push({ ...newUser, id: newUser.$id });
            } catch (err) {
                console.error('Error creating user:', userData.name, err);
                errors.push({
                    user: userData,
                    error: err.message || 'Unknown error',
                    type: 'create_failed'
                });
            }
        }

        // Report progress if callback provided
        if (onProgress) {
            const processed = Math.min(i + BATCH_SIZE, users.length);
            onProgress({
                processed,
                total: users.length,
                successCount: results.length,
                errorCount: errors.length
            });
        }

        // Add delay between batches to prevent rate limiting
        if (i + BATCH_SIZE < users.length) {
            await delay(DELAY_BETWEEN_BATCHES);
        }
    }

    return { results, errors };
};

// ============================================
// Prayer Service
// ============================================

export const submitPrayer = async (prayerData, userId = null) => {
    const data = {
        name: prayerData.name,
        email: prayerData.email,
        phone: prayerData.phone || null,
        privacy: prayerData.privacy || 'public',
        prayer_text: prayerData.prayer_text,
        email_notifications: prayerData.email_notifications || false,
        status: 'pending',
        created_at: new Date().toISOString()
    };

    if (userId) {
        data.user_id = userId;
    }

    // Try with prayer_count first, fall back without it if attribute doesn't exist
    try {
        data.prayer_count = 0;
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.PRAYERS,
            ID.unique(),
            data
        );
        return { ...response, id: response.$id };
    } catch (err) {
        // If prayer_count attribute doesn't exist, try without it
        if (err.message && (err.message.includes('prayer_count') || err.message.includes('unknown_attribute'))) {
            delete data.prayer_count;
            const response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.PRAYERS,
                ID.unique(),
                data
            );
            return { ...response, id: response.$id };
        }
        throw err;
    }
};

export const getApprovedPrayers = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PRAYERS,
        [Query.equal('status', 'approved'), Query.orderDesc('created_at')]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id })) || [];
};

export const getPendingPrayers = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PRAYERS,
        [Query.equal('status', 'pending'), Query.orderDesc('created_at')]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id })) || [];
};

export const getAllPrayers = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PRAYERS,
        [Query.orderDesc('created_at')]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id })) || [];
};

export const approvePrayer = async (id, moderatorId = null) => {
    try {
        const updateData = {
            status: 'approved',
            approved_at: new Date().toISOString()
        };

        if (moderatorId) {
            updateData.approved_by = moderatorId;
        }

        // Try with full update including approved_at and approved_by
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PRAYERS,
            id,
            updateData
        );
        return { ...response, id: response.$id };
    } catch (err) {
        // If the error is about unknown attributes, try with just status
        if (err.message && (err.message.includes('Unknown attribute') || err.message.includes('unknown_attribute'))) {
            console.warn('Prayer schema missing approved_at/approved_by fields, updating status only.');
            const response = await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.PRAYERS,
                id,
                { status: 'approved' }
            );
            return { ...response, id: response.$id };
        }
        throw err; // Re-throw if it's a different error
    }
};

export const rejectPrayer = async (id) => {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.PRAYERS,
        id,
        { status: 'rejected' }
    );
    return { ...response, id: response.$id };
};

export const incrementPrayerCount = async (id) => {
    try {
        // Fetch current count
        const prayer = await databases.getDocument(DATABASE_ID, COLLECTIONS.PRAYERS, id);

        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.PRAYERS,
            id,
            { prayer_count: (prayer.prayer_count || 0) + 1 }
        );
        return { ...response, id: response.$id };
    } catch (err) {
        // Handle missing prayer_count attribute gracefully
        if (err.message && err.message.includes('prayer_count')) {
            console.warn('SCHEMA NOTE: The "prayer_count" attribute needs to be added to the PRAYERS collection in Appwrite Console.');
            console.warn('Add an Integer attribute named "prayer_count" with default value 0 and make it optional.');
            // Return a mock response so UI can still update locally
            throw new Error('Please add "prayer_count" (Integer, optional, default: 0) attribute to PRAYERS collection in Appwrite Console.');
        }
        throw err;
    }
};

// ============================================
// Book Shelf Service
// ============================================

export const uploadBook = async (file, metadata) => {
    // 1. Upload file to Appwrite Storage
    const fileResponse = await storage.createFile(
        MEDIA_BUCKET_ID,
        ID.unique(),
        file
    );

    // 2. Get file URL
    const fileUrl = storage.getFileView(MEDIA_BUCKET_ID, fileResponse.$id);

    // 3. Insert into books collection - only include fields that exist in schema
    // Valid fields: title, description, file_url, file_id, month, year, language, view_count, created_at
    const bookDocument = {
        title: metadata.title || 'Untitled',
        file_url: fileUrl,
        file_id: fileResponse.$id,
        view_count: 0,
        created_at: new Date().toISOString()
    };

    // Add optional fields if they exist
    if (metadata.description) bookDocument.description = metadata.description;
    if (metadata.month) bookDocument.month = metadata.month;
    if (metadata.year) bookDocument.year = metadata.year;
    if (metadata.language) bookDocument.language = metadata.language;

    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.BOOKS,
        ID.unique(),
        bookDocument
    );

    return { ...response, id: response.$id };
};

export const getBooks = async (filters = {}) => {
    const queries = [Query.orderDesc('created_at')];

    // Apply filters if they exist
    if (filters.year) queries.push(Query.equal('year', filters.year));
    if (filters.month) queries.push(Query.equal('month', filters.month));
    if (filters.country) queries.push(Query.equal('country', filters.country));
    if (filters.city) queries.push(Query.equal('city', filters.city));
    if (filters.language) queries.push(Query.equal('language', filters.language));
    if (filters.edition_type) queries.push(Query.equal('edition_type', filters.edition_type));

    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BOOKS,
        queries
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id }));
};

export const getMostViewedBooks = async (limit = 5) => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BOOKS,
        [Query.orderDesc('view_count'), Query.limit(limit)]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id }));
};

export const incrementBookView = async (bookId) => {
    try {
        const book = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOKS, bookId);
        await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.BOOKS,
            bookId,
            { view_count: (book.view_count || 0) + 1 }
        );
    } catch (error) {
        console.error('Error incrementing view:', error);
    }
};

export const deleteBook = async (bookId, fileUrl, moderatorId = null) => {
    // Get book to find file_id
    const book = await databases.getDocument(DATABASE_ID, COLLECTIONS.BOOKS, bookId);

    // Delete from database
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BOOKS, bookId);

    // Delete from storage (best effort)
    if (book.file_id) {
        try {
            await storage.deleteFile(MEDIA_BUCKET_ID, book.file_id);
        } catch (err) {
            console.error('Error deleting file from storage:', err);
        }
    }
};

export const updateBook = async (id, updates) => {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.BOOKS,
        id,
        updates
    );
    return { ...response, id: response.$id };
};

export const deleteUser = async (id, moderatorId = null) => {
    // 1. Delete user entries
    try {
        const entriesResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.NAMA_ENTRIES,
            [Query.equal('user_id', id)]
        );
        for (const entry of entriesResponse.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, entry.$id);
        }
    } catch (e) {
        console.warn('Error deleting user entries:', e.message);
    }

    // 2. Delete user account links
    try {
        const linksResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.USER_ACCOUNT_LINKS,
            [Query.equal('user_id', id)]
        );
        for (const link of linksResponse.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.USER_ACCOUNT_LINKS, link.$id);
        }
    } catch (e) {
        console.warn('Error deleting user account links:', e.message);
    }

    // 3. Delete password resets (if collection exists)
    try {
        const resetsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.PASSWORD_RESETS,
            [Query.equal('user_id', id)]
        );
        for (const reset of resetsResponse.documents) {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PASSWORD_RESETS, reset.$id);
        }
    } catch (e) {
        // Collection might not exist
    }

    // 4. Delete user (may already be deleted)
    try {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.USERS, id);
    } catch (e) {
        if (e.code === 404 || e.message?.includes('not be found') || e.message?.includes('not found')) {
            console.warn('User already deleted or not found:', id);
        } else {
            throw e;
        }
    }
};

export const deletePrayer = async (id, moderatorId = null) => {
    await databases.deleteDocument(DATABASE_ID, COLLECTIONS.PRAYERS, id);
};

// ============================================
// Account Deletion Requests Service
// ============================================

export const requestAccountDeletion = async (accountId, moderatorId, reason = null) => {
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.ACCOUNT_DELETION_REQUESTS,
        ID.unique(),
        {
            account_id: accountId,
            requested_by: moderatorId,
            reason,
            status: 'pending',
            created_at: new Date().toISOString()
        }
    );
    return { ...response, id: response.$id };
};

export const getPendingDeletionRequests = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.ACCOUNT_DELETION_REQUESTS,
        [Query.equal('status', 'pending'), Query.orderDesc('created_at')]
    );

    // Get related account and moderator data
    const requests = response.documents;
    const accountIds = [...new Set(requests.map(r => r.account_id))];
    const moderatorIds = [...new Set(requests.map(r => r.requested_by))];

    const accountsMap = {};
    const moderatorsMap = {};

    if (accountIds.length > 0) {
        const accountsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.NAMA_ACCOUNTS,
            [Query.limit(100)]
        );
        accountsResponse.documents.forEach(acc => {
            accountsMap[acc.$id] = acc;
        });
    }

    if (moderatorIds.length > 0) {
        const moderatorsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.MODERATORS,
            [Query.limit(100)]
        );
        moderatorsResponse.documents.forEach(mod => {
            moderatorsMap[mod.$id] = mod;
        });
    }

    return requests.map(req => ({
        ...req,
        id: req.$id,
        nama_accounts: accountsMap[req.account_id] ? { id: accountsMap[req.account_id].$id, name: accountsMap[req.account_id].name } : null,
        moderators: moderatorsMap[req.requested_by] ? { id: moderatorsMap[req.requested_by].$id, name: moderatorsMap[req.requested_by].name } : null
    }));
};

export const approveAccountDeletion = async (requestId) => {
    // Get the request
    const request = await databases.getDocument(DATABASE_ID, COLLECTIONS.ACCOUNT_DELETION_REQUESTS, requestId);

    // Delete the account
    await deleteNamaAccount(request.account_id);

    // Update request status
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.ACCOUNT_DELETION_REQUESTS,
        requestId,
        { status: 'approved' }
    );
};

export const rejectAccountDeletion = async (requestId) => {
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.ACCOUNT_DELETION_REQUESTS,
        requestId,
        { status: 'rejected' }
    );
};

// ============================================
// User Deletion Requests (Moderator -> Admin)
// ============================================

export const requestUserDeletion = async (userId, moderatorId, reason) => {
    const response = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USER_DELETION_REQUESTS,
        ID.unique(),
        {
            user_id: userId,
            requested_by: moderatorId,
            reason,
            status: 'pending',
            created_at: new Date().toISOString()
        }
    );
    return { ...response, id: response.$id };
};

export const getPendingUserDeletionRequests = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USER_DELETION_REQUESTS,
        [Query.equal('status', 'pending'), Query.orderDesc('created_at')]
    );

    // Get related user and moderator data
    const requests = response.documents;
    const userIds = [...new Set(requests.map(r => r.user_id))];
    const moderatorIds = [...new Set(requests.map(r => r.requested_by))];

    const usersMap = {};
    const moderatorsMap = {};

    if (userIds.length > 0) {
        const usersResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.USERS,
            [Query.limit(1000)]
        );
        usersResponse.documents.forEach(user => {
            usersMap[user.$id] = user;
        });
    }

    if (moderatorIds.length > 0) {
        const moderatorsResponse = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.MODERATORS,
            [Query.limit(100)]
        );
        moderatorsResponse.documents.forEach(mod => {
            moderatorsMap[mod.$id] = mod;
        });
    }

    return requests.map(req => ({
        ...req,
        id: req.$id,
        users: usersMap[req.user_id] ? { id: usersMap[req.user_id].$id, name: usersMap[req.user_id].name, email: usersMap[req.user_id].email, whatsapp: usersMap[req.user_id].whatsapp } : null,
        moderators: moderatorsMap[req.requested_by] ? { id: moderatorsMap[req.requested_by].$id, name: moderatorsMap[req.requested_by].name } : null
    }));
};

export const approveUserDeletion = async (requestId) => {
    // Get the request
    const request = await databases.getDocument(DATABASE_ID, COLLECTIONS.USER_DELETION_REQUESTS, requestId);

    // Try to delete the user (may already be deleted)
    try {
        await deleteUser(request.user_id);
    } catch (err) {
        // If user not found, that's okay - they may have been deleted already
        if (err.code === 404 || err.message?.includes('not be found') || err.message?.includes('not found')) {
            console.warn('User already deleted or not found:', request.user_id);
        } else {
            throw err; // Re-throw other errors
        }
    }

    // Update request status
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USER_DELETION_REQUESTS,
        requestId,
        { status: 'approved' }
    );
};

export const rejectUserDeletion = async (requestId) => {
    await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USER_DELETION_REQUESTS,
        requestId,
        { status: 'rejected' }
    );
};

// ============================================
// Audio Files Service (Appwrite Storage)
// ============================================

export const getAudioFiles = async (bucketId) => {
    try {
        const response = await storage.listFiles(bucketId);
        return response.files.map(file => ({
            id: file.$id,
            name: file.name,
            url: storage.getFileView(bucketId, file.$id),
            size: file.sizeOriginal
        }));
    } catch (error) {
        console.error('Error fetching audio files:', error);
        return [];
    }
};

// ============================================
// Image Files Service (Appwrite Storage)
// ============================================

export const getImageFiles = async (bucketId) => {
    try {
        const response = await storage.listFiles(bucketId);
        return response.files.map(file => ({
            id: file.$id,
            name: file.name,
            url: storage.getFileView(bucketId, file.$id),
            previewUrl: storage.getFilePreview(bucketId, file.$id, 400, 400),
            size: file.sizeOriginal
        }));
    } catch (error) {
        console.error('Error fetching image files:', error);
        return [];
    }
};

// ============================================
// Feedback & Suggestions Service
// ============================================

export const submitFeedback = async (feedbackData, userId = null) => {
    const data = {
        type: feedbackData.type || 'general', // 'sankalpa_suggestion', 'feedback', 'bug_report'
        subject: feedbackData.subject,
        message: feedbackData.message,
        user_name: feedbackData.userName || null,
        user_contact: feedbackData.userContact || null,
        status: 'pending', // 'pending', 'reviewed', 'implemented'
        created_at: new Date().toISOString()
    };

    if (userId) {
        data.user_id = userId;
    }

    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.FEEDBACK,
            ID.unique(),
            data
        );
        return { ...response, id: response.$id, savedToDb: true };
    } catch (err) {
        // If collection doesn't exist, return success with flag indicating email-only
        // This allows the caller to still send email notification
        if (err.code === 404 || 
            (err.message && (err.message.includes('Collection not found') || 
             err.message.includes('not found') ||
             err.message.includes('does not exist')))) {
            console.warn('Feedback collection not found in Appwrite. Returning success for email-only flow.');
            return { 
                id: 'email-only-' + Date.now(), 
                savedToDb: false,
                ...data 
            };
        }
        throw err;
    }
};

export const getAllFeedback = async () => {
    const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.FEEDBACK,
        [Query.orderDesc('created_at')]
    );
    return response.documents.map(doc => ({ ...doc, id: doc.$id })) || [];
};

export const updateFeedbackStatus = async (id, status) => {
    const response = await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.FEEDBACK,
        id,
        { status }
    );
    return { ...response, id: response.$id };
};
