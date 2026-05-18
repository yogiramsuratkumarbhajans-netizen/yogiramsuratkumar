import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import { useAuth } from '../context/AuthContext';
import './SatsangPage.css';

// ── Timezone helpers using JS Intl (auto BST/GMT/EST/EDT) ─────────
const formatInTZ = (istDateStr, tz, opts) => {
    const d = new Date(istDateStr);
    if (isNaN(d)) return '—';
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz, ...opts }).format(d);
};

const toUKTime = (istDateStr) => {
    // Uses Europe/London which auto-handles GMT (winter) and BST (summer)
    const d = new Date(istDateStr);
    if (isNaN(d)) return '—';
    const time = formatInTZ(istDateStr, 'Europe/London', { hour: '2-digit', minute: '2-digit', hour12: false });
    const day  = formatInTZ(istDateStr, 'Europe/London', { day: '2-digit', month: 'short' });
    // Detect whether BST or GMT
    const tzAbbr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', timeZoneName: 'short' })
        .formatToParts(new Date(istDateStr))
        .find(p => p.type === 'timeZoneName')?.value || 'UK';
    return `${day}, ${time} ${tzAbbr}`;
};

const toUSCentral = (istDateStr) => {
    // America/Chicago auto-handles CST (winter) and CDT (summer)
    const d = new Date(istDateStr);
    if (isNaN(d)) return '—';
    const time = formatInTZ(istDateStr, 'America/Chicago', { hour: '2-digit', minute: '2-digit', hour12: true });
    const day  = formatInTZ(istDateStr, 'America/Chicago', { day: '2-digit', month: 'short' });
    const tzAbbr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' })
        .formatToParts(new Date(istDateStr))
        .find(p => p.type === 'timeZoneName')?.value || 'CT';
    return `${day}, ${time} ${tzAbbr}`;
};

const formatIST = (istDateStr) => {
    const d = new Date(istDateStr);
    if (isNaN(d)) return { datePart: '—', timePart: '—' };
    const datePart = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    const timePart = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(d) + ' IST';
    return { datePart, timePart };
};

// ── Recurring event expansion ─────────────────────────────────────
// Returns array of Date objects for upcoming occurrences of an event
const getUpcomingDates = (ev, fromDate, weeksAhead = 12) => {
    const freq = ev.frequency || '';
    const base = new Date(ev.event_datetime);
    if (isNaN(base)) return [];

    const until = new Date(fromDate);
    until.setDate(until.getDate() + weeksAhead * 7);

    const DAY_MAP = {
        'Every Monday': 1, 'Every Tuesday': 2, 'Every Wednesday': 3,
        'Every Thursday': 4, 'Every Friday': 5, 'Every Saturday': 6, 'Every Sunday': 0
    };

    const results = [];
    const today = new Date(fromDate);
    today.setHours(0, 0, 0, 0);

    if (freq === 'Daily') {
        const d = new Date(today);
        while (d <= until && results.length < 30) {
            const dt = new Date(d);
            dt.setHours(base.getHours(), base.getMinutes(), 0, 0);
            results.push(dt);
            d.setDate(d.getDate() + 1);
        }
    } else if (DAY_MAP[freq] !== undefined) {
        const targetDay = DAY_MAP[freq];
        const d = new Date(today);
        // Advance to first occurrence
        while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1);
        while (d <= until && results.length < weeksAhead) {
            const dt = new Date(d);
            dt.setHours(base.getHours(), base.getMinutes(), 0, 0);
            results.push(dt);
            d.setDate(d.getDate() + 7);
        }
    } else if (freq === 'Weekly') {
        const d = new Date(base);
        while (d < today) d.setDate(d.getDate() + 7);
        while (d <= until && results.length < weeksAhead) {
            results.push(new Date(d));
            d.setDate(d.getDate() + 7);
        }
    } else if (freq === 'Monthly' || freq === '2nd Saturday Monthly') {
        // Just show the base date if upcoming, else skip
        if (base >= today) results.push(base);
    } else {
        // One-time or unknown
        if (base >= today) results.push(base);
    }

    return results;
};

// Build a map of date-string → event count for calendar
const buildCalendarMap = (events) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = {}; // 'YYYY-MM-DD' → [ev, ...]

    events.forEach(ev => {
        const dates = getUpcomingDates(ev, today, 16);
        dates.forEach(d => {
            const key = d.toISOString().split('T')[0];
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        });
    });
    return map;
};

