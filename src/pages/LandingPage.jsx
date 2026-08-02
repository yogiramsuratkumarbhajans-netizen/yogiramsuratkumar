import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import { useAuth } from '../context/AuthContext';
import yogiImage from '../assets/YogiPic01.jpg';
import './LandingPage.css';

const MAINTENANCE_MODE = false;
const CACHE_DOC_ID = 'main';
const LOCAL_CACHE_KEY = 'namavruksha_reports_local_cache';

const LandingPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [liveStats, setLiveStats] = useState({
        totalRegisteredUsers: 0,
        devoteesChanted: 0,
        totalNamaCount: 0,
        activeAccounts: 0
    });
    const [loading, setLoading] = useState(true);

    // Computes homepage stats from a stats_cache payload (same shape written
    // by the BuildStatsCache function and consumed by PublicReportsPage).
    const computeStatsFromPayload = (parsed) => {
        const entries = parsed.allEntries || [];
        const accounts = parsed.allAccounts || [];
        const totalNama = entries.reduce((sum, e) => sum + (e.count || 0), 0);
        const devoteesChanted = entries.reduce((sum, e) => {
            const d = parseInt(e.devotee_count);
            return sum + (isNaN(d) || d === 0 ? 1 : d);
        }, 0);
        return {
            totalRegisteredUsers: parsed.usersTotal || 0,
            devoteesChanted,
            totalNamaCount: totalNama,
            activeAccounts: accounts.filter(a => a.is_active).length
        };
    };

    useEffect(() => {
        if (MAINTENANCE_MODE) { setLoading(false); return; }

        // Previously this page fired THREE live, uncached Appwrite queries
        // (nama_accounts, nama_entries limit 2000, users) on every single
        // homepage load — the highest-traffic page on the site. That was the
        // single largest contributor to the read-quota blowout. It now reads
        // the same 1-document stats_cache used by the Reports page, and
        // never falls back to a live query if that read fails.
        const fetchData = async () => {
            try {
                const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.STATS_CACHE, CACHE_DOC_ID);
                const parsed = JSON.parse(doc.payload);
                setLiveStats(computeStatsFromPayload(parsed));
                try {
                    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(parsed));
                } catch (storageErr) {
                    // localStorage unavailable/full — non-fatal
                }
            } catch (err) {
                console.warn('Homepage cache read failed, trying local backup:', err.message);
                try {
                    const backup = localStorage.getItem(LOCAL_CACHE_KEY);
                    if (backup) {
                        setLiveStats(computeStatsFromPayload(JSON.parse(backup)));
                    } else {
                        setLiveStats({ totalRegisteredUsers: 0, devoteesChanted: 0, totalNamaCount: 0, activeAccounts: 0 });
                    }
                } catch (backupErr) {
                    setLiveStats({ totalRegisteredUsers: 0, devoteesChanted: 0, totalNamaCount: 0, activeAccounts: 0 });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

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
                                and offer it together as a collective spiritual <span className="highlight-text">Sankalpa</span>.
                            </p>
                            <div className="greeting-text">🙏 <span style={{ whiteSpace: 'nowrap' }}>Yogi Ramsuratkumar</span> Jaya Guru Raya! 🙏</div>
                        </div>

                        {/* RIGHT — approved redesign: evergreen "Ongoing" tag replaces
                            the stale "June 2025 · Live now" date badge, so this panel
                            never goes out of date again. "Yogi Ramsuratkumar" is locked
                            with white-space: nowrap everywhere it appears — it must
                            never wrap across two lines. */}
                        <div className="hero-right">
                            <div className="challenge-panel">
                                <div className="challenge-header">
                                    <span className="challenge-live-tag">Ongoing</span>
                                    <h2 className="challenge-title">1008 Nama Sadhana</h2>
                                    <p className="challenge-subtitle">A Daily Consistency Chanting Practice</p>
                                </div>
                                <div className="challenge-body">
                                    <p className="challenge-intro" style={{ fontStyle: 'italic' }}>
                                        Not a competition — a collective offering through Nama. Chant together and grow a global Namavruksha for Bhagawan <span style={{ whiteSpace: 'nowrap' }}>Yogi Ramsuratkumar</span>.
                                    </p>
                                    <div className="challenge-info-row">
                                        <div className="challenge-info-box">
                                            <span className="challenge-info-label">Chanting Count Guide</span>
                                            <span className="challenge-info-val">Chant minimum <strong>1008 Namas</strong> daily.</span>
                                            <div className="chant-lines">
                                                <div className="chant-group">
                                                    <span className="chant-name" style={{ whiteSpace: 'nowrap' }}>Yogi Ramsuratkumar</span>
                                                    <span className="chant-name" style={{ whiteSpace: 'nowrap' }}>Yogi Ramsuratkumar</span>
                                                    <span className="chant-name" style={{ whiteSpace: 'nowrap' }}>Yogi Ramsuratkumar</span>
                                                    <span className="chant-name">Jaya Guru Raya</span>
                                                </div>
                                                <span className="chant-equals">= 4 Namas</span>
                                            </div>
                                        </div>
                                        <div className="challenge-info-box">
                                            <span className="challenge-info-label">Completion Blessing</span>
                                            <span className="challenge-info-val">First 3 devotees receive the Bhagawan <span style={{ whiteSpace: 'nowrap' }}>Yogi Ramsuratkumar</span> Ashram Monthly Magazine <strong><em>Saranagatham</em></strong> Annual Subscription <em>(within India)</em>.</span>
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
                                            <span>Login → Dashboard → Invest Nama → set today's date → submit your count</span>
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
                        🙏 <span style={{ whiteSpace: 'nowrap' }}>Yogi Ramsuratkumar</span> Jaya Guru Raya! 🙏
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
                        <span className="stat-num">{loading ? '...' : formatNumber(liveStats.totalRegisteredUsers)}</span>
                        <span className="stat-lbl">Total Users</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-num">{loading ? '...' : formatNumber(liveStats.devoteesChanted)}</span>
                        <span className="stat-lbl">Devotees</span>
                    </div>
                    <div className="stat-item highlight">
                        <span className="stat-num">{loading ? '...' : formatNumber(liveStats.totalNamaCount)}</span>
                        <span className="stat-lbl">Nama Offered</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-num">{loading ? '...' : liveStats.activeAccounts}</span>
                        <span className="stat-lbl">Sankalpas</span>
                    </div>
                </section>

                {/* Action Cards */}
                <section className="action-section fade-in-delay-2">
                    <div className="action-cards">
                        <Link to="/register" className="action-card">
                            <span className="action-icon">🌱</span>
                            <h3>Join Sankalpa</h3>
                            <p>Begin your Nama journey</p>
                        </Link>
                        {authLoading ? (
                            <div className="action-card loading">
                                <span className="action-icon">⏳</span>
                                <h3>Loading...</h3>
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
                        <Link to="/reports/public" className="action-card">
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

                {/* Media Links */}
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
