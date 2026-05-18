import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import { useAuth } from '../context/AuthContext';
import './SatsangPage.css';

// ── All supported timezones ───────────────────────────────────────
export const TIMEZONES = [
    { label: 'India (IST)',           tz: 'Asia/Kolkata',        abbr: 'IST'  },
    { label: 'UK (GMT/BST)',          tz: 'Europe/London',       abbr: 'UK'   },
    { label: 'US Eastern (EST/EDT)',  tz: 'America/New_York',    abbr: 'ET'   },
    { label: 'US Central (CST/CDT)', tz: 'America/Chicago',     abbr: 'CT'   },
    { label: 'US Pacific (PST/PDT)', tz: 'America/Los_Angeles', abbr: 'PT'   },
    { label: 'UAE (GST)',             tz: 'Asia/Dubai',          abbr: 'GST'  },
    { label: 'Singapore (SGT)',       tz: 'Asia/Singapore',      abbr: 'SGT'  },
    { label: 'Australia Sydney',      tz: 'Australia/Sydney',    abbr: 'AEST' },
    { label: 'Germany (CET/CEST)',    tz: 'Europe/Berlin',       abbr: 'CET'  },
];

// ── Convert a UTC ISO string to display in a given IANA timezone ─
const displayInTZ = (utcStr, ianaZone, opts = {}) => {
    const d = new Date(utcStr);
    if (isNaN(d)) return '—';
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: ianaZone,
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        ...opts
    }).format(d);
};

const displayTimeOnly = (utcStr, ianaZone) => {
    const d = new Date(utcStr);
    if (isNaN(d)) return '—';
    // Get the tz abbreviation dynamically (handles BST vs GMT, CDT vs CST etc.)
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: ianaZone,
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZoneName: 'short'
    }).formatToParts(d);
    const day  = parts.find(p => p.type === 'day')?.value;
    const mon  = parts.find(p => p.type === 'month')?.value;
    const hr   = parts.find(p => p.type === 'hour')?.value;
    const min  = parts.find(p => p.type === 'minute')?.value;
    const tzn  = parts.find(p => p.type === 'timeZoneName')?.value || '';
    return `${day} ${mon}, ${hr}:${min} ${tzn}`;
};

const displayIST = (utcStr) => {
    const d = new Date(utcStr);
    if (isNaN(d)) return { datePart: '—', timePart: '—' };
    const datePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric'
    }).format(d);
    const timePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true
    }).format(d) + ' IST';
    return { datePart, timePart };
};

