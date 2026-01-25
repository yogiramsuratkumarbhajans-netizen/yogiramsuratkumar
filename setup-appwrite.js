/**
 * Appwrite Setup Script
 * 
 * This script creates the database, all collections with their attributes,
 * storage bucket, and initial data for Nama Bank.
 * 
 * SETUP:
 * 1. Get API Key from Appwrite Console > Settings > API Keys
 * 2. Create a key with these permissions:
 *    - databases.* (all database permissions)
 *    - collections.* (all collection permissions)  
 *    - attributes.* (all attribute permissions)
 *    - documents.* (all document permissions)
 *    - buckets.* (all bucket permissions)
 *    - files.* (all file permissions)
 * 3. Replace YOUR_API_KEY_HERE below with your key
 * 4. Run: node setup-appwrite.js
 */

// ============ CONFIGURATION ============
const APPWRITE_ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6953d1b2000e392719c6';
const APPWRITE_API_KEY = 'standard_431b55492115676db60757cc2e902757682bc10b0b900d8d409046cbed16fc3ea50e8965e34f5f7a1f5c02275431204276909795f5c16e1ca6284fa4e92db87254f4b8b46b9e6977ce8bd16e4d4a7f02d3ab4da777eb3c22c7a32ba248f97015764e09e316ac5db56c664f0a0a39c705ee8487c736bd9444cc7c1bb5d4dc32fe';

const DATABASE_ID = '6953dc6900395adffa8c';
const BUCKET_ID = 'media';
// =======================================

let Client, Databases, Storage, ID;
let client, databases, storage;

async function initAppwrite() {
    const appwrite = await import('node-appwrite');
    Client = appwrite.Client;
    Databases = appwrite.Databases;
    Storage = appwrite.Storage;
    ID = appwrite.ID;

    client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

    databases = new Databases(client);
    storage = new Storage(client);
}

