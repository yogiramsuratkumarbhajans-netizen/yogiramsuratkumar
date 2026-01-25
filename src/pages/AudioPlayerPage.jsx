import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { submitNamaEntry } from '../services/namaService';
import { storage, MEDIA_BUCKET_ID } from '../appwriteClient';
import './AudioPlayerPage.css';

const AudioPlayerPage = () => {
    const { user, linkedAccounts } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();
    const audioRef = useRef(null);
    const simulationRef = useRef(null);

    // Audio state
    const [audioFiles, setAudioFiles] = useState([]);
    const [selectedAudio, setSelectedAudio] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [loopCount, setLoopCount] = useState(0);
    const [maxLoops, setMaxLoops] = useState(0); // 0 means infinite, 4 for NamaJapa
    const [namaCount, setNamaCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Mode Selection State
    const [inputMode, setInputMode] = useState('nama'); // 'nama' or 'minutes'
    const [minutes, setMinutes] = useState(0);
    const [showNamaInfo, setShowNamaInfo] = useState(false);

    // Submission state
    const [selectedAccount, setSelectedAccount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('namajapa'); // 'namajapa' or 'normal'

    // Computed: Separated audio files
    const namaJapaAudio = audioFiles.filter(a => a.isNamaJapa);
    const normalAudio = audioFiles.filter(a => !a.isNamaJapa);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (linkedAccounts.length > 0 && !selectedAccount) {
            setSelectedAccount(linkedAccounts[0].id);
        }
        fetchAudioFiles();
    }, [user, linkedAccounts, navigate, selectedAccount]);

    const fetchAudioFiles = async () => {
        try {
            const response = await storage.listFiles(MEDIA_BUCKET_ID);
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
            const audioFilesFiltered = response.files.filter(file =>
                audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
            );
            const files = audioFilesFiltered.map((file, index) => {
                const isNamaJapa = file.name.startsWith('NamaJapa_');
                // Convert URL object to string
                const viewUrl = storage.getFileView(MEDIA_BUCKET_ID, file.$id);
                const urlString = typeof viewUrl === 'string' ? viewUrl : viewUrl.href || viewUrl.toString();

                return {
                    id: file.$id,
                    title: file.name.replace(/\.[^/.]+$/, '').replace('NamaJapa_', '').replace(/_/g, ' '),
                    src: urlString,
                    isNamaJapa: isNamaJapa,
                    maxLoops: 0  // 0 means infinite looping
                };
            });
            setAudioFiles(files);
            if (files.length > 0) setSelectedAudio(files[0]);
        } catch (err) {
            console.error('Error fetching audio files:', err);
            setAudioFiles([]);
        } finally {
            setLoading(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (simulationRef.current) {
                clearInterval(simulationRef.current);
            }
        };
    }, []);

    // Refs for event handlers
    const loopCountRef = useRef(0);
    const maxLoopsRef = useRef(1);
    const isPlayingRef = useRef(false);
    const isProcessingEndRef = useRef(false); // Guard to prevent multiple rapid triggers
    const lastEndTimeRef = useRef(0); // Debounce timestamp

    useEffect(() => { loopCountRef.current = loopCount; }, [loopCount]);
    useEffect(() => { maxLoopsRef.current = selectedAudio?.maxLoops || 1; }, [selectedAudio]);
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

    // Handle Audio Ended - Loop infinitely until user stops
    // Added debounce and guard to prevent rapid multiple triggers (Issue #07)
    const handleAudioEnded = () => {
        const now = Date.now();

        // Debounce: Ignore if called within 500ms of last call
        if (now - lastEndTimeRef.current < 500) {
            console.log('Audio ended debounced - ignoring rapid trigger');
            return;
        }

        // Guard: Prevent concurrent processing
        if (isProcessingEndRef.current) {
            console.log('Audio ended already processing - ignoring');
            return;
        }

        isProcessingEndRef.current = true;
        lastEndTimeRef.current = now;

        console.log('Audio ended - current loop:', loopCountRef.current);
        const newCount = loopCountRef.current + 1;
        setLoopCount(newCount);

        if (inputMode === 'nama') {
            setNamaCount(prev => prev + 4);
        }

        // Always loop - only stop when user manually stops
        if (isPlayingRef.current && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play()
                .then(() => {
                    isProcessingEndRef.current = false;
                })
                .catch(err => {
                    console.log('Replay failed:', err);
                    isProcessingEndRef.current = false;
                });
        } else {
            isProcessingEndRef.current = false;
        }
    };

    const stopSimulation = () => {
        if (simulationRef.current) {
            clearInterval(simulationRef.current);
            simulationRef.current = null;
        }
    };

    const handlePlay = (audio) => {
        if (selectedAudio?.id !== audio.id) {
            setLoopCount(0);
            if (inputMode === 'nama') setNamaCount(0);
        }
        setSelectedAudio(audio);
        setIsPlaying(true);
        setIsPaused(false);

        setTimeout(() => {
            if (audioRef.current) {
                audioRef.current.src = audio.src;
                audioRef.current.load();
                audioRef.current.play().catch(err => {
                    console.error('Audio play failed:', err);
                });
            }
        }, 100);
    };

    const handlePause = () => {
        setIsPlaying(false);
        setIsPaused(true);
        stopSimulation();
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    const handleResume = () => {
        setIsPlaying(true);
        setIsPaused(false);
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }
    };

    const handleStop = () => {
        setIsPlaying(false);
        setIsPaused(false);
        stopSimulation();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const handleModeChange = (e) => {
        const mode = e.target.value;
        setInputMode(mode);
        if (mode === 'nama') {
            setMinutes(0);
        } else {
            setNamaCount(0);
            handleStop();
        }
    };

    const handleRevert = () => {
        setInputMode('nama');
        setNamaCount(0);
        setMinutes(0);
        handleStop();
    };

    const handleSubmit = async () => {
        if (!selectedAccount) {
            error('Please select a Namavruksha Sankalpa.');
            return;
        }

        // Convert minutes to namas if in minutes mode (1 min = 20 namas)
        let namaValueToSubmit;
        if (inputMode === 'nama') {
            namaValueToSubmit = namaCount;
        } else {
            // Minutes mode: convert to namas (1 minute = 20 namas)
            namaValueToSubmit = Math.round(minutes * 20);
        }

        if (namaValueToSubmit <= 0) {
            error(`Please enter valid ${inputMode === 'nama' ? 'Namas' : 'Minutes'} to submit.`);
            return;
        }

        setSubmitting(true);
        handleStop();

        try {
            // Always submit as 'audio' type for data consistency
            await submitNamaEntry(user.id || user.$id, selectedAccount, namaValueToSubmit, 'audio');

            const displayValue = inputMode === 'nama' ? namaValueToSubmit : minutes;
            const displayUnit = inputMode === 'nama' ? 'Namas' : `Minutes (${namaValueToSubmit} Namas)`;
            success(`${displayValue} ${displayUnit} submitted! Hari Om 🙏`);

            setLoopCount(0);
            setNamaCount(0);
            setMinutes(0);
        } catch (err) {
            console.error('Submit error:', err);
            error('Failed to submit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="audio-page page-enter">
            <header className="page-header">
                <div className="container">
                    <Link to="/dashboard" className="back-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Dashboard
                    </Link>
                    <h1>ॐ ॐ ॐ Nama Audio</h1>
                    <p>Play & Auto Count - Chant along with the audio</p>
                </div>
            </header>

            <main className="audio-main">
                <div className="container">
                    {/* Mode Selection UI */}
                    <div style={{
                        background: 'white',
                        padding: '1rem',
                        borderRadius: '12px',
                        marginBottom: '1.5rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '1.5rem'
                    }}>
                        <span style={{ fontWeight: '600', color: '#555' }}>Input Mode: Nama Count (Auto)</span>

                        <button
                            onClick={handleRevert}
                            style={{
                                marginLeft: 'auto',
                                background: '#f5f5f5',
                                border: '1px solid #ddd',
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '0.85rem',
                                color: '#666',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            Reset
                        </button>
                    </div>

                    <div className="audio-layout">
                        {/* Audio List with Tabs */}
                        <div className="audio-list-section">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 18V5l12-2v13" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                </svg>
                                Audio Files
                            </h2>

                            {/* Tab Description */}
                            <div style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                background: 'rgba(255,153,51,0.1)',
                                fontSize: '0.85rem',
                                color: '#666'
                            }}>
                                🔁 Audio files loop continuously. Each loop adds +4 to your Nama count.
                            </div>

                            <div className="audio-list">
                                {loading ? (
                                    <div className="loading-audio"><div className="loader-sm"></div><p>Loading audio...</p></div>
                                ) : audioFiles.length === 0 ? (
                                    <p className="no-audio">No audio files available.</p>
                                ) : (
                                    audioFiles.map((audio, index) => (
                                        <div
                                            key={audio.id}
                                            className={`audio-item ${selectedAudio?.id === audio.id ? 'active' : ''} ${selectedAudio?.id === audio.id && isPlaying ? 'playing' : ''}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem',
                                                marginBottom: '0.75rem',
                                                background: selectedAudio?.id === audio.id ? '#FFF8E1' : 'white',
                                                borderRadius: '10px',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                                border: selectedAudio?.id === audio.id ? '1px solid #FF9933' : '1px solid #eee'
                                            }}
                                        >
                                            <div className="audio-item-info" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                                                <span className="audio-number" style={{
                                                    minWidth: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: '#eee', borderRadius: '50%', fontSize: '0.8rem', fontWeight: 'bold'
                                                }}>{index + 1}</span>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className="audio-title" style={{ fontWeight: '600' }}>{audio.title}</span>
                                                    <span className="audio-type-badge" style={{ fontSize: '0.7rem', color: '#FF6600', marginTop: '2px' }}>
                                                        🔁 Infinite Loop (until stopped)
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="audio-item-controls" style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => {
                                                        if (selectedAudio?.id === audio.id && isPaused) handleResume();
                                                        else handlePlay(audio);
                                                    }}
                                                    disabled={selectedAudio?.id === audio.id && isPlaying}
                                                    title="Play"
                                                    style={{
                                                        width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                                                        background: selectedAudio?.id === audio.id && isPlaying ? '#ccc' : '#4CAF50',
                                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                </button>
                                                <button
                                                    onClick={handlePause}
                                                    disabled={!(selectedAudio?.id === audio.id && isPlaying)}
                                                    title="Pause"
                                                    style={{
                                                        width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                                                        background: !(selectedAudio?.id === audio.id && isPlaying) ? '#eee' : '#FF9933',
                                                        color: !(selectedAudio?.id === audio.id && isPlaying) ? '#aaa' : 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                                </button>
                                                <button
                                                    onClick={handleStop}
                                                    disabled={!(selectedAudio?.id === audio.id && (isPlaying || isPaused))}
                                                    title="Stop"
                                                    style={{
                                                        width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                                                        background: !(selectedAudio?.id === audio.id && (isPlaying || isPaused)) ? '#eee' : '#ef4444',
                                                        color: !(selectedAudio?.id === audio.id && (isPlaying || isPaused)) ? '#aaa' : 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Counter Section */}
                        <div className="counter-section">
                            <div className="account-selector" style={{ marginBottom: '1.5rem' }}>
                                <label className="form-label">Select Sankalpa</label>
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="form-input form-select"
                                >
                                    {linkedAccounts.map(account => (
                                        <option key={account.id} value={account.id}>{account.name}</option>
                                    ))}
                                </select>
                            </div>

                            {inputMode === 'nama' ? (
                                <>
                                    <div className="now-playing">
                                        <span className="now-playing-label">NOW PLAYING</span>
                                        <span className="now-playing-title">{selectedAudio?.title || 'Select an audio to chant'}</span>
                                        {isPlaying && <div className="playing-indicator"><span className="bar"></span><span className="bar"></span><span className="bar"></span></div>}
                                        {isPaused && <span className="paused-badge">PAUSED</span>}
                                    </div>
                                    <div className="live-counter">
                                        <div className="counter-display">
                                            <div className="counter-value">{namaCount}</div>
                                            <div className="counter-label">Namas Counted</div>
                                        </div>
                                        <div className="loop-info">
                                            <span className="loop-count">{loopCount} loops (infinite)</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ background: '#f0fff4', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #c6f6d5', textAlign: 'center' }}>
                                    <label className="form-label" style={{ color: '#2E7D32', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        Enter Minutes Chanted
                                        <span
                                            style={{
                                                cursor: 'pointer',
                                                fontSize: '1rem',
                                                color: '#FF9933',
                                                position: 'relative',
                                                fontWeight: 'bold'
                                            }}
                                            onMouseEnter={() => setShowNamaInfo(true)}
                                            onMouseLeave={() => setShowNamaInfo(false)}
                                            onClick={() => setShowNamaInfo(!showNamaInfo)}
                                            title="Nama Calculation Info"
                                        >
                                            ⓘ
                                            {showNamaInfo && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        marginTop: '8px',
                                                        backgroundColor: '#2d3748',
                                                        color: 'white',
                                                        padding: '12px 16px',
                                                        borderRadius: '8px',
                                                        fontSize: '0.75rem',
                                                        lineHeight: '1.5',
                                                        width: '260px',
                                                        zIndex: 100,
                                                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                                                        textAlign: 'left'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <strong style={{ color: '#FF9933', display: 'block', marginBottom: '6px' }}>ⓘ Nama Calculation</strong>
                                                    <strong>1 minute = 20 Namas</strong><br />
                                                    <span style={{ opacity: 0.9, fontSize: '0.7rem' }}>Chanting the mantra 5 times = 20 Namas</span>
                                                </div>
                                            )}
                                        </span>
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <input
                                            type="number" min="0" value={minutes}
                                            onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                            style={{ fontSize: '2rem', width: '120px', textAlign: 'center', padding: '0.5rem', borderRadius: '8px', border: '2px solid #4CAF50', outline: 'none', color: '#2E7D32', fontWeight: 'bold' }}
                                        />
                                        <span style={{ fontSize: '1.2rem', color: '#2E7D32' }}>Mins</span>
                                    </div>
                                    {minutes > 0 && (
                                        <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#666' }}>
                                            = <strong style={{ color: '#FF9933' }}>{Math.round(minutes * 20)}</strong> Namas
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-lg w-full"
                                onClick={handleSubmit}
                                disabled={submitting || (inputMode === 'nama' ? namaCount === 0 : minutes === 0)}
                                style={{ marginTop: '1rem' }}
                            >
                                {submitting ? 'Submitting...' : (
                                    inputMode === 'nama'
                                        ? `Submit ${namaCount} Namas`
                                        : `Submit ${minutes} Minutes (${Math.round(minutes * 20)} Namas)`
                                )}
                            </button>

                            {inputMode === 'nama' && (
                                <div className="audio-info">
                                    <p>Audio loops <strong>infinitely</strong>. Each loop adds <strong>+4</strong> to your count. Press Stop when done!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <audio ref={audioRef} onEnded={handleAudioEnded} crossOrigin="anonymous" preload="auto" style={{ display: 'none' }} />
        </div>
    );
};

export default AudioPlayerPage;
