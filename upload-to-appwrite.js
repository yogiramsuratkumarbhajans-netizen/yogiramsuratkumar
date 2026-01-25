/**
 * Bulk File Upload Script for Appwrite
 * 
 * This script uploads all files from local directories to Appwrite Storage.
 * 
 * SETUP:
 * 1. Create a folder structure like this:
 *    /upload-files/
 *      /audio/       <- Put all your audio files here (.mp3, .wav, etc.)
 *      /images/      <- Put all your image files here (.jpg, .png, etc.)
 *      /books/       <- Put all your PDF files here (.pdf)
 * 
 * 2. Run: npm install node-appwrite
 * 3. Run: node upload-to-appwrite.js
 */

const { Client, Storage, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============
// Update these values with your Appwrite credentials
const APPWRITE_ENDPOINT = 'https://nyc.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6953d1b2000e392719c6';
const APPWRITE_API_KEY = 'YOUR_API_KEY_HERE';  // Get from Appwrite Console > Settings > API Keys
const MEDIA_BUCKET_ID = 'media';

// Folder containing files to upload
const UPLOAD_FOLDER = './upload-files';
// =======================================

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);

// Supported file extensions
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
const BOOK_EXTENSIONS = ['.pdf'];

async function uploadFile(filePath, fileName) {
    try {
        const fileBuffer = fs.readFileSync(filePath);

        // Create a blob-like object for node-appwrite
        const file = {
            name: fileName,
            type: getMimeType(fileName),
            size: fileBuffer.length,
            arrayBuffer: () => Promise.resolve(fileBuffer.buffer)
        };

        const response = await storage.createFile(
            MEDIA_BUCKET_ID,
            ID.unique(),
            fs.createReadStream(filePath)
        );

        console.log(`✅ Uploaded: ${fileName} (ID: ${response.$id})`);
        return response;
    } catch (error) {
        console.error(`❌ Failed to upload ${fileName}:`, error.message);
        return null;
    }
}

function getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
        '.pdf': 'application/pdf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

function getAllFiles(dirPath, fileList = []) {
    if (!fs.existsSync(dirPath)) {
        return fileList;
    }

    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            const ext = path.extname(file).toLowerCase();
            if ([...AUDIO_EXTENSIONS, ...IMAGE_EXTENSIONS, ...BOOK_EXTENSIONS].includes(ext)) {
                fileList.push({ path: filePath, name: file });
            }
        }
    });

    return fileList;
}

async function main() {
    console.log('==========================================');
    console.log('   Appwrite Bulk File Upload Script');
    console.log('==========================================\n');

    if (APPWRITE_API_KEY === 'YOUR_API_KEY_HERE') {
        console.log('❌ ERROR: Please set your APPWRITE_API_KEY in the script!');
        console.log('\n📝 To get an API key:');
        console.log('   1. Go to Appwrite Console');
        console.log('   2. Navigate to Settings > API Keys');
        console.log('   3. Create a new key with Storage permissions');
        console.log('   4. Copy the key and paste it in this script\n');
        return;
    }

    if (!fs.existsSync(UPLOAD_FOLDER)) {
        console.log(`❌ ERROR: Folder "${UPLOAD_FOLDER}" not found!`);
        console.log('\n📁 Please create the folder structure:');
        console.log('   upload-files/');
        console.log('   ├── audio/     (your .mp3, .wav files)');
        console.log('   ├── images/    (your .jpg, .png files)');
        console.log('   └── books/     (your .pdf files)\n');

        // Create the folder structure
        fs.mkdirSync(path.join(UPLOAD_FOLDER, 'audio'), { recursive: true });
        fs.mkdirSync(path.join(UPLOAD_FOLDER, 'images'), { recursive: true });
        fs.mkdirSync(path.join(UPLOAD_FOLDER, 'books'), { recursive: true });
        console.log('✅ Created folder structure for you. Add your files and run again.\n');
        return;
    }

    // Get all files to upload
    const files = getAllFiles(UPLOAD_FOLDER);

    if (files.length === 0) {
        console.log('❌ No files found to upload!');
        console.log('   Add your audio, image, and PDF files to the upload-files folder.\n');
        return;
    }

    console.log(`📁 Found ${files.length} files to upload:\n`);

    // Group files by type
    const audioFiles = files.filter(f => AUDIO_EXTENSIONS.includes(path.extname(f.name).toLowerCase()));
    const imageFiles = files.filter(f => IMAGE_EXTENSIONS.includes(path.extname(f.name).toLowerCase()));
    const bookFiles = files.filter(f => BOOK_EXTENSIONS.includes(path.extname(f.name).toLowerCase()));

    console.log(`   🎵 Audio files: ${audioFiles.length}`);
    console.log(`   🖼️  Image files: ${imageFiles.length}`);
    console.log(`   📚 Book files:  ${bookFiles.length}`);
    console.log('\n==========================================\n');

    let successCount = 0;
    let failCount = 0;

    // Upload all files
    for (const file of files) {
        const result = await uploadFile(file.path, file.name);
        if (result) {
            successCount++;
        } else {
            failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n==========================================');
    console.log('   Upload Complete!');
    console.log('==========================================');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('==========================================\n');
}

main().catch(console.error);
