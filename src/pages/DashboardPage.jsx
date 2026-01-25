import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getUserStats, submitFeedback } from '../services/namaService';
import { sendNotificationEmail } from '../services/emailService';
import './DashboardPage.css';

const DashboardPage = () => {
    const { user, linkedAccounts, logout } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Feedback modal state
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);
    const [feedbackForm, setFeedbackForm] = useState({
        type: 'sankalpa_suggestion',
        subject: '',
        message: ''
    });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadStats();
    }, [user, navigate]);

    const loadStats = async () => {
        if (!user) return;
        try {
            const userStats = await getUserStats(user.$id);
            setStats(userStats);
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const formatNumber = (num) => {
        if (num == null) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toLocaleString();
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (!feedbackForm.subject.trim() || !feedbackForm.message.trim()) {
            error('Please fill in all fields');
            return;
        }

        setSubmittingFeedback(true);
        let dbSaveSuccess = false;
        let emailSent = false;

        try {
            // First, try to send email notification (most important)
            // This ensures the admin gets notified even if DB save fails
            try {
                const feedbackTypeMap = {
                    sankalpa_suggestion: 'New Sankalpa Request',
                    feedback: 'General Feedback',
                    bug_report: 'Bug Report'
                };
                const typeLabel = feedbackTypeMap[feedbackForm.type] || 'Feedback';
                const emailSubject = `[Namavruksha] ${typeLabel} from ${user?.name}`;
                const emailMessage = `Type: ${typeLabel}
Subject: ${feedbackForm.subject}
Message: ${feedbackForm.message}

User: ${user?.name}
Contact: ${user?.whatsapp || user?.email || 'N/A'}
User ID: ${user?.$id || user?.id || 'N/A'}

Submitted at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`;

                await sendNotificationEmail({
                    to: 'yogiramsuratkumarbhajans@gmail.com',
                    subject: emailSubject,
                    message: emailMessage
                });
                emailSent = true;
            } catch (emailErr) {
                console.error('Failed to send feedback notification email:', emailErr);
                // Continue - we'll try to save to DB as backup
            }

            // Then try to save to database (as backup/record keeping)
            try {
                const result = await submitFeedback({
                    type: feedbackForm.type,
                    subject: feedbackForm.subject,
                    message: feedbackForm.message,
                    userName: user?.name,
                    userContact: user?.whatsapp || user?.email
                }, user?.$id);
                
                dbSaveSuccess = result.savedToDb !== false;
            } catch (dbErr) {
                console.error('Failed to save feedback to database:', dbErr);
                // Continue - email was likely sent successfully
            }

            // Success if either email was sent OR DB save succeeded
            if (emailSent || dbSaveSuccess) {
                success('Thank you! Your suggestion has been submitted.');
                setFeedbackForm({ type: 'sankalpa_suggestion', subject: '', message: '' });
                setShowFeedbackModal(false);
            } else {
                // Both failed
                error('Failed to submit. Please try again later or contact us directly.');
            }
        } catch (err) {
            console.error('Feedback submission error:', err);
            error('Failed to submit. Please try again later.');
        } finally {
            setSubmittingFeedback(false);
        }
    };

    if (!user) return null;

    return (
        <div className="dashboard-page page-enter">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <Link to="/" className="header-left" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <span className="om-symbol-small">ॐ</span>
                            <h1>Namavruksha</h1>
                        </Link>
                        <div className="header-right">
                            <Link to="/" className="btn btn-ghost btn-sm" style={{ marginRight: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12" />
                                    <polyline points="12 19 5 12 12 5" />
                                </svg>
                                Back to Home
                            </Link>
                            <span className="user-name">{user.name}</span>
                            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="container">
                    {/* Welcome Section */}
                    <section className="welcome-section">
                        <h2>Hari Om, {user.name.split(' ')[0]}!</h2>
                        <p>Continue your spiritual journey with sincere devotion.</p>
                    </section>

                    {/* Quick Stats */}
                    <section className="stats-section">
                        <h3>Your Nama Journey</h3>
                        {loading ? (
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="skeleton skeleton-text lg" style={{ marginBottom: '8px' }}></div>
                                    <div className="skeleton skeleton-text sm"></div>
                                </div>
                                <div className="stat-card">
                                    <div className="skeleton skeleton-text lg" style={{ marginBottom: '8px' }}></div>
                                    <div className="skeleton skeleton-text sm"></div>
                                </div>
                                <div className="stat-card">
                                    <div className="skeleton skeleton-text lg" style={{ marginBottom: '8px' }}></div>
                                    <div className="skeleton skeleton-text sm"></div>
                                </div>
                                <div className="stat-card highlight">
                                    <div className="skeleton skeleton-text lg" style={{ marginBottom: '8px' }}></div>
                                    <div className="skeleton skeleton-text sm"></div>
                                </div>
                            </div>
                        ) : stats ? (
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-value">{formatNumber(stats.today)}</div>
                                    <div className="stat-label">Today</div>
                                    <div className="stat-date">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{formatNumber(stats.currentWeek)}</div>
                                    <div className="stat-label">Current Week</div>
                                    <div className="stat-date">{(() => {
                                        const now = new Date();
                                        const day = now.getDay();
                                        const monday = new Date(now);
                                        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                                        const sunday = new Date(monday);
                                        sunday.setDate(monday.getDate() + 6);
                                        return `${monday.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}`;
                                    })()}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{formatNumber(stats.currentMonth)}</div>
                                    <div className="stat-label">Current Month</div>
                                    <div className="stat-date">{new Date().toLocaleDateString('en-IN', { month: 'long' })}</div>
                                </div>
                                <div className="stat-card highlight">
                                    <div className="stat-value">{formatNumber(stats.overall)}</div>
                                    <div className="stat-label">Overall</div>
                                </div>
                            </div>
                        ) : (
                            <p className="no-stats">Start your Nama journey today!</p>
                        )}
                    </section>

                    {/* Linked Accounts */}
                    {linkedAccounts.length > 0 && (
                        <section className="accounts-section">
                            <h3>Your Linked Sankalpas</h3>
                            <div className="accounts-list">
                                {linkedAccounts.map(account => (
                                    <div key={account.id} className="account-chip">
                                        <span className="status-dot active"></span>
                                        {account.name}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Action Cards */}
                    <section className="actions-section">
                        <h3>What would you like to do?</h3>
                        <div className="action-cards">
                            <Link to="/invest" className="action-card hover-lift">
                                <div className="action-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="16" />
                                        <line x1="8" y1="12" x2="16" y2="12" />
                                    </svg>
                                </div>
                                <h4>Invest Nama</h4>
                                <p>Submit your daily Nama count</p>
                            </Link>

                            <Link to="/audio" className="action-card hover-lift">
                                <div className="action-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                    </svg>
                                </div>
                                <h4>Nama Audio</h4>
                                <p>Play audio and auto-count</p>
                            </Link>

                            <Link to="/prayers" className="action-card hover-lift">
                                <div className="action-icon" style={{ fontSize: '2.5rem', fontWeight: 'bold', lineHeight: 1 }}>
                                    ॐ
                                </div>
                                <h4>Prayers</h4>
                                <p>Request & offer prayers</p>
                            </Link>

                            <Link to="/reports" className="action-card hover-lift">
                                <div className="action-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="20" x2="18" y2="10" />
                                        <line x1="12" y1="20" x2="12" y2="4" />
                                        <line x1="6" y1="20" x2="6" y2="14" />
                                    </svg>
                                </div>
                                <h4>My Reports</h4>
                                <p>View your devotion summary</p>
                            </Link>

                            <Link to="/books" className="action-card hover-lift">
                                <div className="action-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                                    </svg>
                                </div>
                                <h4>Book Shelf</h4>
                                <p>Read monthly editions</p>
                            </Link>

                            <div className="action-card hover-lift" onClick={() => setShowFeedbackModal(true)} style={{ cursor: 'pointer' }}>
                                <div className="action-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="12" y1="18" x2="12" y2="12" />
                                        <line x1="9" y1="15" x2="15" y2="15" />
                                    </svg>
                                </div>
                                <h4>Suggest Sankalpa</h4>
                                <p>Request new Namavruksha</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Suggest New Sankalpa</h2>
                            <button className="modal-close" onClick={() => setShowFeedbackModal(false)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSubmitFeedback}>
                            <div className="modal-body">
                                <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                                    Would you like a new Namavruksha Sankalpa to be added? Let us know!
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <select
                                        value={feedbackForm.type}
                                        onChange={(e) => setFeedbackForm(prev => ({ ...prev, type: e.target.value }))}
                                        className="form-input"
                                    >
                                        <option value="sankalpa_suggestion">New Sankalpa Request</option>
                                        <option value="feedback">General Feedback</option>
                                        <option value="bug_report">Report an Issue</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Subject <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        value={feedbackForm.subject}
                                        onChange={(e) => setFeedbackForm(prev => ({ ...prev, subject: e.target.value }))}
                                        className="form-input"
                                        placeholder="e.g., New Sankalpa for Chennai"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Details <span className="required">*</span></label>
                                    <textarea
                                        value={feedbackForm.message}
                                        onChange={(e) => setFeedbackForm(prev => ({ ...prev, message: e.target.value }))}
                                        className="form-input"
                                        rows={4}
                                        placeholder="Describe the Sankalpa you'd like to see..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowFeedbackModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submittingFeedback}>
                                    {submittingFeedback ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <footer className="dashboard-footer">
                <div className="container">
                    <p>"Every Nama takes you closer to the Divine"</p>
                </div>
            </footer>
        </div>
    );
};

export default DashboardPage;

