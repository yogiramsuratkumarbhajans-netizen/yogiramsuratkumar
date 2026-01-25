import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    getAllNamaAccounts,
    createNamaAccount,
    updateNamaAccount,
    getAllUsers,
    getUserAccountLinks,
    linkUserToAccounts,
    getPendingPrayers,
    approvePrayer,
    rejectPrayer,
    bulkCreateUsers,
    getBooks,
    deleteBook,
    deletePrayer,
    getAllPrayers,
    requestAccountDeletion,
    requestUserDeletion,
    getAccountStats
} from '../services/namaService';
import { databases, Query, DATABASE_ID, COLLECTIONS } from '../appwriteClient';
import ExcelUpload from '../components/ExcelUpload';
import BookUpload from '../components/BookUpload';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import './ModeratorDashboardPage.css';

const COLORS = ['#FF9933', '#8B0000', '#4CAF50', '#2196F3', '#9C27B0', '#FF5722', '#00BCD4', '#E91E63'];

const ModeratorDashboardPage = () => {
    const { moderator, logout } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();

    const [accounts, setAccounts] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('accounts');
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [newAccountData, setNewAccountData] = useState({
        name: '',
        start_date: '',
        end_date: '',
        target_goal: ''
    });
    const [editData, setEditData] = useState({ name: '', description: '', start_date: '', end_date: '', target_goal: '' });
    const [saving, setSaving] = useState(false);

    // Bank allocation modal states
    const [showBankAllocationModal, setShowBankAllocationModal] = useState(false);
    const [selectedUserForAllocation, setSelectedUserForAllocation] = useState(null);
    const [selectedBanksForAllocation, setSelectedBanksForAllocation] = useState([]);
    const [userCurrentBanks, setUserCurrentBanks] = useState([]);

    // Prayers state
    const [prayers, setPrayers] = useState([]);

    // Books state
    const [books, setBooks] = useState([]);

    const [accountStats, setAccountStats] = useState([]);
    const [selectedExportAccounts, setSelectedExportAccounts] = useState([]);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // Chart Data State
    const [dailyData, setDailyData] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [sourceRatio, setSourceRatio] = useState([]);
    const [cityStats, setCityStats] = useState([]);
    const [newDevotees, setNewDevotees] = useState([]);
    const [topGrowing, setTopGrowing] = useState([]);

    // Bulk Selection State
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    // Convert number to Indian numbering words (lacs, crores)
    const numberToWords = (num) => {
        if (!num || isNaN(num)) return '';
        const n = parseInt(num);
        if (n >= 10000000) return (n / 10000000).toFixed(2).replace(/\.?0+$/, '') + ' Crores';
        if (n >= 100000) return (n / 100000).toFixed(2).replace(/\.?0+$/, '') + ' Lacs';
        if (n >= 1000) return (n / 1000).toFixed(2).replace(/\.?0+$/, '') + ' Thousand';
        return n.toString();
    };

    useEffect(() => {
        if (!moderator) {
            navigate('/moderator/login');
            return;
        }
        loadData();
    }, [moderator, navigate]);

    const loadData = async () => {
        try {
            const [accountsData, usersData, prayersData, booksData, statsData] = await Promise.all([
                getAllNamaAccounts(),
                getAllUsers(),
                getAllPrayers(),
                getBooks(),
                getAccountStats()
            ]);
            setAccounts(accountsData);
            setUsers(usersData);
            setPrayers(prayersData);
            setBooks(booksData);
            setAccountStats(statsData);

            // Load additional report stats
            loadReportStats();
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadReportStats = async () => {
        try {
            await Promise.all([
                loadDailyData(),
                loadWeeklyData(),
                loadSourceRatio(),
                loadCityStats(),
                loadNewDevotees(),
                loadTopGrowing()
            ]);
        } catch (err) {
            console.error('Error loading report stats:', err);
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

    // Prayer approval handlers
    const handleApprovePrayer = async (prayerId) => {
        try {
            await approvePrayer(prayerId, moderator?.id);
            success('Prayer approved and now visible to public!');
            loadData();
        } catch (err) {
            console.error('Error approving prayer:', err);
            error('Failed to approve prayer');
        }
    };

    const handleRejectPrayer = async (prayerId) => {
        try {
            await rejectPrayer(prayerId);
            success('Prayer rejected');
            loadData();
        } catch (err) {
            console.error('Error rejecting prayer:', err);
            error('Failed to reject prayer');
        }
    };

    const handleDeleteBook = async (book) => {
        if (!confirm('Are you sure you want to delete this book?')) return;
        try {
            await deleteBook(book.id, book.file_url, moderator?.id);
            success('Book deleted successfully');
            loadData();
        } catch (err) {
            console.error('Error deleting book:', err);
            error('Failed to delete book');
        }
    };

    const handleDeleteUser = async (user) => {
        const reason = prompt(`Please provide a reason for deleting user ${user.name}:`);
        if (!reason) {
            error('A reason is required to request user deletion.');
            return;
        }

        try {
            await requestUserDeletion(user.id, moderator?.id, reason);
            success('User deletion request submitted. Awaiting admin approval.');
            loadData();
        } catch (err) {
            console.error('Delete request error:', err);
            error(err.message || 'Failed to submit deletion request');
        }
    };

    // Bulk Actions
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedUserIds(users.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (id) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (selectedUserIds.length === 0) return;
        const reason = prompt(`Please provide a reason for deleting ${selectedUserIds.length} users:`);
        if (!reason) {
            error('A reason is required to request user deletion.');
            return;
        }

        try {
            let successCount = 0;
            for (const userId of selectedUserIds) {
                try {
                    await requestUserDeletion(userId, moderator?.id, reason);
                    successCount++;
                } catch (err) {
                    console.error(`Failed to request deletion for user ${userId}`, err);
                }
            }

            if (successCount === selectedUserIds.length) {
                success(`Submitted ${successCount} deletion requests. Awaiting admin approval.`);
            } else {
                success(`Submitted ${successCount} out of ${selectedUserIds.length} requests. Some failed.`);
            }

            setSelectedUserIds([]);
            loadData();
        } catch (err) {
            console.error('Bulk delete request error:', err);
            error('An error occurred during bulk deletion request.');
        }
    };


    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Bank allocation handlers
    const handleOpenBankAllocation = async (user) => {
        setSelectedUserForAllocation(user);
        try {
            const links = await getUserAccountLinks(user.id);
            const linkedAccountIds = links.map(l => l.account_id);
            setUserCurrentBanks(linkedAccountIds);
            setSelectedBanksForAllocation(linkedAccountIds);
            setShowBankAllocationModal(true);
        } catch (err) {
            error('Failed to load user bank links');
        }
    };

    const handleSaveBankAllocation = async () => {
        if (!selectedUserForAllocation) return;

        try {
            const newBanks = selectedBanksForAllocation.filter(
                id => !userCurrentBanks.includes(id)
            );

            if (newBanks.length > 0) {
                await linkUserToAccounts(selectedUserForAllocation.id, newBanks);
            }

            success('Bank accounts allocated successfully!');
            setShowBankAllocationModal(false);
            setSelectedUserForAllocation(null);
            setSelectedBanksForAllocation([]);
            setUserCurrentBanks([]);

            // Refresh data to show updated allocations
            loadData();
        } catch (err) {
            console.error('Error allocating banks:', err);
            error('Failed to allocate banks');
        }
    };

    // Bulk Upload Handler
    const [showUploadModal, setShowUploadModal] = useState(false);

    const handleBulkUpload = async (usersToUpload) => {
        try {
            setLoading(true);

            const defaultAccountIds = usersToUpload[0]?.accountIds || [];

            const { results: createdUsers, errors: failedUsers } = await bulkCreateUsers(usersToUpload, defaultAccountIds);

            const successCount = createdUsers.length;
            const errorCount = failedUsers.length;

            if (successCount > 0) {
                success(`Successfully added ${successCount} new devotees!`);
            }

            if (errorCount > 0) {
                // Show detailed error information
                const duplicates = failedUsers.filter(e => e.type === 'duplicate').length;
                const createFailed = failedUsers.filter(e => e.type === 'create_failed');

                if (duplicates > 0) {
                    error(`${duplicates} devotees were skipped (already exist)`);
                }
                if (createFailed.length > 0) {
                    const errorDetails = createFailed.map(e => `${e.user.name}: ${e.error}`).join('\n');
                    error(`${createFailed.length} devotees failed to upload.`);
                    alert(`Failed to upload ${createFailed.length} devotees:\n\n${errorDetails}`);
                }
            }

            if (successCount === 0 && errorCount === 0) {
                error('No users were processed. Please check your file.');
            }

            setShowUploadModal(false);
            loadData();
        } catch (err) {
            console.error('Bulk upload failed:', err);
            error(`Bulk upload failed: ${err.message || 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
    };


    const toggleBankSelection = (accountId) => {
        setSelectedBanksForAllocation(prev =>
            prev.includes(accountId)
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatNumber = (num) => {
        return num?.toLocaleString() || '0';
    };

    const getFilteredStats = () => {
        if (selectedExportAccounts.length === 0) return accountStats;
        return accountStats.filter(a => selectedExportAccounts.includes(a.id));
    };

    const toggleAccountSelection = (id) => {
        setSelectedExportAccounts(prev => {
            if (prev.includes(id)) return prev.filter(p => p !== id);
            return [...prev, id];
        });
    };

    const exportToCSV = () => {
        const statsToExport = getFilteredStats();
        const headers = ['Account Name', 'Today', 'Current Week', 'Current Month', 'Current Year', 'Overall'];
        const rows = statsToExport.map(a => [a.name, a.today, a.currentWeek, a.currentMonth, a.currentYear, a.overall]);
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nama_bank_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const exportToExcel = async () => {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();
        const statsToExport = getFilteredStats();

        // 1. Summary Sheet
        const wsSummary = XLSX.utils.json_to_sheet(statsToExport.map(a => ({
            'Account Name': a.name, 'Today': a.today, 'Current Week': a.currentWeek,
            'Current Month': a.currentMonth, 'Current Year': a.currentYear, 'Overall': a.overall
        })));
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // 2. Dashboard Graphs Data
        // Daily Growth
        if (dailyData && dailyData.length > 0) {
            const wsDaily = XLSX.utils.json_to_sheet(dailyData.map(d => ({ 'Date': d.date, 'Count': d.count })));
            XLSX.utils.book_append_sheet(wb, wsDaily, 'Graph - Daily Growth');
        }

        // Weekly Momentum
        if (weeklyData && weeklyData.length > 0) {
            const wsWeekly = XLSX.utils.json_to_sheet(weeklyData.map(d => ({ 'Week': d.week, 'Count': d.count })));
            XLSX.utils.book_append_sheet(wb, wsWeekly, 'Graph - Weekly Momentum');
        }

        // City Stats
        if (cityStats && cityStats.length > 0) {
            const wsCity = XLSX.utils.json_to_sheet(cityStats.map(c => ({ 'City': c.city, 'Count': c.count })));
            XLSX.utils.book_append_sheet(wb, wsCity, 'Graph - Top Cities');
        }

        // Source Ratio
        if (sourceRatio && sourceRatio.length > 0) {
            const wsSource = XLSX.utils.json_to_sheet(sourceRatio.map(s => ({ 'Source': s.name, 'Count': s.value })));
            XLSX.utils.book_append_sheet(wb, wsSource, 'Graph - Source Ratio');
        }

        // 3. Detailed Account Data
        for (const account of statsToExport) {
            try {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.NAMA_ENTRIES,
                    [Query.equal('account_id', account.id), Query.orderAsc('entry_date'), Query.limit(10000)]
                );

                if (response.documents && response.documents.length > 0) {
                    const dateMap = {};
                    response.documents.forEach(e => {
                        if (!dateMap[e.entry_date]) dateMap[e.entry_date] = 0;
                        dateMap[e.entry_date] += e.count || 0;
                    });
                    const rows = Object.keys(dateMap).sort().map(date => ({
                        Date: date,
                        Count: dateMap[date]
                    }));
                    const ws = XLSX.utils.json_to_sheet(rows);
                    const invalidChars = new RegExp('[*?:/[\\]\\\\]', 'g');
                    let sheetName = account.name.replace(invalidChars, ' ').substring(0, 31);
                    let uniqueName = sheetName;
                    let counter = 1;
                    while (wb.SheetNames.includes(uniqueName)) {
                        uniqueName = sheetName.substring(0, 28) + ' ' + counter;
                        counter++;
                    }
                    XLSX.utils.book_append_sheet(wb, ws, uniqueName);
                }
            } catch (err) {
                console.error(`Error filtering data for ${account.name}:`, err);
            }
        }

        // 4. Guide Sheet
        const guideData = [
            ['How to use this report'],
            [''],
            ['1. Summary Sheet', 'Provides a high-level overview of total Namas per account.'],
            ['2. Graph Sheets', 'Contains aggregate data used for the dashboard graphs (Daily, Weekly, Cities, Source).'],
            ['3. Account Sheets', 'Contains daily time-series data for individual accounts.'],
            [''],
            ['Creating Graphs in Excel:'],
            ['1. Go to any Graph sheet or Account sheet.'],
            ['2. Select the data columns.'],
            ['3. Go to the "Insert" tab in the Excel ribbon.'],
            ['4. Choose "Recommended Charts" or select a "Line/Bar Chart".'],
            ['5. Your graph will appear automatically!']
        ];
        const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
        XLSX.utils.book_append_sheet(wb, wsGuide, 'Report Guide');

        XLSX.writeFile(wb, `nama_bank_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Title
        doc.setFontSize(22);
        doc.setTextColor(255, 153, 51); // saffron
        doc.text('Namavruksha - Moderator Report', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, 28, { align: 'center' });

        // Summary Table Header
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Account Summary', 20, 45);

        // Simple table
        const statsToExport = getFilteredStats();
        let y = 55;
        doc.setFontSize(10);

        // Table Headers
        doc.setFillColor(245, 245, 245);
        doc.rect(20, y - 5, pageWidth - 40, 7, 'F');
        doc.text('Account Name', 25, y);
        doc.text('Today', 100, y);
        doc.text('Current Week', 120, y);
        doc.text('Overall', 160, y);
        y += 10;

        statsToExport.forEach(account => {
            if (y > pageHeight - 40) {
                doc.addPage();
                y = 20;
            }
            doc.text(account.name, 25, y);
            doc.text(formatNumber(account.today), 100, y);
            doc.text(formatNumber(account.currentWeek), 120, y);
            doc.text(formatNumber(account.overall), 160, y);
            doc.setDrawColor(240);
            doc.line(20, y + 2, pageWidth - 20, y + 2);
            y += 10;
        });

        // Capture Charts
        try {
            const chartsGrid = document.querySelector('.charts-grid');
            if (chartsGrid) {
                doc.addPage();
                doc.setFontSize(16);
                doc.text('Visual Analytics', pageWidth / 2, 20, { align: 'center' });

                success('Capturing charts for report... please wait.');

                const canvas = await html2canvas(chartsGrid, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                const imgWidth = pageWidth - 40;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                // If it's too tall, we might need to split it, but usually standard grid fits one page
                if (imgHeight > pageHeight - 40) {
                    doc.addImage(imgData, 'JPEG', 20, 30, imgWidth, pageHeight - 50);
                } else {
                    doc.addImage(imgData, 'JPEG', 20, 30, imgWidth, imgHeight);
                }
            }
        } catch (err) {
            console.error('Failed to capture charts for PDF:', err);
        }

        doc.save(`nama_bank_full_report_${new Date().toISOString().split('T')[0]}.pdf`);
        success('Full report downloaded!');
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        if (!newAccountData.name.trim()) {
            error('Please enter an account name.');
            return;
        }
        if (!newAccountData.start_date) {
            error('Please select a start date.');
            return;
        }

        setSaving(true);
        try {
            await createNamaAccount(
                newAccountData.name.trim(),
                newAccountData.start_date,
                newAccountData.end_date || null,
                newAccountData.target_goal ? parseInt(newAccountData.target_goal) : null
            );
            success('Namavruksha Sankalpa created successfully!');
            setNewAccountData({ name: '', start_date: '', end_date: '', target_goal: '' });
            setShowAddModal(false);
            loadData();
        } catch (err) {
            console.error('Account creation error:', err);
            error('Failed to create account. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const openEditModal = (account) => {
        setSelectedAccount(account);
        setEditData({ name: account.name, description: account.description || '' });
        setShowEditModal(true);
    };

    const handleEditAccount = async (e) => {
        e.preventDefault();
        if (!editData.name.trim()) {
            error('Account name cannot be empty.');
            return;
        }

        setSaving(true);
        try {
            await updateNamaAccount(selectedAccount.id, {
                name: editData.name.trim(),
                description: editData.description.trim() || null
            });
            success('Account updated successfully!');
            setShowEditModal(false);
            setSelectedAccount(null);
            loadData();
        } catch (err) {
            console.error('Update account error:', err);
            error('Failed to update account. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!moderator) return null;

    return (
        <div className="moderator-dashboard page-enter">
            <header className="dashboard-header">
                <div className="container">
                    <div className="header-content">
                        <div className="header-left">
                            <span className="om-symbol-small">ॐ</span>
                            <div>
                                <h1>Moderator Dashboard</h1>
                                <p className="welcome-text">Welcome, {moderator.name}</p>
                            </div>
                        </div>
                        <div className="header-right">
                            <Link to="/" className="btn btn-ghost btn-sm">Home</Link>
                            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="dashboard-main">
                <div className="container">
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button
                            className={`tab-btn ${activeTab === 'accounts' ? 'active' : ''}`}
                            onClick={() => setActiveTab('accounts')}
                        >
                            Namavruksha Sankalpas
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            Users ({users.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'prayers' ? 'active' : ''}`}
                            onClick={() => setActiveTab('prayers')}
                        >
                            Prayers ({prayers.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'books' ? 'active' : ''}`}
                            onClick={() => setActiveTab('books')}
                        >
                            Books ({books.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                            onClick={() => setActiveTab('reports')}
                        >
                            Reports
                        </button>
                    </div>

                    {/* Namavruksha Sankalpas Tab */}
                    {activeTab === 'accounts' && (
                        <section className="accounts-section">
                            <div className="section-header">
                                <h2>Namavruksha Sankalpas</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowAddModal(true)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19" />
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                    </svg>
                                    Add Account
                                </button>
                            </div>

                            {loading ? (
                                <div className="loading-state">
                                    <span className="loader"></span>
                                    <p>Loading accounts...</p>
                                </div>
                            ) : accounts.length === 0 ? (
                                <div className="empty-state">
                                    <p>No Namavruksha Sankalpas yet. Create one to get started!</p>
                                </div>
                            ) : (
                                <div className="accounts-grid">
                                    {accounts.map(account => (
                                        <div key={account.id} className={`account-card ${!account.is_active ? 'inactive' : ''}`}>
                                            <div className="account-header">
                                                <h3>{account.name}</h3>
                                                <span className={`status-badge ${account.is_active ? 'active' : 'inactive'}`}>
                                                    {account.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                            {account.description && (
                                                <p className="account-description">{account.description}</p>
                                            )}
                                            <div className="account-actions">
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={() => openEditModal(account)}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={async () => {
                                                        if (!confirm(`Request deletion of "${account.name}"? Admin approval required.`)) return;
                                                        try {
                                                            await requestAccountDeletion(account.id, moderator?.id, 'Deletion requested by moderator');
                                                            success('Deletion request sent to Admin for approval.');
                                                        } catch (err) {
                                                            console.error('Request deletion error:', err);
                                                            error(err.message || 'Failed to send deletion request');
                                                        }
                                                    }}
                                                    style={{ color: '#f59e0b' }}
                                                >
                                                    Request Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Users Tab */}
                    {activeTab === 'users' && (
                        <section className="accounts-section">
                            <div className="section-header">
                                <h2>Registered Users</h2>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowUploadModal(true)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Bulk Upload
                                </button>
                                {selectedUserIds.length > 0 && (
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleBulkDelete}
                                        style={{ marginLeft: '10px' }}
                                    >
                                        Delete Selected ({selectedUserIds.length})
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="loading-state">
                                    <span className="loader"></span>
                                    <p>Loading users...</p>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="empty-state">
                                    <p>No users registered yet.</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="users-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        onChange={handleSelectAll}
                                                        checked={users.length > 0 && selectedUserIds.length === users.length}
                                                    />
                                                </th>
                                                <th>Name</th>
                                                <th>WhatsApp</th>
                                                <th>Location</th>
                                                <th>Joined</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(user => (
                                                <tr key={user.id} className={selectedUserIds.includes(user.id) ? 'selected-row' : ''}>
                                                    <td>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUserIds.includes(user.id)}
                                                            onChange={() => handleSelectUser(user.id)}
                                                        />
                                                    </td>
                                                    <td><strong>{user.name}</strong></td>
                                                    <td>{user.whatsapp}</td>
                                                    <td>
                                                        {[user.city, user.state, user.country]
                                                            .filter(Boolean)
                                                            .join(', ') || '-'}
                                                    </td>
                                                    <td>{formatDate(user.created_at)}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => handleOpenBankAllocation(user)}
                                                        >
                                                            Allocate Banks
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm btn-danger"
                                                            onClick={() => handleDeleteUser(user)}
                                                            style={{ marginLeft: '0.5rem', color: '#ef4444' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Prayers Tab */}
                    {activeTab === 'prayers' && (
                        <section className="accounts-section">
                            {/* Pending Prayers Section */}
                            <div className="section-header">
                                <h2>Pending Prayer Requests ({prayers.filter(p => p.status === 'pending').length})</h2>
                            </div>

                            {loading ? (
                                <div className="loading-state">
                                    <span className="loader"></span>
                                    <p>Loading prayers...</p>
                                </div>
                            ) : prayers.filter(p => p.status === 'pending').length === 0 ? (
                                <div className="empty-state" style={{ marginBottom: '2rem' }}>
                                    <p>No pending prayer requests.</p>
                                </div>
                            ) : (
                                <div className="prayer-cards" style={{ marginBottom: '2rem' }}>
                                    {prayers.filter(p => p.status === 'pending').map(prayer => (
                                        <div key={prayer.id} className="prayer-review-card">
                                            <div className="prayer-meta">
                                                <span className="prayer-author">
                                                    {prayer.privacy === 'anonymous' ? 'Anonymous' : prayer.name}
                                                </span>
                                                <span className="prayer-privacy">{prayer.privacy}</span>
                                            </div>
                                            <p className="prayer-text">{prayer.prayer_text}</p>
                                            <div className="prayer-info">
                                                <span>Email: {prayer.email}</span>
                                                {prayer.phone && <span>Phone: {prayer.phone}</span>}
                                                <span>Submitted: {formatDate(prayer.created_at)}</span>
                                            </div>
                                            <div className="prayer-actions">
                                                <button
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => handleApprovePrayer(prayer.id)}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleRejectPrayer(prayer.id)}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Approved/Active Prayers Section */}
                            <div className="section-header" style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                <h2>Approved Prayers ({prayers.filter(p => p.status === 'approved').length})</h2>
                            </div>

                            {prayers.filter(p => p.status === 'approved').length === 0 ? (
                                <div className="empty-state">
                                    <p>No active prayers currently.</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="users-table">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Prayer</th>
                                                <th>Date</th>
                                                <th>Privacy</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prayers.filter(p => p.status === 'approved').map(prayer => (
                                                <tr key={prayer.id}>
                                                    <td><strong>{prayer.privacy === 'anonymous' ? 'Anonymous' : prayer.name}</strong></td>
                                                    <td>
                                                        <div style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={prayer.prayer_text}>
                                                            {prayer.prayer_text}
                                                        </div>
                                                    </td>
                                                    <td>{formatDate(prayer.created_at)}</td>
                                                    <td>{prayer.privacy}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-ghost btn-sm btn-danger"
                                                            onClick={async () => {
                                                                if (!confirm('Are you sure? This will delete the prayer.')) return;
                                                                try {
                                                                    // As moderator, direct delete might fail if we don't use a secure function or reuse reject logic
                                                                    // Reusing reject logic (which deletes) is simplest if 'rejectPrayer' implementation deletes.
                                                                    // Checking rejectPrayer implementation...
                                                                    await deletePrayer(prayer.id, moderator?.id);
                                                                    success('Prayer deleted');
                                                                    loadData();
                                                                } catch (e) {
                                                                    console.error(e);
                                                                    error('Failed to delete');
                                                                }
                                                            }}
                                                            style={{ color: '#ef4444' }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Books Tab */}
                    {activeTab === 'books' && (
                        <section className="accounts-section">
                            <div className="section-header">
                                <h2>Digital Bookshelf</h2>
                            </div>

                            <BookUpload onUploadSuccess={loadData} />

                            <h3 style={{ marginTop: '40px', marginBottom: '20px', color: 'var(--text-color)' }}>Library Collection ({books.length})</h3>

                            {loading ? (
                                <div className="loading-state">
                                    <span className="loader"></span>
                                    <p>Loading books...</p>
                                </div>
                            ) : books.length === 0 ? (
                                <div className="empty-state">
                                    <p>No books in the library yet.</p>
                                </div>
                            ) : (
                                <div className="table-container">
                                    <table className="users-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Details</th>
                                                <th>Views</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {books.map(book => (
                                                <tr key={book.id}>
                                                    <td>
                                                        <strong>{book.title}</strong>
                                                        <br />
                                                        <a href={book.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85em', color: 'var(--primary-color)' }}>View PDF</a>
                                                    </td>
                                                    <td>
                                                        {book.year} {book.month}<br />
                                                        <small>{book.city}, {book.country}</small><br />
                                                        <small>{book.language} • {book.edition_type}</small>
                                                    </td>
                                                    <td>{book.view_count}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ color: '#ef4444' }}
                                                            onClick={() => handleDeleteBook(book)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>
                    )}

                    {/* Reports Tab */}
                    {activeTab === 'reports' && (
                        <section className="accounts-section">
                            <div className="section-header">
                                <h2>Account Reports</h2>
                                <div className="export-controls" style={{ position: 'relative' }}>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                    >
                                        Export Options {selectedExportAccounts.length > 0 && `(${selectedExportAccounts.length})`}
                                    </button>

                                    {isExportMenuOpen && (
                                        <div className="export-menu" style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '100%',
                                            width: '300px',
                                            background: 'white',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                            borderRadius: '8px',
                                            padding: '16px',
                                            zIndex: 100,
                                            border: '1px solid #eee'
                                        }}>
                                            <div className="account-selector">
                                                <h4 style={{ marginBottom: '10px' }}>Select Accounts:</h4>
                                                <div className="account-checkboxes" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedExportAccounts.length === 0}
                                                            onChange={() => setSelectedExportAccounts([])}
                                                        />
                                                        All Accounts
                                                    </label>
                                                    {accountStats.map(acc => (
                                                        <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedExportAccounts.includes(acc.id)}
                                                                onChange={() => toggleAccountSelection(acc.id)}
                                                            />
                                                            {acc.name}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="export-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
                                                <button onClick={exportToCSV} className="btn btn-ghost btn-sm">CSV</button>
                                                <button onClick={exportToExcel} className="btn btn-primary btn-sm">Excel (Detailed Data)</button>
                                                <button onClick={exportToPDF} className="btn btn-ghost btn-sm">PDF (Full Report with Graphs)</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="table-container">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Sankalpa</th>
                                            <th>Today</th>
                                            <th>This Week</th>
                                            <th>This Month</th>
                                            <th>This Year</th>
                                            <th>Overall</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accountStats
                                            .filter(acc => selectedExportAccounts.length === 0 || selectedExportAccounts.includes(acc.id))
                                            .map(account => (
                                                <tr key={account.id}>
                                                    <td><strong>{account.name}</strong></td>
                                                    <td>{formatNumber(account.today)}</td>
                                                    <td>{formatNumber(account.thisWeek)}</td>
                                                    <td>{formatNumber(account.thisMonth)}</td>
                                                    <td>{formatNumber(account.thisYear)}</td>
                                                    <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{formatNumber(account.overall)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Charts Grid */}
                            <div className="charts-grid" style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                                {/* Daily Growth */}
                                <div className="chart-card" style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: '#444' }}>Daily Nama Growth (7 Days)</h3>
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
                                <div className="chart-card" style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: '#444' }}>Weekly Momentum</h3>
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
                                <div className="chart-card" style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: '#444' }}>Account Contribution</h3>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={accountStats.filter(a => a.overall > 0)} dataKey="overall" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                {accountStats.map((e, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                                            </Pie>
                                            <Tooltip /><Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Top Growing Accounts */}
                                <div className="chart-card chart-card-wide" style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <h3 style={{ fontSize: '1rem', marginBottom: '15px', color: '#444' }}>Top Growing Accounts (This Week)</h3>
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
                    )}
                </div>
            </main >

            {/* Add Account Modal */}
            {
                showAddModal && (
                    <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Add New Namavruksha Sankalpa</h2>
                                <button className="modal-close" onClick={() => setShowAddModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleAddAccount}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Account Name <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={newAccountData.name}
                                            onChange={(e) => setNewAccountData(prev => ({ ...prev, name: e.target.value }))}
                                            className="form-input"
                                            placeholder="e.g., Vizag Namavruksha"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="form-row" style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Start Date <span className="required">*</span></label>
                                            <input
                                                type="date"
                                                value={newAccountData.start_date}
                                                onChange={(e) => setNewAccountData(prev => ({ ...prev, start_date: e.target.value }))}
                                                className="form-input"
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">End Date</label>
                                            <input
                                                type="date"
                                                value={newAccountData.end_date}
                                                onChange={(e) => setNewAccountData(prev => ({ ...prev, end_date: e.target.value }))}
                                                className="form-input"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Target Goal</label>
                                        <input
                                            type="number"
                                            value={newAccountData.target_goal}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val.length <= 15) {
                                                    setNewAccountData(prev => ({ ...prev, target_goal: val }));
                                                }
                                            }}
                                            className="form-input"
                                            placeholder="e.g., 1000000"
                                            min="0"
                                            max="999999999999999"
                                        />
                                        {newAccountData.target_goal && (
                                            <span className="form-hint target-label">{numberToWords(newAccountData.target_goal)}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving}
                                    >
                                        {saving ? 'Creating...' : 'Create Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Edit Account Modal */}
            {
                showEditModal && selectedAccount && (
                    <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Edit Account</h2>
                                <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <form onSubmit={handleEditAccount}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Account Name</label>
                                        <input
                                            type="text"
                                            value={editData.name}
                                            onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                            className="form-input"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Description (Optional)</label>
                                        <textarea
                                            value={editData.description}
                                            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                            className="form-input"
                                            rows="3"
                                            placeholder="Enter a description for this Sankalpa..."
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Bank Allocation Modal */}
            {
                showBankAllocationModal && selectedUserForAllocation && (
                    <div className="modal-overlay" onClick={() => setShowBankAllocationModal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Allocate Banks to {selectedUserForAllocation.name}</h2>
                                <button className="modal-close" onClick={() => setShowBankAllocationModal(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p className="modal-description">Select Namavruksha Sankalpas to allocate:</p>
                                <div className="checkbox-group">
                                    {accounts.filter(acc => acc.is_active).map(account => (
                                        <label key={account.id} className="checkbox-item">
                                            <input
                                                type="checkbox"
                                                checked={selectedBanksForAllocation.includes(account.id)}
                                                onChange={() => toggleBankSelection(account.id)}
                                                disabled={userCurrentBanks.includes(account.id)}
                                            />
                                            <span>
                                                {account.name}
                                                {userCurrentBanks.includes(account.id) && (
                                                    <small className="already-linked"> (Already linked)</small>
                                                )}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-ghost" onClick={() => setShowBankAllocationModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={handleSaveBankAllocation}>
                                    Allocate Selected
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Bulk Upload Modal */}
            {
                showUploadModal && (
                    <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                            <ExcelUpload
                                onUpload={handleBulkUpload}
                                onClose={() => setShowUploadModal(false)}
                                accounts={accounts}
                            />
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ModeratorDashboardPage;
