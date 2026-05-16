import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import { useAuth } from '../context/AuthContext';
import './SatsangPage.css';

// ── Timezone conversion (IST base) ──────────────────────────────
const toGMT = (istDateStr) => {
    const d = new Date(istDateStr);
    if (isNaN(d)) return '—';
    const gmt = new Date(d.getTime() - 5.5 * 60 * 60 * 1000);
    return gmt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) + ' GMT';
};

const toEST = (istDateStr) => {
    const d = new Date(istDateStr);
    if (isNaN(d)) return '—';
    const est = new Date(d.getTime() - 10.5 * 60 * 60 * 1000);
    return est.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' EST';
};

const formatIST = (istDateStr) => {
    const d = new Date(istDateStr);
    if (isNaN(d)) return '—';
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
};

// ── Free QR API — no npm needed ───────────────────────────────────
const getQRUrl = (url) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&color=7a1a1a&bgcolor=fff9f0&data=${encodeURIComponent(url)}`;

const COUNTRY_FLAGS = {
    'India': '🇮🇳', 'USA': '🇺🇸', 'UK': '🇬🇧', 'Canada': '🇨🇦',
    'Australia': '🇦🇺', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Singapore': '🇸🇬',
    'UAE': '🇦🇪', 'Malaysia': '🇲🇾', 'Sri Lanka': '🇱🇰', 'New Zealand': '🇳🇿',
    'South Africa': '🇿🇦', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪', 'Global': '🌍'
};

const STATUS_COLORS = {
    'Upcoming': { bg: '#e8f5e9', color: '#2e7d32', border: '#a5d6a7' },
    'Live Now': { bg: '#fff3e0', color: '#e65100', border: '#ffb74d' },
    'Completed': { bg: '#f5f5f5', color: '#757575', border: '#e0e0e0' }
};

// ── QR Modal ──────────────────────────────────────────────────────
const QRModal = ({ url, eventName, onClose }) => (
    <div className="qr-modal-overlay" onClick={onClose}>
        <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <button className="qr-modal-close" onClick={onClose}>✕</button>
            <h3 className="qr-modal-title">🕉 {eventName}</h3>
            <img
                src={getQRUrl(url)}
                alt="QR Code"
                className="qr-canvas"
                width={200}
                height={200}
            />
            <p className="qr-modal-hint">Scan to join the session</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="qr-join-btn">Open Link →</a>
        </div>
    </div>
);

// ── Calendar ──────────────────────────────────────────────────────
const SatsangCalendar = ({ events, onDateClick, selectedDate }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const eventDates = events.reduce((acc, ev) => {
        const d = new Date(ev.event_datetime);
        if (d.getFullYear() === year && d.getMonth() === month) {
            const key = d.getDate();
            if (!acc[key]) acc[key] = [];
            acc[key].push(ev);
        }
        return acc;
    }, {});

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const goToday = () => setCurrentMonth(new Date());

    const monthName = currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="satsang-calendar">
            <div className="cal-header">
                <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                <div className="cal-month-title">
                    <span>{monthName}</span>
                    <button className="cal-today-btn" onClick={goToday}>Today</button>
                </div>
                <button className="cal-nav-btn" onClick={nextMonth}>›</button>
            </div>
            <div className="cal-grid">
                {days.map(d => <div key={d} className="cal-day-label">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="cal-cell empty" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                    const hasEvents = eventDates[day];
                    const isSelected = selectedDate &&
                        new Date(selectedDate).getDate() === day &&
                        new Date(selectedDate).getMonth() === month &&
                        new Date(selectedDate).getFullYear() === year;
                    return (
                        <div
                            key={day}
                            className={`cal-cell ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''} ${isSelected ? 'selected' : ''}`}
                            onClick={() => hasEvents && onDateClick(new Date(year, month, day))}
                        >
                            <span className="cal-day-num">{day}</span>
                            {hasEvents && (
                                <div className="cal-dots">
                                    {hasEvents.slice(0, 3).map((ev, idx) => (
                                        <span key={idx} className={`cal-dot status-${ev.status?.replace(' ', '-').toLowerCase()}`} title={ev.event_name} />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="cal-legend">
                <span className="legend-item"><span className="cal-dot status-upcoming" />Upcoming</span>
                <span className="legend-item"><span className="cal-dot status-live-now" />Live Now</span>
                <span className="legend-item"><span className="cal-dot status-completed" />Completed</span>
            </div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────
const SatsangPage = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [qrModal, setQrModal] = useState(null);

    const [filterCountry, setFilterCountry] = useState('');
    const [filterFrequency, setFilterFrequency] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPlatform, setFilterPlatform] = useState('');
    const [sortBy, setSortBy] = useState('date_asc');

    const tableRef = useRef(null);

    useEffect(() => { loadEvents(); }, []);

    const loadEvents = async () => {
        try {
            const res = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.SATSANG_EVENTS,
                [Query.equal('is_active', true), Query.orderAsc('event_datetime'), Query.limit(100)]
            );
            setEvents(res.documents.map(d => ({ ...d, id: d.$id })));
        } catch (err) {
            console.error('Error loading satsang events:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setFilterCountry(''); setFilterFrequency(''); setFilterStatus(''); setFilterPlatform('');
        setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const clearFilters = () => {
        setSelectedDate(null);
        setFilterCountry(''); setFilterFrequency(''); setFilterStatus(''); setFilterPlatform('');
    };

    const filteredEvents = events
        .filter(ev => {
            if (selectedDate) {
                const evDate = new Date(ev.event_datetime);
                const sel = new Date(selectedDate);
                if (evDate.getDate() !== sel.getDate() || evDate.getMonth() !== sel.getMonth() || evDate.getFullYear() !== sel.getFullYear()) return false;
            }
            if (filterCountry && ev.country !== filterCountry) return false;
            if (filterFrequency && ev.frequency !== filterFrequency) return false;
            if (filterStatus && ev.status !== filterStatus) return false;
            if (filterPlatform && ev.platform !== filterPlatform) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'date_asc') return new Date(a.event_datetime) - new Date(b.event_datetime);
            if (sortBy === 'date_desc') return new Date(b.event_datetime) - new Date(a.event_datetime);
            if (sortBy === 'country') return a.country.localeCompare(b.country);
            if (sortBy === 'status') return a.status.localeCompare(b.status);
            return 0;
        });

    const uniqueCountries = [...new Set(events.map(e => e.country))].sort();
    const uniquePlatforms = [...new Set(events.map(e => e.platform))].sort();

    return (
        <div className="satsang-page">
            <header className="satsang-header">
                <div className="satsang-header-inner">
                    <Link to="/" className="satsang-back">← Home</Link>
                    <div className="satsang-header-text">
                        <h1 className="satsang-page-title">🕉 Global Satsang Events</h1>
                        <p className="satsang-page-subtitle">Online chanting gatherings around the world — in the name of Bhagawan Yogi Ramsuratkumar</p>
                    </div>
                    <Link to="/satsang/submit" className="satsang-submit-btn">+ Submit Your Event</Link>
                </div>
            </header>

            <div className="satsang-container">

                {/* Section 1: Calendar */}
                <section className="satsang-section">
                    <h2 className="satsang-section-title">📅 Event Calendar</h2>
                    <p className="satsang-section-sub">Click on a highlighted date to filter events for that day</p>
                    {loading ? (
                        <div className="satsang-loader"><span className="loader" /><p>Loading events...</p></div>
                    ) : (
                        <SatsangCalendar events={events} onDateClick={handleDateClick} selectedDate={selectedDate} />
                    )}
                </section>

                {/* Section 2: Events Table */}
                <section className="satsang-section" ref={tableRef}>
                    <div className="satsang-table-header">
                        <h2 className="satsang-section-title">
                            🌏 All Events
                            {filteredEvents.length !== events.length && (
                                <span className="event-count-badge">{filteredEvents.length} of {events.length}</span>
                            )}
                        </h2>
                        <Link to="/satsang/submit" className="satsang-submit-btn-sm">+ Host an Event</Link>
                    </div>

                    {/* Filters */}
                    <div className="satsang-filters">
                        <div className="filter-group">
                            <label>Country</label>
                            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
                                <option value="">All Countries</option>
                                {uniqueCountries.map(c => <option key={c} value={c}>{COUNTRY_FLAGS[c] || '🌐'} {c}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Frequency</label>
                            <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value)}>
                                <option value="">All</option>
                                {['Daily', 'Weekly', 'Monthly', 'One-time'].map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Status</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="">All</option>
                                {['Upcoming', 'Live Now', 'Completed'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Platform</label>
                            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                                <option value="">All Platforms</option>
                                {uniquePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Sort By</label>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                <option value="date_asc">Date ↑</option>
                                <option value="date_desc">Date ↓</option>
                                <option value="country">Country</option>
                                <option value="status">Status</option>
                            </select>
                        </div>
                        {(filterCountry || filterFrequency || filterStatus || filterPlatform || selectedDate) && (
                            <button className="filter-clear-btn" onClick={clearFilters}>✕ Clear</button>
                        )}
                    </div>

                    {loading ? (
                        <div className="satsang-loader"><span className="loader" /></div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="satsang-empty">
                            <p>🙏 No events found. <Link to="/satsang/submit">Be the first to host one!</Link></p>
                        </div>
                    ) : (
                        <div className="satsang-table-wrapper">
                            <table className="satsang-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Country</th>
                                        <th>Event Name</th>
                                        <th>Date & Time (IST)</th>
                                        <th>GMT / EST</th>
                                        <th>Sankalpa</th>
                                        <th>Frequency</th>
                                        <th>Platform</th>
                                        <th>Host</th>
                                        <th>Status</th>
                                        <th>Join / QR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEvents.map((ev, idx) => {
                                        const statusStyle = STATUS_COLORS[ev.status] || STATUS_COLORS['Upcoming'];
                                        const flag = COUNTRY_FLAGS[ev.country] || '🌐';
                                        const hasLink = ev.meeting_url && ev.meeting_url.trim() !== '';
                                        return (
                                            <tr key={ev.id} className={ev.status === 'Live Now' ? 'row-live' : ''}>
                                                <td className="td-num">{idx + 1}</td>
                                                <td className="td-country">{flag} {ev.country}</td>
                                                <td className="td-name">
                                                    <strong>{ev.event_name}</strong>
                                                    {ev.status === 'Live Now' && <span className="live-pulse">● LIVE</span>}
                                                </td>
                                                <td className="td-time">{formatIST(ev.event_datetime)}</td>
                                                <td className="td-tz">
                                                    <span className="tz-line">{toGMT(ev.event_datetime)}</span>
                                                    <span className="tz-line">{toEST(ev.event_datetime)}</span>
                                                </td>
                                                <td className="td-sankalpa">{ev.sankalpa || '—'}</td>
                                                <td className="td-freq">
                                                    <span className="freq-badge">{ev.frequency}</span>
                                                </td>
                                                <td className="td-platform">{ev.platform}</td>
                                                <td className="td-host">{ev.host_name}</td>
                                                <td className="td-status">
                                                    <span className="status-badge" style={{ background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                                                        {ev.status}
                                                    </span>
                                                </td>
                                                <td className="td-join">
                                                    {hasLink ? (
                                                        <div className="join-actions">
                                                            <a href={ev.meeting_url} target="_blank" rel="noopener noreferrer" className="join-btn">Join →</a>
                                                            <button className="qr-btn" onClick={() => setQrModal({ url: ev.meeting_url, name: ev.event_name })}>
                                                                📱 QR
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="no-link" title="Dynamic link — check closer to event time">🔗 Soon</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Section 3: Why Join */}
                <section className="satsang-why-section">
                    <div className="satsang-why-inner">
                        <h2 className="satsang-why-title">🌳 Why Join Namavruksha?</h2>
                        <p className="satsang-why-lead">
                            Chanting the Divine Name is the simplest and most powerful spiritual practice. Namavruksha is a humble digital home for this sacred discipline — a space where every Nama you chant is counted, offered, and woven into a collective tapestry of devotion for Bhagawan Yogi Ramsuratkumar.
                        </p>
                        <div className="satsang-why-cards">
                            <div className="why-card">
                                <span className="why-icon">🔢</span>
                                <h3>Track Your Practice</h3>
                                <p>Every Nama you chant matters. Namavruksha helps you count with sincerity and build the beautiful discipline of Nishta — steadfast, daily practice — that deepens your connection to the Divine Name over time.</p>
                            </div>
                            <div className="why-card">
                                <span className="why-icon">🌍</span>
                                <h3>Chant with the World</h3>
                                <p>You are never alone in this Sadhana. Devotees across India, USA, UK, Singapore, Australia and beyond are chanting right now. Your Nama joins a river of collective devotion flowing towards Bhagawan.</p>
                            </div>
                            <div className="why-card">
                                <span className="why-icon">📿</span>
                                <h3>Offer as a Sankalpa</h3>
                                <p>Each count you enter is not merely a number — it is an offering. Namavruksha gathers every Nama offered by every devotee and presents it collectively at the feet of Bhagawan Yogi Ramsuratkumar.</p>
                            </div>
                            <div className="why-card">
                                <span className="why-icon">🕉</span>
                                <h3>Join Live Satsangs</h3>
                                <p>These global chanting events are open to all. Join a session, chant together, and then log your Namas on Namavruksha. Your participation — however small — adds to the growing NamaVruksha for Bhagawan.</p>
                            </div>
                        </div>
                        <div className="satsang-cta-block">
                            <p className="satsang-cta-text">
                                <em>"The Name is the boat. Sincerity is the oar. Let us row together."</em>
                            </p>
                            <div className="satsang-cta-buttons">
                                <Link to="/register" className="cta-btn cta-primary">🌱 Register Free</Link>
                                <Link to="/login" className="cta-btn cta-secondary">🔑 Login & Offer Nama</Link>
                                <Link to="/reports/public" className="cta-btn cta-ghost">📊 View Community Stats</Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 4: Logged-in tools */}
                {user && (
                    <section className="satsang-logged-links">
                        <p className="satsang-logged-title">Your Namavruksha Tools</p>
                        <div className="satsang-tool-links">
                            <Link to="/audio" className="tool-link">🎵 Chant with Audio</Link>
                            <Link to="/invest" className="tool-link">🙏 Log Your Namas</Link>
                            <Link to="/reports" className="tool-link">📊 My Reports</Link>
                            <Link to="/prayers" className="tool-link">🌸 Prayers</Link>
                        </div>
                    </section>
                )}
            </div>

            {/* QR Modal */}
            {qrModal && (
                <QRModal url={qrModal.url} eventName={qrModal.name} onClose={() => setQrModal(null)} />
            )}
        </div>
    );
};

export default SatsangPage;