// ── Date key helper ───────────────────────────────────────────────
const toDateKey = (d) => {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// ── Recurring date expansion ──────────────────────────────────────
const DAY_MAP = {
    'Every Monday': 1, 'Every Tuesday': 2, 'Every Wednesday': 3,
    'Every Thursday': 4, 'Every Friday': 5, 'Every Saturday': 6, 'Every Sunday': 0
};

const getUpcomingDates = (ev, weeksAhead = 14) => {
    const freq = (ev.frequency || '').trim();
    const base = new Date(ev.event_datetime);
    if (isNaN(base)) return [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const until = new Date(todayStart);
    until.setDate(until.getDate() + weeksAhead * 7);

    const baseHour = base.getUTCHours();
    const baseMin  = base.getUTCMinutes();

    if (freq === 'Daily') {
        const results = [];
        const d = new Date(todayStart);
        const limit = new Date(todayStart);
        limit.setDate(limit.getDate() + 30);
        while (d <= limit) {
            const dt = new Date(d);
            dt.setUTCHours(baseHour, baseMin, 0, 0);
            results.push(new Date(dt));
            d.setDate(d.getDate() + 1);
        }
        return results;
    }

    if (DAY_MAP[freq] !== undefined) {
        const targetDay = DAY_MAP[freq];
        const results = [];
        const d = new Date(todayStart);
        while (d.getDay() !== targetDay) d.setDate(d.getDate() + 1);
        while (d <= until) {
            const dt = new Date(d);
            dt.setUTCHours(baseHour, baseMin, 0, 0);
            results.push(new Date(dt));
            d.setDate(d.getDate() + 7);
        }
        return results;
    }

    if (freq === 'Weekly') {
        const results = [];
        const d = new Date(base);
        while (d < todayStart) d.setDate(d.getDate() + 7);
        while (d <= until) { results.push(new Date(d)); d.setDate(d.getDate() + 7); }
        return results;
    }

    if (base >= todayStart) return [base];
    return [];
};

const buildCalendarMap = (events) => {
    const map = {};
    events.forEach(ev => {
        getUpcomingDates(ev, 16).forEach(d => {
            const key = toDateKey(d);
            if (!map[key]) map[key] = [];
            map[key].push(ev);
        });
    });
    return map;
};

const eventOccursOnDate = (ev, targetDate) => {
    const targetKey = toDateKey(new Date(targetDate));
    return getUpcomingDates(ev, 16).some(d => toDateKey(d) === targetKey);
};

const buildDisplayUTC = (ev, targetDate) => {
    const base = new Date(ev.event_datetime);
    const d    = new Date(targetDate);
    d.setUTCHours(base.getUTCHours(), base.getUTCMinutes(), 0, 0);
    return d.toISOString();
};

// ── Constants ─────────────────────────────────────────────────────
const ASHRAM_LIVE_URL    = 'https://www.youtube.com/watch?v=SQIs3S7RhgM';
const ASHRAM_CHANNEL_URL = 'https://www.youtube.com/@YogiRamsuratkumarAshram';

const COUNTRY_FLAGS = {
    'India':'🇮🇳','USA':'🇺🇸','UK':'🇬🇧','Canada':'🇨🇦','Australia':'🇦🇺',
    'Germany':'🇩🇪','France':'🇫🇷','Singapore':'🇸🇬','UAE':'🇦🇪','Malaysia':'🇲🇾',
    'Sri Lanka':'🇱🇰','New Zealand':'🇳🇿','South Africa':'🇿🇦','Netherlands':'🇳🇱',
    'Sweden':'🇸🇪','Global':'🌍'
};

const getQRUrl = (url) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&color=7a1a1a&bgcolor=fff9f0&data=${encodeURIComponent(url)}`;

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
    const todayKey    = toDateKey(new Date());
    const selectedKey = selectedDate ? toDateKey(new Date(selectedDate)) : null;

    const getCellKey = (day) =>
        `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

    const monthName = currentMonth.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    return (
        <div className="satsang-calendar">
            <div className="cal-header">
                <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month-1, 1))}>‹</button>
                <div className="cal-month-title">
                    <span>{monthName}</span>
                    <button className="cal-today-btn" onClick={() => setCurrentMonth(new Date())}>Today</button>
                </div>
                <button className="cal-nav-btn" onClick={() => setCurrentMonth(new Date(year, month+1, 1))}>›</button>
            </div>
            <div className="cal-grid">
                {days.map(d => <div key={d} className="cal-day-label">{d}</div>)}
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} className="cal-cell empty" />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day   = i + 1;
                    const key   = getCellKey(day);
                    const count = (calendarMap[key] || []).length;
                    const isToday    = key === todayKey;
                    const isSelected = key === selectedKey;
                    return (
                        <div key={day}
                            className={`cal-cell${count>0?' has-events':''}${isSelected?' selected':''}`}
                            onClick={() => count > 0 && onDateClick(new Date(year, month, day))}
                            title={count > 0 ? `${count} event${count>1?'s':''}` : ''}
                        >
                            <span className={`cal-day-num${isToday?' today-num':''}`}>{day}</span>
                            {count > 0 && <span className="cal-event-count">{count}</span>}
                        </div>
                    );
                })}
            </div>
            <div className="cal-legend">
                <span className="legend-item">
                    <span className="legend-count-sample">2</span>
                    <span>= events on that day</span>
                </span>
                <span className="legend-item legend-today-item">
                    <span className="legend-today-sample">5</span>
                    <span>= Today</span>
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
        setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    };

    const clearFilters = () => {
        setSelectedDate(null);
        setFilterCountry(''); setFilterFrequency(''); setFilterPlatform('');
    };

    const filteredEvents = events.filter(ev => {
        if (selectedDate && !eventOccursOnDate(ev, selectedDate)) return false;
        if (filterCountry   && ev.country   !== filterCountry)   return false;
        if (filterFrequency && ev.frequency !== filterFrequency) return false;
        if (filterPlatform  && ev.platform  !== filterPlatform)  return false;
        return true;
    });

    const uniqueCountries = [...new Set(events.map(e => e.country))].sort();
    const uniquePlatforms = [...new Set(events.map(e => e.platform))].sort();
    const uniqueFreqs     = [...new Set(events.map(e => e.frequency))].sort();

    const getDisplayUTC = (ev) => {
        if (selectedDate) return buildDisplayUTC(ev, selectedDate);
        const dates = getUpcomingDates(ev, 14);
        return dates.length > 0 ? dates[0].toISOString() : ev.event_datetime;
    };

    const selectedLabel = selectedDate
        ? new Date(selectedDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })
        : null;

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

                {/* 24/7 Banner */}
                <div className="ashram-247-banner">
                    <div className="ashram-247-left">
                        <span className="ashram-247-live-badge">● 24/7 LIVE</span>
                        <div>
                            <p className="ashram-247-title">🙏 Bhagawan Nama — Flowing Always</p>
                            <p className="ashram-247-note">Immerse in the eternal stream of Bhagawan's Divine Name — flowing ceaselessly, day and night, for seekers across the world.</p>
                        </div>
                    </div>
                    <div className="ashram-247-right">
                        <a href={ASHRAM_LIVE_URL} target="_blank" rel="noopener noreferrer" className="ashram-247-watch-btn">▶ Watch Live Now</a>
                        <a href={ASHRAM_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="ashram-247-channel-btn">📺 Ashram Channel</a>
                    </div>
                </div>

                {/* Calendar */}
                <section className="satsang-section">
                    <h2 className="satsang-section-title">📅 Event Calendar</h2>
                    <p className="satsang-section-sub">Click on a date with a number to see that day's events below</p>
                    {loading
                        ? <div className="satsang-loader"><span className="loader"/><p>Loading...</p></div>
                        : <SatsangCalendar calendarMap={calendarMap} onDateClick={handleDateClick} selectedDate={selectedDate} />
                    }
                </section>

                {/* Events Table */}
                <section className="satsang-section" ref={tableRef}>
                    <div className="satsang-table-header">
                        <h2 className="satsang-section-title">
                            {selectedLabel
                                ? <>🗓 {selectedLabel} <span className="event-count-badge">{filteredEvents.length} event{filteredEvents.length!==1?'s':''}</span></>
                                : <>🌏 All Events <span className="event-count-badge">{filteredEvents.length}</span></>
                            }
                        </h2>
                        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                            {selectedDate && <button className="filter-clear-btn" onClick={clearFilters}>✕ Show All</button>}
                            <Link to="/satsang/submit" className="satsang-submit-btn-sm">+ Host an Event</Link>
                        </div>
                    </div>

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
                        {(filterCountry||filterFrequency||filterPlatform) && (
                            <button className="filter-clear-btn" onClick={clearFilters}>✕ Clear</button>
                        )}
                    </div>

                    {loading ? <div className="satsang-loader"><span className="loader"/></div> : (
                        <div className="satsang-table-wrapper">
                            <table className="satsang-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Country</th>
                                        <th>Event Name</th>
                                        <th>India (IST)</th>
                                        <th>UK Time</th>
                                        <th>US Central</th>
                                        <th>Frequency</th>
                                        <th>Platform</th>
                                        <th>Host</th>
                                        <th>Join / QR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Always-on 24/7 row */}
                                    <tr className="row-247">
                                        <td className="td-num">—</td>
                                        <td className="td-country">🇮🇳<br/><span className="td-country-name">India</span></td>
                                        <td className="td-name"><strong>Bhagawan Nama — 24/7 Live</strong><span className="badge-247">● Always Live</span></td>
                                        <td className="td-time"><span className="td-time-line">Anytime · Always</span></td>
                                        <td className="td-tz"><span className="tz-line">Anytime</span></td>
                                        <td className="td-tz"><span className="tz-line">Anytime</span></td>
                                        <td><span className="freq-badge freq-247">24/7</span></td>
                                        <td>YouTube</td>
                                        <td>Yogi Ramsuratkumar Glimpses</td>
                                        <td className="td-join">
                                            <div className="join-actions">
                                                <a href={ASHRAM_LIVE_URL} target="_blank" rel="noopener noreferrer" className="join-btn join-btn-247">▶ Watch</a>
                                                <a href={ASHRAM_CHANNEL_URL} target="_blank" rel="noopener noreferrer" className="qr-btn">📺 Channel</a>
                                            </div>
                                        </td>
                                    </tr>

                                    {filteredEvents.length === 0 ? (
                                        <tr><td colSpan="10" style={{textAlign:'center',padding:'2rem',color:'#888'}}>🙏 No events found for this selection.</td></tr>
                                    ) : filteredEvents.map((ev, idx) => {
                                        const flag    = COUNTRY_FLAGS[ev.country] || '🌐';
                                        const hasLink = ev.meeting_url && ev.meeting_url.startsWith('http');
                                        const utc     = getDisplayUTC(ev);
                                        const ist     = displayIST(utc);

                                        return (
                                            <tr key={ev.id}>
                                                <td className="td-num">{idx+1}</td>
                                                <td className="td-country">{flag}<br/><span className="td-country-name">{ev.country}</span></td>
                                                <td className="td-name"><strong>{ev.event_name}</strong></td>
                                                <td className="td-time">
                                                    <span className="td-date-line">{ist.datePart}</span>
                                                    <span className="td-time-line">{ist.timePart}</span>
                                                </td>
                                                <td className="td-tz"><span className="tz-line">{displayTimeOnly(utc,'Europe/London')}</span></td>
                                                <td className="td-tz"><span className="tz-line">{displayTimeOnly(utc,'America/Chicago')}</span></td>
                                                <td><span className="freq-badge">{ev.frequency}</span></td>
                                                <td className="td-platform">{ev.platform}</td>
                                                <td className="td-host">{ev.host_name}</td>
                                                <td className="td-join">
                                                    {hasLink ? (
                                                        <div className="join-actions">
                                                            <a href={ev.meeting_url} target="_blank" rel="noopener noreferrer" className="join-btn">Join →</a>
                                                            <button className="qr-btn" onClick={() => setQrModal({url:ev.meeting_url,name:ev.event_name})}>📱 QR</button>
                                                        </div>
                                                    ) : <span className="no-link">🔗 Soon</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {/* Why Join */}
                <section className="satsang-why-section">
                    <div className="satsang-why-inner">
                        <h2 className="satsang-why-title">🌳 Why Join Namavruksha?</h2>
                        <p className="satsang-why-lead">Chanting the Divine Name is the simplest and most powerful spiritual practice. Namavruksha is a humble digital home for this sacred discipline — a space where every Nama you chant is counted, offered, and woven into a collective tapestry of devotion for Bhagawan Yogi Ramsuratkumar.</p>
                        <div className="satsang-why-cards">
                            <div className="why-card"><span className="why-icon">🔢</span><h3>Track Your Practice</h3><p>Every Nama you chant matters. Build the beautiful discipline of Nishta — steadfast, daily practice — that deepens your connection to the Divine Name.</p></div>
                            <div className="why-card"><span className="why-icon">🌍</span><h3>Chant with the World</h3><p>Devotees across India, USA, UK, Singapore, Australia and beyond are chanting right now. Your Nama joins a river of collective devotion.</p></div>
                            <div className="why-card"><span className="why-icon">📿</span><h3>Offer as a Sankalpa</h3><p>Each count you enter is an offering. Namavruksha gathers every Nama and presents it collectively at the feet of Bhagawan Yogi Ramsuratkumar.</p></div>
                            <div className="why-card"><span className="why-icon">🕉</span><h3>Join Live Satsangs</h3><p>These global chanting events are open to all. Join a session, chant together, and log your Namas on Namavruksha — every Nama counts.</p></div>
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
