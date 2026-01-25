import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { storage, MEDIA_BUCKET_ID } from '../appwriteClient';
import './AudioGalleryPage.css';

const ALBUMS = [
    {
        title: 'Nama Japa Collection',
        description: 'Sacred chants of Yogi Ramsuratkumar',
        coverColor: '#FF9933',
        icon: '🕉️',
        count: 5
    },
    {
        title: 'Spiritual Discourses',
        description: 'Coming soon...',
        coverColor: '#4CAF50',
        icon: '📿',
        count: 0
    }
];

const AudioGalleryPage = () => {
    const [selectedAlbum, setSelectedAlbum] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('title');
    const [playingAudio, setPlayingAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [favorites, setFavorites] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [audioFiles, setAudioFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const audioRef = useRef(null);

    useEffect(() => {
        const stored = localStorage.getItem('audio_favorites');
        if (stored) setFavorites(JSON.parse(stored));

        // Fetch audio files from Appwrite Storage
        fetchAudioFiles();
    }, []);

    const fetchAudioFiles = async () => {
        try {
            const response = await storage.listFiles(MEDIA_BUCKET_ID);
            // Filter to only include audio files (by extension)
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
            const audioFilesFiltered = response.files.filter(file =>
                audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
            );
            const files = audioFilesFiltered.map((file, index) => {
                // Convert URL object to string
                const viewUrl = storage.getFileView(MEDIA_BUCKET_ID, file.$id);
                const urlString = typeof viewUrl === 'string' ? viewUrl : viewUrl.href || viewUrl.toString();
                const ext = file.name.split('.').pop().toLowerCase();

                return {
                    id: file.$id,
                    album: 'Nama Japa Collection',
                    title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '), // Remove extension and underscores
                    src: urlString,
                    duration: '-:--',
                    extension: ext
                };
            });
            setAudioFiles(files);
        } catch (error) {
            console.error('Error fetching audio files:', error);
            setAudioFiles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
        };
    }, [playingAudio]);

    const toggleFavorite = (id) => {
        const newFavs = favorites.includes(id)
            ? favorites.filter(fid => fid !== id)
            : [...favorites, id];
        setFavorites(newFavs);
        localStorage.setItem('audio_favorites', JSON.stringify(newFavs));
    };

    const handlePlayPause = (audio) => {
        if (playingAudio?.id === audio.id) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                audioRef.current.play();
                setIsPlaying(true);
            }
        } else {
            setPlayingAudio(audio);
            setIsPlaying(true);
            setCurrentTime(0);
            setTimeout(() => {
                if (audioRef.current) {
                    audioRef.current.src = audio.src;
                    audioRef.current.play();
                }
            }, 0);
        }
    };

    const handleSeek = (e) => {
        const seekTime = (e.target.value / 100) * duration;
        audioRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return '0:00';
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleDownload = async (audio) => {
        try {
            // Get the download URL from Appwrite
            const downloadUrl = storage.getFileDownload(MEDIA_BUCKET_ID, audio.id);
            const urlString = typeof downloadUrl === 'string' ? downloadUrl : downloadUrl.href || downloadUrl.toString();

            const response = await fetch(urlString);
            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${audio.title.replace(/\s+/g, '_')}.${audio.extension || 'mp3'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            // Fallback: open in new tab
            window.open(audio.src, '_blank');
        }
    };

    const filteredAudios = audioFiles
        .filter(a => !selectedAlbum || a.album === selectedAlbum)
        .filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortBy === 'title') return a.title.localeCompare(b.title);
            if (sortBy === 'favorites') {
                const aFav = favorites.includes(a.id) ? 0 : 1;
                const bFav = favorites.includes(b.id) ? 0 : 1;
                return aFav - bFav;
            }
            return 0;
        });

    return (
        <div className="audio-gallery-page">
            <header className="audio-header">
                <Link to="/" className="back-link">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back to Home
                </Link>
                <h1>Satsang Audios</h1>
                <p>Listen to divine chants, bhajans and spiritual discourses</p>
            </header>

            {!selectedAlbum ? (
                <div className="albums-section">
                    <h2 className="section-title">Albums</h2>
                    <div className="albums-grid">
                        {ALBUMS.map(album => (
                            <div
                                key={album.title}
                                className={`album-card ${album.count === 0 ? 'disabled' : ''}`}
                                onClick={() => album.count > 0 && setSelectedAlbum(album.title)}
                                style={{ '--accent-color': album.coverColor }}
                            >
                                <div className="album-art">
                                    <span className="album-icon">{album.icon}</span>
                                </div>
                                <div className="album-info">
                                    <h3>{album.title}</h3>
                                    <p>{album.description}</p>
                                    <span className="track-count">{audioFiles.length > 0 ? audioFiles.length : album.count} Tracks</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="audio-list-view">
                    <div className="view-header">
                        <button className="back-to-albums" onClick={() => setSelectedAlbum(null)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12" />
                                <polyline points="12 19 5 12 12 5" />
                            </svg>
                            Back to Albums
                        </button>
                        <div className="view-controls">
                            <div className="search-box">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search tracks..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="title">Sort by Title</option>
                                <option value="id">Sort by Date Added</option>
                                <option value="favorites">Sort by Favorites</option>
                            </select>
                        </div>
                    </div>

                    <h2 className="album-title">{selectedAlbum}</h2>

                    <div className="audio-items-list">
                        {loading ? (
                            <div className="loading-gallery">
                                <div className="loader-sm" style={{ width: '40px', height: '40px', borderTopColor: '#8B0000', margin: '0 auto' }}></div>
                                <p style={{ marginTop: '20px', color: '#666' }}>Loading audio files...</p>
                            </div>
                        ) : filteredAudios.length === 0 ? (
                            <p className="no-results">No tracks found.</p>
                        ) : (
                            filteredAudios.map((audio, index) => (
                                <div
                                    key={audio.id}
                                    className={`audio-item ${playingAudio?.id === audio.id ? 'active' : ''}`}
                                >
                                    <span className="track-number">{index + 1}</span>

                                    <button
                                        className={`play-btn ${playingAudio?.id === audio.id && isPlaying ? 'playing' : ''}`}
                                        onClick={() => handlePlayPause(audio)}
                                    >
                                        {playingAudio?.id === audio.id && isPlaying ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                            </svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="5 3 19 12 5 21 5 3" />
                                            </svg>
                                        )}
                                    </button>

                                    <div className="track-info">
                                        <h4>{audio.title}</h4>
                                        <span className="track-duration">{audio.duration}</span>
                                    </div>

                                    <div className="track-actions">
                                        <button
                                            className={`action-btn favorite ${favorites.includes(audio.id) ? 'active' : ''}`}
                                            onClick={() => toggleFavorite(audio.id)}
                                            title="Add to Favorites"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={favorites.includes(audio.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                            </svg>
                                        </button>
                                        <button
                                            className="action-btn download"
                                            onClick={() => handleDownload(audio)}
                                            title="Download Audio"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Audio Player Bar */}
            {playingAudio && (
                <div className="audio-player-bar">
                    <div className="player-track-info">
                        <span className="now-playing-label">Now Playing</span>
                        <strong>{playingAudio.title}</strong>
                    </div>

                    <div className="player-controls">
                        <button className="player-btn" onClick={() => handlePlayPause(playingAudio)}>
                            {isPlaying ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5 3 19 12 5 21 5 3" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="player-progress">
                        <span className="time-current">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={duration ? (currentTime / duration) * 100 : 0}
                            onChange={handleSeek}
                            className="progress-slider"
                        />
                        <span className="time-duration">{formatTime(duration)}</span>
                    </div>

                    <button className="close-player" onClick={() => {
                        audioRef.current?.pause();
                        setPlayingAudio(null);
                        setIsPlaying(false);
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>

                    <audio
                        ref={audioRef}
                        onEnded={() => setIsPlaying(false)}
                        style={{ display: 'none' }}
                    />
                </div>
            )}
        </div>
    );
};

export default AudioGalleryPage;
