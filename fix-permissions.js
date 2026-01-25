/**
 * Fix Appwrite Collection Permissions
 * 
 * This script updates the moderators collection to allow admin operations
 * without requiring Appwrite authentication.
 * 
 * Run: node fix-permissions.js
 */

const APPWRITE_ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6953d1b2000e392719c6';
const APPWRITE_API_KEY = 'standard_431b55492115676db60757cc2e902757682bc10b0b900d8d409046cbed16fc3ea50e8965e34f5f7a1f5c02275431204276909795f5c16e1ca6284fa4e92db87254f4b8b46b9e6977ce8bd16e4d4a7f02d3ab4da777eb3c22c7a32ba248f97015764e09e316ac5db56c664f0a0a39c705ee8487c736bd9444cc7c1bb5d4dc32fe';
const DATABASE_ID = '6953dc6900395adffa8c';

async function fixPermissions() {
    const { Client, Databases } = await import('node-appwrite');

    const client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    // ALL collections need "any" permissions for admin operations
    const allCollections = [
        { id: 'users', name: 'Users' },
        { id: 'nama_accounts', name: 'Nama Accounts' },
        { id: 'user_account_links', name: 'User Account Links' },
        { id: 'nama_entries', name: 'Nama Entries' },
        { id: 'moderators', name: 'Moderators' },
        { id: 'prayers', name: 'Prayers' },
        { id: 'books', name: 'Books' },
        { id: 'account_deletion_requests', name: 'Account Deletion Requests' },
        { id: 'user_deletion_requests', name: 'User Deletion Requests' }
    ];

    console.log('🔧 Fixing Appwrite Collection Permissions...\n');

    for (const col of allCollections) {
        try {
            console.log(`📁 Updating ${col.name} collection...`);
            await databases.updateCollection(
                DATABASE_ID,
                col.id,
                col.name,
                [
                    'read("any")',
                    'create("any")',
                    'update("any")',
                    'delete("any")'
                ],
                false
            );
            console.log(`   ✅ ${col.name} permissions updated!`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`   ⚠️ ${col.name} collection not found, skipping...`);
            } else {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
    }

    console.log('\n✅ Done! Permissions have been updated.');
    console.log('   You can now create moderators and upload books from the Admin Dashboard.');
}

fixPermissions().catch(console.error);
