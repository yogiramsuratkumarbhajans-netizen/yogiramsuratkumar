import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAccountStats, getAllUsers, getAllNamaEntries } from '../services/namaService';
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

    // Previous Year selection
    const currentYear = new Date().getFullYear();
    const [selectedPreviousYear, setSelectedPreviousYear] = useState(currentYear - 1);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const availableYears = Array.from({ length: 6 }, (_, i) => currentYear - 1 - i); // Last 6 years

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        try {
            await Promise.all([
                loadAccountStats(),
                loadRecentUsers(),
                loadUserTotals(),
                loadDailyData(),
                loadWeeklyData(),
                loadSourceRatio(),
                loadCityStats(),
                loadNewDevotees(),
                loadTopGrowing(),
                loadTotalStats(),
                loadRecentEntries()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAccountStats = async (rangeOverride = null) => {
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

        // Get base stats
        const data = await getAccountStats();

        // Calculate previous year/period stats for each account
        try {
            const entriesResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.NAMA_ENTRIES,
                [Query.limit(10000)]
            );

            const enhancedStats = (data || []).map(account => {
                const accountEntries = entriesResponse.documents.filter(e => e.account_id === account.id);
                const previousYearCount = accountEntries
                    .filter(e => e.entry_date >= startDate && e.entry_date <= endDate)
                    .reduce((sum, e) => sum + (e.count || 0), 0);

                return {
                    ...account,
                    previousYear: previousYearCount,
                    comparisonTitle: title
                };
            });

            setAccountStats(enhancedStats);
        } catch (err) {
            console.error('Error loading previous year stats:', err);
            setAccountStats(data || []);
        }
    };

    const loadRecentUsers = async () => {
        try {
            const usersResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.USERS,
                [Query.equal('is_active', true), Query.orderDesc('created_at'), Query.limit(8)]
            );

            const users = usersResponse.documents;

            // Get linked accounts and totals for each user
            const enrichedUsers = await Promise.all(users.map(async (user) => {
                // Get links
                const linksResponse = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.USER_ACCOUNT_LINKS,
                    [Query.equal('user_id', user.$id)]
                );

                // Get entries
                const entriesResponse = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.NAMA_ENTRIES,
                    [Query.equal('user_id', user.$id)]
                );

                // Get account names
                const accountIds = linksResponse.documents.map(l => l.account_id);
                let accounts = [];
                if (accountIds.length > 0) {
                    const accountsResponse = await databases.listDocuments(
                        DATABASE_ID,
                        COLLECTIONS.NAMA_ACCOUNTS,
                        [Query.limit(100)]
                    );
                    accounts = accountsResponse.documents
                        .filter(a => accountIds.includes(a.$id))
                        .map(a => a.name);
                }

                const totalCount = entriesResponse.documents.reduce((sum, e) => sum + (e.count || 0), 0);

                return { ...user, id: user.$id, accounts, totalCount };
            }));

            setRecentUsers(enrichedUsers);
        } catch (err) {
            console.error('Error loading recent users:', err);
        }
    };

    const loadUserTotals = async () => {
        try {
            const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1000)]);
            const entriesResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [Query.limit(10000)]);

            const userMap = {};
            entriesResponse.documents.forEach(entry => {
                if (!userMap[entry.user_id]) userMap[entry.user_id] = 0;
                userMap[entry.user_id] += entry.count || 0;
            });

            const totals = usersResponse.documents
                .map(user => ({
                    name: user.name,
                    city: user.city,
                    total: userMap[user.$id] || 0
                }))
                .filter(u => u.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            setUserTotals(totals);
        } catch (err) {
            console.error('Error loading user totals:', err);
        }
    };

    const loadDailyData = async () => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }

        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.NAMA_ENTRIES,
                [Query.greaterThanEqual('entry_date', last7Days[0]), Query.limit(10000)]
            );

            const dailyTotals = last7Days.map(date => {
                const dayEntries = response.documents.filter(e => e.entry_date === date);
                const total = dayEntries.reduce((sum, e) => sum + (e.count || 0), 0);
                return {
                    date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                    count: total
                };
            });

            setDailyData(dailyTotals);
        } catch (err) {
            console.error('Error loading daily data:', err);
        }
    };

    const loadWeeklyData = async () => {
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
            const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [Query.limit(10000)]);

            const weeklyTotals = last4Weeks.map(week => {
                const weekEntries = response.documents.filter(e => e.entry_date >= week.start && e.entry_date <= week.end);
                return {
                    week: week.label,
                    count: weekEntries.reduce((sum, e) => sum + (e.count || 0), 0)
                };
            });

            setWeeklyData(weeklyTotals);
        } catch (err) {
            console.error('Error loading weekly data:', err);
        }
    };

    const loadSourceRatio = async () => {
        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [Query.limit(10000)]);
            const manual = response.documents.filter(e => e.source_type === 'manual').reduce((sum, e) => sum + (e.count || 0), 0);
            const audio = response.documents.filter(e => e.source_type === 'audio').reduce((sum, e) => sum + (e.count || 0), 0);
            setSourceRatio([
                { name: 'Manual', value: manual },
                { name: 'Audio', value: audio }
            ]);
        } catch (err) {
            console.error('Error loading source ratio:', err);
        }
    };

    const loadCityStats = async () => {
        try {
            const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1000)]);
            const entriesResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [Query.limit(10000)]);

            const cityMap = {};
            usersResponse.documents.forEach(user => {
                if (user.city) {
                    if (!cityMap[user.city]) cityMap[user.city] = { city: user.city, count: 0 };
                    const userEntries = entriesResponse.documents.filter(e => e.user_id === user.$id);
                    cityMap[user.city].count += userEntries.reduce((sum, e) => sum + (e.count || 0), 0);
                }
            });

            const sorted = Object.values(cityMap).sort((a, b) => b.count - a.count).slice(0, 6);
            setCityStats(sorted);
        } catch (err) {
            console.error('Error loading city stats:', err);
        }
    };

    const loadNewDevotees = async () => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toISOString().split('T')[0]);
        }

        try {
            const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1000)]);

            const dailyNew = last7Days.map(date => {
                const count = response.documents.filter(u => u.created_at?.split('T')[0] === date).length;
                return {
                    date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
                    count
                };
            });

            setNewDevotees(dailyNew);
        } catch (err) {
            console.error('Error loading new devotees:', err);
        }
    };

    const loadTopGrowing = async () => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        try {
            const entriesResponse = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.NAMA_ENTRIES,
                [Query.greaterThanEqual('entry_date', weekStart.toISOString().split('T')[0]), Query.limit(10000)]
            );

            const accountsResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ACCOUNTS, [Query.limit(100)]);
            const accountsMap = {};
            accountsResponse.documents.forEach(a => { accountsMap[a.$id] = a.name; });

            const accountMap = {};
            entriesResponse.documents.forEach(entry => {
                const name = accountsMap[entry.account_id] || 'Unknown';
                if (!accountMap[name]) accountMap[name] = 0;
                accountMap[name] += entry.count || 0;
            });

            const sorted = Object.entries(accountMap)
                .map(([name, count]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, growth: count }))
                .sort((a, b) => b.growth - a.growth)
                .slice(0, 5);

            setTopGrowing(sorted);
        } catch (err) {
            console.error('Error loading top growing:', err);
        }
    };

    const loadTotalStats = async () => {
        try {
            const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1)]);
            const entriesResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [Query.limit(10000)]);
            const total = entriesResponse.documents.reduce((sum, e) => sum + (e.count || 0), 0);

            // Calculate devotees consistently with LandingPage.jsx
            const devoteesChanted = entriesResponse.documents.reduce((sum, entry) => {
                const devotees = parseInt(entry.devotee_count);
                return sum + (isNaN(devotees) || devotees === 0 ? 1 : devotees);
            }, 0);

            setTotalStats({
                users: usersResponse.total,
                entries: entriesResponse.total,
                total,
                devotees: devoteesChanted
            });
        } catch (err) {
            console.error('Error loading total stats:', err);
        }
    };

    const loadRecentEntries = async () => {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTIONS.NAMA_ENTRIES,
                [Query.orderDesc('created_at'), Query.limit(15)]
            );

            // Get user and account names
            const userIds = [...new Set(response.documents.map(e => e.user_id))];
            const accountIds = [...new Set(response.documents.map(e => e.account_id))];

            const usersResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS, [Query.limit(1000)]);
            const accountsResponse = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ACCOUNTS, [Query.limit(100)]);

            const usersMap = {};
            usersResponse.documents.forEach(u => { usersMap[u.$id] = u; });
            const accountsMap = {};
            accountsResponse.documents.forEach(a => { accountsMap[a.$id] = a; });

            const enrichedEntries = response.documents.map(entry => ({
                ...entry,
                id: entry.$id,
                users: usersMap[entry.user_id] ? { name: usersMap[entry.user_id].name } : null,
                nama_accounts: accountsMap[entry.account_id] ? { name: accountsMap[entry.account_id].name } : null
            }));

            setRecentEntries(enrichedEntries);
        } catch (err) {
            console.error('Error loading recent entries:', err);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatNumber = (num) => {
        return num?.toLocaleString() || '0';
    };

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
                                        {user.city && <p className="user-city"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>{user.city}</p>}
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

                    {/* User Consolidated Totals */}
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
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    background: 'white',
                                                    border: '1px solid #ddd',
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                    zIndex: 100,
                                                    minWidth: '180px'
                                                }}>
                                                    {availableYears.map(year => (
                                                        <div
                                                            key={year}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPreviousYear(year);
                                                                setShowYearPicker(false);
                                                                loadAccountStats({ year });
                                                            }}
                                                            className="year-option"
                                                            style={{
                                                                padding: '8px 12px',
                                                                cursor: 'pointer',
                                                                borderRadius: '4px',
                                                                background: year === selectedPreviousYear ? '#FF9933' : 'transparent',
                                                                color: year === selectedPreviousYear ? 'white' : '#333',
                                                                marginBottom: '4px'
                                                            }}
                                                        >
                                                            {year}
                                                        </div>
                                                    ))}
                                                    <div className="year-separator" style={{ height: '1px', background: '#eee', margin: '4px 0' }}></div>
                                                    <div
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ padding: '8px', background: '#f9f9f9', borderRadius: '4px' }}
                                                    >
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '4px' }}>Custom Range</div>
                                                        <input
                                                            type="date"
                                                            value={customStartDate}
                                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                                            style={{ width: '100%', marginBottom: '4px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                                            placeholder="Start Date"
                                                        />
                                                        <input
                                                            type="date"
                                                            value={customEndDate}
                                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                                            style={{ width: '100%', marginBottom: '4px', padding: '4px', border: '1px solid #ddd', borderRadius: '4px' }}
                                                            placeholder="End Date"
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (customStartDate && customEndDate) {
                                                                    setSelectedPreviousYear('custom');
                                                                    setShowYearPicker(false);
                                                                    loadAccountStats({ type: 'custom', start: customStartDate, end: customEndDate });
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

                    {/* Recent Nama Offerings with Period */}
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

                    {/* Charts Section */}
                    <section className="section charts-section">
                        <h2>Advanced Metrics</h2>
                        <div className="charts-grid">
                            {/* Daily Growth */}
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

                            {/* Weekly Momentum */}
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

                            {/* Account Contribution */}
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

                            {/* Audio vs Manual */}
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

                            {/* City Distribution */}
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

                            {/* New Devotees Timeline */}
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

                            {/* Top Growing Accounts */}
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

                    {/* Quote */}
                    <div className="quote-section">
                        <p>"When devotees unite in Nama Japa, the collective energy transcends individual efforts."</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PublicReportsPage;
