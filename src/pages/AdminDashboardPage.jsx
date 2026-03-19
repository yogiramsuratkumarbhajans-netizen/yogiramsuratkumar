import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    getAllNamaAccounts,
    createNamaAccount,
    updateNamaAccount,
    getAllUsers,
    getAccountStats,
    getUserAccountLinks,
    linkUserToAccounts,
    deleteUser,
    getAllPrayers,
    deletePrayer,
    getBooks,
    deleteBook,
    getPendingDeletionRequests,
    approveAccountDeletion,
    rejectAccountDeletion,
    getPendingUserDeletionRequests,
    approveUserDeletion,
    rejectUserDeletion,
    deleteNamaAccount,
    updateBook,
    deleteNamaEntry
} from '../services/namaService';
import { databases, storage, ID, Query, DATABASE_ID, COLLECTIONS, MEDIA_BUCKET_ID } from '../appwriteClient';
import ExcelUpload from '../components/ExcelUpload';
import ImageUpload from '../components/ImageUpload';
import AudioUpload from '../components/AudioUpload';
import BookUpload from '../components/BookUpload';
import '../components/ExcelUpload.css';
import './AdminDashboardPage.css';
import * as XLSX from 'xlsx';

const AdminDashboardPage = () => {
    const { isAdmin, logout } = useAuth();
    const { success, error } = useToast();
    const navigate = useNavigate();

    const audioRef = React.useRef(null);
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

    const [activeTab, setActiveTab] = useState('accounts');
    const [loading, setLoading] = useState(true);

    const [accounts, setAccounts] = useState([]);
    const [users, setUsers] = useState([]);
    const [entries, setEntries] = useState([]);
    const [accountStats, setAccountStats] = useState([]);
    const [moderators, setModerators] = useState([]);
    const [prayers, setPrayers] = useState([]);
    const [books, setBooks] = useState([]);
    const [audioFiles, setAudioFiles] = useState([]);

    const [deletionRequests, setDeletionRequests] = useState([]);
    const [userDeletionRequests, setUserDeletionRequests] = useState([]);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [accountName, setAccountName] = useState('');

    const [showModeratorModal, setShowModeratorModal] = useState(false);
    const [moderatorName, setModeratorName] = useState('');
    const [moderatorUsername, setModeratorUsername] = useState('');
    const [moderatorPassword, setModeratorPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [showBankAllocationModal, setShowBankAllocationModal] = useState(false);
    const [selectedUserForAllocation, setSelectedUserForAllocation] = useState(null);
    const [selectedBanksForAllocation, setSelectedBanksForAllocation] = useState([]);
    const [userCurrentBanks, setUserCurrentBanks] = useState([]);

    const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
    const [showBookEditModal, setShowBookEditModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [bookTitle, setBookTitle] = useState('');

    useEffect(() => {
        if (!isAdmin) {
            navigate('/admin/login');
            return;
        }
        loadData();
    }, [isAdmin, navigate]);

    // ── OPTIMIZED: nama_entries fetched once, shared with entries tab + getAccountStats ──
    const loadData = async () => {
        try {
            const [
                accountsData, usersData, rawEntriesRes,
                prayersData, booksData,
                deletionRequestsData, userDeletionRequestsData
            ] = await Promise.all([
                getAllNamaAccounts(),
                getAllUsers(),
                // Single fetch for nama_entries — used for both Entries tab and account stats
                databases.listDocuments(DATABASE_ID, COLLECTIONS.NAMA_ENTRIES, [
                    Query.orderDesc('created_at'), Query.limit(1000)
                ]),
                getAllPrayers(),
                getBooks(),
                getPendingDeletionRequests(),
                getPendingUserDeletionRequests()
            ]);

            // Build entries with user/account names (replaces getAllNamaEntries)
            const usersMap = Object.fromEntries(usersData.map(u => [u.id, u]));
            const accountsMap = Object.fromEntries(accountsData.map(a => [a.id, a]));

            const enrichedEntries = rawEntriesRes.documents.map(entry => ({
                ...entry,
                id: entry.$id,
                users: usersMap[entry.user_id]
                    ? { name: usersMap[entry.user_id].name, whatsapp: usersMap[entry.user_id].whatsapp }
                    : null,
                nama_accounts: accountsMap[entry.account_id]
                    ? { name: accountsMap[entry.account_id].name }
                    : null
            }));

            // Pass prefetched entries to getAccountStats — zero extra fetch
            const statsData = await getAccountStats(rawEntriesRes.documents);

            setAccounts(accountsData);
            setUsers(usersData);
            setEntries(enrichedEntries);
            setAccountStats(statsData);
            setPrayers(prayersData);
            setBooks(booksData);
            setDeletionRequests(deletionRequestsData);
            setUserDeletionRequests(userDeletionRequestsData);

            // Load moderators
            try {
                const modsResponse = await databases.listDocuments(
                    DATABASE_ID, COLLECTIONS.MODERATORS, [Query.orderDesc('created_at')]
                );
                setModerators(modsResponse.documents.map(doc => ({ ...doc, id: doc.$id })) || []);
            } catch (modErr) {
                console.error('Error loading moderators:', modErr);
            }

            // Load audio files
            try {
                const response = await storage.listFiles(MEDIA_BUCKET_ID);
                const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
                const audioFilesFiltered = response.files.filter(file =>
                    audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
                );
                const files = audioFilesFiltered.map(file => ({
                    id: file.$id,
                    name: file.name,
                    title: file.name.replace(/\.[^/.]+$/, '').replace('NamaJapa_', '').replace(/_/g, ' '),
                    isNamaJapa: file.name.startsWith('NamaJapa_'),
                    size: file.sizeOriginal
                }));
                setAudioFiles(files);
            } catch (audioErr) {
                console.error('Error loading audio files:', audioErr);
            }
        } catch (err) {
            console.error('Error loading data:', err);
            error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // ── Everything below is 100% unchanged from your original ──

    const fetchAudioFiles = async () => {
        try {
            const response = await storage.listFiles(MEDIA_BUCKET_ID);
            const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
            const audioFilesFiltered = response.files.filter(file =>
                audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
            );
            const files = audioFilesFiltered.map(file => {
                const isNamaJapa = file.name.startsWith('NamaJapa_');
                return {
                    id: file.$id,
                    name: file.name,
                    title: file.name.replace(/\.[^/.]+$/, '').replace('NamaJapa_', '').replace(/_/g, ' '),
                    isNamaJapa: isNamaJapa,
                    size: file.sizeOriginal
                };
            });
            setAudioFiles(files);
        } catch (err) {
            console.error('Error fetching audio files:', err);
        }
    };

    const handleDeleteAudio = async (audioId, audioName) => {
        if (!window.confirm(`Are you sure you want to delete "${audioName}"?`)) return;
        try {
            await storage.deleteFile(MEDIA_BUCKET_ID, audioId);
            success(`Deleted "${audioName}" successfully!`);
            fetchAudioFiles();
        } catch (err) {
            console.error('Delete audio failed:', err);
            error('Failed to delete audio file.');
        }
    };

    const handleLogout = () => { logout(); navigate('/'); };

    const handleSaveAccount = async () => {
        if (!accountName.trim()) { error('Account name is required'); return; }
        try {
            if (editingAccount) {
                await updateNamaAccount(editingAccount.id, { name: accountName });
                success('Account updated successfully');
            } else {
                await createNamaAccount(accountName);
                success('Account created successfully');
            }
            setShowAccountModal(false);
            setAccountName('');
            setEditingAccount(null);
            loadData();
        } catch (err) { error('Failed to save account'); }
    };

    const handleToggleAccountStatus = async (account) => {
        try {
            await updateNamaAccount(account.id, { is_active: !account.is_active });
            success(`Account ${account.is_active ? 'disabled' : 'enabled'}`);
            loadData();
        } catch (err) { error('Failed to update account status'); }
    };

    const handleToggleUserStatus = async (user) => {
        try {
            await updateNamaAccount(user.id, { is_active: !user.is_active });
            success(`User ${user.is_active ? 'disabled' : 'enabled'}`);
            loadData();
        } catch (err) { error('Failed to update user status'); }
    };

    const handleDeleteUser = async (user) => {
        if (!confirm(`Are you sure you want to delete user ${user.name}? This action cannot be undone.`)) return;
        try {
            await deleteUser(user.id);
            success('User deleted successfully');
            loadData();
        } catch (err) {
            console.error('Delete user error:', err);
            error(err.message || 'Failed to delete user');
        }
    };

    const handleDeletePrayer = async (id) => {
        if (!confirm('Are you sure you want to delete this prayer?')) return;
        try {
            await deletePrayer(id);
            success('Prayer deleted');
            loadData();
        } catch (err) { error(err.message || 'Failed to delete prayer'); }
    };

    const handleDeleteBook = async (book) => {
        if (!confirm('Are you sure you want to delete this book?')) return;
        try {
            await deleteBook(book.id, book.file_url);
            success('Book deleted successfully');
            loadData();
        } catch (err) { error(err.message || 'Failed to delete book'); }
    };

    const handleDeleteEntry = async (id) => {
        if (!confirm('Are you sure you want to delete this entry? This will affect the user\'s total count.')) return;
        try {
            await deleteNamaEntry(id);
            success('Entry deleted successfully');
            loadData();
        } catch (err) { error(err.message || 'Failed to delete entry'); }
    };

    const handleApproveAccountDeletion = async (requestId) => {
        if (!confirm('Are you sure you want to approve this deletion? The account will be permanently deleted.')) return;
        try {
            await approveAccountDeletion(requestId);
            success('Account deleted successfully');
            loadData();
        } catch (err) { error(err.message || 'Failed to approve deletion'); }
    };

    const handleRejectAccountDeletion = async (requestId) => {
        if (!confirm('Reject this deletion request?')) return;
        try {
            await rejectAccountDeletion(requestId);
            success('Deletion request rejected');
            loadData();
        } catch (err) { error(err.message || 'Failed to reject request'); }
    };

    const handleApproveUserDeletion = async (requestId) => {
        if (!confirm('Are you sure you want to approve this user deletion? The user will be permanently deleted.')) return;
        try {
            await approveUserDeletion(requestId);
            success('User deleted successfully');
            loadData();
        } catch (err) { error(err.message || 'Failed to approve user deletion'); }
    };

    const handleRejectUserDeletion = async (requestId) => {
        if (!confirm('Reject this user deletion request?')) return;
        try {
            await rejectUserDeletion(requestId);
            success('User deletion request rejected');
            loadData();
        } catch (err) { error(err.message || 'Failed to reject user request'); }
    };

    const handleDirectDeleteAccount = async (account) => {
        if (!confirm(`Permanently delete "${account.name}"? This will also delete all user links and entries.`)) return;
        try {
            await deleteNamaAccount(account.id);
            success('Account deleted successfully');
            loadData();
        } catch (err) { error(err.message || 'Failed to delete account'); }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedUserIds(users.map(u => u.id));
        else setSelectedUserIds([]);
    };

    const handleSelectUser = (id) => {
        setSelectedUserIds(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (selectedUserIds.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedUserIds.length} users? This action cannot be undone.`)) return;
        try {
            let successCount = 0;
            for (const userId of selectedUserIds) {
                try { await deleteUser(userId); successCount++; }
                catch (err) { console.error(`Failed to delete user ${userId}`, err); }
            }
            if (successCount === selectedUserIds.length) success(`Successfully deleted ${successCount} users.`);
            else success(`Deleted ${successCount} out of ${selectedUserIds.length} users. Some failed.`);
            setSelectedUserIds([]);
            loadData();
        } catch (err) { error('An error occurred during bulk deletion.'); }
    };

    const handleOpenBankAllocation = async (user) => {
        setSelectedUserForAllocation(user);
        try {
            const links = await getUserAccountLinks(user.id);
            const linkedAccountIds = links.map(l => l.account_id);
            setUserCurrentBanks(linkedAccountIds);
            setSelectedBanksForAllocation(linkedAccountIds);
            setShowBankAllocationModal(true);
        } catch (err) { error('Failed to load user bank links'); }
    };

    const handleSaveBankAllocation = async () => {
        if (!selectedUserForAllocation) return;
        try {
            const newBanks = selectedBanksForAllocation.filter(id => !userCurrentBanks.includes(id));
            if (newBanks.length > 0) await linkUserToAccounts(selectedUserForAllocation.id, newBanks);
            success('Bank accounts allocated successfully!');
            setShowBankAllocationModal(false);
            setSelectedUserForAllocation(null);
            setSelectedBanksForAllocation([]);
            setUserCurrentBanks([]);
            loadData();
        } catch (err) { error('Failed to allocate bank accounts'); }
    };

    const toggleBankSelection = (accountId) => {
        setSelectedBanksForAllocation(prev =>
            prev.includes(accountId) ? prev.filter(id => id !== accountId) : [...prev, accountId]
        );
    };

    const handleBulkUpload = async (users) => {
        setLoading(true);
        try {
            const { results, errors: uploadErrors } = await import('../services/namaService')
                .then(module => module.bulkCreateUsers(users, users[0]?.accountIds || []));
            if (results.length > 0) success(`Successfully added ${results.length} devotees!`);
            if (uploadErrors.length > 0) {
                const duplicates = uploadErrors.filter(e => e.type === 'duplicate').length;
                const createFailed = uploadErrors.filter(e => e.type === 'create_failed');
                if (duplicates > 0) error(`${duplicates} devotees were skipped (already exist)`);
                if (createFailed.length > 0) {
                    const errorDetails = createFailed.map(e => `${e.user.name}: ${e.error}`).join('\n');
                    error(`${createFailed.length} devotees failed to upload.`);
                    alert(`Failed to upload ${createFailed.length} devotees:\n\n${errorDetails}`);
                }
            }
            if (results.length === 0 && uploadErrors.length === 0) error('No users were processed. Please check your file.');
            setShowBulkUploadModal(false);
            loadData();
        } catch (err) {
            error(`Bulk upload failed: ${err.message || 'Please try again.'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateModerator = async () => {
        if (!moderatorName.trim() || !moderatorUsername.trim() || !moderatorPassword.trim()) {
            error('All fields are required'); return;
        }
        try {
            await databases.createDocument(DATABASE_ID, COLLECTIONS.MODERATORS, ID.unique(), {
                name: moderatorName, username: moderatorUsername,
                password_hash: moderatorPassword, is_active: true,
                created_at: new Date().toISOString()
            });
            success('Moderator created successfully');
            setShowModeratorModal(false);
            setModeratorName(''); setModeratorUsername(''); setModeratorPassword('');
            loadData();
        } catch (err) { error('Failed to create moderator. Username may already exist.'); }
    };

    const handleToggleModeratorStatus = async (mod) => {
        try {
            await databases.updateDocument(DATABASE_ID, COLLECTIONS.MODERATORS, mod.id, { is_active: !mod.is_active });
            success(`Moderator ${mod.is_active ? 'disabled' : 'enabled'}`);
            loadData();
        } catch (err) { error('Failed to update moderator status'); }
    };

    const handleDeleteModerator = async (id) => {
        if (!confirm('Are you sure you want to delete this moderator?')) return;
        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.MODERATORS, id);
            success('Moderator deleted');
            loadData();
        } catch (err) { error(err.message || 'Failed to delete moderator'); }
    };

    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const formatNumber = (num) => num?.toLocaleString() || '0';

    const handlePlayAudio = (audio) => {
        if (currentlyPlaying === audio.id) {
            if (audioRef.current.paused) audioRef.current.play();
            else audioRef.current.pause();
        } else {
            const fileUrl = `https://cloud.appwrite.io/v1/storage/buckets/${MEDIA_BUCKET_ID}/files/${audio.id}/view?project=682de53c003c04cdaeda`;
            if (audioRef.current) {
                audioRef.current.src = fileUrl;
                audioRef.current.play();
                setCurrentlyPlaying(audio.id);
            }
        }
    };

    const handleStopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setCurrentlyPlaying(null);
        }
    };

    const handleExportUsersToExcel = (count = 'all') => {
        let usersToExport = users;
        if (count !== 'all') usersToExport = users.slice(0, parseInt(count));
        const exportData = usersToExport.map((user, index) => ({
            'S.No': index + 1, 'Name': user.name,
            'WhatsApp': user.whatsapp ? "'" + String(user.whatsapp) : '',
            'Email': user.email || '', 'City': user.city || '',
            'State': user.state || '', 'Country': user.country || '',
            'Status': user.is_active ? 'Active' : 'Disabled',
            'Joined': formatDate(user.created_at)
        }));
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: 2 });
            if (ws[cellAddress]) ws[cellAddress].t = 's';
        }
        XLSX.utils.book_append_sheet(wb, ws, 'Users');
        XLSX.writeFile(wb, `namavruksha_users_${count === 'all' ? 'all' : count}_${new Date().toISOString().split('T')[0]}.xlsx`);
        success(`Exported ${usersToExport.length} users to Excel!`);
    };

    if (!isAdmin) return null;

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="container">
                    <div className="header-content">
                        <div className="header-left">
                            <span className="admin-badge">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                                Admin
                            </span>
                            <h1>Namavruksha Admin</h1>
                        </div>
                        <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
                    </div>
                </div>
            </header>

            <nav className="admin-nav">
                <div className="container">
                    <div className="nav-tabs">
                        <button className={`nav-tab ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                            Accounts
                        </button>
                        <button className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            Users
                        </button>
                        <button className={`nav-tab ${activeTab === 'entries' ? 'active' : ''}`} onClick={() => setActiveTab('entries')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                            Entries
                        </button>
                        <button className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                            Reports
                        </button>
                        <button className={`nav-tab ${activeTab === 'moderators' ? 'active' : ''}`} onClick={() => setActiveTab('moderators')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M12 8v4m0 4h.01" /></svg>
                            Moderators
                        </button>
                        <button className={`nav-tab ${activeTab === 'prayers' ? 'active' : ''}`} onClick={() => setActiveTab('prayers')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                            Prayers & Books
                        </button>
                        <button className={`nav-tab ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => setActiveTab('gallery')}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                            Gallery
                        </button>
                    </div>
                </div>
            </nav>

            <main className="admin-main">
                <div className="container">
                    {loading ? (
                        <div className="page-loader"><span className="loader"></span><p>Loading admin data...</p></div>
                    ) : (
                        <>
                            {activeTab === 'accounts' && (
                                <section className="admin-section">
                                    <div className="section-header">
                                        <h2>Namavruksha Sankalpas</h2>
                                        <button className="btn btn-primary" onClick={() => { setEditingAccount(null); setAccountName(''); setShowAccountModal(true); }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                            Add Account
                                        </button>
                                    </div>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead><tr><th>Name</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                {accounts.map(account => (
                                                    <tr key={account.id}>
                                                        <td><strong>{account.name}</strong></td>
                                                        <td><span className={`badge badge-${account.is_active ? 'success' : 'error'}`}>{account.is_active ? 'Active' : 'Disabled'}</span></td>
                                                        <td>{formatDate(account.created_at)}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button className="btn btn-sm btn-ghost" onClick={() => { setEditingAccount(account); setAccountName(account.name); setShowAccountModal(true); }}>Edit</button>
                                                                <button className={`btn btn-sm ${account.is_active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggleAccountStatus(account)}>{account.is_active ? 'Disable' : 'Enable'}</button>
                                                                <button className="btn btn-sm btn-ghost" onClick={() => handleDirectDeleteAccount(account)} style={{ color: '#ef4444' }}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {deletionRequests.length > 0 && (
                                        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                            <h3 style={{ color: 'var(--text-color)', marginBottom: '15px' }}>Pending Account Deletion Requests ({deletionRequests.length})</h3>
                                            <div className="table-container">
                                                <table className="table">
                                                    <thead><tr><th>Account Name</th><th>Requested By</th><th>Requested At</th><th>Actions</th></tr></thead>
                                                    <tbody>
                                                        {deletionRequests.map(req => (
                                                            <tr key={req.id}>
                                                                <td><strong>{req.nama_accounts?.name || 'Unknown'}</strong></td>
                                                                <td>{req.moderators?.name || 'Unknown'}</td>
                                                                <td>{formatDate(req.created_at)}</td>
                                                                <td>
                                                                    <div className="action-buttons">
                                                                        <button className="btn btn-sm btn-primary" onClick={() => handleApproveAccountDeletion(req.id)}>Approve</button>
                                                                        <button className="btn btn-sm btn-ghost" onClick={() => handleRejectAccountDeletion(req.id)}>Reject</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                    {userDeletionRequests.length > 0 && (
                                        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                                            <h3 style={{ color: 'var(--text-color)', marginBottom: '15px' }}>Pending User Deletion Requests ({userDeletionRequests.length})</h3>
                                            <div className="table-container">
                                                <table className="table">
                                                    <thead><tr><th>User Name</th><th>Requested By</th><th>Requested At</th><th>Actions</th></tr></thead>
                                                    <tbody>
                                                        {userDeletionRequests.map(req => (
                                                            <tr key={req.id}>
                                                                <td><strong>{req.users?.name || 'Unknown'}</strong></td>
                                                                <td>{req.moderators?.name || 'Unknown'}</td>
                                                                <td>{formatDate(req.created_at)}</td>
                                                                <td>
                                                                    <div className="action-buttons">
                                                                        <button className="btn btn-sm btn-primary" onClick={() => handleApproveUserDeletion(req.id)}>Approve</button>
                                                                        <button className="btn btn-sm btn-ghost" onClick={() => handleRejectUserDeletion(req.id)}>Reject</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                            {activeTab === 'users' && (
                                <section className="admin-section">
                                    <div className="section-header">
                                        <h2>Registered Users ({users.length})</h2>
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: '#f0f0f0', padding: '4px 8px', borderRadius: '6px' }}>
                                                <span style={{ fontSize: '0.85rem', color: '#666' }}>📊 Export:</span>
                                                {[10, 20, 50].map(n => (
                                                    <button key={n} className="btn btn-sm" onClick={() => handleExportUsersToExcel(n)} style={{ background: '#22c55e', color: 'white', padding: '4px 10px', fontSize: '0.8rem' }}>{n}</button>
                                                ))}
                                                <button className="btn btn-sm" onClick={() => handleExportUsersToExcel('all')} style={{ background: '#16a34a', color: 'white', padding: '4px 10px', fontSize: '0.8rem' }}>All</button>
                                            </div>
                                            {selectedUserIds.length > 0 && (
                                                <button className="btn btn-danger" onClick={handleBulkDelete} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ef4444', color: 'white' }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    Delete Selected ({selectedUserIds.length})
                                                </button>
                                            )}
                                            <button className="btn btn-primary" onClick={() => setShowBulkUploadModal(true)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                Bulk Upload
                                            </button>
                                        </div>
                                    </div>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}><input type="checkbox" checked={users.length > 0 && selectedUserIds.length === users.length} onChange={handleSelectAll} style={{ cursor: 'pointer' }} /></th>
                                                    <th>Name</th><th>WhatsApp</th><th>Location</th><th>Status</th><th>Joined</th><th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(user => (
                                                    <tr key={user.id}>
                                                        <td><input type="checkbox" checked={selectedUserIds.includes(user.id)} onChange={() => handleSelectUser(user.id)} style={{ cursor: 'pointer' }} /></td>
                                                        <td><strong>{user.name}</strong></td>
                                                        <td>{user.whatsapp}</td>
                                                        <td>{[user.city, user.state, user.country].filter(Boolean).join(', ') || '-'}</td>
                                                        <td><span className={`badge badge-${user.is_active ? 'success' : 'error'}`}>{user.is_active ? 'Active' : 'Disabled'}</span></td>
                                                        <td>{formatDate(user.created_at)}</td>
                                                        <td>
                                                            <div className="action-buttons">
                                                                <button className="btn btn-sm btn-ghost" onClick={() => handleOpenBankAllocation(user)}>Allocate Banks</button>
                                                                <button className={`btn btn-sm ${user.is_active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggleUserStatus(user)}>{user.is_active ? 'Disable' : 'Enable'}</button>
                                                                <button className="btn btn-sm btn-ghost btn-danger" onClick={() => handleDeleteUser(user)}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'entries' && (
                                <section className="admin-section">
                                    <div className="section-header"><h2>Recent Nama Entries</h2></div>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead><tr><th>User</th><th>Account</th><th>Count</th><th>Type</th><th>Date</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                {entries.map(entry => (
                                                    <tr key={entry.id}>
                                                        <td>{entry.users?.name || 'Unknown'}</td>
                                                        <td>{entry.nama_accounts?.name || 'Unknown'}</td>
                                                        <td className="count-cell">{formatNumber(entry.count)}</td>
                                                        <td><span className={`badge badge-${entry.source_type === 'audio' ? 'info' : 'success'}`}>{entry.source_type}</span></td>
                                                        <td>{formatDate(entry.entry_date)}</td>
                                                        <td><button className="btn btn-sm btn-ghost btn-danger" onClick={() => handleDeleteEntry(entry.id)}>Delete</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'reports' && (
                                <section className="admin-section">
                                    <div className="section-header"><h2>Account-wise Reports</h2></div>
                                    <div className="table-container">
                                        <table className="table">
                                            <thead><tr><th>Account</th><th>Today</th><th>This Week</th><th>This Month</th><th>This Year</th><th>Overall</th></tr></thead>
                                            <tbody>
                                                {accountStats.map(stat => (
                                                    <tr key={stat.id}>
                                                        <td><strong>{stat.name}</strong></td>
                                                        <td>{formatNumber(stat.today)}</td>
                                                        <td>{formatNumber(stat.thisWeek)}</td>
                                                        <td>{formatNumber(stat.thisMonth)}</td>
                                                        <td>{formatNumber(stat.thisYear)}</td>
                                                        <td className="count-cell">{formatNumber(stat.overall)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'moderators' && (
                                <section className="admin-section">
                                    <div className="section-header">
                                        <h2>Moderator Accounts</h2>
                                        <button className="btn btn-primary" onClick={() => setShowModeratorModal(true)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                            Add Moderator
                                        </button>
                                    </div>
                                    {moderators.length === 0 ? (
                                        <div className="empty-state"><p>No moderators yet. Create one to get started.</p></div>
                                    ) : (
                                        <div className="table-container">
                                            <table className="table">
                                                <thead><tr><th>Name</th><th>Username</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                                                <tbody>
                                                    {moderators.map(mod => (
                                                        <tr key={mod.id}>
                                                            <td><strong>{mod.name}</strong></td>
                                                            <td>{mod.username}</td>
                                                            <td><span className={`badge badge-${mod.is_active ? 'success' : 'error'}`}>{mod.is_active ? 'Active' : 'Disabled'}</span></td>
                                                            <td>{formatDate(mod.created_at)}</td>
                                                            <td>
                                                                <div className="action-buttons">
                                                                    <button className={`btn btn-sm ${mod.is_active ? 'btn-secondary' : 'btn-primary'}`} onClick={() => handleToggleModeratorStatus(mod)}>{mod.is_active ? 'Disable' : 'Enable'}</button>
                                                                    <button className="btn btn-sm btn-ghost btn-danger" onClick={() => handleDeleteModerator(mod.id)}>Delete</button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            )}

                            {activeTab === 'prayers' && (
                                <section className="admin-section">
                                    <div className="section-header"><h2>Prayers & Books Management</h2></div>
                                    <div className="admin-grid-layout" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                                        <div className="upload-section subsection">
                                            <BookUpload onUploadSuccess={() => { success('Book uploaded successfully! It will appear in the Digital Library.'); loadData(); }} />
                                        </div>
                                        <div className="subsection">
                                            <h3>Prayers ({prayers.length})</h3>
                                            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                <table className="table">
                                                    <thead><tr><th>Name</th><th>Prayer</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
                                                    <tbody>
                                                        {prayers.map(prayer => (
                                                            <tr key={prayer.id}>
                                                                <td>{prayer.privacy === 'anonymous' ? 'Anonymous' : prayer.name}</td>
                                                                <td style={{ maxWidth: '300px' }}><div className="truncate-text" title={prayer.prayer_text}>{prayer.prayer_text}</div></td>
                                                                <td><span className={`badge badge-${prayer.status === 'approved' ? 'success' : prayer.status === 'pending' ? 'warning' : 'error'}`}>{prayer.status}</span></td>
                                                                <td>{formatDate(prayer.created_at)}</td>
                                                                <td><button className="btn btn-sm btn-ghost btn-danger" onClick={() => handleDeletePrayer(prayer.id)}>Delete</button></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div className="subsection">
                                            <h3>Books ({books.length})</h3>
                                            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                                <table className="table">
                                                    <thead><tr><th>Title</th><th>Info</th><th>Views</th><th>Action</th></tr></thead>
                                                    <tbody>
                                                        {books.map(book => (
                                                            <tr key={book.id}>
                                                                <td>
                                                                    <strong>{book.title}</strong><br />
                                                                    <Link to={`/books/${book.id}`} target="_blank" className="text-sm link" style={{ color: 'var(--primary)' }}>📖 Read as Flipbook</Link>
                                                                </td>
                                                                <td>{book.month} {book.year} • {book.language}</td>
                                                                <td>{book.view_count}</td>
                                                                <td>
                                                                    <div className="action-buttons">
                                                                        <a href={book.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">Download</a>
                                                                        <button className="btn btn-sm btn-ghost" onClick={() => { setEditingBook(book); setBookTitle(book.title); setShowBookEditModal(true); }}>Edit</button>
                                                                        <button className="btn btn-sm btn-ghost btn-danger" onClick={() => handleDeleteBook(book)}>Delete</button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {activeTab === 'gallery' && (
                                <section className="admin-section">
                                    <div className="section-header">
                                        <h2>Media Gallery Management</h2>
                                        <p className="section-description">Upload images and audio files for the public galleries</p>
                                    </div>
                                    <div className="media-upload-grid">
                                        <div className="upload-section"><ImageUpload onUploadComplete={() => { success('Images uploaded! They will appear in Photo Gallery.'); }} /></div>
                                        <div className="upload-section"><AudioUpload onUploadComplete={() => { success('Audio uploaded! It will appear in Audio Gallery.'); loadData(); }} /></div>
                                    </div>
                                    <audio ref={audioRef} onEnded={() => setCurrentlyPlaying(null)} style={{ display: 'none' }} />
                                    <div style={{ marginTop: '2rem' }}>
                                        <h3 style={{ marginBottom: '1rem', color: '#333', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            🎵 Uploaded Audio Files ({audioFiles.length})
                                            {currentlyPlaying && (
                                                <button onClick={handleStopAudio} style={{ marginLeft: '1rem', background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>⏹️ Stop Playing</button>
                                            )}
                                        </h3>
                                        {audioFiles.length === 0 ? (
                                            <p style={{ color: '#666', padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>No audio files uploaded yet.</p>
                                        ) : (
                                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                {audioFiles.map(audio => (
                                                    <div key={audio.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: currentlyPlaying === audio.id ? 'linear-gradient(135deg, #fff3e0 0%, #fff9f0 100%)' : '#fff', border: currentlyPlaying === audio.id ? '2px solid #FF9933' : '1px solid #e0e0e0', borderRadius: '8px', borderLeft: audio.isNamaJapa ? '4px solid #FF9933' : '4px solid #4CAF50', transition: 'all 0.3s ease' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            <button onClick={() => handlePlayAudio(audio)} style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', background: currentlyPlaying === audio.id ? 'linear-gradient(135deg, #FF9933 0%, #FF6600 100%)' : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'transform 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                                                                {currentlyPlaying === audio.id ? '⏸️' : '▶️'}
                                                            </button>
                                                            <div>
                                                                <div style={{ fontWeight: 'bold', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    {audio.title}
                                                                    {currentlyPlaying === audio.id && <span style={{ color: '#FF9933', fontSize: '0.85rem' }}>🔊 Playing</span>}
                                                                </div>
                                                                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '12px', background: audio.isNamaJapa ? 'rgba(255,153,51,0.15)' : 'rgba(76,175,80,0.15)', color: audio.isNamaJapa ? '#FF6600' : '#2E7D32', marginRight: '8px' }}>
                                                                        {audio.isNamaJapa ? '🔁 Nama Japa (4x Loop)' : '▶️ Normal (Play Once)'}
                                                                    </span>
                                                                    {audio.size && `${(audio.size / 1024 / 1024).toFixed(2)} MB`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => handleDeleteAudio(audio.id, audio.title)} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"></path></svg>
                                                            Delete
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </div>
            </main>

            {showAccountModal && (
                <div className="modal-overlay" onClick={() => setShowAccountModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingAccount ? 'Edit Account' : 'Add New Account'}</h3>
                            <button className="modal-close" onClick={() => setShowAccountModal(false)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Account Name</label>
                                <input type="text" value={accountName} onChange={e => setAccountName(e.target.value)} className="form-input" placeholder="e.g., Chennai Namavruksha" autoFocus />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAccountModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveAccount}>{editingAccount ? 'Update' : 'Create'}</button>
                        </div>
                    </div>
                </div>
            )}

            {showModeratorModal && (
                <div className="modal-overlay" onClick={() => setShowModeratorModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Create Moderator</h3>
                            <button className="modal-close" onClick={() => setShowModeratorModal(false)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input type="text" value={moderatorName} onChange={e => setModeratorName(e.target.value)} className="form-input" placeholder="e.g., John Doe" autoFocus />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input type="text" value={moderatorUsername} onChange={e => setModeratorUsername(e.target.value)} className="form-input" placeholder="e.g., johndoe" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div className="password-input-wrapper">
                                    <input type={showPassword ? "text" : "password"} value={moderatorPassword} onChange={e => setModeratorPassword(e.target.value)} className="form-input" placeholder="Enter password" />
                                    <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowModeratorModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCreateModerator}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {showBankAllocationModal && selectedUserForAllocation && (
                <div className="modal-overlay" onClick={() => setShowBankAllocationModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Allocate Banks to {selectedUserForAllocation.name}</h3>
                            <button className="modal-close" onClick={() => setShowBankAllocationModal(false)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                        </div>
                        <div className="modal-body">
                            <p className="modal-description">Select Namavruksha Sankalpas to allocate:</p>
                            <div className="checkbox-group">
                                {accounts.filter(acc => acc.is_active).map(account => (
                                    <label key={account.id} className="checkbox-item">
                                        <input type="checkbox" checked={selectedBanksForAllocation.includes(account.id)} onChange={() => toggleBankSelection(account.id)} disabled={userCurrentBanks.includes(account.id)} />
                                        <span>{account.name}{userCurrentBanks.includes(account.id) && <small className="already-linked"> (Already linked)</small>}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowBankAllocationModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveBankAllocation}>Allocate Selected</button>
                        </div>
                    </div>
                </div>
            )}

            {showBulkUploadModal && (
                <div className="modal-overlay" onClick={() => setShowBulkUploadModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <ExcelUpload onUpload={handleBulkUpload} onClose={() => setShowBulkUploadModal(false)} accounts={accounts} />
                    </div>
                </div>
            )}

            {showBookEditModal && (
                <div className="modal-overlay" onClick={() => setShowBookEditModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit Book Title</h3>
                            <button className="modal-close" onClick={() => setShowBookEditModal(false)}><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Book Title</label>
                                <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} className="form-input" placeholder="Enter book title" autoFocus />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowBookEditModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={async () => {
                                if (!bookTitle.trim()) return;
                                try {
                                    await updateBook(editingBook.id, { title: bookTitle });
                                    success('Book title updated successfully!');
                                    setShowBookEditModal(false);
                                    loadData();
                                } catch (err) {
                                    error('Failed to update book title');
                                    console.error(err);
                                }
                            }}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;