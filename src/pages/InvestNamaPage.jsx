import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { submitMultipleNamaEntries, getUserStats } from '../services/namaService';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import './InvestNamaPage.css';

// How long a user's stats stay valid in this browser tab's session before
// we refetch from Appwrite. Repeated dashboard/invest-nama visits within
// this window reuse the cached value instead of firing a new read.
const STATS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Guided chant videos — hardcoded, same pattern as the site's existing
// CHANT_VIDEO feature. No database collection, no reads. Thumbnails are
// pulled directly from YouTube's own CDN using the video ID.
const CHANT_VIDEOS = [
    {
        id: 'v1008',
        title: '1008 Times Chanting Powerful Mantra',
        subtitleParts: ['Vibrant Chants · Bhagawan ', 'Yogi Ramsuratkumar'],
        duration: '38 min',
        count: 1008,
        youtubeId: 'KEdWVEJwzOI',
        url: 'https://www.youtube.com/watch?v=KEdWVEJwzOI'
    },
    {
        id: 'v1200',
        title: '1200 Nama in 50 Minutes',
        subtitleParts: ['', 'Yogi Ramsuratkumar', ' Nama Chant with Counter'],
        duration: '50 min',
        count: 1200,
        youtubeId: 'c51S9ahzVcs',
        url: 'https://www.youtube.com/watch?v=c51S9ahzVcs'
    }
];

