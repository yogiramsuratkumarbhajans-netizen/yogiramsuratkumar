import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import yogiImage from '../assets/YogiPic01.jpg';
import './LandingPage.css';

// ─── MAINTENANCE MODE ───────────────────────────────────────────────────────
// DB reads disabled until June 9, 2026 (Appwrite free tier cycle reset).
// Remove this flag and restore the useEffect block after June 9.
const MAINTENANCE_MODE = true;
// ────────────────────────────────────────────────────────────────────────────

const LandingPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [liveStats] = useState({
        totalRegisteredUsers: 0,
        devoteesChanted: 0,
        totalNamaCount: 0,
        activeAccounts: 0
    });

    const formatNumber = (num) => {
        if (!num) return '0';
        if (num >= 10000000) return (num / 10000000).toFixed(2) + ' Cr';
        if (num >= 100000) return (num / 100000).toFixed(2) + ' Lacs';
        if (num >= 1000) return num.toLocaleString('en-IN');
        return num.toString();
    };

    return (
        <div className="landing-page">
            <div className="animated-bg">
                <div className="floating-om om-1">ॐ</div>
                <div className="floating-om om-2">ॐ</div>
                <div className="floating-om om-3">ॐ</div>
            </div>

            <div className="landing-container">

                {/* ── Maintenance Banner ── */}
                {MAINTENANCE_MODE && (
                    <div style={{
                        background: 'linear-gradient(135deg, #fff8e1, #fff3cd)',
                        border: '2px solid #FF9933',
                        borderRadius: '12px',
                        padding: '20px 24px',
                        textAlign: 'center',
                        margin: '0 auto 24px',
                        maxWidth: '780px',
                        boxShadow: '0 2px 12px rgba(255,153,51,0.15)'
                    }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🙏 एक निवेदन · A Humble Notice 🙏</div>
                        <p style={{ color: '#7a4800', fontWeight: '600', fontSize: '1rem', margin: '0 0 10px' }}>
                            Namavruksha is currently under scheduled server maintenance and will resume fully on <strong>June 9, 2026</strong>.
                        </p>
                        <p style={{ color: '#5a3800', fontSize: '0.92rem', margin: '0 0 10px', lineHeight: '1.6' }}>
                            Our hosting operates on a free tier, and the community's heartfelt participation in reports and statistics 
                            has been so abundant that the monthly server limit was reached earlier than expected — 
                            a blessing in disguise, and a sign of Bhagawan's grace flowing through all of you.
                        </p>
                        <div style={{
                            background: '#fff',
                            border: '1px solid #f0c060',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            margin: '10px auto',
                            maxWidth: '620px',
                            textAlign: 'left'
                        }}>
                            <p style={{ color: '#7a1a1a', fontWeight: '700', margin: '0 0 8px', fontSize: '0.95rem' }}>
                                📋 What you should do right now:
                            </p>
                            <ul style={{ color: '#5a3800', fontSize: '0.9rem', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                                <li><strong>Do not attempt to login or use Forgot Password</strong> — authentication is unavailable during this period.</li>
                                <li><strong>Please note down your Nama count</strong> on paper or in a notebook, day by day, until June 9.</li>
                                <li>Once the site is back, you can enter up to <strong>5 days of backdated entries</strong> on June 9 — your Nama will not be lost.</li>
                                <li>The site is fully restored when you see <strong>real numbers appear in the statistics section</strong> below. Until then, please wait patiently.</li>
                            </ul>
                        </div>
                        <p style={{ color: '#8B6914', fontSize: '0.85rem', margin: '10px 0 0', fontStyle: 'italic' }}>
                            "Only the Name remains when everything else falls away." — May Bhagawan's Nama continue in your heart uninterrupted. 🙏
                        </p>
                    </div>
                )}

                {/* ── Hero: split left/right ── */}
                <header className="hero-section fade-in">
                    <div className="hero-split">

                        {/* LEFT */}
                        <div className="hero-left">
                            <img src={yogiImage} alt="Bhagawan Yogi Ramsuratkumar" className="yogi-photo" />
                            <h1 className="hero-title">Namavruksha</h1>
                            <p className="hero-tagline">The Divine Tree of the Holy Name</p>
                            <p className="hero-description">
                                <span className="highlight-text">Namavruksha</span> is a humble digital space for devotees to chant and count Nama with sincerity,
                                and offer it together as a collective spiritual <span className="highlight-text">sankalpa</span>.
                            </p>
                            <div className="greeting-text">🙏 Yogi Ramsuratkumar Jaya Guru Raya! 🙏</div>
                        </div>

                        {/* RIGHT */}
                        <div className="hero-right">
                            <div className="challenge-panel">
                                <div className="challenge-header">
                                    <span className="challenge-live-tag">June 2025 · Live now</span>
                                    <h2 className="challenge-title">June 1008 Nama Sadhana</h2>
                                    <p className="challenge-subtitle">June Consistency Daily Chanting Challenge</p>
                                </div>
                                <div className="challenge-body">
                                    <p className="challenge-intro">
                                        Not a competition … a collective offering through Nama. Chant together and grow a global NamaVruksha for Bhagawan Yogi Ramsuratkumar.
                                    </p>
                                    <div className="challenge-info-row">
                                        <div className="challenge-info-box">
                                            <span className="challenge-info-label">Chanting Count Guide</span>
                                            <span className="challenge-info-val">Chant minimum <strong>1008 Namas</strong> daily.</span>
                                            <div className="chant-lines">
                                                <div className="chant-group">
                                                    <span className="chant-name">Yogi Ramsuratkumar</span>
                                                    <span className="chant-name">Yogi Ramsuratkumar</span>
                                                    <span className="chant-name">Yogi Ramsuratkumar</span>
                                                    <span className="chant-name">Jaya Guru Raya</span>
                                                </div>
                                                <span className="chant-equals">= 4 Namas</span>
                                            </div>
                                        </div>
                                        <div className="challenge-info-box">
                                            <span className="challenge-info-label">Completion Blessing</span>
                                            <span className="challenge-info-val">First 3 devotees receive the Bhagawan Yogi Ramsuratkumar Ashram Monthly Magazine <strong><em>Saranagatham</em></strong> Annual Subscription <em>(within India)</em>.</span>
                                        </div>
                                    </div>
                                    <div className="challenge-steps">
                                        <p className="challenge-steps-label">How to Join</p>
                                        <div className="challenge-step">
                                            <span className="challenge-step-num">1</span>
                                            <span>Visit namavruksha.org · Register with the <em>Sankalpa – 1008 Daily Chanting</em></span>
                                        </div>
                                        <div className="challenge-step">
                                            <span className="challenge-step-num">2</span>
                                            <span>Login → Dashboard → Invest Nama → set today as start &amp; end date → submit count</span>
                                        </div>
                                    </div>
                                    <div className="challenge-sincere">
                                        <span className="challenge-quote-mark">"</span>
                                        I sincerely confirm that I have entered my Nama daily, without any backward or forward entries, and stayed true to Bhagawan in this Nama Sadhana.
                                        <span className="challenge-quote-mark">"</span>
                                    </div>
                                    <div className="challenge-footer-note">
                                        Simple. Sincere. Powerful. Let Nama guide us.
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Greeting centered below both frames */}
                    <div className="greeting-text-centered">
                        🙏 Yogi Ramsuratkumar Jaya Guru Raya! 🙏
                    </div>
                </header>

                {/* FAQ Cards */}
                <section className="faq-cards-section fade-in-delay-1">
                    <div className="faq-cards">
                        <div className="faq-card">
                            <h4 className="faq-question">Why Chant the Divine Name?</h4>
                            <p className="faq-answer">Only the Name remains when everything else falls away. Nama is the simplest and highest refuge.</p>
                        </div>
                        <div className="faq-card">
                            <h4 className="faq-question">Why Count Nama?</h4>
                            <p className="faq-answer">Nama Japa gains strength through nishta (steadfastness) and regularity. Counting helps Nama take root.</p>
                        </div>
                        <div className="faq-card">
                            <h4 className="faq-question">Why Offer Nama Collectively?</h4>
                            <p className="faq-answer">When devotion is offered selflessly, it expands and uplifts all.</p>
                        </div>
                    </div>
                </section>

                {/* Live Stats */}
                <section className="stats-inline fade-in-delay-1">
                    <div className="stat-item">
                        <span className="stat-num" style={MAINTENANCE_MODE ? { color: '#ccc' } : {}}>
                            {MAINTENANCE_MODE ? '–' : formatNumber(liveStats.totalRegisteredUsers)}
                        </span>
                        <span className="stat-lbl">Total Users</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-num" style={MAINTENANCE_MODE ? { color: '#ccc' } : {}}>
                            {MAINTENANCE_MODE ? '–' : formatNumber(liveStats.devoteesChanted)}
                        </span>
                        <span className="stat-lbl">Devotees</span>
                    </div>
                    <div className="stat-item highlight">
                        <span className="stat-num" style={MAINTENANCE_MODE ? { color: '#ccc' } : {}}>
                            {MAINTENANCE_MODE ? '–' : formatNumber(liveStats.totalNamaCount)}
                        </span>
                        <span className="stat-lbl">Nama Offered</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-num" style={MAINTENANCE_MODE ? { color: '#ccc' } : {}}>
                            {MAINTENANCE_MODE ? '–' : liveStats.activeAccounts}
                        </span>
                        <span className="stat-lbl">Sankalpas</span>
                    </div>
                    {MAINTENANCE_MODE && (
                        <div style={{ width: '100%', textAlign: 'center', marginTop: '6px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#aaa', fontStyle: 'italic' }}>
                                Statistics unavailable · Resumes June 9, 2026
                            </span>
                        </div>
                    )}
                </section>

                {/* Action Cards */}
                <section className="action-section fade-in-delay-2">
                    <div className="action-cards">
                        <Link to="/register" className="action-card" style={MAINTENANCE_MODE ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
                            <span className="action-icon">🌱</span>
                            <h3>Join Sankalpa</h3>
                            <p>Begin your Nama journey</p>
                        </Link>
                        {authLoading ? (
                            <div className="action-card loading">
                                <span className="action-icon">⏳</span>
                                <h3>Loading...</h3>
                            </div>
                        ) : MAINTENANCE_MODE ? (
                            <div className="action-card highlight" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                                <span className="action-icon">🔑</span>
                                <h3>Login</h3>
                                <p>Unavailable · June 9</p>
                            </div>
                        ) : user ? (
                            <Link to="/dashboard" className="action-card highlight">
                                <span className="action-icon">🏠</span>
                                <h3>Dashboard</h3>
                                <p>Welcome, {user.name?.split(' ')[0]}</p>
                            </Link>
                        ) : (
                            <Link to="/login" className="action-card highlight">
                                <span className="action-icon">🔑</span>
                                <h3>Login</h3>
                                <p>Continue your offering</p>
                            </Link>
                        )}
                        <Link to="/reports/public" className="action-card" style={MAINTENANCE_MODE ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
                            <span className="action-icon">📊</span>
                            <h3>Reports</h3>
                            <p>Community stats</p>
                        </Link>
                    </div>
                </section>

                {/* Humble Invitation */}
                <section className="invitation-section">
                    <h3>🌼 A Humble Invitation</h3>
                    <p>
                        Namavruksha does not compel practice.<br />
                        It simply offers a space to record, remember, and offer Nama with sincerity.<br />
                        <strong>If it resonates with you, come and water the Tree of Nama—one chant at a time.</strong>
                    </p>
                </section>

                {/* Media Links — Satsang added */}
                <section className="media-compact">
                    <Link to="/satsang" className="media-link" style={{ background: 'linear-gradient(135deg, #7a1a1a, #a52a2a)', color: 'white', border: 'none' }}>🕉 Global Satsang</Link>
                    <Link to="/gallery" className="media-link">📷 Gallery</Link>
                    <Link to="/audios" className="media-link">🎵 Audio</Link>
                    <Link to="/books" className="media-link">📚 Library</Link>
                    <Link to="/prayers" className="media-link">🙏 Prayers</Link>
                </section>

                {/* Divyavani Links */}
                <section className="media-compact" style={{ marginTop: '0.5rem' }}>
                    <a href="https://divyavanienglish.namavruksha.org" target="_blank" rel="noopener noreferrer" className="media-link" style={{ background: 'linear-gradient(135deg, #FF9933, #E88800)', color: 'white' }}>
                        🙏 Divyavani English
                    </a>
                    <a href="https://divyavanitamil.namavruksha.org" target="_blank" rel="noopener noreferrer" className="media-link" style={{ background: 'linear-gradient(135deg, #8B0000, #660000)', color: 'white' }}>
                        🙏 திவ்யவாணி தமிழ்
                    </a>
                </section>

                {/* Footer */}
                <footer className="landing-footer">
                    <div className="footer-logo">🌳 <strong>Namavruksha</strong></div>
                    <p className="footer-tagline">Rooted in Nama. Growing in Faith. Bearing Fruits Beyond Life.</p>
                    <div className="admin-links">
                        <Link to="/moderator/login">Moderator</Link>
                        <Link to="/admin/login">Admin</Link>
                    </div>
                </footer>

            </div>
        </div>
    );
};

export default LandingPage;