// Collection definitions with their attributes
const COLLECTIONS = {
    users: {
        name: 'Users',
        attributes: [
            { type: 'string', key: 'name', size: 255, required: true },
            { type: 'string', key: 'email', size: 255, required: true },
            { type: 'string', key: 'whatsapp', size: 20, required: false },
            { type: 'string', key: 'city', size: 100, required: false },
            { type: 'string', key: 'state', size: 100, required: false },
            { type: 'string', key: 'country', size: 100, required: false },
            { type: 'string', key: 'profile_photo', size: 500, required: false },
            { type: 'string', key: 'auth_id', size: 255, required: false },
            { type: 'boolean', key: 'is_active', required: false, default: true },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    nama_accounts: {
        name: 'Nama Accounts',
        attributes: [
            { type: 'string', key: 'name', size: 255, required: true },
            { type: 'boolean', key: 'is_active', required: false, default: true },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    user_account_links: {
        name: 'User Account Links',
        attributes: [
            { type: 'string', key: 'user_id', size: 255, required: true },
            { type: 'string', key: 'account_id', size: 255, required: true },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    nama_entries: {
        name: 'Nama Entries',
        attributes: [
            { type: 'string', key: 'user_id', size: 255, required: true },
            { type: 'string', key: 'account_id', size: 255, required: true },
            { type: 'integer', key: 'count', required: true },
            { type: 'string', key: 'entry_date', size: 10, required: false },
            { type: 'string', key: 'start_date', size: 10, required: false },
            { type: 'string', key: 'end_date', size: 10, required: false },
            { type: 'string', key: 'source_type', size: 20, required: false },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    moderators: {
        name: 'Moderators',
        attributes: [
            { type: 'string', key: 'name', size: 255, required: true },
            { type: 'string', key: 'username', size: 100, required: true },
            { type: 'string', key: 'password_hash', size: 255, required: true },
            { type: 'boolean', key: 'is_active', required: false, default: true },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    prayers: {
        name: 'Prayers',
        attributes: [
            { type: 'string', key: 'user_id', size: 255, required: true },
            { type: 'string', key: 'account_id', size: 255, required: false },
            { type: 'string', key: 'prayer_text', size: 2000, required: true },
            { type: 'string', key: 'status', size: 20, required: false },
            { type: 'integer', key: 'prayer_count', required: false, default: 0 },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    books: {
        name: 'Books',
        attributes: [
            { type: 'string', key: 'title', size: 255, required: true },
            { type: 'string', key: 'description', size: 1000, required: false },
            { type: 'string', key: 'file_url', size: 500, required: true },
            { type: 'string', key: 'file_id', size: 255, required: false },
            { type: 'string', key: 'month', size: 20, required: false },
            { type: 'string', key: 'year', size: 10, required: false },
            { type: 'string', key: 'language', size: 50, required: false },
            { type: 'integer', key: 'view_count', required: false },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    account_deletion_requests: {
        name: 'Account Deletion Requests',
        attributes: [
            { type: 'string', key: 'account_id', size: 255, required: true },
            { type: 'string', key: 'requested_by', size: 255, required: false },
            { type: 'string', key: 'reason', size: 500, required: false },
            { type: 'string', key: 'status', size: 20, required: false },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    },
    user_deletion_requests: {
        name: 'User Deletion Requests',
        attributes: [
            { type: 'string', key: 'user_id', size: 255, required: true },
            { type: 'string', key: 'reason', size: 500, required: false },
            { type: 'string', key: 'status', size: 20, required: false },
            { type: 'datetime', key: 'created_at', required: false }
        ]
    }
};

// Initial Nama Bank accounts to create
const INITIAL_ACCOUNTS = [
    'Individual Contribution',
    'Likhita Japam - Fun with Yogi Thatha',
    'Trichy Punyashektram',
    'UK 7 Crore Japam'
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createDatabase() {
    console.log('\n📦 Creating Database...');

    // First try to create the database
    try {
        await databases.create(DATABASE_ID, 'Nama Bank Database');
        console.log('   ✅ Database created: namabank_db');
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log('   ⚠️ Database already exists, continuing...');
            return true;
        } else if (error.code === 403) {
            console.log('   ⚠️ Max databases reached. Checking for existing databases...');

            // Try to list databases to see what exists
            try {
                const dbList = await databases.list();
                if (dbList.databases && dbList.databases.length > 0) {
                    console.log('\n   📋 Found existing database(s):');
                    for (const db of dbList.databases) {
                        console.log(`      - ID: ${db.$id}, Name: ${db.name}`);
                        // Check if existing database matches our target ID
                        if (db.$id === DATABASE_ID) {
                            console.log(`   ✅ Found matching database! Using: ${DATABASE_ID}`);
                            return true;
                        }
                    }
                    console.log('\n   ❌ Please either:');
                    console.log('      1. Delete the existing database in Appwrite Console, OR');
                    console.log('      2. Update DATABASE_ID in this script to use the existing one');
                    return false;
                }
            } catch (listErr) {
                console.error('   Could not list databases:', listErr.message);
            }
            return false;
        } else {
            throw error;
        }
    }
}

async function createCollection(collectionId, config) {
    console.log(`\n📁 Creating collection: ${config.name}...`);
    try {
        await databases.createCollection(DATABASE_ID, collectionId, config.name);
        console.log(`   ✅ Collection created: ${collectionId}`);

        // Set permissions for collection - allow 'any' for admin operations
        await databases.updateCollection(
            DATABASE_ID,
            collectionId,
            config.name,
            ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
            false // documentSecurity
        );
        console.log(`   ✅ Permissions set for ${collectionId}`);

    } catch (error) {
        if (error.code === 409) {
            console.log(`   ⚠️ Collection ${collectionId} already exists, continuing...`);
        } else {
            throw error;
        }
    }

    // Create attributes
    for (const attr of config.attributes) {
        try {
            console.log(`   📝 Creating attribute: ${attr.key}...`);

            if (attr.type === 'string') {
                await databases.createStringAttribute(
                    DATABASE_ID,
                    collectionId,
                    attr.key,
                    attr.size,
                    attr.required,
                    attr.default || null
                );
            } else if (attr.type === 'integer') {
                await databases.createIntegerAttribute(
                    DATABASE_ID,
                    collectionId,
                    attr.key,
                    attr.required,
                    null, // min
                    null, // max
                    attr.default || null
                );
            } else if (attr.type === 'boolean') {
                await databases.createBooleanAttribute(
                    DATABASE_ID,
                    collectionId,
                    attr.key,
                    attr.required,
                    attr.default || null
                );
            } else if (attr.type === 'datetime') {
                await databases.createDatetimeAttribute(
                    DATABASE_ID,
                    collectionId,
                    attr.key,
                    attr.required,
                    attr.default || null
                );
            }

            console.log(`      ✅ ${attr.key}`);
            await sleep(500); // Wait for attribute to be created

        } catch (error) {
            if (error.code === 409) {
                console.log(`      ⚠️ Attribute ${attr.key} already exists`);
            } else {
                console.error(`      ❌ Failed to create ${attr.key}:`, error.message);
            }
        }
    }
}

async function createStorageBucket() {
    console.log('\n📦 Creating Storage Bucket...');
    try {
        await storage.createBucket(
            BUCKET_ID,
            'Media Files',
            ['read("any")', 'create("users")', 'update("users")', 'delete("users")'],
            true, // fileSecurity
            true, // enabled
            50 * 1024 * 1024, // maxFileSize: 50MB
            ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
                'audio/mpeg', 'audio/wav', 'audio/ogg', 'application/pdf'],
            'none', // compression
            true, // encryption
            true // antivirus
        );
        console.log('   ✅ Bucket created: media');
        return true;
    } catch (error) {
        if (error.code === 409) {
            console.log('   ⚠️ Bucket already exists, continuing...');
            return true;
        } else if (error.code === 403) {
            console.log('   ⚠️ Max buckets reached. Checking for existing buckets...');
            try {
                const bucketList = await storage.listBuckets();
                if (bucketList.buckets && bucketList.buckets.length > 0) {
                    console.log('\n   📋 Found existing bucket(s):');
                    for (const bucket of bucketList.buckets) {
                        console.log(`      - ID: ${bucket.$id}, Name: ${bucket.name}`);
                        if (bucket.$id === BUCKET_ID) {
                            console.log(`   ✅ Found matching bucket! Using: ${BUCKET_ID}`);
                            return true;
                        }
                    }
                    // Auto-use first bucket found
                    const existingBucket = bucketList.buckets[0];
                    console.log(`\n   ⚠️ Using existing bucket: ${existingBucket.$id}`);
                    console.log(`      Please update BUCKET_ID in .env to: ${existingBucket.$id}`);
                    return { useExisting: existingBucket.$id };
                }
            } catch (listErr) {
                console.error('   Could not list buckets:', listErr.message);
            }
            return false;
        } else {
            throw error;
        }
    }
}

async function createInitialAccounts() {
    console.log('\n🏦 Creating Initial Nama Bank Accounts...');

    // Wait for attributes to be ready
    await sleep(3000);

    for (const accountName of INITIAL_ACCOUNTS) {
        try {
            await databases.createDocument(
                DATABASE_ID,
                'nama_accounts',
                ID.unique(),
                {
                    name: accountName,
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            );
            console.log(`   ✅ Created: ${accountName}`);
        } catch (error) {
            if (error.code === 409) {
                console.log(`   ⚠️ ${accountName} already exists`);
            } else {
                console.error(`   ❌ Failed to create ${accountName}:`, error.message);
            }
        }
    }
}

async function main() {
    console.log('==========================================');
    console.log('   Appwrite Setup Script for Nama Bank');
    console.log('==========================================');

    if (APPWRITE_API_KEY === 'YOUR_API_KEY_HERE') {
        console.log('\n❌ ERROR: Please set your APPWRITE_API_KEY!');
        console.log('\n📝 To get an API key:');
        console.log('   1. Go to Appwrite Console');
        console.log('   2. Click Settings (gear icon) > API Keys');
        console.log('   3. Create a new key with these scopes:');
        console.log('      - databases.* (all)');
        console.log('      - collections.* (all)');
        console.log('      - attributes.* (all)');
        console.log('      - documents.* (all)');
        console.log('      - buckets.* (all)');
        console.log('      - files.* (all)');
        console.log('   4. Copy the key and paste it in this script');
        console.log('\n   Then run: node setup-appwrite.js\n');
        return;
    }

    try {
        // Initialize Appwrite client
        await initAppwrite();

        // Create database
        const dbCreated = await createDatabase();
        if (!dbCreated) {
            console.log('\n❌ Cannot proceed without database. Please resolve the issue above.');
            return;
        }

        // Create all collections
        for (const [collectionId, config] of Object.entries(COLLECTIONS)) {
            await createCollection(collectionId, config);
        }

        // Create storage bucket
        await createStorageBucket();

        // Create initial nama bank accounts
        await createInitialAccounts();

        console.log('\n==========================================');
        console.log('   ✅ Setup Complete!');
        console.log('==========================================');
        console.log('\nYour Appwrite backend is ready:');
        console.log('   - Database: namabank_db');
        console.log('   - 9 Collections with attributes');
        console.log('   - Storage bucket: media');
        console.log('   - 4 Nama Bank accounts created');
        console.log('\nYou can now use the application!\n');

    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        console.error(error);
    }
}

main();
