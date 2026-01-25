import { useState, useRef } from 'react';
import { uploadBook } from '../services/namaService';
import { useToast } from '../context/ToastContext';
import './BookUpload.css';

const BookUpload = ({ onUploadSuccess }) => {
    const { success, error } = useToast();
    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [metadata, setMetadata] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [parseError, setParseError] = useState('');

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'application/pdf') {
            error('Please upload a PDF file.');
            return;
        }

        setFile(selectedFile);
        const parsed = parseFilename(selectedFile.name);
        setMetadata(parsed);
        setParseError(parsed.isAutomatic ? '' : 'Filename does not match standard format. Please fill in the details manually.');
    };

    const parseFilename = (filename) => {
        const name = filename.replace(/\.pdf$/i, '');
        const parts = name.split('_');

        // Initial empty/default metadata
        let result = {
            title: name.split('_').join(' '),
            year: new Date().getFullYear().toString(),
            month: new Date().toLocaleString('default', { month: 'long' }),
            country: '',
            city: '',
            language: 'English',
            edition_type: 'Monthly',
            isAutomatic: false
        };

        // If it matches exactly
        if (parts.length >= 7) {
            const [title, year, month, country, city, language, ...editionParts] = parts;
            result = {
                title: title.replace(/-/g, ' '),
                year,
                month,
                country,
                city,
                language,
                edition_type: editionParts.join('_'),
                isAutomatic: true
            };
        } else {
            // Intelligent guessing (Automatic categorization)
            const lowerName = name.toLowerCase();

            // Guess Year
            const yearMatch = name.match(/20\d{2}/);
            if (yearMatch) result.year = yearMatch[0];

            // Guess Month
            const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
            const foundMonth = months.find(m => lowerName.includes(m));
            if (foundMonth) result.month = foundMonth.charAt(0).toUpperCase() + foundMonth.slice(1);

            // Guess Country/City
            if (lowerName.includes('uk') || lowerName.includes('united kingdom')) result.country = 'UK';
            if (lowerName.includes('london')) { result.city = 'London'; result.country = 'UK'; }
            if (lowerName.includes('india')) result.country = 'India';
            if (lowerName.includes('chennai')) { result.city = 'Chennai'; result.country = 'India'; }

            // Guess Edition
            if (lowerName.includes('monthly')) result.edition_type = 'Monthly';
            if (lowerName.includes('special')) result.edition_type = 'Special Edition';
            if (lowerName.includes('magazine')) result.edition_type = 'eMagazine';
        }

        return result;
    };

    const handleMetadataChange = (key, value) => {
        setMetadata(prev => ({ ...prev, [key]: value }));
    };

    const handleUpload = async () => {
        if (!file || !metadata) return;

        // Basic validation before upload
        if (!metadata.title || !metadata.year || !metadata.month) {
            error('Title, Year, and Month are required.');
            return;
        }

        setUploading(true);
        try {
            // Only send fields that exist in the Appwrite books schema
            const validMetadata = {
                title: metadata.title,
                year: metadata.year,
                month: metadata.month,
                language: metadata.language || 'English'
            };

            await uploadBook(file, validMetadata);
            success('Book uploaded successfully!');
            setFile(null);
            setMetadata(null);
            setParseError('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            console.error('Upload failed:', err);
            error(`Failed to upload: ${err.message || 'Unknown error'}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="book-upload-container">
            <h3>Upload New Book</h3>
            <div className="upload-instructions">
                <p><strong>Naming Convention:</strong> <code>Title_Year_Month_Country_City_Language_EditionType.pdf</code></p>
                <p className="example-text">Example: <code>NamaSankalpa_2025_November_UK_London_English_Monthly.pdf</code></p>
            </div>

            <div className={`drop-zone ${file ? 'has-file' : ''}`}>
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="file-input"
                    id="book-file-input"
                />
                <label htmlFor="book-file-input" className="file-label">
                    {file ? (
                        <div className="file-selected">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                            <span>{file.name}</span>
                        </div>
                    ) : (
                        <div className="upload-prompt">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            <span>Click to upload PDF</span>
                        </div>
                    )}
                </label>
            </div>

            {parseError && (
                <div className="info-message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12.01" y2="16" /><line x1="12" y1="8" x2="12" y2="12" /></svg>
                    {parseError}
                </div>
            )}

            {metadata && (
                <div className="metadata-editor">
                    <h4>Book Details</h4>
                    <div className="metadata-form-grid">
                        <div className="form-group">
                            <label>Title *</label>
                            <input type="text" value={metadata.title} onChange={e => handleMetadataChange('title', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Year *</label>
                            <input type="text" value={metadata.year} onChange={e => handleMetadataChange('year', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Month *</label>
                            <input type="text" value={metadata.month} onChange={e => handleMetadataChange('month', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Language</label>
                            <input type="text" value={metadata.language} onChange={e => handleMetadataChange('language', e.target.value)} />
                        </div>
                    </div>

                    <button
                        className="btn btn-primary full-width mt-4"
                        onClick={handleUpload}
                        disabled={uploading}
                    >
                        {uploading ? 'Uploading...' : 'Confirm & Upload'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BookUpload;