// ── Free QR API ───────────────────────────────────────────────────
const getQRUrl = (url) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&color=7a1a1a&bgcolor=fff9f0&data=${encodeURIComponent(url)}`;

const COUNTRY_FLAGS = {
    'India': '🇮🇳', 'USA': '🇺🇸', 'UK': '🇬🇧', 'Canada': '🇨🇦',
    'Australia': '🇦🇺', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Singapore': '🇸🇬',
    'UAE': '🇦🇪', 'Malaysia': '🇲🇾', 'Sri Lanka': '🇱🇰', 'New Zealand': '🇳🇿',
    'South Africa': '🇿🇦', 'Netherlands': '🇳🇱', 'Sweden': '🇸🇪', 'Global': '🌍'
};

// ── 24/7 Ashram Live row (always visible) ─────────────────────────
const ASHRAM_247 = {
    id: 'ashram-247',
    event_name: 'Bhagawan Nama — 24/7 Live',
    country: 'India',
    host_name: 'Yogi Ramsuratkumar Ashram',
    frequency: '24/7 Always',
    platform: 'YouTube',
    meeting_url: 'https://www.youtube.com/watch?v=SQIs3S7RhgM',
    note: 'Immerse in the eternal stream of Bhagawan\'s Divine Name — flowing ceaselessly, day and night, for seekers across the world.',
    is247: true
};

const ASHRAM_CHANNEL = 'https://www.youtube.com/@YogiRamsuratkumarAshram';

// ── QR Modal ──────────────────────────────────────────────────────
const QRModal = ({ url, eventName, onClose }) => (
    <div className="qr-modal-overlay" onClick={onClose}>
        <div className="qr-modal" onClick={e => e.stopPropagation()}>
            <button className="qr-modal-close" onClick={onClose}>✕</button>
            <h3 className="qr-modal-title">🕉 {eventName}</h3>
            <img src={getQRUrl(url)} alt="QR Code" className="qr-canvas" width={200} height={200} />
            <p className="qr-modal-hint">Scan to join the session</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="qr-join-btn">Open Link →</a>
        </div>
    </div>
);

// ── Calendar ──────────────────────────────────────────────────────
const SatsangCalendar = ({ calendarMap, onDateClick, selectedDate }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const year  = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
    const goToday   = () => setCurrentMonth(new Date());

    const monthName = currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const getDateKey = (d) => {
        const y = year, m = String(month + 1).padStart(2,'0'), day = String(d).padStart(2,'0');
        return `${y}-${m}-${day}`;
    };

    const isSelectedDay = (day) => {
        if (!selectedDate) return false;
        const s = new Date(selectedDate);
        return s.getDate() === day && s.getMonth() === month && s.getFullYear() === year;
    };

    const isToday = (day) => {
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    };

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
                    const key = getDateKey(day);
                    const eventsOnDay = calendarMap[key] || [];
                    const count = eventsOnDay.length;
                    const todayCell = isToday(day);
                    const selected = isSelectedDay(day);

                    return (
                        <div
                            key={day}
                            className={`cal-cell ${todayCell ? 'today' : ''} ${count > 0 ? 'has-events' : ''} ${selected ? 'selected' : ''}`}
                            onClick={() => count > 0 && onDateClick(new Date(year, month, day))}
                            title={count > 0 ? eventsOnDay.map(e => e.event_name).join(', ') : ''}
                        >
                            <span className={`cal-day-num ${todayCell ? 'today-num' : ''}`}>{day}</span>
                            {/* Show count number instead of dots */}
                            {count > 0 && (
                                <span className="cal-event-count">{count}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="cal-legend">
                <span className="legend-item">
                    <span className="cal-event-count-sample">3</span>
                    Number = events on that day
                </span>
                <span className="legend-item today-legend">
                    <span className="today-sample">17</span>
                    Today
                </span>
            </div>
        </div>
    );
};

// ── Main Page ─────────────────────────────────────────────────────
const SatsangPage = () => {
    const { user } = useAuth();
    const [events,       setEvents]       = useState([]);
    const [loading,      setLoading]      = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [qrModal,      setQrModal]      = useState(null);
    const [calendarMap,  setCalendarMap]  = useState({});

    const [filterCountry,   setFilterCountry]   = useState('');
    const [filterFrequency, setFilterFrequency] = useState('');
    const [filterPlatform,  setFilterPlatform]  = useState('');
    const [sortBy,          setSortBy]          = useState('date_asc');

    const tableRef = useRef(null);

    useEffect(() => { loadEvents(); }, []);

    const loadEvents = async () => {
        try {
            const res = await databases.listDocuments(
                DATABASE_ID, COLLECTIONS.SATSANG_EVENTS,
                [Query.equal('is_active', true), Query.orderAsc('event_datetime'), Query.limit(100)]
            );
            const evs = res.documents.map(d => ({ ...d, id: d.$id }));
            setEvents(evs);
            setCalendarMap(buildCalendarMap(evs));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        setFilterCountry(''); setFilterFrequency(''); setFilterPlatform('');
        setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };

    const clearFilters = () => {
        setSelectedDate(null);
        setFilterCountry(''); setFilterFrequency(''); setFilterPlatform('');
    };

    // Filter events for selected date
    const filteredEvents = events.filter(ev => {
        if (selectedDate) {
            const today = new Date(); today.setHours(0,0,0,0);
            const dates = getUpcomingDates(ev, today, 16);
            const sel = new Date(selectedDate); sel.setHours(0,0,0,0);
            const matchesDate = dates.some(d => {
                const dd = new Date(d); dd.setHours(0,0,0,0);
                return dd.getTime() === sel.getTime();
            });
            if (!matchesDate) return false;
        }
        if (filterCountry   && ev.country   !== filterCountry)   return false;
        if (filterFrequency && ev.frequency  !== filterFrequency) return false;
        if (filterPlatform  && ev.platform   !== filterPlatform)  return false;
        return true;
    });

    const uniqueCountries  = [...new Set(events.map(e => e.country))].sort();
    const uniquePlatforms  = [...new Set(events.map(e => e.platform))].sort();
    const uniqueFreqs      = [...new Set(events.map(e => e.frequency))].sort();

    // Display date for each event in table
    const getDisplayDate = (ev) => {
        if (selectedDate) {
            // Show the specific selected date with correct time
            const base = new Date(ev.event_datetime);
            const d = new Date(selectedDate);
            d.setHours(base.getHours(), base.getMinutes(), 0, 0);
            return d.toISOString();
        }
        // Show next upcoming occurrence
        const today = new Date(); today.setHours(0,0,0,0);
        const dates = getUpcomingDates(ev, today, 16);
        return dates.length > 0 ? dates[0].toISOString() : ev.event_datetime;
    };

    return (
        <div className="satsang-page">
            {/* Header */}
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

                {/* 24/7 Ashram Banner — always on top */}
                <div className="ashram-247-banner">
                    <div className="ashram-247-left">
                        <span className="ashram-247-live-badge">● 24/7 LIVE</span>
                        <div>
                            <p className="ashram-247-title">🙏 Bhagawan Nama — Flowing Always</p>
                            <p className="ashram-247-note">{ASHRAM_247.note}</p>
                        </div>
                    </div>
                    <div className="ashram-247-right">
                        <a href={ASHRAM_247.meeting_url} target="_blank" rel="noopener noreferrer" className="ashram-247-watch-btn">
                            ▶ Watch Live Now
                        </a>
                        <a href={ASHRAM_CHANNEL} target="_blank" rel="noopener noreferrer" className="ashram-247-channel-btn">
                            📺 Ashram Channel
                        </a>
                    </div>
                </div>

                {/* Section 1 — Calendar */}
                <section className="satsang-section">
                    <h2 className="satsang-section-title">📅 Event Calendar</h2>
                    <p className="satsang-section-sub">Numbers on each date show how many satsangs are scheduled — click to see them</p>
                    {loading
                        ? <div className="satsang-loader"><span className="loader" /><p>Loading events...</p></div>
                        : <SatsangCalendar calendarMap={calendarMap} onDateClick={handleDateClick} selectedDate={selectedDate} />
                    }
                </section>

                {/* Section 2 — Events Table */}
                <section className="satsang-section" ref={tableRef}>
                    <div className="satsang-table-header">
                        <h2 className="satsang-section-title">
                            🌏 {selectedDate ? `Events on ${new Date(selectedDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}` : 'All Events'}
                            {selectedDate && (
                                <span className="event-count-badge">{filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}</span>
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
                                {uniqueCountries.map(c => <option key={c} value={c}>{COUNTRY_FLAGS[c]||'🌐'} {c}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Frequency</label>
                            <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value)}>
                                <option value="">All</option>
                                {uniqueFreqs.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label>Platform</label>
                            <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                                <option value="">All Platforms</option>
                                {uniquePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        {(filterCountry||filterFrequency||filterPlatform||selectedDate) && (
                            <button className="filter-clear-btn" onClick={clearFilters}>✕ Clear filters</button>
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
                                        <th>UK Time</th>
                                        <th>US Central</th>
                                        <th>Frequency</th>
                                        <th>Platform</th>
                                        <th>Host</th>
                                        <th>Join / QR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Always-visible 24/7 row */}
                                    <tr className="row-247">
                                        <td className="td-num">—</td>
                                        <td className="td-country">🇮🇳<br/><span className="td-country-name">India</span></td>
                                        <td className="td-name">
                                            <strong>Bhagawan Nama — 24/7 Live</strong>
                                            <span className="badge-247">● Always Live</span>
                                        </td>
                                        <td className="td-time"><span className="td-time-line">Anytime · Always</span></td>
                                        <td className="td-tz"><span className="tz-line">Anytime</span></td>
                                        <td className="td-tz"><span className="tz-line">Anytime</span></td>
                                        <td><span className="freq-badge freq-247">24/7</span></td>
                                        <td>YouTube</td>
                                        <td>YR Ashram</td>
                                        <td className="td-join">
                                            <div className="join-actions">
                                                <a href={ASHRAM_247.meeting_url} target="_blank" rel="noopener noreferrer" className="join-btn join-btn-247">▶ Watch</a>
                                                <a href={ASHRAM_CHANNEL} target="_blank" rel="noopener noreferrer" className="qr-btn">📺 Channel</a>
                                            </div>
                                        </td>
                                    </tr>

                                    {filteredEvents.map((ev, idx) => {
                                        const flag    = COUNTRY_FLAGS[ev.country] || '🌐';
                                        const hasLink = ev.meeting_url && ev.meeting_url.startsWith('http');
                                        const displayDateStr = getDisplayDate(ev);
                                        const ist = formatIST(displayDateStr);

                                        return (
                                            <tr key={ev.id}>
                                                <td className="td-num">{idx + 1}</td>
                                                <td className="td-country">
                                                    {flag}<br/>
                                                    <span className="td-country-name">{ev.country}</span>
                                                </td>
                                                <td className="td-name">
                                                    <strong>{ev.event_name}</strong>
                                                </td>
                                                <td className="td-time">
                                                    <span className="td-date-line">{ist.datePart}</span>
                                                    <span className="td-time-line">{ist.timePart}</span>
                                                </td>
                                                <td className="td-tz">
                                                    <span className="tz-line">{toUKTime(displayDateStr)}</span>
                                                </td>
                                                <td className="td-tz">
                                                    <span className="tz-line">{toUSCentral(displayDateStr)}</span>
                                                </td>
                                                <td>
                                                    <span className="freq-badge">{ev.frequency}</span>
                                                </td>
                                                <td className="td-platform">{ev.platform}</td>
                                                <td className="td-host">{ev.host_name}</td>
                                                <td className="td-join">
                                                    {hasLink ? (
                                                        <div className="join-actions">
                                                            <a href={ev.meeting_url} target="_blank" rel="noopener noreferrer" className="join-btn">Join →</a>
                                                            <button className="qr-btn" onClick={() => setQrModal({ url: ev.meeting_url, name: ev.event_name })}>📱 QR</button>
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

                {/* Section 3 — Why Join */}
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
                                <p>Every Nama you chant matters. Build the beautiful discipline of Nishta — steadfast, daily practice — that deepens your connection to the Divine Name over time.</p>
                            </div>
                            <div className="why-card">
                                <span className="why-icon">🌍</span>
                                <h3>Chant with the World</h3>
                                <p>Devotees across India, USA, UK, Singapore, Australia and beyond are chanting right now. Your Nama joins a river of collective devotion flowing towards Bhagawan.</p>
                            </div>
                            <div className="why-card">
                                <span className="why-icon">📿</span>
                                <h3>Offer as a Sankalpa</h3>
                                <p>Each count you enter is an offering. Namavruksha gathers every Nama offered by every devotee and presents it collectively at the feet of Bhagawan Yogi Ramsuratkumar.</p>
                            </div>
                            <div className="why-card">
                                <span className="why-icon">🕉</span>
                                <h3>Join Live Satsangs</h3>
                                <p>These global chanting events are open to all. Join a session, chant together, and then log your Namas on Namavruksha — every Nama counts.</p>
                            </div>
                        </div>
                        <div className="satsang-cta-block">
                            <p className="satsang-cta-text"><em>"The Name is the boat. Sincerity is the oar. Let us row together."</em></p>
                            <div className="satsang-cta-buttons">
                                <Link to="/register" className="cta-btn cta-primary">🌱 Register Free</Link>
                                <Link to="/login" className="cta-btn cta-secondary">🔑 Login & Offer Nama</Link>
                                <Link to="/reports/public" className="cta-btn cta-ghost">📊 View Community Stats</Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 4 — Logged-in tools */}
                {user && (
                    <section className="satsang-logged-links">
                        <p className="satsang-logged-title">Your Namavruksha Tools</p>
                        <div className="satsang-tool-links">
                            <Link to="/audio"   className="tool-link">🎵 Chant with Audio</Link>
                            <Link to="/invest"  className="tool-link">🙏 Log Your Namas</Link>
                            <Link to="/reports" className="tool-link">📊 My Reports</Link>
                            <Link to="/prayers" className="tool-link">🌸 Prayers</Link>
                        </div>
                    </section>
                )}
            </div>

            {qrModal && <QRModal url={qrModal.url} eventName={qrModal.name} onClose={() => setQrModal(null)} />}
        </div>
    );
};

export default SatsangPage;
