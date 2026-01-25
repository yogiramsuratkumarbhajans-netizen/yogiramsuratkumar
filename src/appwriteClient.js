import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

// Appwrite Configuration
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '6953d1b2000e392719c6';

// Database and Bucket IDs
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || '6953dc6900395adffa8c';

// Single media bucket for all files (books, audio, images)
// Files are organized by prefix: books/, audio/, images/
export const MEDIA_BUCKET_ID = import.meta.env.VITE_APPWRITE_MEDIA_BUCKET_ID || '695420140035b3e66c3a';

// Legacy exports for backwards compatibility (all point to same bucket)
export const LIBRARY_BUCKET_ID = MEDIA_BUCKET_ID;
export const AUDIO_BUCKET_ID = MEDIA_BUCKET_ID;
export const IMAGES_BUCKET_ID = MEDIA_BUCKET_ID;

// File prefixes for organizing files in single bucket
export const FILE_PREFIXES = {
    BOOKS: 'books/',
    AUDIO: 'audio/',
    IMAGES: 'images/'
};

// Collection IDs
export const COLLECTIONS = {
    USERS: 'users',
    NAMA_ACCOUNTS: 'nama_accounts',
    USER_ACCOUNT_LINKS: 'user_account_links',
    NAMA_ENTRIES: 'nama_entries',
    MODERATORS: 'moderators',
    PRAYERS: 'prayers',
    BOOKS: 'books',
    ACCOUNT_DELETION_REQUESTS: 'account_deletion_requests',
    USER_DELETION_REQUESTS: 'user_deletion_requests',
    PASSWORD_RESETS: 'password_resets',
    FEEDBACK: 'feedback'
};

// Initialize Appwrite Client
const client = new Client();

// Check if credentials are configured
const isConfigured = endpoint && projectId &&
    !projectId.includes('YOUR_');

if (isConfigured) {
    client
        .setEndpoint(endpoint)
        .setProject(projectId);
} else {
    console.warn('⚠️ Appwrite not configured. Please set VITE_APPWRITE_PROJECT_ID in .env file.');
}

// Initialize Services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

export { client, account, databases, storage, ID, Query, isConfigured };
