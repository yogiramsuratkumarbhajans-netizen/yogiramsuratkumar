import { useState, useRef } from 'react';
import { storage, MEDIA_BUCKET_ID, ID } from '../appwriteClient';
import { useToast } from '../context/ToastContext';
import './ImageUpload.css';

const ImageUpload = ({ onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const fileInputRef = useRef(null);
    const { success, error } = useToast();

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const validFiles = [];

        selectedFiles.forEach(file => {
            if (!ALLOWED_TYPES.includes(file.type)) {
                error(`${file.name}: Invalid file type. Use JPG, PNG, GIF, or WebP.`);
                return;
            }
            if (file.size > MAX_SIZE) {
                error(`${file.name}: File too large. Max 10MB.`);
                return;
            }
            validFiles.push({
                file,
                preview: URL.createObjectURL(file),
                name: file.name,
                size: file.size
            });
        });

        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => {
            const newFiles = [...prev];
            URL.revokeObjectURL(newFiles[index].preview);
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const uploadFiles = async () => {
        if (files.length === 0) {
            error('Please select images to upload');
            return;
        }

        setUploading(true);
        const results = { success: 0, failed: 0 };

        for (let i = 0; i < files.length; i++) {
            const { file, name } = files[i];
            setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));

            try {
                await storage.createFile(
                    MEDIA_BUCKET_ID,
                    ID.unique(),
                    file
                );
                setUploadProgress(prev => ({ ...prev, [i]: 'success' }));
                results.success++;
            } catch (err) {
                console.error(`Failed to upload ${name}:`, err);
                setUploadProgress(prev => ({ ...prev, [i]: 'error' }));
                results.failed++;
            }
        }

        setUploading(false);

        if (results.success > 0) {
            success(`Uploaded ${results.success} image(s) successfully!`);
            // Clear uploaded files
            files.forEach(f => URL.revokeObjectURL(f.preview));
            setFiles([]);
            setUploadProgress({});
            if (onUploadComplete) onUploadComplete();
        }
        if (results.failed > 0) {
            error(`${results.failed} image(s) failed to upload.`);
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="image-upload-container">
            <div className="upload-header">
                <h3>📸 Upload Gallery Images</h3>
                <p>Upload images to display in the Photo Gallery</p>
            </div>

            {/* Drop Zone */}
            <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="drop-zone-content">
                    <span className="drop-icon">🖼️</span>
                    <p className="drop-text">Click to select images</p>
                    <p className="drop-hint">JPG, PNG, GIF, WebP • Max 10MB each</p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Preview Grid */}
            {files.length > 0 && (
                <div className="preview-section">
                    <div className="preview-header">
                        <span>{files.length} image(s) selected</span>
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                                files.forEach(f => URL.revokeObjectURL(f.preview));
                                setFiles([]);
                            }}
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="preview-grid">
                        {files.map((file, index) => (
                            <div key={index} className={`preview-item ${uploadProgress[index] || ''}`}>
                                <img src={file.preview} alt={file.name} />
                                <div className="preview-overlay">
                                    {uploadProgress[index] === 'uploading' && (
                                        <span className="status-indicator uploading">⏳</span>
                                    )}
                                    {uploadProgress[index] === 'success' && (
                                        <span className="status-indicator success">✅</span>
                                    )}
                                    {uploadProgress[index] === 'error' && (
                                        <span className="status-indicator error">❌</span>
                                    )}
                                    {!uploadProgress[index] && (
                                        <button
                                            className="remove-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFile(index);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                <div className="preview-info">
                                    <span className="preview-name" title={file.name}>
                                        {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                                    </span>
                                    <span className="preview-size">{formatSize(file.size)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Upload Button */}
            {files.length > 0 && (
                <button
                    className="btn btn-primary btn-upload"
                    onClick={uploadFiles}
                    disabled={uploading}
                >
                    {uploading ? (
                        <>
                            <span className="loader loader-sm"></span>
                            Uploading...
                        </>
                    ) : (
                        <>
                            ⬆️ Upload {files.length} Image(s)
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default ImageUpload;
