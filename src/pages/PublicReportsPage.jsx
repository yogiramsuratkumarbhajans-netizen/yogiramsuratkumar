import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAccountStats } from '../services/namaService';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import './PublicReportsPage.css';

const COLORS = ['#FF9933', '#8B0000', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#00BCD4', '#E91E63'];

const PublicReportsPage = () => {
    const [loading, setLoading] = useState(true);
    const [accountStats, setAccountStats] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);
    const [userTotals, setUserTotals] = useState([]);
    const [dailyData, setDailyData] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [sourceRatio, setSourceRatio] = useState([]);
    const [cityStats, setCityStats] = useState([]);
    const [newDevotees, setNewDevotees] = useState([]);
    const [topGrowing, setTopGrowing] = useState([]);
    const [totalStats, setTotalStats] = useState({ users: 0, entries: 0, total: 0 });
    const [recentEntries, setRecentEntries] = useState([]);

    const currentYear = new Date().getFullYear();
    const [selectedPreviousYear, setSelectedPreviousYear] = useState(currentYear - 1);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - 1 - i);

    useEffect(() => {
        loadAllData();
    }, []);

    // ─── SINGLE SHARED FETCH ─────────────────────────────────────────────────────

    const fetchSharedData = async () => {
        const [entriesRes, usersRes, accountsRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [Query.limit(2000)]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1000)]),
            databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ACCOUNTS, [Query.limit(100)])
        ]);
        return {
            allEntries: entriesRes.documents,
            entriesTotal: entriesRes.total,
            allUsers: usersRes.documents,
            usersTotal: usersRes.total,
            allAccounts: accountsRes.documents,
            usersMap: Object.fromEntries(usersRes.documents.map(u => [u.$id, u])),
            accountsMap: Object.fromEntries(accountsRes.documents.map(a => [a.$id, a]))
        };
    };

    const loadAllData = async () => {
        try {
            const shared = await fetchSharedData();
            await Promise.all([
                loadAccountStats(shared),
                loadRecentUsers(shared),
                loadUserTotals(shared),
                loadDailyData(shared),
                loadWeeklyData(shared),
                loadSourceRatio(shared),
                loadCityStats(shared),
                loadNewDevotees(shared),
                loadTopGrowing(shared),
                loadTotalStats(shared),
                loadRecentEntries(shared)
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // ─── ACCOUNT STATS ───────────────────────────────────────────────────────────

    const loadAccountStats = async (shared, rangeOverride = null) => {
        let title = 'Previous Year';
        let startDate, endDate;

        if (rangeOverride && rangeOverride.type === 'custom') {
            startDate = rangeOverride.start;
            endDate = rangeOverride.end;
            title = 'Custom Period';
        } else {
            const year = (rangeOverride && rangeOverride.year) || selectedPreviousYear;
            startDate = `${year}-01-01`;
            endDate = `${year}-12-31`;
            title = year === (currentYear - 1) ? 'Previous Year' : `${year}`;
        }

        try {
            const data = await getAccountStats();
            const entries = shared?.allEntries || [];

            const enhancedStats = (data || []).map(account => {
                const accountEntries = entries.filter(e => e.account_id === account.id);
                const previousYearCount = accountEntries
                    .filter(e => e.entry_date >= startDate && e.entry_date <= endDate)
                    .reduce((sum, e) => sum + (e.count || 0), 0);
                return { ...account, previousYear: previousYearCount, comparisonTitle: title };
            });

            setAccountStats(enhancedStats);
        } catch (err) {
            console.error('Error loading account stats:', err);
            setAccountStats([]);
        }
    };

    // Year picker re-fetch — only triggered by user action, not on load
    const handleYearChange = async (rangeOverride) => {
        const { start, end, year, type } = rangeOverride || {};
        let startDate = start || `${year || selectedPreviousYear}-01-01`;
        let endDate = end || `${year || selectedPreviousYear}-12-31`;
        let title = type === 'custom' ? 'Custom Period' : (year === currentYear - 1 ? 'Previous Year' : `${year}`);

        try {
            const [data, entriesRes] = await Promise.all([
                getAccountStats(),
                databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [
                    Query.greaterThanEqual('entry_date', startDate),
                    Query.lessThanEqual('entry_date', endDate),
                    Query.limit(2000)
                ])
            ]);

            const enhancedStats = (data || []).map(account => {
                const accountEntries = entriesRes.documents.filter(e => e.account_id === account.id);
                const previousYearCount = accountEntries.reduce((sum, e) => sum + (e.count || 0), 0);
                return { ...account, previousYear: previousYearCount, comparisonTitle: title };
            });

            setAccountStats(enhancedStats);
        } catch (err) {
            console.error('Error updating year stats:', err);
        }
    };

    // ─── RECENT USERS — one batch link fetch, not one per user ──────────────────

    const loadRecentUsers = async (shared) => {
        try {
            const recentUserDocs = [...shared.allUsers]
                .filter(u => u.is_active)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 8);

            const recentUserIds = recentUserDocs.map(u => u.$id);

            // ONE fetch for all links instead of one per user
            let allLinks = [];
            try {
                const linksResponse = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.USER_ACCOUNT_LINKS,
                    [Query.equal('user_id', recentUserIds), Query.limit(100)]
                );
                allLinks = linksResponse.documents;
            } catch { /* links optional */ }

            const enrichedUsers = recentUserDocs.map(user => {
                const userLinks = allLinks.filter(l => l.user_id === user.$id);
                const accountIds = userLinks.map(l => l.account_id);
                const accounts = shared.allAccounts
                    .filter(a => accountIds.includes(a.$id))
                    .map(a => a.name);

                const userEntries = shared.allEntries.filter(e => e.user_id === user.$id);
                const totalCount = userEntries.reduce((sum, e) => sum + (e.count || 0), 0);

                return { ...user, id: user.$id, accounts, totalCount };
            });

            setRecentUsers(enrichedUsers);
        } catch (err) {
            console.error('Error loading recent users:', err);
        }
    };

    // ─── ALL REMAINING FUNCTIONS USE shared, NO EXTRA FETCHES ───────────────────

    const loadUserTotals = async (shared) => {
        try {
            const userMap = {};
            shared.allEntries.forEach(entry => {
                if (!userMap[entry.user_id]) userMap[entry.user_id] = 0;
                userMap[entry.user_id] += entry.count || 0;
            });

            const totals = shared.allUsers
                .map(user => ({ name: user.name, city: user.city, total: userMap[user.$id] || 0 }))
                .filter(u => u.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            setUserTotals(totals);
        } catch (err) {
            console.error('Error loading user totals:', err);
        }
    };

    const loadDailyData = async (shared) => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }
        try {
            const dailyTotals = last7Days.map(date => ({
                date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                count: shared.allEntries
                    .filter(e => e.entry_date === date)
                    .reduce((sum, e) => sum + (e.count || 0), 0)
            }));
            setDailyData(dailyTotals);
        } catch (err) {
            console.error('Error loading daily data:', err);
        }
    };

    const loadWeeklyData = async (shared) => {
        const last4Weeks = [];
        for (let i = 3; i >= 0; i--) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - (i * 7) - 6);
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - (i * 7));
            last4Weeks.push({
                label: `Week ${4 - i}`,
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            });
        }
        try {
            const weeklyTotals = last4Weeks.map(week => ({
                week: week.label,
                count: shared.allEntries
                    .filter(e => e.entry_date >= week.start && e.entry_date <= week.end)
                    .reduce((sum, e) => sum + (e.count || 0), 0)
            }));
            setWeeklyData(weeklyTotals);
        } catch (err) {
            console.error('Error loading weekly data:', err);
        }
    };

    const loadSourceRatio = async (shared) => {
        try {
            const manual = shared.allEntries
                .filter(e => e.source_type === 'manual')
                .reduce((sum, e) => sum + (e.count || 0), 0);
            const audio = shared.allEntries
                .filter(e => e.source_type === 'audio')
                .reduce((sum, e) => sum + (e.count || 0), 0);
            setSourceRatio([{ name: 'Manual', value: manual }, { name: 'Audio', value: audio }]);
        } catch (err) {
            console.error('Error loading source ratio:', err);
        }
    };

    const loadCityStats = async (shared) => {
        try {
            const cityMap = {};
            shared.allUsers.forEach(user => {
                if (user.city) {
                    if (!cityMap[user.city]) cityMap[user.city] = { city: user.city, count: 0 };
                    const userEntries = shared.allEntries.filter(e => e.user_id === user.$id);
                    cityMap[user.city].count += userEntries.reduce((sum, e) => sum + (e.count || 0), 0);
                }
            });
            const sorted = Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 6);
            setCityStats(sorted);
        } catch (err) {
            console.error('Error loading city stats:', err);
        }
    };

    const loadNewDevotees = async (shared) => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }
        try {
            const dailyNew = last7Days.map(date => ({
                date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                count: shared.allUsers.filter(u => u.created_at?.split('T')[0] === date).length
            }));
            setNewDevotees(dailyNew);
        } catch (err) {
            console.error('Error loading new devotees:', err);
        }
    };

    const loadTopGrowing = async (shared) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        try {
            const recentEntries = shared.allEntries.filter(e => e.entry_date >= weekStartStr);
            const accountMap = {};
            recentEntries.forEach(entry => {
                const name = shared.accountsMap[entry.account_id]?.name || 'Unknown';
                if (!accountMap[name]) accountMap[name] = 0;
                accountMap[name] += entry.count || 0;
            });
            const sorted = Object.entries(accountMap)
                .map(([name, count]) => ({
                    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
                    growth: count
                }))
                .sort((a, b) => b.growth - a.growth)
                .slice(0, 5);
            setTopGrowing(sorted);
        } catch (err) {
            console.error('Error loading top growing:', err);
        }
    };

    const loadTotalStats = async (shared) => {
        try {
            const total = shared.allEntries.reduce((sum, e) => sum + (e.count || 0), 0);
            const devoteesChanted = shared.allEntries.reduce((sum, entry) => {
                const devotees = parseInt(entry.devotee_count);
                return sum + (isNaN(devotees) || devotees === 0 ? 1 : devotees);
            }, 0);
            setTotalStats({
                users: shared.usersTotal,
                entries: shared.entriesTotal,
                total,
                devotees: devoteesChanted
            });
        } catch (err) {
            console.error('Error loading total stats:', err);
        }
    };

    const loadRecentEntries = async (shared) => {
        try {
            // Small ordered fetch — only 15 rows, needed for correct ordering
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.NAMA_ENTRIES,
                [Query.orderDesc('created_at'), Query.limit(15)]
            );
            const enrichedEntries = response.documents.map(entry => ({
                ...entry,
                id: entry.$id,
                users: shared.usersMap[entry.user_id] ? { name: shared.usersMap[entry.user_id].name } : null,
                nama_accounts: shared.accountsMap[entry.account_id] ? { name: shared.accountsMap[entry.account_id].name } : null
            }));
            setRecentEntries(enrichedEntries);
        } catch (err) {
            console.error('Error loading recent entries:', err);
        }
    };

    // ─── FORMATTERS ──────────────────────────────────────────────────────────────

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatNumber = (num) => {
        return num?.toLocaleString() || '0';
    };

    // ─── LOADING STATE ───────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="public-reports-page">
                <div className="page-loader">
                    <span className="loader"></span>
                    <p>Loading community reports...</p>
                </div>
            </div>
        );
    }

    // ─── JSX — 100% IDENTICAL TO YOUR ORIGINAL ──────────────────────────────────

    return (
        <div className="public-reports-page page-enter">
            <header className="reports-header">
                <div className="container">
                    <Link to="/" className="back-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Home
                    </Link>
                    <div className="header-content">
                        <div className="om-symbol">ॐ</div>
                        <h1>Namavruksha Reports</h1>
                        <p>Community devotion statistics and insights</p>
                    </div>
                </div>
            </header>

            <main className="reports-main">
                <div className="container">

                    {/* Global Stats */}
                    <section className="global-stats">
                        <div className="stat-card highlight">
                            <div className="stat-value">{formatNumber(totalStats.total)}</div>
                            <div className="stat-label">Total Namas</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{formatNumber(totalStats.devotees || totalStats.users)}</div>
                            <div className="stat-label">Devotees</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{formatNumber(totalStats.entries)}</div>
                            <div className="stat-label">Entries</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{accountStats.length}</div>
                            <div className="stat-label">Sankalpas</div>
                        </div>
                    </section>

                    {/* Recently Joined Users */}
                    <section className="section recently-joined">
                        <h2>Recently Joined Devotees</h2>
                        <div className="users-grid-enhanced">
                            {recentUsers.map(user => (
                                <div key={user.id} className="user-card-enhanced">
                                    <div className="user-avatar-lg">
                                        {user.profile_photo ? (
                                            <img src={user.profile_photo} alt={user.name} />
                                        ) : (
                                            <span>{user.name?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="user-details">
                                        <h4>{user.name}</h4>
                                        {user.city && (
                                            <p className="user-city">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                {user.city}
                                            </p>
                                        )}
                                        <div className="user-accounts">
                                            {user.accounts?.slice(0, 2).map((acc, i) => (
                                                <span key={i} className="mini-tag">{acc}</span>
                                            ))}
                                        </div>
                                        <div className="user-contribution">
                                            <strong>{formatNumber(user.totalCount)}</strong> Namas
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Top Contributors */}
                    <section className="section user-totals">
                        <h2>Top Contributors</h2>
                        <div className="leaderboard">
                            {userTotals.map((user, index) => (
                                <div key={index} className={`leaderboard-item ${index < 3 ? 'top-three' : ''}`}>
                                    <span className="rank">{index + 1}</span>
                                    <div className="contributor-info">
                                        <span className="contributor-name">{user.name}</span>
                                        {user.city && <span className="contributor-city">{user.city}</span>}
                                    </div>
                                    <span className="contributor-total">{formatNumber(user.total)}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Account Level Reports */}
                    <section className="section account-stats">
                        <div className="section-header">
                            <h2>Account-wise Statistics</h2>
                        </div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Sankalpa</th>
                                        <th>
                                            Today
                                            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'normal' }}>
                                                {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}
                                            </div>
                                        </th>
                                        <th>
                                            This Week
                                            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'normal' }}>
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
                                        </th>
                                        <th>
                                            This Month
                                            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'normal' }}>
                                                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                                            </div>
                                        </th>
                                        <th>
                                            This Year
                                            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'normal' }}>
                                                {new Date().getFullYear()}
                                            </div>
                                        </th>
                                        <th style={{ position: 'relative' }}>
                                            <div
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
                                                onClick={() => setShowYearPicker(!showYearPicker)}
                                            >
                                                {accountStats[0]?.comparisonTitle || 'Previous Year'}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                    <line x1="16" y1="2" x2="16" y2="6" />
                                                    <line x1="8" y1="2" x2="8" y2="6" />
                                                    <line x1="3" y1="10" x2="21" y2="10" />
                                                </svg>
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: '#888', fontWeight: 'normal', textAlign: 'center' }}>
                                                {selectedPreviousYear === 'custom' ? 'Custom Range' : selectedPreviousYear}
                                            </div>
                                            {showYearPicker && (
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: '50%',
                                                    transform: 'translateX(-50%)', background: 'white',
                                                    border: '1px solid #ddd', borderRadius: '8px', padding: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, minWidth: '180px'
                                                }}>
                                                    {availableYears.map(year => (
                                                        <div
                                                            key={year}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPreviousYear(year);
                                                                setShowYearPicker(false);
                                                                handleYearChange({ year });
                                                            }}
                                                            style={{
                                                                padding: '8px 12px', cursor: 'pointer', borderRadius: '4px',
                                                                background: year === selectedPreviousYear ? '#FF9933' : 'transparent',
                                                                color: year === selectedPreviousYear ? 'white' : '#333',
                                                                marginBottom: '4px'
                                                            }}
                                                        >
                                                            {year}
                                                        </div>
                                                    ))}
                                                    <div style={{ height: '1px', background: '#eee', margin: '4px 0' }}></div>
                                                    <div onClick={(e) => e.stopPropagation()} style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Custom Range</div>
                                                        <input
                                                            type="date"
                                                            value={customStartDate}
                                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                                            style={{ width: '100%', marginBottom: '4px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                                        />
                                                        <input
                                                            type="date"
                                                            value={customEndDate}
                                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                                            style={{ width: '100%', marginBottom: '4px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (customStartDate && customEndDate) {
                                                                    setSelectedPreviousYear('custom');
                                                                    setShowYearPicker(false);
                                                                    handleYearChange({ type: 'custom', start: customStartDate, end: customEndDate });
                                                                }
                                                            }}
                                                            className="btn btn-sm btn-primary"
                                                            style={{ width: '100%', marginTop: '4px', padding: '4px' }}
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                        <th>Overall</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accountStats.map(account => (
                                        <tr key={account.id}>
                                            <td><strong>{account.name}</strong></td>
                                            <td>{formatNumber(account.today)}</td>
                                            <td>{formatNumber(account.currentWeek)}</td>
                                            <td>{formatNumber(account.currentMonth)}</td>
                                            <td>{formatNumber(account.currentYear)}</td>
                                            <td>{formatNumber(account.previousYear || 0)}</td>
                                            <td className="highlight-cell">{formatNumber(account.overall)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Recent Nama Offerings */}
                    <section className="section recent-offerings">
                        <h2>Recent Nama Offerings</h2>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Devotee</th>
                                        <th>Sankalpa</th>
                                        <th>Count</th>
                                        <th>Period (Start - End)</th>
                                        <th>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentEntries.map(entry => (
                                        <tr key={entry.id}>
                                            <td>{entry.users?.name || '-'}</td>
                                            <td><strong>{entry.nama_accounts?.name || '-'}</strong></td>
                                            <td className="highlight-cell">{formatNumber(entry.count)}</td>
                                            <td>
                                                {entry.start_date || entry.end_date ? (
                                                    <span className="date-range-badge">
                                                        {formatDate(entry.start_date) || '...'} - {formatDate(entry.end_date) || '...'}
                                                    </span>
                                                ) : (
                                                    <span className="single-day-badge">Single Day</span>
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
                    </section>

                    {/* Charts */}
                    <section className="section charts-section">
                        <h2>Advanced Metrics</h2>
                        <div className="charts-grid">

                            <div className="chart-card">
                                <h3>Daily Nama Growth (7 Days)</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={dailyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="count" stroke="#FF9933" fill="rgba(255,153,51,0.3)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <h3>Weekly Momentum</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#8B0000" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <h3>Account Contribution</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={accountStats.filter(a => a.overall > 0)} dataKey="overall" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                            {accountStats.map((e, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip /><Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <h3>Audio vs Manual</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={sourceRatio} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                                            <Cell fill="#4CAF50" /><Cell fill="#2196F3" />
                                        </Pie>
                                        <Tooltip /><Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <h3>Top Cities</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={cityStats} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="city" type="category" tick={{ fontSize: 10 }} width={80} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#9C27B0" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card">
                                <h3>New Devotees (7 Days)</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={newDevotees}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="count" stroke="#E91E63" strokeWidth={2} dot={{ fill: '#E91E63' }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="chart-card chart-card-wide">
                                <h3>Top Growing Accounts (This Week)</h3>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={topGrowing}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="growth" fill="#00BCD4" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                        </div>
                    </section>

                    <div className="quote-section">
                        <p>"When devotees unite in Nama Japa, the collective energy transcends individual efforts."</p>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default PublicReportsPage;