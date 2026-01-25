import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserStats, getUserRecentEntries, getUserEntriesByDateRange } from '../services/namaService';
import * as XLSX from 'xlsx';
import './ReportsPage.css';

const ReportsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [recentEntries, setRecentEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    // Date range filter state
    const [dateRangeStart, setDateRangeStart] = useState('');
    const [dateRangeEnd, setDateRangeEnd] = useState('');
    const [dateRangeTotal, setDateRangeTotal] = useState(null);
    const [dateRangeLoading, setDateRangeLoading] = useState(false);

    // Calendar state
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [calendarData, setCalendarData] = useState({});
    const [calendarLoading, setCalendarLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        loadData();
    }, [user, navigate]);

    const loadData = async () => {
        try {
            const [userStats, entries] = await Promise.all([
                getUserStats(user.$id),
                getUserRecentEntries(user.$id, 10)
            ]);
            setStats(userStats);
            setRecentEntries(entries);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch calendar data for a specific month
    const fetchCalendarData = async (month, year) => {
        setCalendarLoading(true);
        try {
            const startDate = new Date(year, month, 1).toISOString().split('T')[0];
            const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
            const result = await getUserEntriesByDateRange(user.$id, startDate, endDate);

            // Group entries by date
            const dailyData = {};
            if (result.entries) {
                result.entries.forEach(entry => {
                    const date = entry.entry_date;
                    if (!dailyData[date]) dailyData[date] = 0;
                    dailyData[date] += entry.count || 0;
                });
            }
            setCalendarData(dailyData);
        } catch (err) {
            console.error('Error fetching calendar data:', err);
            setCalendarData({});
        } finally {
            setCalendarLoading(false);
        }
    };

    // Load calendar data when month/year changes
    useEffect(() => {
        if (user) {
            fetchCalendarData(calendarMonth, calendarYear);
        }
    }, [calendarMonth, calendarYear, user]);

    // Calendar navigation
    const navigateMonth = (direction) => {
        if (direction === 'prev') {
            if (calendarMonth === 0) {
                setCalendarMonth(11);
                setCalendarYear(calendarYear - 1);
            } else {
                setCalendarMonth(calendarMonth - 1);
            }
        } else {
            if (calendarMonth === 11) {
                setCalendarMonth(0);
                setCalendarYear(calendarYear + 1);
            } else {
                setCalendarMonth(calendarMonth + 1);
            }
        }
        setSelectedDay(null);
    };

    // Get calendar grid
    const getCalendarDays = () => {
        const firstDay = new Date(calendarYear, calendarMonth, 1);
        const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

        const days = [];
        // Add empty cells for days before month starts
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push({ day: null, date: null });
        }
        // Add actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({ day: d, date: dateStr, count: calendarData[dateStr] || 0 });
        }
        return days;
    };

    // Get monthly total from calendar data
    const getMonthlyTotal = () => {
        return Object.values(calendarData).reduce((sum, count) => sum + count, 0);
    };

    // Get color intensity based on count
    const getColorIntensity = (count) => {
        if (!count) return 'transparent';
        if (count < 20) return 'rgba(255, 153, 51, 0.2)';
        if (count < 50) return 'rgba(255, 153, 51, 0.4)';
        if (count < 100) return 'rgba(255, 153, 51, 0.6)';
        if (count < 200) return 'rgba(255, 153, 51, 0.8)';
        return 'rgba(255, 153, 51, 1)';
    };

    const formatNumber = (num) => num?.toLocaleString() || '0';

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    // Date range calculation handler
    const handleDateRangeSearch = async () => {
        if (!dateRangeStart || !dateRangeEnd) return;

        setDateRangeLoading(true);
        try {
            const result = await getUserEntriesByDateRange(user.$id, dateRangeStart, dateRangeEnd);
            setDateRangeTotal(result.total);
        } catch (err) {
            console.error('Error fetching date range:', err);
            setDateRangeTotal(0);
        } finally {
            setDateRangeLoading(false);
        }
    };

    // Quick date range setters
    const setQuickRange = (type) => {
        const now = new Date();
        let start, end;

        switch (type) {
            case 'week':
                const dayOfWeek = now.getDay();
                start = new Date(now);
                start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            case 'last7':
                end = new Date(now);
                start = new Date(now);
                start.setDate(now.getDate() - 6);
                break;
            case 'last30':
                end = new Date(now);
                start = new Date(now);
                start.setDate(now.getDate() - 29);
                break;
            default:
                return;
        }

        setDateRangeStart(start.toISOString().split('T')[0]);
        setDateRangeEnd(end.toISOString().split('T')[0]);
        setDateRangeTotal(null);
    };

    const exportToExcel = () => {
        if (recentEntries.length === 0) return;

        // Prepare data for export
        const exportData = recentEntries.map(entry => ({
            'Entry Date': formatDate(entry.entry_date),
            'Sankalpa': entry.nama_accounts?.name || '-',
            'Count': entry.count,
            'Start Date': entry.start_date ? formatDate(entry.start_date) : '-',
            'End Date': entry.end_date ? formatDate(entry.end_date) : '-',
            'Type': entry.source_type
        }));

        // Add summary row
        exportData.push({});
        exportData.push({
            'Entry Date': 'SUMMARY',
            'Sankalpa': '',
            'Count': '',
            'Start Date': '',
            'End Date': '',
            'Type': ''
        });
        exportData.push({
            'Entry Date': 'Today',
            'Sankalpa': stats?.today || 0,
            'Count': '',
            'Start Date': 'This Week',
            'End Date': stats?.thisWeek || 0,
            'Type': ''
        });
        exportData.push({
            'Entry Date': 'This Month',
            'Sankalpa': stats?.thisMonth || 0,
            'Count': '',
            'Start Date': 'This Year',
            'End Date': stats?.thisYear || 0,
            'Type': ''
        });
        exportData.push({
            'Entry Date': 'Overall Total',
            'Sankalpa': stats?.overall || 0,
            'Count': '',
            'Start Date': '',
            'End Date': '',
            'Type': ''
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'My Nama Report');

        // Generate filename with date
        const fileName = `NamaReport_${user.name?.replace(/\s+/g, '_') || 'User'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    if (!user) return null;

    return (
        <div className="reports-page page-enter">
            <header className="page-header">
                <div className="container">
                    <Link to="/dashboard" className="back-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Dashboard
                    </Link>
                    <h1>My Reports</h1>
                    <p>Your devotion journey in numbers</p>
                </div>
            </header>

            <main className="reports-main">
                <div className="container container-md">
                    {loading ? (
                        <div className="page-loader">
                            <span className="loader"></span>
                            <p>Loading your reports...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Overview */}
                            <section className="report-section">
                                <h2>Consolidated Totals</h2>
                                <div className="stats-grid stats-grid-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                                    <div className="stat-card">
                                        <div className="stat-value">{formatNumber(stats?.today)}</div>
                                        <div className="stat-label">Today</div>
                                        <div className="stat-date" style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                                            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{formatNumber(stats?.currentWeek)}</div>
                                        <div className="stat-label">Current Week</div>
                                        <div className="stat-date" style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                                            {(() => {
                                                const now = new Date();
                                                const day = now.getDay();
                                                const monday = new Date(now);
                                                monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
                                                const sunday = new Date(monday);
                                                sunday.setDate(monday.getDate() + 6);
                                                return `${monday.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })} - ${sunday.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}`;
                                            })()}
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{formatNumber(stats?.currentMonth)}</div>
                                        <div className="stat-label">Current Month</div>
                                        <div className="stat-date" style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                                            {new Date().toLocaleDateString('en-IN', { month: 'long' })}
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{formatNumber(stats?.currentYear)}</div>
                                        <div className="stat-label">Current Year</div>
                                        <div className="stat-date" style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                                            {new Date().getFullYear()}
                                        </div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{formatNumber(stats?.previousYear)}</div>
                                        <div className="stat-label">Previous Year</div>
                                        <div className="stat-date" style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                                            {new Date().getFullYear() - 1}
                                        </div>
                                    </div>
                                    <div className="stat-card highlight">
                                        <div className="stat-value">{formatNumber(stats?.overall)}</div>
                                        <div className="stat-label">Overall</div>
                                    </div>
                                </div>
                            </section>

                            {/* Date Range Calculator */}
                            <section className="report-section" style={{ background: 'var(--cream-light, #fdf8f3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
                                <h2 style={{ marginBottom: '1rem' }}>📅 Custom Date Range</h2>
                                <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    Select a date range to see your total Nama contributions
                                </p>

                                {/* Quick Range Buttons */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setQuickRange('last7')}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        Last 7 Days
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setQuickRange('last30')}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        Last 30 Days
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setQuickRange('week')}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        This Week
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setQuickRange('month')}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        This Month
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setQuickRange('year')}
                                        style={{ fontSize: '0.8rem' }}
                                    >
                                        This Year
                                    </button>
                                </div>

                                {/* Custom Date Inputs */}
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: '140px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>From Date</label>
                                        <input
                                            type="date"
                                            value={dateRangeStart}
                                            onChange={(e) => { setDateRangeStart(e.target.value); setDateRangeTotal(null); }}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '140px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>To Date</label>
                                        <input
                                            type="date"
                                            value={dateRangeEnd}
                                            onChange={(e) => { setDateRangeEnd(e.target.value); setDateRangeTotal(null); }}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleDateRangeSearch}
                                        disabled={!dateRangeStart || !dateRangeEnd || dateRangeLoading}
                                        style={{ minWidth: '100px' }}
                                    >
                                        {dateRangeLoading ? 'Loading...' : 'Calculate'}
                                    </button>
                                </div>

                                {/* Results */}
                                {dateRangeTotal !== null && (
                                    <div style={{
                                        marginTop: '1.5rem',
                                        padding: '1.5rem',
                                        background: 'linear-gradient(135deg, #FF9933 0%, #FF6600 100%)',
                                        borderRadius: '12px',
                                        textAlign: 'center',
                                        color: 'white'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '4px' }}>
                                            {formatDate(dateRangeStart)} — {formatDate(dateRangeEnd)}
                                        </div>
                                        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                                            {formatNumber(dateRangeTotal)}
                                        </div>
                                        <div style={{ fontSize: '1rem', opacity: 0.9 }}>
                                            Total Namas
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Interactive Calendar */}
                            <section className="report-section" style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    📅 Nama Calendar
                                </h2>
                                <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                    View your daily contributions. Navigate to previous months to see your history.
                                </p>

                                {/* Month Navigation */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    padding: '0.75rem 1rem',
                                    background: 'var(--cream-light, #fdf8f3)',
                                    borderRadius: '8px'
                                }}>
                                    <button
                                        onClick={() => navigateMonth('prev')}
                                        style={{
                                            background: 'white',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px',
                                            padding: '8px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        ← {new Date(calendarYear, calendarMonth - 1).toLocaleDateString('en-IN', { month: 'short' })}
                                    </button>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#333' }}>
                                            {new Date(calendarYear, calendarMonth).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                        </div>
                                        {calendarLoading && <span style={{ fontSize: '0.75rem', color: '#888' }}>Loading...</span>}
                                    </div>
                                    <button
                                        onClick={() => navigateMonth('next')}
                                        style={{
                                            background: 'white',
                                            border: '1px solid #ddd',
                                            borderRadius: '8px',
                                            padding: '8px 16px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {new Date(calendarYear, calendarMonth + 1).toLocaleDateString('en-IN', { month: 'short' })} →
                                    </button>
                                </div>

                                {/* Quick Month Jump */}
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', justifyContent: 'center' }}>
                                    {[-3, -2, -1, 0].map(offset => {
                                        const d = new Date();
                                        d.setMonth(d.getMonth() + offset);
                                        const isActive = calendarMonth === d.getMonth() && calendarYear === d.getFullYear();
                                        return (
                                            <button
                                                key={offset}
                                                onClick={() => { setCalendarMonth(d.getMonth()); setCalendarYear(d.getFullYear()); }}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    border: isActive ? '2px solid #FF9933' : '1px solid #ddd',
                                                    background: isActive ? '#FFF8E1' : 'white',
                                                    color: isActive ? '#FF6600' : '#666',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                    fontWeight: isActive ? '600' : '400'
                                                }}
                                            >
                                                {d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Calendar Grid */}
                                <div style={{ marginBottom: '1rem' }}>
                                    {/* Weekday Headers */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gap: '4px',
                                        marginBottom: '8px'
                                    }}>
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                            <div key={day} style={{
                                                textAlign: 'center',
                                                padding: '8px 4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                color: '#888'
                                            }}>
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Day Cells */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gap: '4px'
                                    }}>
                                        {getCalendarDays().map((cell, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => cell.day && setSelectedDay(cell)}
                                                style={{
                                                    aspectRatio: '1',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '8px',
                                                    cursor: cell.day ? 'pointer' : 'default',
                                                    background: selectedDay?.date === cell.date
                                                        ? 'linear-gradient(135deg, #FF9933 0%, #FF6600 100%)'
                                                        : getColorIntensity(cell.count),
                                                    border: cell.date === new Date().toISOString().split('T')[0]
                                                        ? '2px solid #8B0000'
                                                        : selectedDay?.date === cell.date
                                                            ? 'none'
                                                            : '1px solid #eee',
                                                    color: selectedDay?.date === cell.date ? 'white' : '#333',
                                                    transition: 'all 0.2s ease',
                                                    minHeight: '50px'
                                                }}
                                            >
                                                {cell.day && (
                                                    <>
                                                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{cell.day}</span>
                                                        {cell.count > 0 && (
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                fontWeight: '500',
                                                                marginTop: '2px',
                                                                opacity: selectedDay?.date === cell.date ? 1 : 0.8
                                                            }}>
                                                                {cell.count}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Selected Day Info */}
                                {selectedDay && (
                                    <div style={{
                                        padding: '1rem',
                                        background: 'linear-gradient(135deg, #FF9933 0%, #FF6600 100%)',
                                        borderRadius: '12px',
                                        color: 'white',
                                        textAlign: 'center',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                                            {new Date(selectedDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                            {formatNumber(selectedDay.count)}
                                        </div>
                                        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Namas</div>
                                    </div>
                                )}

                                {/* Monthly Summary */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: '#f8f9fa',
                                    borderRadius: '8px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Monthly Total</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF6600' }}>
                                            {formatNumber(getMonthlyTotal())} Namas
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>Days with activity</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333' }}>
                                            {Object.keys(calendarData).filter(k => calendarData[k] > 0).length} days
                                        </div>
                                    </div>
                                </div>

                                {/* Color Legend */}
                                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#888' }}>Intensity:</span>
                                    {[{ label: '1-19', color: 'rgba(255, 153, 51, 0.2)' },
                                    { label: '20-49', color: 'rgba(255, 153, 51, 0.4)' },
                                    { label: '50-99', color: 'rgba(255, 153, 51, 0.6)' },
                                    { label: '100-199', color: 'rgba(255, 153, 51, 0.8)' },
                                    { label: '200+', color: 'rgba(255, 153, 51, 1)' }].map(item => (
                                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '16px', height: '16px', background: item.color, borderRadius: '4px', border: '1px solid #ddd' }} />
                                            <span style={{ fontSize: '0.7rem', color: '#666' }}>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                            <section className="report-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h2 style={{ margin: 0 }}>Recent Entries</h2>
                                    {recentEntries.length > 0 && (
                                        <button
                                            onClick={exportToExcel}
                                            className="btn btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            Export Excel
                                        </button>
                                    )}
                                </div>
                                {recentEntries.length === 0 ? (
                                    <div className="empty-state">
                                        <div className="empty-state-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="12" y1="18" x2="12" y2="12" />
                                                <line x1="9" y1="15" x2="15" y2="15" />
                                            </svg>
                                        </div>
                                        <p className="empty-state-title">No entries yet</p>
                                        <p className="empty-state-text">Start your Nama journey by investing some Namas today!</p>
                                        <Link to="/invest" className="btn btn-primary">
                                            Invest Nama
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th>Entry Date</th>
                                                    <th>Sankalpa</th>
                                                    <th>Count</th>
                                                    <th>Period (Start - End)</th>
                                                    <th>Type</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentEntries.map(entry => (
                                                    <tr key={entry.id}>
                                                        <td>{formatDate(entry.entry_date)}</td>
                                                        <td>{entry.nama_accounts?.name || '-'}</td>
                                                        <td className="count-cell">{formatNumber(entry.count)}</td>
                                                        <td>
                                                            {entry.start_date || entry.end_date ? (
                                                                <span className="date-range">
                                                                    {entry.start_date ? formatDate(entry.start_date) : '...'} - {entry.end_date ? formatDate(entry.end_date) : '...'}
                                                                </span>
                                                            ) : (
                                                                <span className="date-single">Single Day</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`badge badge-${entry.source_type === 'audio' ? 'info' : 'success'}`}>
                                                                {entry.source_type}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </section>

                            {/* Motivational Quote */}
                            <div className="quote-section">
                                <p>"Consistent devotion, however small, moves mountains of karma."</p>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportsPage;
