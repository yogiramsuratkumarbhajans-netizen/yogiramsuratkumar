import { useState, useRef } from 'react';
import { storage, MEDIA_BUCKET_ID, ID } from '../appwriteClient';
import { useToast } from '../context/ToastContext';
import './AudioUpload.css';

const AudioUpload = ({ onUploadComplete }) => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({});
    const [audioType, setAudioType] = useState('normal'); // 'normal' or 'namajapa'
    const fileInputRef = useRef(null);
    const { success, error } = useToast();

    const ALLOWED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac'];
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB

    const handleFileSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        const validFiles = [];

        selectedFiles.forEach(file => {
            if (!ALLOWED_TYPES.includes(file.type)) {
                error(`${file.name}: Invalid file type. Use MP3, WAV, OGG, M4A, AAC, or FLAC.`);
                return;
            }
            if (file.size > MAX_SIZE) {
                error(`${file.name}: File too large. Max 50MB.`);
                return;
            }
            validFiles.push({
                file,
                name: file.name,
                size: file.size,
                duration: null
            });
        });

        setFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setFiles(prev => {
            const newFiles = [...prev];
            newFiles.splice(index, 1);
            return newFiles;
        });
    };

    const uploadFiles = async () => {
        if (files.length === 0) {
            error('Please select audio files to upload');
            return;
        }

        setUploading(true);
        const results = { success: 0, failed: 0 };

        for (let i = 0; i < files.length; i++) {
            const { file, name } = files[i];
            setUploadProgress(prev => ({ ...prev, [i]: 'uploading' }));

            try {
                // Add prefix for Nama Japa audio files
                let uploadFile = file;
                if (audioType === 'namajapa' && !name.startsWith('NamaJapa_')) {
                    const newFileName = `NamaJapa_${name}`;
                    uploadFile = new File([file], newFileName, { type: file.type });
                }

                await storage.createFile(
                    MEDIA_BUCKET_ID,
                    ID.unique(),
                    uploadFile
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
            success(`Uploaded ${results.success} audio file(s) successfully!`);
            setFiles([]);
            setUploadProgress({});
            if (onUploadComplete) onUploadComplete();
        }
        if (results.failed > 0) {
            error(`${results.failed} audio file(s) failed to upload.`);
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="audio-upload-container">
            <div className="upload-header">
                <h3>🎵 Upload Audio Files</h3>
                <p>Upload audio for Nama Japa Collection</p>
            </div>

            {/* Audio Type Selector */}
            <div className="audio-type-selector" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Audio Type:</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <label className="radio-option" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        background: audioType === 'normal' ? 'rgba(255,153,51,0.15)' : '#fff',
                        border: audioType === 'normal' ? '2px solid #FF9933' : '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        flex: 1
                    }}>
                        <input
                            type="radio"
                            name="audioType"
                            value="normal"
                            checked={audioType === 'normal'}
                            onChange={(e) => setAudioType(e.target.value)}
                        />
                        <div>
                            <strong>🎧 Normal Audio</strong>
                            <small style={{ display: 'block', color: '#666' }}>Plays once</small>
                        </div>
                    </label>
                    <label className="radio-option" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1rem',
                        background: audioType === 'namajapa' ? 'rgba(255,153,51,0.15)' : '#fff',
                        border: audioType === 'namajapa' ? '2px solid #FF9933' : '2px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        flex: 1
                    }}>
                        <input
                            type="radio"
                            name="audioType"
                            value="namajapa"
                            checked={audioType === 'namajapa'}
                            onChange={(e) => setAudioType(e.target.value)}
                        />
                        <div>
                            <strong>🕉️ Nama Japa Loop</strong>
                            <small style={{ display: 'block', color: '#666' }}>Loops 4 times</small>
                        </div>
                    </label>
                </div>
            </div>

            {/* Drop Zone */}
            <div
                className="drop-zone audio-drop"
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="drop-zone-content">
                    <span className="drop-icon">🎶</span>
                    <p className="drop-text">Click to select audio files</p>
                    <p className="drop-hint">MP3, WAV, OGG, M4A • Max 50MB each</p>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="file-list-section">
                    <div className="file-list-header">
                        <span>{files.length} audio file(s) selected</span>
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => setFiles([])}
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="file-list">
                        {files.map((file, index) => (
                            <div key={index} className={`file-item ${uploadProgress[index] || ''}`}>
                                <div className="file-icon">🎵</div>
                                <div className="file-info">
                                    <span className="file-name" title={file.name}>
                                        {file.name.length > 30 ? file.name.substring(0, 30) + '...' : file.name}
                                    </span>
                                    <span className="file-size">{formatSize(file.size)}</span>
                                </div>
                                <div className="file-status">
                                    {uploadProgress[index] === 'uploading' && <span className="status uploading">⏳</span>}
                                    {uploadProgress[index] === 'success' && <span className="status success">✅</span>}
                                    {uploadProgress[index] === 'error' && <span className="status error">❌</span>}
                                    {!uploadProgress[index] && (
                                        <button
                                            className="remove-btn"
                                            onClick={() => removeFile(index)}
                                        >
                                            ✕
                                        </button>
                                    )}
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
                            ⬆️ Upload {files.length} Audio File(s)
                        </>
                    )}
                </button>
            )}
        </div>
    );
};

export default AudioUpload;
