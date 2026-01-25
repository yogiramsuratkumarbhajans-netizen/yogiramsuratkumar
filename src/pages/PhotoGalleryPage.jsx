import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storage, MEDIA_BUCKET_ID } from '../appwriteClient';
import './PhotoGalleryPage.css';

const CATEGORIES = ['All', 'Devotional', 'Temple', 'Scriptures', 'Wallpapers'];

const PhotoGalleryPage = () => {
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [activeCategory, setActiveCategory] = useState('All');
    const [downloading, setDownloading] = useState(null);

    useEffect(() => {
        fetchPhotos();
    }, []);

    const fetchPhotos = async () => {
        try {
            const response = await storage.listFiles(MEDIA_BUCKET_ID);
            // Filter to only include image files (by extension)
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
            const imageFiles = response.files.filter(file =>
                imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
            );

            const fetchedPhotos = imageFiles.map((file) => {
                // Create a title from filename (remove extension and underscores)
                const titleRaw = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
                const title = titleRaw.charAt(0).toUpperCase() + titleRaw.slice(1);

                // Get file extension for download
                const ext = file.name.split('.').pop().toLowerCase();

                // Convert URL objects to strings
                const viewUrl = storage.getFileView(MEDIA_BUCKET_ID, file.$id);
                const previewUrl = storage.getFilePreview(MEDIA_BUCKET_ID, file.$id, 400, 400);

                return {
                    id: file.$id,
                    title: title || 'Divine Photo',
                    url: typeof viewUrl === 'string' ? viewUrl : viewUrl.href || viewUrl.toString(),
                    previewUrl: typeof previewUrl === 'string' ? previewUrl : previewUrl.href || previewUrl.toString(),
                    description: 'Divine glimpses & spiritual wallpapers.',
                    category: 'Wallpapers',
                    extension: ext,
                    mimeType: file.mimeType
                };
            });

            setPhotos(fetchedPhotos);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            setPhotos([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredPhotos = activeCategory === 'All'
        ? photos
        : photos.filter(p => p.category === activeCategory);

    const handleDownload = async (photo) => {
        setDownloading(photo.id);
        try {
            // Get the download URL from Appwrite
            const downloadUrl = storage.getFileDownload(MEDIA_BUCKET_ID, photo.id);
            const urlString = typeof downloadUrl === 'string' ? downloadUrl : downloadUrl.href || downloadUrl.toString();

            const response = await fetch(urlString);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Use proper extension from the original file
            link.download = `${photo.title.replace(/\s+/g, '_')}.${photo.extension || 'jpg'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            // Fallback: open in new tab
            window.open(photo.url, '_blank');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="gallery-page">
            <header className="gallery-header">
                <Link to="/" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Home
                </Link>
                <h1>Photo Gallery</h1>
                <p>Divine glimpses & spiritual wallpapers for your reflection</p>
            </header>

            {/* Category Filter */}
            <div className="gallery-filters">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Gallery Grid */}
            <div className="gallery-grid">
                {loading ? (
                    <div className="loading-gallery">
                        <div className="loader-sm" style={{ width: '40px', height: '40px', borderTopColor: '#8B0000', margin: '0 auto' }}></div>
                        <p style={{ marginTop: '20px', color: '#666' }}>Loading divine images...</p>
                    </div>
                ) : filteredPhotos.length === 0 ? (
                    <div className="empty-gallery">
                        <p>No photos found in this category.</p>
                    </div>
                ) : (
                    filteredPhotos.map(photo => (
                        <div key={photo.id} className="photo-card">
                            <div className="photo-wrapper" onClick={() => setSelectedPhoto(photo)}>
                                <img src={photo.previewUrl || photo.url} alt={photo.title} loading="lazy" />
                                <div className="photo-overlay">
                                    <span className="view-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                            <line x1="11" y1="8" x2="11" y2="14" />
                                            <line x1="8" y1="11" x2="14" y2="11" />
                                        </svg>
                                    </span>
                                </div>
                            </div>
                            <div className="photo-info">
                                <h3>{photo.title}</h3>
                                <button
                                    className="download-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(photo);
                                    }}
                                    disabled={downloading === photo.id}
                                >
                                    {downloading === photo.id ? (
                                        <span className="loader-sm"></span>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                    )}
                                    Download
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Lightbox Modal */}
            {selectedPhoto && (
                <div className="photo-modal" onClick={() => setSelectedPhoto(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setSelectedPhoto(null)}>&times;</button>
                        <img src={selectedPhoto.url} alt={selectedPhoto.title} />
                        <div className="modal-info">
                            <h2>{selectedPhoto.title}</h2>
                            <p>{selectedPhoto.description}</p>
                        </div>
                        <div className="modal-actions">
                            <button
                                className="modal-download"
                                onClick={() => handleDownload(selectedPhoto)}
                                disabled={downloading === selectedPhoto.id}
                            >
                                {downloading === selectedPhoto.id ? (
                                    <>
                                        <span className="loader-sm"></span>
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Download Wallpaper
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Section */}
            <div className="gallery-info">
                <p>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    More photos will automatically appear here as they are added.
                </p>
            </div>
        </div>
    );
};

export default PhotoGalleryPage;
