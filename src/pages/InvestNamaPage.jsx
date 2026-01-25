import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { submitMultipleNamaEntries, getUserStats } from '../services/namaService';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import './InvestNamaPage.css';

const InvestNamaPage = () => {
    const { user, linkedAccounts } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();

    const [counts, setCounts] = useState({});
    const [minutes, setMinutes] = useState({}); // Track minutes separately
    const [loading, setLoading] = useState(false);
    const [todayStats, setTodayStats] = useState({ today: 0, totalDevotees: 0 });
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [submissionSuccess, setSubmissionSuccess] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [devoteeCount, setDevoteeCount] = useState('');
    const [showNamaInfoFor, setShowNamaInfoFor] = useState(null); // Track which account tooltip to show

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        // Initialize counts and minutes for each account
        const initialCounts = {};
        const initialMinutes = {};
        linkedAccounts.forEach(acc => {
            initialCounts[acc.id] = 0;
            initialMinutes[acc.id] = '';
        });
        setCounts(initialCounts);
        setMinutes(initialMinutes);
        setCounts(initialCounts);
        setMinutes(initialMinutes);
        loadTodayStats();
    }, [user, linkedAccounts, navigate]);

    const loadTodayStats = async () => {
        try {
            const stats = await getUserStats(user.$id);
            setTodayStats(stats);
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };



    const handleCountChange = (accountId, value) => {
        const numValue = Math.max(0, parseInt(value) || 0);
        setCounts(prev => ({ ...prev, [accountId]: numValue }));
        // Clear minutes when count is entered directly (one-way: Minutes -> Count only)
        setMinutes(prev => ({ ...prev, [accountId]: '' }));
    };

    const handleMinutesChange = (accountId, value) => {
        // Store minutes value
        setMinutes(prev => ({ ...prev, [accountId]: value }));
        // Calculate count from minutes (20 namas per minute)
        // 1 min = 20 Namas (chanting the mantra 5 times, 4 Namas each = 20)
        const mins = parseFloat(value) || 0;
        const calculatedCount = Math.round(mins * 20);
        setCounts(prev => ({ ...prev, [accountId]: calculatedCount }));
    };

    const handleQuickAdd = (accountId, amount) => {
        setCounts(prev => ({
            ...prev,
            [accountId]: (prev[accountId] || 0) + amount
        }));
        // Clear minutes when using quick add (direct count input)
        setMinutes(prev => ({ ...prev, [accountId]: '' }));
    };

    const getTotalCount = () => {
        return Object.values(counts).reduce((sum, count) => sum + (count || 0), 0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const entries = Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .map(([accountId, count]) => ({
                accountId,
                count,
                sourceType: 'manual'
            }));

        if (entries.length === 0) {
            error('Please enter at least one Nama count.');
            return;
        }

        // Show confirmation dialog
        setShowConfirmDialog(true);
    };

    const confirmSubmission = async () => {
        const entries = Object.entries(counts)
            .filter(([_, count]) => count > 0)
            .map(([accountId, count]) => ({
                accountId,
                count,
                sourceType: 'manual'
            }));

        setShowConfirmDialog(false);
        setLoading(true);

        try {
            await submitMultipleNamaEntries(user.$id, entries, 'manual', startDate, endDate, devoteeCount);
            const total = getTotalCount();
            success(`${total} Namas offered successfully! Hari Om`);
            setSubmissionSuccess(`Successfully offered ${total} Namas! Hari Om.`);

            // Reset counts and minutes
            const resetCounts = {};
            const resetMinutes = {};
            linkedAccounts.forEach(acc => {
                resetCounts[acc.id] = 0;
                resetMinutes[acc.id] = '';
            });
            setCounts(resetCounts);
            setMinutes(resetMinutes);
            setStartDate('');
            setStartDate('');
            setEndDate('');
            setDevoteeCount('');
            loadTodayStats();

            // Clear success message after 5 seconds
            setTimeout(() => setSubmissionSuccess(null), 5000);
        } catch (err) {
            error('Failed to submit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="invest-page page-enter">
            <header className="page-header">
                <div className="container">
                    <Link to="/dashboard" className="back-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Dashboard
                    </Link>
                    <h1>Credit Nama</h1>
                    <p>Manual Entry - Record your daily devotion</p>
                </div>
            </header>

            <main className="invest-main">
                <div className="container container-sm">
                    {/* User Info Section */}
                    <div className="user-info-section">
                        <div className="user-profile">
                            <div className="user-avatar-large">
                                {user.profile_photo ? (
                                    <img src={user.profile_photo} alt={user.name} />
                                ) : (
                                    <span>{user.name?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="user-details">
                                <h2 className="user-name-display">{user.name}</h2>
                                <p className="user-city-display">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {user.city || 'Location not set'}
                                </p>
                            </div>
                        </div>
                        <div className="linked-accounts-info">
                            <span className="accounts-label">Linked Accounts:</span>
                            <div className="accounts-tags">
                                {linkedAccounts.map(acc => (
                                    <span key={acc.id} className="account-tag">{acc.name}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="stats-grid">
                        {/* Total Devotees */}
                        <div className="devotees-summary">
                            <div className="summary-content">
                                <span className="summary-label">Total Devotees</span>
                                <span className="summary-value">{todayStats.totalDevotees?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="summary-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                        </div>

                        {/* Today's Summary */}
                        <div className="today-summary">
                            <div className="summary-content">
                                <span className="summary-label">Today's Total</span>
                                <span className="summary-value">{(todayStats.today ?? 0).toLocaleString()}</span>
                            </div>
                            <div className="summary-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {linkedAccounts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <p className="empty-state-title">No Sankalpas Linked</p>
                            <p className="empty-state-text">Contact admin to link your account to a Namavruksha Sankalpa.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="invest-form">
                            {/* Date Range Selection */}
                            <div className="date-selection-section">
                                <h3 className="section-title">Offering Period (Optional)</h3>
                                <div className="date-inputs">
                                    <div className="form-group">
                                        <label htmlFor="startDate">Start Date</label>
                                        <input
                                            type="date"
                                            id="startDate"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="endDate">End Date</label>
                                        <input
                                            type="date"
                                            id="endDate"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                                <p className="date-hint">Select dates if you are offering for a specific period.</p>
                            </div>

                            {/* Devotee Count Section */}
                            <div className="devotee-count-section" style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--gray-100)' }}>
                                <h3 className="section-title">Number of Devotees (Optional)</h3>
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
                                    <p className="date-hint">How many devotees chanted together?</p>
                                </div>
                            </div>

                            <div className="accounts-form">
                                {linkedAccounts.map(account => (
                                    <div key={account.id} className="account-entry">
                                        <div className="account-info">
                                            <span className="account-name">{account.name}</span>
                                        </div>

                                        <div className="count-controls">
                                            <div className="quick-buttons">
                                                <button
                                                    type="button"
                                                    className="quick-btn"
                                                    onClick={() => handleQuickAdd(account.id, 108)}
                                                >
                                                    +108
                                                </button>
                                                <button
                                                    type="button"
                                                    className="quick-btn"
                                                    onClick={() => handleQuickAdd(account.id, 54)}
                                                >
                                                    +54
                                                </button>
                                                <button
                                                    type="button"
                                                    className="quick-btn"
                                                    onClick={() => handleQuickAdd(account.id, 27)}
                                                >
                                                    +27
                                                </button>
                                            </div>

                                            <div className="inputs-row" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                <div className="input-group" style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', display: 'block' }}>Nama Count</label>
                                                    <input
                                                        type="number"
                                                        value={counts[account.id] || ''}
                                                        onChange={(e) => handleCountChange(account.id, e.target.value)}
                                                        className="form-input count-input"
                                                        min="0"
                                                        placeholder="0"
                                                    />
                                                </div>

                                                <div className="input-divider" style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem', color: '#999' }}>OR</div>

                                                <div className="input-group" style={{ flex: 1, position: 'relative' }}>
                                                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        Minutes (Approx)
                                                        <span
                                                            className="info-icon"
                                                            style={{
                                                                cursor: 'pointer',
                                                                fontSize: '1rem',
                                                                color: '#FF9933',
                                                                position: 'relative',
                                                                fontWeight: 'bold'
                                                            }}
                                                            onMouseEnter={() => setShowNamaInfoFor(account.id)}
                                                            onMouseLeave={() => setShowNamaInfoFor(null)}
                                                            onClick={() => setShowNamaInfoFor(showNamaInfoFor === account.id ? null : account.id)}
                                                            title="Nama Calculation Info"
                                                        >
                                                            ⓘ
                                                            {showNamaInfoFor === account.id && (
                                                                <div
                                                                    className="nama-info-tooltip"
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
                                                                        fontSize: '0.8rem',
                                                                        lineHeight: '1.5',
                                                                        width: '280px',
                                                                        zIndex: 100,
                                                                        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                                                                        textAlign: 'left'
                                                                    }}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <strong style={{ color: '#FF9933', display: 'block', marginBottom: '8px' }}>ⓘ Nama Calculation Info</strong>
                                                                    <div style={{ marginBottom: '8px' }}>
                                                                        <strong>1 minute = 20 Namas</strong><br />
                                                                        <span style={{ opacity: 0.8 }}>12 seconds = 4 Namas</span>
                                                                    </div>
                                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '8px', marginTop: '8px' }}>
                                                                        <strong style={{ color: '#FFD700' }}>Why?</strong><br />
                                                                        <span style={{ opacity: 0.9 }}>Chanting:</span>
                                                                        <div style={{ fontStyle: 'italic', margin: '6px 0', paddingLeft: '8px', borderLeft: '2px solid #FF9933' }}>
                                                                            Yogi Ramsuratkumar<br />
                                                                            Yogi Ramsuratkumar<br />
                                                                            Yogi Ramsuratkumar<br />
                                                                            Jaya Guru Raya
                                                                        </div>
                                                                        <span style={{ opacity: 0.9 }}>is counted as <strong>4 Namas</strong>, which takes ~12 seconds.</span><br />
                                                                        <span style={{ opacity: 0.9 }}>So, <strong>1 minute ≈ 5 × 4 = 20 Namas</strong></span>
                                                                    </div>
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '-6px',
                                                                        left: '50%',
                                                                        transform: 'translateX(-50%)',
                                                                        width: 0,
                                                                        height: 0,
                                                                        borderLeft: '6px solid transparent',
                                                                        borderRight: '6px solid transparent',
                                                                        borderBottom: '6px solid #2d3748'
                                                                    }} />
                                                                </div>
                                                            )}
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={minutes[account.id] || ''}
                                                        onChange={(e) => handleMinutesChange(account.id, e.target.value)}
                                                        className="form-input count-input"
                                                        min="0"
                                                        placeholder="0 min"
                                                        step="0.5"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total Display */}
                            <div className="total-display">
                                <span className="total-label">Session Total</span>
                                <span className="total-value">{getTotalCount().toLocaleString()}</span>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-lg w-full"
                                disabled={loading || getTotalCount() === 0}
                            >
                                {loading ? (
                                    <>
                                        <span className="loader loader-sm"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    'Offer Namas'
                                )}
                            </button>

                            {submissionSuccess && (
                                <div className="submission-success-message" style={{
                                    marginTop: '1rem',
                                    padding: '1rem',
                                    backgroundColor: 'var(--success-light, #d4edda)',
                                    color: 'var(--success-dark, #155724)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    border: '1px solid var(--success-color, #28a745)'
                                }}>
                                    ✓ {submissionSuccess}
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </main>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="confirm-modal-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="confirm-modal" style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                        animation: 'slideUp 0.3s ease'
                    }}>
                        <h3 style={{
                            fontSize: '1.25rem',
                            color: 'var(--maroon, #8B0000)',
                            marginBottom: '16px',
                            textAlign: 'center'
                        }}>
                            🙏 Confirm Your Offering
                        </h3>

                        <div style={{
                            background: 'var(--cream-light, #fdf8f3)',
                            borderRadius: '8px',
                            padding: '16px',
                            marginBottom: '16px'
                        }}>
                            <p style={{ marginBottom: '12px', fontWeight: '600', color: 'var(--gray-700, #374151)' }}>
                                You are offering:
                            </p>
                            {Object.entries(counts)
                                .filter(([_, count]) => count > 0)
                                .map(([accountId, count]) => {
                                    const account = linkedAccounts.find(a => a.id === accountId);
                                    return (
                                        <div key={accountId} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '8px',
                                            padding: '8px',
                                            background: 'white',
                                            borderRadius: '6px'
                                        }}>
                                            <span>{account?.name || 'Account'}</span>
                                            <strong style={{ color: 'var(--saffron, #FF9933)' }}>{count.toLocaleString()} Namas</strong>
                                        </div>
                                    );
                                })}
                            <div style={{
                                borderTop: '2px solid var(--saffron, #FF9933)',
                                marginTop: '8px',
                                paddingTop: '8px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontWeight: 'bold'
                            }}>
                                <span>Total</span>
                                <span style={{ color: 'var(--maroon, #8B0000)' }}>{getTotalCount().toLocaleString()} Namas</span>
                            </div>
                            {(startDate || endDate) && (
                                <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--gray-500, #6b7280)' }}>
                                    {startDate && <span>From: {startDate}</span>}
                                    {startDate && endDate && ' • '}
                                    {endDate && <span>To: {endDate}</span>}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowConfirmDialog(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: '1px solid #ddd',
                                    background: 'white',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSubmission}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    border: 'none',
                                    background: 'var(--saffron, #FF9933)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
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


