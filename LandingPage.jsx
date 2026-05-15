import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import { useAuth } from '../context/AuthContext';
import yogiImage from '../assets/YogiPic01.jpg';
import './LandingPage.css';

const LandingPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [liveStats, setLiveStats] = useState({
        totalRegisteredUsers: 0,
        devoteesChanted: 0,
        totalNamaCount: 0,
        activeAccounts: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const [accountsResult, namaResult, usersResult] = await Promise.allSettled([
                databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ACCOUNTS, [Query.equal('is_active', true), Query.limit(100)]),
                databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [Query.limit(2000)]),
                databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1)]),
            ]);

            const accountCount = accountsResult.status === 'fulfilled'
                ? (accountsResult.value.total || accountsResult.value.documents.length) : 0;

            let totalNama = 0;
            let totalDevoteesSum = 0;
            if (namaResult.status === 'fulfilled') {
                const docs = namaResult.value.documents || [];
                totalNama = docs.reduce((sum, e) => sum + (e.count || 0), 0);
                totalDevoteesSum = docs.reduce((sum, e) => {
                    const d = parseInt(e.devotee_count);
                    return sum + (isNaN(d) || d === 0 ? 1 : d);
                }, 0);
            }

            const userCount = usersResult.status === 'fulfilled' ? (usersResult.value.total || 0) : 0;

            setLiveStats({
                totalRegisteredUsers: userCount,
                devoteesChanted: totalDevoteesSum,
                totalNamaCount: totalNama,
                activeAccounts: accountCount
            });
            setLoading(false);
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
                                            <span className="challenge-info-label">Daily target</span>
                                            <span className="challenge-info-val big">1008 Namas</span>
                                            <span className="challenge-info-note">3× Yogi Ramsuratkumar + Jaya Guru Raya = 4 Namas</span>
                                        </div>
                                        <div className="challenge-info-box">
                                            <span className="challenge-info-label">Completion blessing</span>
                                            <span className="challenge-info-val">First 3 devotees receive <em>Saranagatham</em> Annual Subscription</span>
                                        </div>
                                    </div>
                                    <div className="challenge-steps">
                                        <p className="challenge-steps-label">How to join</p>
                                        <div className="challenge-step">
                                            <span className="challenge-step-num">1</span>
                                            <span>Visit namavruksha.org and register with the <em>Sankalpa – 1008 Daily Chanting</em></span>
                                        </div>
                                        <div className="challenge-step">
                                            <span className="challenge-step-num">2</span>
                                            <span>Login → Dashboard → Invest Nama → set today as start &amp; end date → submit count</span>
                                        </div>
                                    </div>
                                    <div className="challenge-footer-note">
                                        Simple. Sincere. Powerful. Let Nama guide us.
                                    </div>
                                </div>
                            </div>
                        </div>

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