const InvestNamaPage = () => {
    const { user, linkedAccounts } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();

    const [counts, setCounts] = useState({});
    const [minutes, setMinutes] = useState({});
    const [loading, setLoading] = useState(false);
    const [todayStats, setTodayStats] = useState({ today: 0, totalDevotees: 0 });

    // Single date field — defaults to today
    const getTodayStr = () => new Date().toISOString().split('T')[0];
    const [entryDate, setEntryDate] = useState(getTodayStr());

    const [submissionSuccess, setSubmissionSuccess] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [devoteeCount, setDevoteeCount] = useState('');
    const [showNamaInfoFor, setShowNamaInfoFor] = useState(null);

    // Which single Sankalpa a Chant Along quick-add applies to. Defaulted to
    // the first linked account once accounts load, and changeable via a
    // dropdown — never applied to every linked account automatically.
    const [chantTargetAccount, setChantTargetAccount] = useState('');

    useEffect(() => {
        if (linkedAccounts.length > 0 && !chantTargetAccount) {
            setChantTargetAccount(linkedAccounts[0].id);
        }
    }, [linkedAccounts, chantTargetAccount]);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        const initialCounts = {};
        const initialMinutes = {};
        linkedAccounts.forEach(acc => {
            initialCounts[acc.id] = 0;
            initialMinutes[acc.id] = '';
        });
        setCounts(initialCounts);
        setMinutes(initialMinutes);
        loadTodayStats();
    }, [user, linkedAccounts, navigate]);

    // forceRefresh=true bypasses the session cache — used right after a
    // successful submission, when we genuinely need fresh numbers.
    const loadTodayStats = async (forceRefresh = false) => {
        try {
            const cacheKey = `namavruksha_user_stats_${user.$id}`;

            if (!forceRefresh) {
                try {
                    const cached = sessionStorage.getItem(cacheKey);
                    if (cached) {
                        const { stats, ts } = JSON.parse(cached);
                        if (Date.now() - ts < STATS_CACHE_TTL_MS) {
                            setTodayStats(stats);
                            return;
                        }
                    }
                } catch (readErr) {
                    // Corrupt/unavailable cache entry — fall through to a live fetch
                }
            }

            const stats = await getUserStats(user.$id);
            setTodayStats(stats);
            try {
                sessionStorage.setItem(cacheKey, JSON.stringify({ stats, ts: Date.now() }));
            } catch (writeErr) {
                // sessionStorage unavailable/full — non-fatal
            }
        } catch (err) { console.error('Error loading stats:', err); }
    };

    const handleCountChange = (accountId, value) => {
        const numValue = Math.max(0, parseInt(value) || 0);
        setCounts(prev => ({ ...prev, [accountId]: numValue }));
        setMinutes(prev => ({ ...prev, [accountId]: '' }));
    };

    const handleMinutesChange = (accountId, value) => {
        setMinutes(prev => ({ ...prev, [accountId]: value }));
        const mins = parseFloat(value) || 0;
        setCounts(prev => ({ ...prev, [accountId]: Math.round(mins * 20) }));
    };

    const handleQuickAdd = (accountId, amount) => {
        setCounts(prev => ({ ...prev, [accountId]: (prev[accountId] || 0) + amount }));
        setMinutes(prev => ({ ...prev, [accountId]: '' }));
    };

    // Applies a chant-along video's count to ONLY the selected Sankalpa —
    // reuses the same single-account handleQuickAdd already used by the
    // +108/+54/+27 buttons, so behavior is identical and predictable.
    const handleChantAlongQuickAdd = (amount) => {
        if (!chantTargetAccount) {
            error('Please select a Sankalpa first.');
            return;
        }
        handleQuickAdd(chantTargetAccount, amount);
    };

    const getRawTotal   = () => Object.values(counts).reduce((sum, c) => sum + (c || 0), 0);
    const getMultiplier = () => { const d = parseInt(devoteeCount); return (!isNaN(d) && d > 1) ? d : 1; };
    const getDisplayTotal = () => getRawTotal() * getMultiplier();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!entryDate) {
            error('Please select the date of offering.');
            return;
        }

        // Prevent future dates
        if (entryDate > getTodayStr()) {
            error('Offering date cannot be in the future.');
            return;
        }

        const entries = Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .map(([accountId, count]) => ({ accountId, count, sourceType: 'manual' }));

        if (entries.length === 0) {
            error('Please enter at least one Nama count.');
            return;
        }

        setShowConfirmDialog(true);
    };

    const confirmSubmission = async () => {
        const multiplier = getMultiplier();
        const entries = Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .map(([accountId, count]) => ({
                accountId,
                count: count * multiplier,
                sourceType: 'manual'
            }));

        setShowConfirmDialog(false);
        setLoading(true);

        try {
            await submitMultipleNamaEntries(user.$id, entries, 'manual', entryDate, devoteeCount);
            const total = getDisplayTotal();
            success(`${total.toLocaleString()} Namas offered successfully! Hari Om`);
            setSubmissionSuccess(`Successfully offered ${total.toLocaleString()} Namas! Hari Om.`);

            // Reset — keep date as today for next entry
            const resetCounts = {};
            const resetMinutes = {};
            linkedAccounts.forEach(acc => { resetCounts[acc.id] = 0; resetMinutes[acc.id] = ''; });
            setCounts(resetCounts);
            setMinutes(resetMinutes);
            setEntryDate(getTodayStr());
            setDevoteeCount('');
            loadTodayStats(true); // force a fresh read — a new entry was just submitted
            setTimeout(() => setSubmissionSuccess(null), 5000);
        } catch (err) {
            error('Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;
    const multiplier = getMultiplier();

    return (
        <div className="invest-page page-enter">
            <header className="page-header">
                <div className="container">
                    <Link to="/dashboard" className="back-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        Dashboard
                    </Link>
                    <h1>Credit Nama</h1>
                    <p>Manual Entry - Record your daily devotion</p>
                </div>
            </header>

            <main className="invest-main">
                <div className="container container-sm">
                    {/* User Info */}
                    <div className="user-info-section">
                        <div className="user-profile">
                            <div className="user-avatar-large">
                                {user.profile_photo
                                    ? <img src={user.profile_photo} alt={user.name} />
                                    : <span>{user.name?.charAt(0).toUpperCase()}</span>
                                }
                            </div>
                            <div className="user-details">
                                <h2 className="user-name-display">{user.name}</h2>
                                <p className="user-city-display">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    {user.city || 'Location not set'}
                                </p>
                            </div>
                        </div>
                        <div className="linked-accounts-info">
                            <span className="accounts-label">Linked Accounts:</span>
                            <div className="accounts-tags">
                                {linkedAccounts.map(acc => <span key={acc.id} className="account-tag">{acc.name}</span>)}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="devotees-summary">
                            <div className="summary-content">
                                <span className="summary-label">Total Devotees</span>
                                <span className="summary-value">{todayStats.totalDevotees?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="summary-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                            </div>
                        </div>
                        <div className="today-summary">
                            <div className="summary-content">
                                <span className="summary-label">Today's Total</span>
                                <span className="summary-value">{(todayStats.today ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="summary-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {linkedAccounts.length > 0 && (
                        <div className="chant-along-section" style={{ marginBottom: '2rem' }}>
                            <h3 className="section-title">🎧 Chant Along</h3>
                            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '12px' }}>
                                Follow one of these guided chants, then log your count below.
                            </p>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '0.8rem', color: '#666', display: 'block', marginBottom: '4px' }}>
                                    Quick Add applies to:
                                </label>
                                <select
                                    value={chantTargetAccount}
                                    onChange={(e) => setChantTargetAccount(e.target.value)}
                                    className="form-input"
                                    style={{ maxWidth: '280px' }}
                                >
                                    {linkedAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {CHANT_VIDEOS.map(video => (
                                    <div key={video.id} style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                                        <a href={video.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', position: 'relative' }}>
                                            <img
                                                src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                                                alt={video.title}
                                                style={{ width: '100%', display: 'block', aspectRatio: '16 / 9', objectFit: 'cover' }}
                                            />
                                            <span style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.75)', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
                                                {video.duration}
                                            </span>
                                        </a>
                                        <div style={{ padding: '10px 12px' }}>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '600', margin: '0 0 4px', lineHeight: '1.4' }}>{video.title}</p>
                                            <p style={{ fontSize: '0.75rem', color: '#888', margin: '0 0 8px' }}>
                                                {video.subtitleParts[0]}
                                                <span style={{ whiteSpace: 'nowrap' }}>{video.subtitleParts[1]}</span>
                                                {video.subtitleParts[2]}
                                            </p>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <a
                                                    href={video.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ flex: 1, textAlign: 'center', fontSize: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', padding: '6px', color: '#FF9933', textDecoration: 'none', fontWeight: '600' }}
                                                >
                                                    Watch ↗
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={() => handleChantAlongQuickAdd(video.count)}
                                                    disabled={!chantTargetAccount}
                                                    style={{ flex: 1, fontSize: '0.75rem', border: 'none', borderRadius: '6px', padding: '6px', background: chantTargetAccount ? '#FF9933' : '#ccc', color: 'white', fontWeight: '600', cursor: chantTargetAccount ? 'pointer' : 'not-allowed' }}
                                                >
                                                    +{video.count}
                                                </button>
                                            </div>
                                            {chantTargetAccount && (
                                                <p style={{ fontSize: '0.68rem', color: '#aaa', margin: '6px 0 0', textAlign: 'center' }}>
                                                    Adds to: {linkedAccounts.find(a => a.id === chantTargetAccount)?.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {linkedAccounts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                            </div>
                            <p className="empty-state-title">No Sankalpas Linked</p>
                            <p className="empty-state-text">Contact admin to link your account to a Namavruksha Sankalpa.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="invest-form">

                            {/* ── OFFERING DATE — single field, default today ── */}
                            <div className="date-selection-section">
                                <div style={{ background: '#fff8e1', border: '1px solid #FF9933', borderRadius: '8px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.82rem', color: '#5a3800', lineHeight: '1.6' }}>
                                    🙏 Log your Nama once a day, ideally after your chanting is done for the day. No need to keep checking back — your numbers refresh automatically every few minutes.
                                </div>
                                <h3 className="section-title">Offering Date</h3>
                                <div className="form-group" style={{ maxWidth: '220px' }}>
                                    <label htmlFor="entryDate">
                                        Date <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="entryDate"
                                        value={entryDate}
                                        max={getTodayStr()}
                                        onChange={(e) => setEntryDate(e.target.value)}
                                        className="form-input"
                                        required
                                    />
                                    <p className="date-hint">
                                        Date on which you chanted. Defaults to today.
                                        {entryDate !== getTodayStr() && (
                                            <span
                                                style={{ display: 'block', marginTop: '4px', color: '#FF9933', fontWeight: '600', cursor: 'pointer' }}
                                                onClick={() => setEntryDate(getTodayStr())}
                                            >
                                                ↩ Reset to today
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* ── NUMBER OF DEVOTEES ── */}
                            <div className="devotee-count-section" style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--gray-100)' }}>
                                <h3 className="section-title">Number of Devotees</h3>
                                <div className="form-group" style={{ maxWidth: '200px' }}>
                                    <label htmlFor="devoteeCount">Devotees Count</label>
                                    <input
                                        type="number"
                                        id="devoteeCount"
                                        value={devoteeCount}
                                        onChange={(e) => setDevoteeCount(e.target.value)}
                                        className="form-input"
                                        placeholder="1"
                                        min="1"
                                    />
                                    <p className="date-hint">
                                        How many devotees chanted together?
                                        {multiplier > 1 && (
                                            <span style={{ display: 'block', marginTop: '4px', color: '#FF9933', fontWeight: '600' }}>
                                                ✕ {multiplier} devotees — Session Total will be multiplied
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* ── SANKALPA ENTRIES ── */}
                            <div className="accounts-form">
                                {linkedAccounts.map(account => (
                                    <div key={account.id} className="account-entry">
                                        <div className="account-info">
                                            <span className="account-name">{account.name}</span>
                                            {multiplier > 1 && counts[account.id] > 0 && (
                                                <span style={{ marginLeft: '12px', fontSize: '0.82rem', color: '#FF9933', fontWeight: '600' }}>
                                                    {counts[account.id]} × {multiplier} = {(counts[account.id] * multiplier).toLocaleString()} Namas
                                                </span>
                                            )}
                                        </div>
                                        <div className="count-controls">
                                            <div className="quick-buttons">
                                                <button type="button" className="quick-btn" onClick={() => handleQuickAdd(account.id, 108)}>+108</button>
                                                <button type="button" className="quick-btn" onClick={() => handleQuickAdd(account.id, 54)}>+54</button>
                                                <button type="button" className="quick-btn" onClick={() => handleQuickAdd(account.id, 27)}>+27</button>
                                            </div>
                                            <div className="inputs-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                <div className="input-group" style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', display: 'block' }}>Nama Count</label>
                                                    <input
                                                        type="number"
                                                        value={counts[account.id] || ''}
                                                        onChange={(e) => handleCountChange(account.id, e.target.value)}
                                                        className="form-input count-input"
                                                        min="0" placeholder="0"
                                                    />
                                                </div>
                                                <div className="input-divider" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem', color: '#999' }}>OR</div>
                                                <div className="input-group" style={{ flex: 1, position: 'relative' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        Minutes (Approx)
                                                        <span
                                                            className="info-icon"
                                                            style={{ cursor: 'pointer', fontSize: '1rem', color: '#FF9933', position: 'relative', fontWeight: 'bold' }}
                                                            onMouseEnter={() => setShowNamaInfoFor(account.id)}
                                                            onMouseLeave={() => setShowNamaInfoFor(null)}
                                                            onClick={() => setShowNamaInfoFor(showNamaInfoFor === account.id ? null : account.id)}
                                                        >
                                                            ⓘ
                                                            {showNamaInfoFor === account.id && (
                                                                <div className="nama-info-tooltip" style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px', backgroundColor: '#2d3748', color: 'white', padding: '12px 16px', borderRadius: '8px', fontSize: '0.8rem', lineHeight: '1.5', width: '280px', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                                                                    <strong style={{ color: '#FF9933', display: 'block', marginBottom: '8px' }}>ⓘ Nama Calculation Info</strong>
                                                                    <div style={{ marginBottom: '8px' }}><strong>1 minute = 20 Namas</strong><br/><span style={{ opacity: 0.8 }}>12 seconds = 4 Namas</span></div>
                                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', marginTop: '8px' }}>
                                                                        <strong style={{ color: '#FFD700' }}>Why?</strong><br/>
                                                                        <span style={{ opacity: 0.9 }}>Chanting:</span>
                                                                        <div style={{ fontStyle: 'italic', margin: '6px 0', paddingLeft: '8px', borderLeft: '2px solid #FF9933' }}>
                                                                            Yogi Ramsuratkumar<br/>Yogi Ramsuratkumar<br/>Yogi Ramsuratkumar<br/>Jaya Guru Raya
                                                                        </div>
                                                                        <span style={{ opacity: 0.9 }}>is counted as <strong>4 Namas</strong>, which takes ~12 seconds.</span><br/>
                                                                        <span style={{ opacity: 0.9 }}>So, <strong>1 minute ≈ 5 × 4 = 20 Namas</strong></span>
                                                                    </div>
                                                                    <div style={{ position: 'absolute', top: '-6px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid #2d3748' }}/>
                                                                </div>
                                                            )}
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={minutes[account.id] || ''}
                                                        onChange={(e) => handleMinutesChange(account.id, e.target.value)}
                                                        className="form-input count-input"
                                                        min="0" placeholder="0 min" step="0.5"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Session Total */}
                            <div className="total-display">
                                <span className="total-label">
                                    Session Total
                                    {multiplier > 1 && (
                                        <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '8px', fontWeight: 'normal' }}>
                                            ({getRawTotal().toLocaleString()} × {multiplier} devotees)
                                        </span>
                                    )}
                                </span>
                                <span className="total-value">{getDisplayTotal().toLocaleString()}</span>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || getRawTotal() === 0}>
                                {loading ? <><span className="loader loader-sm"></span>Submitting...</> : 'Offer Namas'}
                            </button>

                            {submissionSuccess && (
                                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--success-light, #d4edda)', color: 'var(--success-dark, #155724)', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', border: '1px solid var(--success-color, #28a745)' }}>
                                    ✓ {submissionSuccess}
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </main>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="confirm-modal-overlay" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="confirm-modal" style={{ background: 'white', borderRadius: '16px', padding: '24px', maxWidth: '420px', width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease' }}>
                        <h3 style={{ fontSize: '1.25rem', color: 'var(--maroon, #8B0000)', marginBottom: '16px', textAlign: 'center' }}>🙏 Confirm Your Offering</h3>

                        <div style={{ background: 'var(--cream-light, #fdf8f3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                            <p style={{ marginBottom: '12px', fontWeight: '600', color: 'var(--gray-700, #374151)' }}>You are offering:</p>

                            {Object.entries(counts).filter(([_, count]) => count > 0).map(([accountId, count]) => {
                                const account = linkedAccounts.find(a => a.id === accountId);
                                const effectiveCount = count * multiplier;
                                return (
                                    <div key={accountId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '8px', background: 'white', borderRadius: '6px' }}>
                                        <span>{account?.name || 'Account'}</span>
                                        <strong style={{ color: 'var(--saffron, #FF9933)' }}>
                                            {effectiveCount.toLocaleString()} Namas
                                            {multiplier > 1 && <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: '6px' }}>({count} × {multiplier})</span>}
                                        </strong>
                                    </div>
                                );
                            })}

                            <div style={{ borderTop: '2px solid var(--saffron, #FF9933)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span>Total</span>
                                <span style={{ color: 'var(--maroon, #8B0000)' }}>{getDisplayTotal().toLocaleString()} Namas</span>
                            </div>

                            {multiplier > 1 && (
                                <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#666', fontStyle: 'italic' }}>
                                    👥 {multiplier} devotees chanted together
                                </div>
                            )}

                            {/* Single date display */}
                            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--gray-500, #6b7280)', fontWeight: '500' }}>
                                📅 Offering Date: <strong>{entryDate}</strong>
                            </div>
                        </div>

                        <div style={{ background: '#fffbe8', border: '1px solid #e8d080', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '0.82rem', color: '#5a3a1a', fontStyle: 'italic', lineHeight: '1.6' }}>
                            "I sincerely confirm that I have chanted on this date and am entering this count truthfully in Bhagawan's name."
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={() => setShowConfirmDialog(false)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                                Cancel
                            </button>
                            <button onClick={confirmSubmission} style={{ flex: 1, padding: '12px', border: 'none', background: 'var(--saffron, #FF9933)', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                                Confirm Offering
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestNamaPage;
