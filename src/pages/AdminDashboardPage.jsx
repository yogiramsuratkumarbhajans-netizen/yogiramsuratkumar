import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
    getAllNamaAccounts, createNamaAccount, updateNamaAccount,
    getAllUsers, updateUser, getAllNamaEntries, getAccountStats,
    getUserAccountLinks, linkUserToAccounts, deleteUser,
    getAllPrayers, deletePrayer, getBooks, deleteBook,
    getPendingDeletionRequests, approveAccountDeletion, rejectAccountDeletion,
    getPendingUserDeletionRequests, approveUserDeletion, rejectUserDeletion,
    deleteNamaAccount, updateBook, deleteNamaEntry
} from '../services/namaService';
import { databases, storage, ID, Query, DATABASE_ID, COLLECTIONS, MEDIA_BUCKET_ID } from '../appwriteClient';
import ExcelUpload from '../components/ExcelUpload';
import ImageUpload from '../components/ImageUpload';
import AudioUpload from '../components/AudioUpload';
import BookUpload from '../components/BookUpload';
import '../components/ExcelUpload.css';
import './AdminDashboardPage.css';
import * as XLSX from 'xlsx';

// Free QR API — no npm needed
const getQRUrl = (url) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&color=7a1a1a&bgcolor=fff9f0&data=${encodeURIComponent(url)}`;

const SATSANG_PLATFORMS = ['Zoom', 'Google Meet', 'Zoho Meet', 'Microsoft Teams', 'WhatsApp', 'YouTube Live', 'namavruksha.org', 'Other'];
const SATSANG_FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'One-time', 'Every Monday', 'Every Tuesday', 'Every Wednesday', 'Every Thursday', 'Every Friday', 'Every Saturday', 'Every Sunday', '2nd Saturday Monthly'];
const SATSANG_COUNTRIES = ['India', 'UK', 'USA', 'Canada', 'Australia', 'Singapore', 'Malaysia', 'UAE', 'Germany', 'France', 'Netherlands', 'Sweden', 'New Zealand', 'South Africa', 'Sri Lanka', 'Global', 'Other'];
const SATSANG_STATUSES = ['Upcoming', 'Live Now', 'Completed'];

// All known events from Excel + WhatsApp data
const KNOWN_EVENTS = [
    // UK Events
    { event_name: 'Rudram Parayanam Purusha Suktam', country: 'UK', frequency: 'Every Monday', platform: 'Google Meet', time_display: '8:00 PM – 9:00 PM GMT (1:30 AM IST)', host_name: 'Sri Sridhar Govindarajan', meeting_url: 'https://meet.google.com/hgm-kbcs-aim' },
    { event_name: 'Kandar Shasti Kavasam Parayanam', country: 'UK', frequency: 'Every Tuesday', platform: 'Google Meet', time_display: '8:00 PM – 9:00 PM GMT (1:30 AM IST)', host_name: 'Sri Ramamurthy Krishnan', meeting_url: 'https://meet.google.com/hgm-kbcs-aim' },
    { event_name: 'Bhagwan Nama Japam', country: 'UK', frequency: 'Every Thursday', platform: 'Google Meet', time_display: '8:00 PM – 9:00 PM GMT (1:30 AM IST)', host_name: 'Mr. Natarajan', meeting_url: 'https://meet.google.com/hgm-kbcs-aim' },
    { event_name: 'Lalitha Sahasaramam', country: 'UK', frequency: 'Every Friday', platform: 'Google Meet', time_display: '8:00 PM – 9:00 PM GMT (1:30 AM IST)', host_name: 'Srimathi Swarnalakshmi', meeting_url: 'https://meet.google.com/hgm-kbcs-aim' },
    { event_name: 'Vishnu Sahasranama & Hanuman Chalisa', country: 'UK', frequency: 'Every Saturday', platform: 'Google Meet', time_display: '8:00 PM – 9:00 PM GMT (1:30 AM IST)', host_name: 'Sri Ramamurthy Krishnan', meeting_url: 'https://meet.google.com/hgm-kbcs-aim' },
    { event_name: "Nama Chanting for Bhagwan's UK Abode", country: 'UK', frequency: 'Every Sunday', platform: 'Google Meet', time_display: '8:00 AM – 9:00 AM GMT (1:30 PM IST)', host_name: 'Mr. Natarajan', meeting_url: 'https://meet.google.com/hgm-kbcs-aim' },
    { event_name: "Akandanamam for Bhagwan's UK Abode", country: 'UK', frequency: '2nd Saturday Monthly', platform: 'Zoom', time_display: '6:00 AM – 6:00 PM GMT (11:30 AM – 11:30 PM IST)', host_name: 'Mr. Natarajan', meeting_url: 'https://us06web.zoom.us/j/89997226659?pwd=WU4baSiQ36fU4PyEaGGlofyicQ41gh.1' },
    // USA Events
    { event_name: 'Daily Nama Chanting', country: 'USA', frequency: 'Daily', platform: 'Zoom', time_display: '2:00 PM – 2:30 PM IST (also noted as 5:30 AM–6:30 AM IST)', host_name: 'Suneetha Madhusudhan', meeting_url: 'https://us04web.zoom.us/j/77762865853?pwd=e2ZPT1l7fwa9agvR4xkZlLsbf1dkFC.1', notes: 'Meeting ID: 777 6286 5853 · Passcode: 3Rb5y0' },
    { event_name: 'Weekly Chanting', country: 'USA', frequency: 'Every Sunday', platform: 'Google Meet', time_display: '8:30 PM IST (10:00 AM US Central)', host_name: 'Suneetha Madhusudhan', meeting_url: 'https://meet.google.com/nyd-ekyr-jud' },
    { event_name: 'Swathi Akhandanam 24hr Chanting', country: 'USA', frequency: 'Monthly', platform: 'Zoom', time_display: 'On Swati Nakshatra dates (check calendar)', host_name: 'Suneetha Madhusudhan', meeting_url: '', notes: 'Dynamic URL — Suneetha generates link closer to date. May 2026: Apr 30–May 1 & May 27.' },
    // India Events
    { event_name: 'Sunday Satsang', country: 'India', frequency: 'Every Sunday', platform: 'Zoho Meet', time_display: '3:30 PM – 5:30 PM IST', host_name: 'Mambalam Yogi Ramsuratkumar Nama Mandhiram', meeting_url: 'https://meet.zoho.in/nydw-lhy-mnh', notes: 'Meeting ID: 138793984572 · Includes Nama Chanting, Guru Experiences, Devotional Songs, Discourse, Mangalam' },
];

const EMPTY_SATSANG = {
    event_name: '', country: 'UK', event_datetime: '', sankalpa: '',
    frequency: 'Weekly', platform: 'Google Meet', host_name: '',
    meeting_url: '', status: 'Upcoming', is_active: true
};

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
    const [logFilterUser, setLogFilterUser] = useState('');
    const [logFilterAccount, setLogFilterAccount] = useState('');
    const [logFilterDate, setLogFilterDate] = useState('');

    // Satsang states
    const [satsangEvents, setSatsangEvents] = useState([]);
    const [satsangLoading, setSatsangLoading] = useState(false);
    const [satsangFilter, setSatsangFilter] = useState('all');
    const [showSatsangModal, setShowSatsangModal] = useState(false);
    const [editingSatsang, setEditingSatsang] = useState(null);
    const [satsangForm, setSatsangForm] = useState({ ...EMPTY_SATSANG });
    const [showKnownEvents, setShowKnownEvents] = useState(true);

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
        if (!isAdmin) { navigate('/admin/login'); return; }
        loadData();
    }, [isAdmin, navigate]);

    const loadData = async () => {
        try {
            const [accountsData, usersData, entriesData, statsData, prayersData, booksData, delReq, userDelReq] = await Promise.all([
                getAllNamaAccounts(), getAllUsers(), getAllNamaEntries(), getAccountStats(),
                getAllPrayers(), getBooks(), getPendingDeletionRequests(), getPendingUserDeletionRequests()
            ]);
            setAccounts(accountsData); setUsers(usersData); setEntries(entriesData);
            setAccountStats(statsData); setPrayers(prayersData); setBooks(booksData);
            setDeletionRequests(delReq); setUserDeletionRequests(userDelReq);
            try { const m = await databases.listDocuments(DATABASE_ID, COLLECTIONS.MODERATORS, [Query.orderDesc('created_at')]); setModerators(m.documents.map(d => ({ ...d, id: d.$id })) || []); } catch (e) { console.error(e); }
            try { const r = await storage.listFiles(MEDIA_BUCKET_ID); const exts = ['.mp3','.wav','.ogg','.m4a','.aac','.flac']; setAudioFiles(r.files.filter(f => exts.some(e => f.name.toLowerCase().endsWith(e))).map(f => ({ id: f.$id, name: f.name, title: f.name.replace(/\.[^/.]+$/,'').replace('NamaJapa_','').replace(/_/g,' '), isNamaJapa: f.name.startsWith('NamaJapa_'), size: f.sizeOriginal }))); } catch (e) { console.error(e); }
        } catch (err) { console.error(err); error('Failed to load data'); }
        finally { setLoading(false); }
    };

    const loadSatsangEvents = async () => {
        setSatsangLoading(true);
        try {
            const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, [Query.orderDesc('created_at'), Query.limit(100)]);
            setSatsangEvents(res.documents.map(d => ({ ...d, id: d.$id })));
        } catch (err) { console.error(err); error('Failed to load satsang events'); }
        finally { setSatsangLoading(false); }
    };

    useEffect(() => { if (activeTab === 'satsang') loadSatsangEvents(); }, [activeTab]);

    const pendingCount = satsangEvents.filter(e => !e.is_active).length;
    const filteredSatsang = satsangEvents.filter(e => {
        if (satsangFilter === 'pending') return !e.is_active;
        if (satsangFilter === 'approved') return e.is_active;
        return true;
    });

    // Pre-fill form from known event
    const prefillFromKnown = (ev) => {
        setSatsangForm({
            event_name: ev.event_name,
            country: ev.country,
            event_datetime: '',
            sankalpa: '',
            frequency: ev.frequency,
            platform: ev.platform,
            host_name: ev.host_name,
            meeting_url: ev.meeting_url || '',
            status: 'Upcoming',
            is_active: true
        });
        setEditingSatsang(null);
        setShowSatsangModal(true);
    };

    const handleApproveSatsang = async (ev) => {
        try { await databases.updateDocument(DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, ev.id, { is_active: true, status: 'Upcoming' }); success(`"${ev.event_name}" approved!`); loadSatsangEvents(); } catch { error('Failed'); }
    };
    const handleRejectSatsang = async (ev) => {
        if (!confirm(`Reject "${ev.event_name}"?`)) return;
        try { await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, ev.id); success('Rejected.'); loadSatsangEvents(); } catch { error('Failed'); }
    };
    const handleDeleteSatsang = async (ev) => {
        if (!confirm(`Delete "${ev.event_name}"?`)) return;
        try { await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, ev.id); success('Deleted.'); loadSatsangEvents(); } catch { error('Failed'); }
    };
    const handleToggleSatsangStatus = async (ev) => {
        const s = ev.status === 'Upcoming' ? 'Completed' : 'Upcoming';
        try { await databases.updateDocument(DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, ev.id, { status: s }); success('Updated.'); loadSatsangEvents(); } catch { error('Failed'); }
    };

    const openSatsangModal = (ev = null) => {
        if (ev) {
            setEditingSatsang(ev);
            setSatsangForm({ event_name: ev.event_name, country: ev.country, event_datetime: ev.event_datetime || '', sankalpa: ev.sankalpa || '', frequency: ev.frequency, platform: ev.platform, host_name: ev.host_name, meeting_url: ev.meeting_url || '', status: ev.status, is_active: ev.is_active });
        } else {
            setEditingSatsang(null);
            setSatsangForm({ ...EMPTY_SATSANG });
        }
        setShowSatsangModal(true);
    };

    const handleSaveSatsang = async () => {
        if (!satsangForm.event_name.trim() || !satsangForm.host_name.trim()) {
            error('Event name and host name are required.'); return;
        }
        try {
            const data = {
                event_name: satsangForm.event_name.trim(),
                country: satsangForm.country,
                event_datetime: satsangForm.event_datetime || new Date().toISOString(),
                sankalpa: satsangForm.sankalpa.trim(),
                frequency: satsangForm.frequency,
                platform: satsangForm.platform,
                host_name: satsangForm.host_name.trim(),
                meeting_url: satsangForm.meeting_url.trim(),
                status: satsangForm.status,
                is_active: satsangForm.is_active,
                created_at: editingSatsang ? editingSatsang.created_at : new Date().toISOString()
            };
            if (editingSatsang) { await databases.updateDocument(DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, editingSatsang.id, data); success('Updated.'); }
            else { await databases.createDocument(DATABASE_ID, COLLECTIONS.SATSANG_EVENTS, ID.unique(), data); success('Event created!'); }
            setShowSatsangModal(false);
            loadSatsangEvents();
        } catch (err) { console.error(err); error('Failed to save.'); }
    };

    // All existing handlers
    const fetchAudioFiles = async () => { try { const r = await storage.listFiles(MEDIA_BUCKET_ID); const exts=['.mp3','.wav','.ogg','.m4a','.aac','.flac']; setAudioFiles(r.files.filter(f=>exts.some(e=>f.name.toLowerCase().endsWith(e))).map(f=>({id:f.$id,name:f.name,title:f.name.replace(/\.[^/.]+$/,'').replace('NamaJapa_','').replace(/_/g,' '),isNamaJapa:f.name.startsWith('NamaJapa_'),size:f.sizeOriginal}))); } catch(e){console.error(e);} };
    const handleDeleteAudio = async (id, name) => { if (!window.confirm(`Delete "${name}"?`)) return; try { await storage.deleteFile(MEDIA_BUCKET_ID, id); success(`Deleted`); fetchAudioFiles(); } catch { error('Failed'); } };
    const handleLogout = () => { logout(); navigate('/'); };
    const handleSaveAccount = async () => { if (!accountName.trim()) { error('Required'); return; } try { if (editingAccount) { await updateNamaAccount(editingAccount.id,{name:accountName}); success('Updated'); } else { await createNamaAccount(accountName); success('Created'); } setShowAccountModal(false); setAccountName(''); setEditingAccount(null); loadData(); } catch { error('Failed'); } };
    const handleToggleAccountStatus = async (a) => { try { await updateNamaAccount(a.id,{is_active:!a.is_active}); success(`Done`); loadData(); } catch { error('Failed'); } };
    const handleToggleUserStatus = async (u) => { try { await updateUser(u.id,{is_active:!u.is_active}); success(`Done`); loadData(); } catch { error('Failed'); } };
    const handleDeleteUser = async (u) => { if (!confirm(`Delete ${u.name}?`)) return; try { await deleteUser(u.id); success('Deleted'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleDeletePrayer = async (id) => { if (!confirm('Delete?')) return; try { await deletePrayer(id); success('Deleted'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleDeleteBook = async (b) => { if (!confirm('Delete?')) return; try { await deleteBook(b.id,b.file_url); success('Deleted'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleDeleteEntry = async (id) => { if (!confirm('Delete entry?')) return; try { await deleteNamaEntry(id); success('Deleted'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleApproveAccountDeletion = async (id) => { if (!confirm('Approve?')) return; try { await approveAccountDeletion(id); success('Done'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleRejectAccountDeletion = async (id) => { if (!confirm('Reject?')) return; try { await rejectAccountDeletion(id); success('Rejected'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleApproveUserDeletion = async (id) => { if (!confirm('Approve?')) return; try { await approveUserDeletion(id); success('Done'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleRejectUserDeletion = async (id) => { if (!confirm('Reject?')) return; try { await rejectUserDeletion(id); success('Rejected'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleDirectDeleteAccount = async (a) => { if (!confirm(`Delete "${a.name}"?`)) return; try { await deleteNamaAccount(a.id); success('Deleted'); loadData(); } catch(e) { error(e.message||'Failed'); } };
    const handleSelectAll = (e) => setSelectedUserIds(e.target.checked ? users.map(u=>u.id) : []);
    const handleSelectUser = (id) => setSelectedUserIds(prev => prev.includes(id) ? prev.filter(i=>i!==id) : [...prev,id]);
    const handleBulkDelete = async () => { if (!selectedUserIds.length||!confirm(`Delete ${selectedUserIds.length}?`)) return; let c=0; for(const id of selectedUserIds){try{await deleteUser(id);c++;}catch(e){console.error(e);}} success(`Deleted ${c}`); setSelectedUserIds([]); loadData(); };
    const handleOpenBankAllocation = async (u) => { setSelectedUserForAllocation(u); try { const l=await getUserAccountLinks(u.id); const ids=l.map(x=>x.account_id); setUserCurrentBanks(ids); setSelectedBanksForAllocation(ids); setShowBankAllocationModal(true); } catch { error('Failed'); } };
    const handleSaveBankAllocation = async () => { if(!selectedUserForAllocation) return; try { const n=selectedBanksForAllocation.filter(id=>!userCurrentBanks.includes(id)); if(n.length>0) await linkUserToAccounts(selectedUserForAllocation.id,n); success('Done!'); setShowBankAllocationModal(false); setSelectedUserForAllocation(null); setSelectedBanksForAllocation([]); setUserCurrentBanks([]); loadData(); } catch { error('Failed'); } };
    const toggleBankSelection = (id) => setSelectedBanksForAllocation(prev => prev.includes(id)?prev.filter(i=>i!==id):[...prev,id]);
    const handleBulkUpload = async (users) => { setLoading(true); try { const {results,errors:ue}=await import('../services/namaService').then(m=>m.bulkCreateUsers(users,users[0]?.accountIds||[])); if(results.length>0) success(`Added ${results.length}!`); if(ue.length>0){const d=ue.filter(e=>e.type==='duplicate').length; if(d>0) error(`${d} skipped`);} setShowBulkUploadModal(false); loadData(); } catch(e){error(`Failed: ${e.message}`);}finally{setLoading(false);} };
    const handleCreateModerator = async () => { if(!moderatorName.trim()||!moderatorUsername.trim()||!moderatorPassword.trim()){error('All required');return;} try{await databases.createDocument(DATABASE_ID,COLLECTIONS.MODERATORS,ID.unique(),{name:moderatorName,username:moderatorUsername,password_hash:moderatorPassword,is_active:true,created_at:new Date().toISOString()});success('Created');setShowModeratorModal(false);setModeratorName('');setModeratorUsername('');setModeratorPassword('');loadData();}catch{error('Failed.');} };
    const handleToggleModeratorStatus = async (m) => { try{await databases.updateDocument(DATABASE_ID,COLLECTIONS.MODERATORS,m.id,{is_active:!m.is_active});success(`Done`);loadData();}catch{error('Failed');} };
    const handleDeleteModerator = async (id) => { if(!confirm('Delete?'))return; try{await databases.deleteDocument(DATABASE_ID,COLLECTIONS.MODERATORS,id);success('Deleted');loadData();}catch(e){error(e.message||'Failed');} };
    const formatDate = (s) => { try { return new Date(s).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); } catch { return s||'—'; } };
    const formatDateTime = (s) => { try { return new Date(s).toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return s||'—'; } };
    const formatNumber = (n) => n?.toLocaleString()||'0';
    const handlePlayAudio = (audio) => { if(currentlyPlaying===audio.id){if(audioRef.current.paused)audioRef.current.play();else audioRef.current.pause();}else{const url=`https://cloud.appwrite.io/v1/storage/buckets/${MEDIA_BUCKET_ID}/files/${audio.id}/view?project=682de53c003c04cdaeda`;if(audioRef.current){audioRef.current.src=url;audioRef.current.play();setCurrentlyPlaying(audio.id);}} };
    const handleStopAudio = () => { if(audioRef.current){audioRef.current.pause();audioRef.current.currentTime=0;setCurrentlyPlaying(null);} };
    const handleExportUsersToExcel = (count='all') => { const u=count==='all'?users:users.slice(0,parseInt(count)); const data=u.map((x,i)=>({'S.No':i+1,'Name':x.name,'WhatsApp':x.whatsapp||'','Email':x.email||'','City':x.city||'','State':x.state||'','Country':x.country||'','Status':x.is_active?'Active':'Disabled','Joined':formatDate(x.created_at)})); const wb=XLSX.utils.book_new();const ws=XLSX.utils.json_to_sheet(data);XLSX.utils.book_append_sheet(wb,ws,'Users');XLSX.writeFile(wb,`namavruksha_users_${new Date().toISOString().split('T')[0]}.xlsx`);success(`Exported ${u.length}!`); };
    const getFilteredEntries = () => entries.filter(e=>{const u=(e.users?.name||'').toLowerCase();const a=(e.nama_accounts?.name||'').toLowerCase();const d=e.entry_date||e.$createdAt||'';return(!logFilterUser||u.includes(logFilterUser.toLowerCase()))&&(!logFilterAccount||a.includes(logFilterAccount.toLowerCase()))&&(!logFilterDate||d.startsWith(logFilterDate));});
    const handleExportLogToExcel = () => { const f=getFilteredEntries();const data=f.map((e,i)=>({'S.No':i+1,'Submitted At':formatDateTime(e.$createdAt||e.created_at),'User':e.users?.name||'Unknown','Sankalpa':e.nama_accounts?.name||'Unknown','Nama Count':e.count,'Devotees':e.devotee_count||1,'Offering Date':e.entry_date||'-','Type':e.source_type}));const wb=XLSX.utils.book_new();const ws=XLSX.utils.json_to_sheet(data);XLSX.utils.book_append_sheet(wb,ws,'Log');XLSX.writeFile(wb,`namavruksha_log_${new Date().toISOString().split('T')[0]}.xlsx`);success(`Exported ${f.length}!`); };

    if (!isAdmin) return null;

    const TABS = [
        { key: 'accounts', label: 'Accounts' },
        { key: 'users', label: 'Users' },
        { key: 'entries', label: 'Entries' },
        { key: 'log', label: '📋 Submission Log' },
        { key: 'reports', label: 'Reports' },
        { key: 'satsang', label: `🕉 Satsang${pendingCount > 0 ? ` (${pendingCount}⏳)` : ''}` },
        { key: 'moderators', label: 'Moderators' },
        { key: 'prayers', label: 'Prayers & Books' },
        { key: 'gallery', label: 'Gallery' },
    ];

    return (
        <div className="admin-dashboard">
            <header className="admin-header">
                <div className="container">
                    <div className="header-content">
                        <div className="header-left"><span className="admin-badge">Admin</span><h1>Namavruksha Admin</h1></div>
                        <button onClick={handleLogout} className="btn btn-ghost">Logout</button>
                    </div>
                </div>
            </header>

            <nav className="admin-nav">
                <div className="container">
                    <div className="nav-tabs">
                        {TABS.map(t => <button key={t.key} className={`nav-tab ${activeTab===t.key?'active':''}`} onClick={() => setActiveTab(t.key)}>{t.label}</button>)}
                    </div>
                </div>
            </nav>

            <main className="admin-main">
                <div className="container">
                    {loading ? <div className="page-loader"><span className="loader"/><p>Loading...</p></div> : (
                        <>
                            {/* Accounts Tab */}
                            {activeTab === 'accounts' && (
                                <section className="admin-section">
                                    <div className="section-header"><h2>Namavruksha Sankalpas</h2><button className="btn btn-primary" onClick={()=>{setEditingAccount(null);setAccountName('');setShowAccountModal(true);}}>+ Add Account</button></div>
                                    <div className="table-container"><table className="table"><thead><tr><th>Name</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id}><td><strong>{a.name}</strong></td><td><span className={`badge badge-${a.is_active?'success':'error'}`}>{a.is_active?'Active':'Disabled'}</span></td><td>{formatDate(a.created_at)}</td><td><div className="action-buttons"><button className="btn btn-sm btn-ghost" onClick={()=>{setEditingAccount(a);setAccountName(a.name);setShowAccountModal(true);}}>Edit</button><button className={`btn btn-sm ${a.is_active?'btn-secondary':'btn-primary'}`} onClick={()=>handleToggleAccountStatus(a)}>{a.is_active?'Disable':'Enable'}</button><button className="btn btn-sm btn-ghost" onClick={()=>handleDirectDeleteAccount(a)} style={{color:'#ef4444'}}>Delete</button></div></td></tr>)}</tbody></table></div>
                                    {deletionRequests.length>0&&<div style={{marginTop:'30px',borderTop:'1px solid var(--border-color)',paddingTop:'20px'}}><h3 style={{marginBottom:'15px'}}>Pending Account Deletion Requests ({deletionRequests.length})</h3><div className="table-container"><table className="table"><thead><tr><th>Account</th><th>By</th><th>Date</th><th>Actions</th></tr></thead><tbody>{deletionRequests.map(r=><tr key={r.id}><td><strong>{r.nama_accounts?.name||'Unknown'}</strong></td><td>{r.moderators?.name||'Unknown'}</td><td>{formatDate(r.created_at)}</td><td><div className="action-buttons"><button className="btn btn-sm btn-primary" onClick={()=>handleApproveAccountDeletion(r.id)}>Approve</button><button className="btn btn-sm btn-ghost" onClick={()=>handleRejectAccountDeletion(r.id)}>Reject</button></div></td></tr>)}</tbody></table></div></div>}
                                    {userDeletionRequests.length>0&&<div style={{marginTop:'30px',borderTop:'1px solid var(--border-color)',paddingTop:'20px'}}><h3 style={{marginBottom:'15px'}}>Pending User Deletion Requests ({userDeletionRequests.length})</h3><div className="table-container"><table className="table"><thead><tr><th>User</th><th>By</th><th>Date</th><th>Actions</th></tr></thead><tbody>{userDeletionRequests.map(r=><tr key={r.id}><td><strong>{r.users?.name||'Unknown'}</strong></td><td>{r.moderators?.name||'Unknown'}</td><td>{formatDate(r.created_at)}</td><td><div className="action-buttons"><button className="btn btn-sm btn-primary" onClick={()=>handleApproveUserDeletion(r.id)}>Approve</button><button className="btn btn-sm btn-ghost" onClick={()=>handleRejectUserDeletion(r.id)}>Reject</button></div></td></tr>)}</tbody></table></div></div>}
                                </section>
                            )}

                            {activeTab==='users'&&<section className="admin-section"><div className="section-header"><h2>Registered Users ({users.length})</h2><div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}><div style={{display:'flex',gap:'6px',alignItems:'center',background:'#f0f0f0',padding:'4px 8px',borderRadius:'6px'}}><span style={{fontSize:'0.85rem',color:'#666'}}>📊 Export:</span>{[10,20,50].map(n=><button key={n} className="btn btn-sm" onClick={()=>handleExportUsersToExcel(n)} style={{background:'#22c55e',color:'white',padding:'4px 10px',fontSize:'0.8rem'}}>{n}</button>)}<button className="btn btn-sm" onClick={()=>handleExportUsersToExcel('all')} style={{background:'#16a34a',color:'white',padding:'4px 10px',fontSize:'0.8rem'}}>All</button></div>{selectedUserIds.length>0&&<button className="btn btn-danger" onClick={handleBulkDelete} style={{backgroundColor:'#ef4444',color:'white'}}>Delete ({selectedUserIds.length})</button>}<button className="btn btn-primary" onClick={()=>setShowBulkUploadModal(true)}>Bulk Upload</button></div></div><div className="table-container"><table className="table"><thead><tr><th style={{width:'40px'}}><input type="checkbox" checked={users.length>0&&selectedUserIds.length===users.length} onChange={handleSelectAll}/></th><th>Name</th><th>WhatsApp</th><th>Location</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>{users.map(u=><tr key={u.id}><td><input type="checkbox" checked={selectedUserIds.includes(u.id)} onChange={()=>handleSelectUser(u.id)}/></td><td><strong>{u.name}</strong></td><td>{u.whatsapp}</td><td>{[u.city,u.state,u.country].filter(Boolean).join(', ')||'-'}</td><td><span className={`badge badge-${u.is_active?'success':'error'}`}>{u.is_active?'Active':'Disabled'}</span></td><td>{formatDate(u.created_at)}</td><td><div className="action-buttons"><button className="btn btn-sm btn-ghost" onClick={()=>handleOpenBankAllocation(u)}>Allocate Banks</button><button className={`btn btn-sm ${u.is_active?'btn-secondary':'btn-primary'}`} onClick={()=>handleToggleUserStatus(u)}>{u.is_active?'Disable':'Enable'}</button><button className="btn btn-sm btn-ghost btn-danger" onClick={()=>handleDeleteUser(u)}>Delete</button></div></td></tr>)}</tbody></table></div></section>}

                            {activeTab==='entries'&&<section className="admin-section"><div className="section-header"><h2>Recent Nama Entries</h2></div><div className="table-container"><table className="table"><thead><tr><th>User</th><th>Account</th><th>Count</th><th>Type</th><th>Date</th><th>Actions</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td>{e.users?.name||'Unknown'}</td><td>{e.nama_accounts?.name||'Unknown'}</td><td className="count-cell">{formatNumber(e.count)}</td><td><span className={`badge badge-${e.source_type==='audio'?'info':'success'}`}>{e.source_type}</span></td><td>{formatDate(e.entry_date)}</td><td><button className="btn btn-sm btn-ghost btn-danger" onClick={()=>handleDeleteEntry(e.id)}>Delete</button></td></tr>)}</tbody></table></div></section>}

                            {activeTab==='log'&&<section className="admin-section"><div className="section-header"><h2>📋 Submission Log ({getFilteredEntries().length})</h2><button className="btn btn-primary" onClick={handleExportLogToExcel} style={{background:'#16a34a'}}>📊 Export</button></div><div style={{display:'flex',gap:'12px',marginBottom:'1.5rem',flexWrap:'wrap',alignItems:'flex-end'}}><div className="form-group" style={{margin:0}}><label style={{fontSize:'0.8rem',color:'#666',display:'block',marginBottom:'4px'}}>User</label><input type="text" className="form-input" placeholder="Search name..." value={logFilterUser} onChange={e=>setLogFilterUser(e.target.value)} style={{width:'180px',padding:'6px 10px',fontSize:'0.9rem'}}/></div><div className="form-group" style={{margin:0}}><label style={{fontSize:'0.8rem',color:'#666',display:'block',marginBottom:'4px'}}>Sankalpa</label><input type="text" className="form-input" placeholder="Search sankalpa..." value={logFilterAccount} onChange={e=>setLogFilterAccount(e.target.value)} style={{width:'200px',padding:'6px 10px',fontSize:'0.9rem'}}/></div><div className="form-group" style={{margin:0}}><label style={{fontSize:'0.8rem',color:'#666',display:'block',marginBottom:'4px'}}>Date</label><input type="date" className="form-input" value={logFilterDate} onChange={e=>setLogFilterDate(e.target.value)} style={{padding:'6px 10px',fontSize:'0.9rem'}}/></div>{(logFilterUser||logFilterAccount||logFilterDate)&&<button className="btn btn-sm btn-ghost" onClick={()=>{setLogFilterUser('');setLogFilterAccount('');setLogFilterDate('');}}>✕ Clear</button>}</div><div className="table-container"><table className="table"><thead><tr><th>Submitted At</th><th>User</th><th>Sankalpa</th><th>Nama Count</th><th>Devotees</th><th>Offering Date</th><th>Type</th></tr></thead><tbody>{getFilteredEntries().map(e=><tr key={e.id}><td style={{fontSize:'0.82rem',color:'#555'}}>{formatDateTime(e.$createdAt||e.created_at)}</td><td><strong>{e.users?.name||'Unknown'}</strong></td><td>{e.nama_accounts?.name||'Unknown'}</td><td className="count-cell" style={{color:'#8B0000',fontWeight:'700'}}>{formatNumber(e.count)}</td><td style={{textAlign:'center'}}>{e.devotee_count>1?<span style={{background:'#fff3e0',color:'#FF6600',padding:'2px 8px',borderRadius:'12px',fontSize:'0.82rem',fontWeight:'600'}}>👥 {e.devotee_count}</span>:'1'}</td><td>{e.entry_date||'-'}</td><td><span className={`badge badge-${e.source_type==='audio'?'info':'success'}`}>{e.source_type}</span></td></tr>)}{getFilteredEntries().length===0&&<tr><td colSpan="7" style={{textAlign:'center',color:'#999',padding:'2rem'}}>No entries match.</td></tr>}</tbody></table></div></section>}

                            {activeTab==='reports'&&<section className="admin-section"><div className="section-header"><h2>Account-wise Reports</h2></div><div className="table-container"><table className="table"><thead><tr><th>Account</th><th>Today</th><th>This Week</th><th>This Month</th><th>This Year</th><th>Overall</th></tr></thead><tbody>{accountStats.map(s=><tr key={s.id}><td><strong>{s.name}</strong></td><td>{formatNumber(s.today)}</td><td>{formatNumber(s.thisWeek)}</td><td>{formatNumber(s.thisMonth)}</td><td>{formatNumber(s.thisYear)}</td><td className="count-cell">{formatNumber(s.overall)}</td></tr>)}</tbody></table></div></section>}

                            {/* ── Satsang Tab ── */}
                            {activeTab === 'satsang' && (
                                <section className="admin-section">
                                    <div className="section-header">
                                        <div>
                                            <h2>🕉 Satsang Events</h2>
                                            <p style={{fontSize:'0.82rem',color:'#888',margin:'2px 0 0'}}>Manage all global online satsang events</p>
                                        </div>
                                        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                                            <a href="/satsang" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{fontSize:'0.85rem'}}>↗ Public Page</a>
                                            <button className="btn btn-primary" onClick={() => openSatsangModal()}>+ Add Event</button>
                                        </div>
                                    </div>

                                    {/* Known Events Reference Panel */}
                                    <div style={{marginBottom:'1.5rem'}}>
                                        <button
                                            onClick={() => setShowKnownEvents(!showKnownEvents)}
                                            style={{background:'#fff9f0',border:'1px solid #e8c880',borderRadius:'8px',padding:'8px 16px',cursor:'pointer',fontSize:'0.85rem',color:'#8b5e00',fontWeight:'600',display:'flex',alignItems:'center',gap:'8px'}}
                                        >
                                            📋 {showKnownEvents ? 'Hide' : 'Show'} Event Reference List ({KNOWN_EVENTS.length} events) — click any row to pre-fill form
                                        </button>

                                        {showKnownEvents && (
                                            <div style={{marginTop:'10px',border:'1px solid #e8c880',borderRadius:'10px',overflow:'hidden'}}>
                                                <div style={{background:'#7a1a1a',padding:'10px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                                    <span style={{color:'#ffd080',fontWeight:'700',fontSize:'0.9rem'}}>📌 Known Events — Click "Add →" to pre-fill the form</span>
                                                    <span style={{color:'rgba(255,255,255,0.7)',fontSize:'0.78rem'}}>UK: {KNOWN_EVENTS.filter(e=>e.country==='UK').length} events · USA: {KNOWN_EVENTS.filter(e=>e.country==='USA').length} events · India: {KNOWN_EVENTS.filter(e=>e.country==='India').length} events</span>
                                                </div>
                                                <div style={{overflowX:'auto',maxHeight:'360px',overflowY:'auto'}}>
                                                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
                                                        <thead style={{position:'sticky',top:0,background:'#f5ede0'}}>
                                                            <tr>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>Event</th>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>Country</th>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>Time</th>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>Frequency</th>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>Host</th>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>Platform</th>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>QR</th>
                                                                <th style={{padding:'8px 12px',textAlign:'left',color:'#5a3010',borderBottom:'1px solid #e8c880'}}>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {KNOWN_EVENTS.map((ev, i) => (
                                                                <tr key={i} style={{borderBottom:'1px solid #f5ede0',background:i%2===0?'#fff':'#fffdf8'}}>
                                                                    <td style={{padding:'8px 12px',fontWeight:'600',color:'#3a2000'}}>
                                                                        {ev.event_name}
                                                                        {ev.notes && <div style={{fontSize:'0.72rem',color:'#888',marginTop:'2px',fontWeight:'400'}}>{ev.notes}</div>}
                                                                    </td>
                                                                    <td style={{padding:'8px 12px',color:'#555'}}>{ev.country==='UK'?'🇬🇧':ev.country==='USA'?'🇺🇸':'🇮🇳'} {ev.country}</td>
                                                                    <td style={{padding:'8px 12px',color:'#555',fontSize:'0.78rem',whiteSpace:'nowrap'}}>{ev.time_display}</td>
                                                                    <td style={{padding:'8px 12px'}}><span style={{background:'#e8f4fd',color:'#0369a1',borderRadius:'10px',padding:'2px 8px',fontSize:'0.72rem',fontWeight:'600'}}>{ev.frequency}</span></td>
                                                                    <td style={{padding:'8px 12px',color:'#555',fontSize:'0.78rem'}}>{ev.host_name}</td>
                                                                    <td style={{padding:'8px 12px',color:'#555',fontSize:'0.78rem'}}>{ev.platform}</td>
                                                                    <td style={{padding:'8px 12px'}}>
                                                                        {ev.meeting_url ? (
                                                                            <img src={getQRUrl(ev.meeting_url)} alt="QR" width={48} height={48} style={{borderRadius:'4px',border:'1px solid #e8c880'}} />
                                                                        ) : <span style={{fontSize:'0.72rem',color:'#aaa'}}>Dynamic</span>}
                                                                    </td>
                                                                    <td style={{padding:'8px 12px'}}>
                                                                        <button
                                                                            className="btn btn-sm btn-primary"
                                                                            onClick={() => prefillFromKnown(ev)}
                                                                            style={{fontSize:'0.78rem',padding:'4px 10px'}}
                                                                        >
                                                                            Add →
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                <div style={{padding:'8px 16px',background:'#fff9f0',fontSize:'0.75rem',color:'#888',borderTop:'1px solid #e8c880'}}>
                                                    ⚠️ After clicking "Add →", set the exact date/time in the form and verify details before saving.
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Filter tabs */}
                                    <div style={{display:'flex',gap:'8px',marginBottom:'1.25rem',flexWrap:'wrap'}}>
                                        {[['all','All Events'],['pending',`⏳ Pending${pendingCount>0?` (${pendingCount})`:''}`],['approved','✅ Live']].map(([val,label])=>(
                                            <button key={val} onClick={()=>setSatsangFilter(val)} style={{padding:'6px 16px',borderRadius:'20px',border:`1px solid ${satsangFilter===val?'#8B0000':'#ddd'}`,background:satsangFilter===val?'#8B0000':'#fff',color:satsangFilter===val?'#fff':'#666',fontSize:'0.85rem',cursor:'pointer',fontWeight:satsangFilter===val?'600':'400'}}>
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {satsangLoading ? <div className="page-loader"><span className="loader"/></div> :
                                    filteredSatsang.length===0 ? (
                                        <div style={{textAlign:'center',padding:'2rem',color:'#888'}}>
                                            {satsangFilter==='pending' ? '✅ No pending events.' : 'No events yet. Use the reference list above to add them.'}
                                        </div>
                                    ) : (
                                        <div className="table-container">
                                            <table className="table">
                                                <thead><tr><th>Event Name</th><th>Host</th><th>Country</th><th>Date/Time (IST)</th><th>Platform</th><th>Freq.</th><th>QR</th><th>Approval</th><th>Status</th><th>Actions</th></tr></thead>
                                                <tbody>
                                                    {filteredSatsang.map(ev => (
                                                        <tr key={ev.id} style={{background:!ev.is_active?'#fffde7':'inherit'}}>
                                                            <td>
                                                                <strong>{ev.event_name}</strong>
                                                                {ev.sankalpa&&<div style={{fontSize:'0.75rem',color:'#888',marginTop:'2px'}}>{ev.sankalpa}</div>}
                                                                {ev.meeting_url&&<a href={ev.meeting_url} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.72rem',color:'#8B0000',display:'block',marginTop:'2px'}}>🔗 Link</a>}
                                                            </td>
                                                            <td style={{fontSize:'0.82rem'}}>{ev.host_name}</td>
                                                            <td style={{fontSize:'0.82rem'}}>{ev.country}</td>
                                                            <td style={{fontSize:'0.78rem',whiteSpace:'nowrap'}}>{ev.event_datetime ? new Date(ev.event_datetime).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</td>
                                                            <td style={{fontSize:'0.82rem'}}>{ev.platform}</td>
                                                            <td><span style={{background:'#e8f4fd',color:'#0369a1',borderRadius:'10px',padding:'2px 8px',fontSize:'0.75rem',fontWeight:'600'}}>{ev.frequency}</span></td>
                                                            <td>{ev.meeting_url?<img src={getQRUrl(ev.meeting_url)} alt="QR" width={50} height={50} style={{borderRadius:'4px',border:'1px solid #e8c880'}}/>:<span style={{fontSize:'0.72rem',color:'#aaa'}}>—</span>}</td>
                                                            <td>{ev.is_active?<span className="badge badge-success">✅ Live</span>:<span className="badge badge-warning" style={{background:'#fff3cd',color:'#856404'}}>⏳ Pending</span>}</td>
                                                            <td><span style={{background:ev.status==='Live Now'?'#fff3e0':ev.status==='Completed'?'#f5f5f5':'#e8f5e9',color:ev.status==='Live Now'?'#e65100':ev.status==='Completed'?'#757575':'#2e7d32',borderRadius:'10px',padding:'2px 8px',fontSize:'0.75rem',fontWeight:'600'}}>{ev.status}</span></td>
                                                            <td>
                                                                <div className="action-buttons" style={{flexWrap:'wrap',gap:'4px'}}>
                                                                    {!ev.is_active&&<button className="btn btn-sm btn-primary" onClick={()=>handleApproveSatsang(ev)}>✅ Approve</button>}
                                                                    {!ev.is_active&&<button className="btn btn-sm btn-ghost" style={{color:'#ef4444'}} onClick={()=>handleRejectSatsang(ev)}>✕ Reject</button>}
                                                                    {ev.is_active&&<button className="btn btn-sm btn-ghost" onClick={()=>handleToggleSatsangStatus(ev)}>{ev.status==='Upcoming'?'Mark Done':'Mark Upcoming'}</button>}
                                                                    <button className="btn btn-sm btn-ghost" onClick={()=>openSatsangModal(ev)}>Edit</button>
                                                                    <button className="btn btn-sm btn-ghost" style={{color:'#ef4444'}} onClick={()=>handleDeleteSatsang(ev)}>Delete</button>
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

                            {activeTab==='moderators'&&<section className="admin-section"><div className="section-header"><h2>Moderator Accounts</h2><button className="btn btn-primary" onClick={()=>setShowModeratorModal(true)}>+ Add Moderator</button></div>{moderators.length===0?<div className="empty-state"><p>No moderators yet.</p></div>:<div className="table-container"><table className="table"><thead><tr><th>Name</th><th>Username</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>{moderators.map(m=><tr key={m.id}><td><strong>{m.name}</strong></td><td>{m.username}</td><td><span className={`badge badge-${m.is_active?'success':'error'}`}>{m.is_active?'Active':'Disabled'}</span></td><td>{formatDate(m.created_at)}</td><td><div className="action-buttons"><button className={`btn btn-sm ${m.is_active?'btn-secondary':'btn-primary'}`} onClick={()=>handleToggleModeratorStatus(m)}>{m.is_active?'Disable':'Enable'}</button><button className="btn btn-sm btn-ghost btn-danger" onClick={()=>handleDeleteModerator(m.id)}>Delete</button></div></td></tr>)}</tbody></table></div>}</section>}

                            {activeTab==='prayers'&&<section className="admin-section"><div className="section-header"><h2>Prayers & Books Management</h2></div><div style={{display:'grid',gridTemplateColumns:'1fr',gap:'2rem'}}><div><BookUpload onUploadSuccess={()=>{success('Uploaded!');loadData();}}/></div><div><h3>Prayers ({prayers.length})</h3><div className="table-container" style={{maxHeight:'400px',overflowY:'auto'}}><table className="table"><thead><tr><th>Name</th><th>Prayer</th><th>Status</th><th>Date</th><th>Action</th></tr></thead><tbody>{prayers.map(p=><tr key={p.id}><td>{p.privacy==='anonymous'?'Anonymous':p.name}</td><td style={{maxWidth:'300px'}}><div className="truncate-text" title={p.prayer_text}>{p.prayer_text}</div></td><td><span className={`badge badge-${p.status==='approved'?'success':p.status==='pending'?'warning':'error'}`}>{p.status}</span></td><td>{formatDate(p.created_at)}</td><td><button className="btn btn-sm btn-ghost btn-danger" onClick={()=>handleDeletePrayer(p.id)}>Delete</button></td></tr>)}</tbody></table></div></div><div><h3>Books ({books.length})</h3><div className="table-container" style={{maxHeight:'400px',overflowY:'auto'}}><table className="table"><thead><tr><th>Title</th><th>Info</th><th>Views</th><th>Action</th></tr></thead><tbody>{books.map(b=><tr key={b.id}><td><strong>{b.title}</strong><br/><Link to={`/books/${b.id}`} target="_blank" style={{color:'var(--primary)',fontSize:'0.82rem'}}>📖 Flipbook</Link></td><td>{b.month} {b.year} · {b.language}</td><td>{b.view_count}</td><td><div className="action-buttons"><a href={b.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-ghost">Download</a><button className="btn btn-sm btn-ghost" onClick={()=>{setEditingBook(b);setBookTitle(b.title);setShowBookEditModal(true);}}>Edit</button><button className="btn btn-sm btn-ghost btn-danger" onClick={()=>handleDeleteBook(b)}>Delete</button></div></td></tr>)}</tbody></table></div></div></div></section>}

                            {activeTab==='gallery'&&<section className="admin-section"><div className="section-header"><h2>Media Gallery Management</h2></div><div className="media-upload-grid"><div className="upload-section"><ImageUpload onUploadComplete={()=>success('Images uploaded!')}/></div><div className="upload-section"><AudioUpload onUploadComplete={()=>{success('Audio uploaded!');loadData();}}/></div></div><audio ref={audioRef} onEnded={()=>setCurrentlyPlaying(null)} style={{display:'none'}}/><div style={{marginTop:'2rem'}}><h3 style={{marginBottom:'1rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>🎵 Audio Files ({audioFiles.length}){currentlyPlaying&&<button onClick={handleStopAudio} style={{marginLeft:'1rem',background:'#ef4444',color:'white',border:'none',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'0.85rem'}}>⏹ Stop</button>}</h3>{audioFiles.length===0?<p style={{color:'#666',padding:'1rem',background:'#f9f9f9',borderRadius:'8px'}}>No audio files yet.</p>:<div style={{display:'grid',gap:'0.75rem'}}>{audioFiles.map(a=><div key={a.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'1rem',background:currentlyPlaying===a.id?'linear-gradient(135deg,#fff3e0,#fff9f0)':'#fff',border:currentlyPlaying===a.id?'2px solid #FF9933':'1px solid #e0e0e0',borderRadius:'8px',borderLeft:a.isNamaJapa?'4px solid #FF9933':'4px solid #4CAF50'}}><div style={{display:'flex',alignItems:'center',gap:'1rem'}}><button onClick={()=>handlePlayAudio(a)} style={{width:'48px',height:'48px',borderRadius:'50%',border:'none',background:currentlyPlaying===a.id?'linear-gradient(135deg,#FF9933,#FF6600)':'linear-gradient(135deg,#4CAF50,#45a049)',color:'white',cursor:'pointer',fontSize:'1.2rem'}}>{currentlyPlaying===a.id?'⏸️':'▶️'}</button><div><div style={{fontWeight:'bold'}}>{a.title}{currentlyPlaying===a.id&&<span style={{color:'#FF9933',fontSize:'0.85rem',marginLeft:'8px'}}>🔊</span>}</div><div style={{fontSize:'0.8rem',color:'#666'}}><span style={{padding:'2px 8px',borderRadius:'12px',background:a.isNamaJapa?'rgba(255,153,51,0.15)':'rgba(76,175,80,0.15)',color:a.isNamaJapa?'#FF6600':'#2E7D32',marginRight:'8px'}}>{a.isNamaJapa?'🔁 Nama Japa':'▶️ Normal'}</span>{a.size&&`${(a.size/1024/1024).toFixed(2)} MB`}</div></div></div><button onClick={()=>handleDeleteAudio(a.id,a.title)} style={{background:'#ff4444',color:'white',border:'none',padding:'0.5rem 1rem',borderRadius:'6px',cursor:'pointer'}}>🗑 Delete</button></div>)}</div>}</div></section>}
                        </>
                    )}
                </div>
            </main>

            {showAccountModal&&<div className="modal-overlay" onClick={()=>setShowAccountModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h3 className="modal-title">{editingAccount?'Edit':'Add'} Account</h3><button className="modal-close" onClick={()=>setShowAccountModal(false)}>✕</button></div><div className="modal-body"><div className="form-group"><label className="form-label">Account Name</label><input type="text" value={accountName} onChange={e=>setAccountName(e.target.value)} className="form-input" autoFocus/></div></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setShowAccountModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSaveAccount}>{editingAccount?'Update':'Create'}</button></div></div></div>}
            {showModeratorModal&&<div className="modal-overlay" onClick={()=>setShowModeratorModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h3 className="modal-title">Create Moderator</h3><button className="modal-close" onClick={()=>setShowModeratorModal(false)}>✕</button></div><div className="modal-body"><div className="form-group"><label className="form-label">Full Name</label><input type="text" value={moderatorName} onChange={e=>setModeratorName(e.target.value)} className="form-input" autoFocus/></div><div className="form-group"><label className="form-label">Username</label><input type="text" value={moderatorUsername} onChange={e=>setModeratorUsername(e.target.value)} className="form-input"/></div><div className="form-group"><label className="form-label">Password</label><div className="password-input-wrapper"><input type={showPassword?'text':'password'} value={moderatorPassword} onChange={e=>setModeratorPassword(e.target.value)} className="form-input"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(!showPassword)}>{showPassword?'🙈':'👁'}</button></div></div></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setShowModeratorModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateModerator}>Create</button></div></div></div>}
            {showBankAllocationModal&&selectedUserForAllocation&&<div className="modal-overlay" onClick={()=>setShowBankAllocationModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h3 className="modal-title">Allocate Banks to {selectedUserForAllocation.name}</h3><button className="modal-close" onClick={()=>setShowBankAllocationModal(false)}>✕</button></div><div className="modal-body"><p className="modal-description">Select Sankalpas:</p><div className="checkbox-group">{accounts.filter(a=>a.is_active).map(a=><label key={a.id} className="checkbox-item"><input type="checkbox" checked={selectedBanksForAllocation.includes(a.id)} onChange={()=>toggleBankSelection(a.id)} disabled={userCurrentBanks.includes(a.id)}/><span>{a.name}{userCurrentBanks.includes(a.id)&&<small className="already-linked"> (Linked)</small>}</span></label>)}</div></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setShowBankAllocationModal(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSaveBankAllocation}>Allocate</button></div></div></div>}
            {showBulkUploadModal&&<div className="modal-overlay" onClick={()=>setShowBulkUploadModal(false)}><div className="modal modal-lg" onClick={e=>e.stopPropagation()}><ExcelUpload onUpload={handleBulkUpload} onClose={()=>setShowBulkUploadModal(false)} accounts={accounts}/></div></div>}
            {showBookEditModal&&<div className="modal-overlay" onClick={()=>setShowBookEditModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-header"><h3 className="modal-title">Edit Book Title</h3><button className="modal-close" onClick={()=>setShowBookEditModal(false)}>✕</button></div><div className="modal-body"><div className="form-group"><label className="form-label">Title</label><input type="text" value={bookTitle} onChange={e=>setBookTitle(e.target.value)} className="form-input" autoFocus/></div></div><div className="modal-footer"><button className="btn btn-ghost" onClick={()=>setShowBookEditModal(false)}>Cancel</button><button className="btn btn-primary" onClick={async()=>{if(!bookTitle.trim())return;try{await updateBook(editingBook.id,{title:bookTitle});success('Updated!');setShowBookEditModal(false);loadData();}catch{error('Failed');}}}>Save</button></div></div></div>}

            {/* Satsang Modal */}
            {showSatsangModal && (
                <div className="modal-overlay" onClick={() => setShowSatsangModal(false)}>
                    <div className="modal" style={{maxWidth:'640px',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingSatsang ? 'Edit Satsang Event' : 'Add Satsang Event'}</h3>
                            <button className="modal-close" onClick={() => setShowSatsangModal(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem'}}>
                                <div className="form-group">
                                    <label className="form-label">Event Name *</label>
                                    <input type="text" value={satsangForm.event_name} onChange={e=>setSatsangForm(p=>({...p,event_name:e.target.value}))} className="form-input" placeholder="e.g. Bhagwan Nama Japam"/>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Host Name *</label>
                                    <input type="text" value={satsangForm.host_name} onChange={e=>setSatsangForm(p=>({...p,host_name:e.target.value}))} className="form-input" placeholder="e.g. Mr. Natarajan"/>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Country</label>
                                    <select value={satsangForm.country} onChange={e=>setSatsangForm(p=>({...p,country:e.target.value}))} className="form-input">
                                        {SATSANG_COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Platform</label>
                                    <select value={satsangForm.platform} onChange={e=>setSatsangForm(p=>({...p,platform:e.target.value}))} className="form-input">
                                        {SATSANG_PLATFORMS.map(p=><option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date & Time (IST)</label>
                                    <input type="datetime-local" value={satsangForm.event_datetime} onChange={e=>setSatsangForm(p=>({...p,event_datetime:e.target.value}))} className="form-input"/>
                                    <small style={{color:'#999',fontSize:'0.72rem'}}>GMT & EST auto-shown on public page</small>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Frequency</label>
                                    <select value={satsangForm.frequency} onChange={e=>setSatsangForm(p=>({...p,frequency:e.target.value}))} className="form-input">
                                        {SATSANG_FREQUENCIES.map(f=><option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{gridColumn:'span 2'}}>
                                    <label className="form-label">Meeting URL <span style={{color:'#aaa',fontWeight:400,fontSize:'0.78rem'}}>— leave blank if dynamic</span></label>
                                    <input type="url" value={satsangForm.meeting_url} onChange={e=>setSatsangForm(p=>({...p,meeting_url:e.target.value}))} className="form-input" placeholder="https://zoom.us/... or https://meet.google.com/..."/>
                                </div>

                                {/* Live QR Preview */}
                                {satsangForm.meeting_url && satsangForm.meeting_url.startsWith('http') && (
                                    <div style={{gridColumn:'span 2',background:'#fff9f0',border:'1px solid #e8c880',borderRadius:'10px',padding:'14px',display:'flex',alignItems:'center',gap:'16px'}}>
                                        <img src={getQRUrl(satsangForm.meeting_url)} alt="QR Preview" width={90} height={90} style={{borderRadius:'8px',border:'2px solid #e8c880'}}/>
                                        <div>
                                            <p style={{margin:'0 0 4px',fontWeight:'600',color:'#5a3a1a',fontSize:'0.85rem'}}>📱 QR Preview — auto-generated from meeting URL</p>
                                            <p style={{margin:'0',fontSize:'0.75rem',color:'#888'}}>This exact QR appears on the public Satsang page.<br/>Devotees scan to join directly.</p>
                                            <a href={satsangForm.meeting_url} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.75rem',color:'#8B0000',display:'block',marginTop:'6px'}}>Test link ↗</a>
                                        </div>
                                    </div>
                                )}

                                <div className="form-group" style={{gridColumn:'span 2'}}>
                                    <label className="form-label">Sankalpa / Purpose <span style={{color:'#aaa',fontWeight:400,fontSize:'0.78rem'}}>optional</span></label>
                                    <input type="text" value={satsangForm.sankalpa} onChange={e=>setSatsangForm(p=>({...p,sankalpa:e.target.value}))} className="form-input" placeholder="e.g. World Peace, Bhagwan's UK Abode..."/>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select value={satsangForm.status} onChange={e=>setSatsangForm(p=>({...p,status:e.target.value}))} className="form-input">
                                        {SATSANG_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'1.5rem'}}>
                                    <input type="checkbox" id="isActiveSatsang" checked={satsangForm.is_active} onChange={e=>setSatsangForm(p=>({...p,is_active:e.target.checked}))}/>
                                    <label htmlFor="isActiveSatsang" className="form-label" style={{margin:0}}>Publish immediately</label>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowSatsangModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveSatsang}>{editingSatsang ? 'Update Event' : 'Create Event'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboardPage;
