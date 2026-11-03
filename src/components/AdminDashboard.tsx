import React, { useState, useEffect } from 'react';
import { 
  Users, 
  QrCode, 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Building2, 
  MapPin, 
  BarChart3, 
  ShieldAlert, 
  LogOut, 
  RefreshCw, 
  Eye, 
  XCircle, 
  Layers, 
  Printer,
  Sparkles,
  Plus,
  Bell,
  Mail,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Activity,
  Check,
  ShieldCheck,
  Settings,
  ArrowLeft,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { Participant, DashboardStats, RegistrationStatus, TechnologyTopic, InterestSegment } from '../types.ts';
import { exportParticipantsToExcel, exportParticipantsToCsv, exportParticipantsToPdfReport } from '../utils/exportUtils.ts';
import { ticketPageUrl } from '../utils/ticketGenerator.ts';
import { useBrand } from '../brand.ts';
import { BrandSettings } from './BrandSettings.tsx';
import { RegistrationQrCard } from './RegistrationQrCard.tsx';

interface AdminDashboardProps {
  onOpenBadge: (p: Participant) => void;
  onExit: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onOpenBadge, onExit }) => {
  // Auth state
  const brand = useBrand();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('estrada2026');
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'checkin' | 'topics' | 'segmentation' | 'audit' | 'settings'>('overview');

  // Stats & Data
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [topics, setTopics] = useState<TechnologyTopic[]>([]);
  const [adminTopics, setAdminTopics] = useState<TechnologyTopic[]>([]);
  const [segments, setSegments] = useState<InterestSegment[]>([]);
  const [auditLogs, setAuditLogs] = useState<DashboardStats['recent_audits']>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterTopic, setFilterTopic] = useState('ALL');

  // Selected participant for detail, edit, delete
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isViewingDetail, setIsViewingDetail] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Participant | null>(null);

  // Master Topic Modals
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<TechnologyTopic | null>(null);
  const [topicDeleteCandidate, setTopicDeleteCandidate] = useState<TechnologyTopic | null>(null);

  // Master Segment Modals
  const [segmentModalOpen, setSegmentModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<InterestSegment | null>(null);
  const [segmentDeleteCandidate, setSegmentDeleteCandidate] = useState<InterestSegment | null>(null);

  // QR Code Check-in scanner state
  const [scannerInput, setScannerInput] = useState('');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    alreadyAttended?: boolean;
    message: string;
    participant?: any;
  } | null>(null);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);

  // Check saved session
  useEffect(() => {
    const savedToken = localStorage.getItem('estrada_admin_token');
    const savedUser = localStorage.getItem('estrada_admin_user');
    if (savedToken && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  // Fetch topics list
  const loadAdminTopics = async () => {
    try {
      const res = await fetch('/api/admin/topics');
      const d = await res.json();
      if (d.success && Array.isArray(d.topics)) {
        setAdminTopics(d.topics);
        setTopics(d.topics);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch segments list
  const loadSegments = async () => {
    try {
      const res = await fetch('/api/admin/segments');
      const d = await res.json();
      if (d.success && Array.isArray(d.segments)) {
        setSegments(d.segments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAdminTopics();
    loadSegments();
  }, []);

  // Fetch Stats
  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Participants
  const loadParticipants = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.set('search', searchTerm);
      if (filterRole !== 'ALL') queryParams.set('role', filterRole);
      if (filterCity !== 'ALL') queryParams.set('city', filterCity);
      if (filterStatus !== 'ALL') queryParams.set('status', filterStatus);
      if (filterTopic !== 'ALL') queryParams.set('topic', filterTopic);

      const res = await fetch(`/api/admin/participants?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setParticipants(data.participants);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) setAuditLogs(data.logs);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
      loadParticipants();
      loadAdminTopics();
      loadSegments();
      loadAuditLogs();
    }
  }, [isAuthenticated, filterRole, filterCity, filterStatus, filterTopic]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      loadParticipants();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAuthError(data.error || 'Login gagal.');
        return;
      }
      localStorage.setItem('estrada_admin_token', data.token);
      localStorage.setItem('estrada_admin_user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError('Tidak dapat menghubungi server.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('estrada_admin_token');
    localStorage.removeItem('estrada_admin_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleUpdateStatus = async (id: number, newStatus: RegistrationStatus) => {
    try {
      const res = await fetch(`/api/admin/participants/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, operator_name: currentUser?.full_name || 'Admin' })
      });
      const data = await res.json();
      if (data.success) {
        loadParticipants();
        loadStats();
        loadSegments();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteParticipant = async () => {
    if (!deleteCandidate) return;
    try {
      const res = await fetch(`/api/admin/participants/${deleteCandidate.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setDeleteCandidate(null);
        loadParticipants();
        loadStats();
        loadSegments();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTopic = async () => {
    if (!topicDeleteCandidate || !topicDeleteCandidate.id) return;
    try {
      const res = await fetch(`/api/admin/topics/${topicDeleteCandidate.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setTopicDeleteCandidate(null);
        loadAdminTopics();
        loadStats();
        loadSegments();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSegment = async () => {
    if (!segmentDeleteCandidate || !segmentDeleteCandidate.id) return;
    try {
      const res = await fetch(`/api/admin/segments/${segmentDeleteCandidate.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSegmentDeleteCandidate(null);
        loadSegments();
        loadAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const executeCheckIn = async (codeToScan: string) => {
    if (!codeToScan.trim() || scanProcessing) return;
    setScanProcessing(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/admin/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToScan.trim(),
          operator_name: currentUser?.full_name || 'Check-in Desk'
        })
      });
      const data = await res.json();
      setScanResult({
        success: data.success,
        alreadyAttended: data.already_attended,
        message: data.message || data.error,
        participant: data.participant
      });

      if (data.success && data.participant) {
        setRecentCheckIns(prev => [data.participant, ...prev.slice(0, 9)]);
        loadStats();
        loadParticipants();
        loadAuditLogs();
      }
    } catch (err) {
      setScanResult({
        success: false,
        message: 'Gagal memproses check-in.'
      });
    } finally {
      setScanProcessing(false);
      setScannerInput('');
    }
  };

  const handleExportExcel = () => {
    exportParticipantsToExcel(participants, `ESTRADA_Peserta.xlsx`);
  };

  const handleExportCsv = () => {
    exportParticipantsToCsv(participants, `ESTRADA_Peserta.csv`);
  };

  const handleExportPdf = () => {
    exportParticipantsToPdfReport(participants, `${filterRole} - ${filterCity}`);
  };

  // Login View styled in purple canvas
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#221940] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6 border border-purple-900/20">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#4A3B73] text-white flex items-center justify-center font-black text-xl mx-auto shadow-md">
              E
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Estrada 2026</h2>
            <p className="text-xs text-slate-500">Sistem Manajemen Registrasi & Check-In Eksekutif</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {authError}
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Username</label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={e => setAdminUsername(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#4A3B73]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#4A3B73]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#4A3B73] hover:bg-[#3D2E62] text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.99]"
            >
              Masuk ke Console
            </button>

            <button
              type="button"
              onClick={onExit}
              className="w-full text-xs text-slate-500 hover:text-slate-800 text-center block pt-2 font-medium"
            >
              Kembali ke Halaman Publik
            </button>
          </form>
        </div>
      </div>
    );
  }

  const dirCount = stats?.roles.find(r => r.role_position.includes('Direktur'))?.count || 0;
  const telkomCount = stats?.roles.find(r => r.role_position.includes('Mitra'))?.count || 0;
  const narsumCount = stats?.roles.find(r => r.role_position.includes('Narasumber'))?.count || 0;
  const hadirCount = stats?.statuses.find(s => s.status === 'Hadir')?.count || 0;

  interface MenuItem {
    id: 'overview' | 'participants' | 'checkin' | 'topics' | 'segmentation' | 'audit' | 'settings';
    label: string;
    icon: any;
    badge?: number;
  }

  const menuItems: MenuItem[] = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
    { id: 'participants', label: 'Peserta', icon: Users, badge: participants.length },
    { id: 'checkin', label: 'Check-In QR', icon: QrCode },
    { id: 'topics', label: 'Master Topik', icon: Sparkles, badge: adminTopics.length },
    { id: 'segmentation', label: 'Segmentasi Minat', icon: Layers, badge: segments.length },
    { id: 'audit', label: 'Audit Log', icon: Clock },
    { id: 'settings', label: 'Pengaturan', icon: Settings }
  ];

  return (
    <div className="bg-[#20183F] min-h-screen p-2 sm:p-5 flex items-center justify-center font-sans">
      {/* MAIN APPLICATION WINDOW WITH ROUNDED-3XL BORDER (AS IN MOCKUP) */}
      <div className="w-full max-w-[1540px] bg-[#F4F5FA] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-purple-900/30 min-h-[92vh]">
        
        {/* LEFT SIDEBAR NAVIGATION (PURPLE BACKDROP WITH ACTIVE SEAMLESS PILL & BOTANICAL ILLUSTRATION) */}
        <aside className="w-full md:w-64 bg-[#4A3B73] text-white flex flex-col justify-between shrink-0 relative overflow-hidden">
          {/* Top Branding Section */}
          <div className="relative z-10 p-5 space-y-6">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-full bg-white text-[#4A3B73] overflow-hidden flex items-center justify-center font-black text-xl mx-auto shadow-lg">
                {brand.icon_url ? (
                  <img src={brand.icon_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="tracking-tighter">E</span>
                )}
              </div>
              <h2 className="text-base font-extrabold text-white tracking-wide mt-3">ESTRADA</h2>
              <p className="text-[10px] text-purple-200/80 font-medium uppercase tracking-widest">Healthcare 2026</p>
            </div>

            {/* Navigation Menu */}
            <nav className="space-y-1.5 pt-2">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between py-3 px-4 text-xs font-bold transition-all relative ${
                      isActive
                        ? 'bg-[#F4F5FA] text-[#4A3B73] rounded-l-2xl shadow-sm -mr-5 pr-9 font-extrabold'
                        : 'text-purple-200 hover:text-white hover:bg-white/10 rounded-xl'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#4A3B73]' : 'text-purple-300'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-[#4A3B73] text-white' : 'bg-purple-900/60 text-purple-200'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Area with Stylized Botanical Leaf Illustration */}
          <div className="relative z-10 p-4 pt-16">
            {/* Action Bar */}
            <div className="bg-purple-950/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-2 relative z-20">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.full_name || 'Admin Desk'}</p>
                  <p className="text-[10px] text-purple-200/70 uppercase">Administrator</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Keluar"
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-500 text-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-white/10 flex gap-2">
                <button
                  onClick={() => { loadStats(); loadParticipants(); loadAdminTopics(); loadSegments(); }}
                  className="flex-1 py-1.5 px-2 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync</span>
                </button>
                <button
                  onClick={onExit}
                  className="py-1.5 px-3 bg-white/15 hover:bg-white/25 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center transition-colors"
                  title="Kembali ke Web Publik"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Botanical Tropical Leaf Vector Illustration (Exactly like in the reference mockup) */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden h-48 select-none">
            <svg viewBox="0 0 240 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
              {/* Soft purple gradient backing */}
              <circle cx="120" cy="180" r="110" fill="#382C5E" />
              {/* Teal monstera / palm leaf */}
              <path d="M-30,180 C0,90 60,80 110,120 C130,140 135,180 135,180 Z" fill="#2DD4BF" opacity="0.35" />
              {/* Sky blue secondary leaf */}
              <path d="M30,180 C70,100 130,95 180,135 C190,145 190,180 190,180 Z" fill="#38BDF8" opacity="0.4" />
              {/* Lavender accent leaf */}
              <path d="M120,180 C150,110 200,105 240,140 C250,150 250,180 250,180 Z" fill="#C084FC" opacity="0.25" />
              {/* Crisp front leaf */}
              <path d="M0,180 C25,125 70,115 95,145 C105,160 105,180 105,180 Z" fill="#5EEAD4" opacity="0.65" />
              <path d="M15,180 Q60,130 95,145" stroke="#0F766E" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            </svg>
          </div>
        </aside>

        {/* RIGHT MAIN VIEW AREA */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto">
          {/* FLOATING TOP BAR HEADER (MATCHING MOCKUP) */}
          <header className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-base sm:text-lg font-black text-[#2D234C] tracking-tight">
                  Welcome to Estrada
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  {activeTab === 'overview' && 'Dashboard Eksekutif & Statistik Terkini'}
                  {activeTab === 'participants' && 'Manajemen Data & Registrasi Peserta'}
                  {activeTab === 'checkin' && 'Pemindaian Barcode & Check-in Delegasi'}
                  {activeTab === 'topics' && 'Konfigurasi Master Topik Pilihan'}
                  {activeTab === 'segmentation' && 'Konfigurasi Master Segmentasi Minat'}
                  {activeTab === 'audit' && 'Log Audit Aktivitas Sistem'}
                  {activeTab === 'settings' && 'Ganti ikon dan gambar acara'}
                </p>
              </div>
            </div>

            {/* Rounded Pill Search Bar with Deep Purple Button */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  if (activeTab !== 'participants' && e.target.value) {
                    setActiveTab('participants');
                  }
                }}
                placeholder="Search..."
                className="w-full bg-[#F4F5FA] border border-slate-200/80 rounded-full py-2 pl-4 pr-11 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4A3B73] transition-colors"
              />
              <button
                onClick={() => {
                  if (activeTab !== 'participants') setActiveTab('participants');
                }}
                className="absolute right-1 top-1 w-7 h-7 rounded-full bg-[#4A3B73] text-white flex items-center justify-center hover:bg-[#3D2E62] transition-colors shadow-xs"
                title="Cari"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Header Right Action Icons */}
            <div className="flex items-center gap-3 self-end md:self-auto">
              <div 
                onClick={() => setActiveTab('checkin')}
                className="relative p-2 rounded-full bg-[#F4F5FA] hover:bg-slate-200/70 text-slate-600 cursor-pointer transition-colors"
                title="Notifikasi Check-in"
              >
                <Bell className="w-4 h-4 text-[#4A3B73]" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              </div>

              <div 
                onClick={() => { loadStats(); loadParticipants(); loadAdminTopics(); loadSegments(); }}
                className="relative p-2 rounded-full bg-[#F4F5FA] hover:bg-slate-200/70 text-slate-600 cursor-pointer transition-colors"
                title="Sinkronisasi Data"
              >
                <RefreshCw className="w-4 h-4 text-[#4A3B73]" />
              </div>

              {/* User Avatar Circle */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#4A3B73] to-purple-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {currentUser?.full_name?.charAt(0) || 'A'}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser?.full_name || 'Administrator'}
                  </p>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* 4 TOP STAT CARDS (IDENTICAL LAYOUT & BORDER COLORING AS IN MOCKUP) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Peserta (Coral/Rose Accent) */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 border-l-[5px] border-l-rose-400 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Peserta</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats?.total_participants || 0}
                </span>
              </div>
            </div>

            {/* Card 2: Sudah Check-In (Deep Purple Accent) */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 border-l-[5px] border-l-[#4A3B73] flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#4A3B73] flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Sudah Check-In</span>
                <span className="text-2xl font-black text-[#4A3B73] tracking-tight">
                  {hadirCount}
                </span>
              </div>
            </div>

            {/* Card 3: Direktur RS (Amber/Yellow Accent) */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 border-l-[5px] border-l-amber-400 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Direktur RS</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {dirCount}
                </span>
              </div>
            </div>

            {/* Card 4: Instansi Faskes (Emerald Green Accent) */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/70 border-l-[5px] border-l-emerald-500 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Instansi Faskes</span>
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats?.total_institutions || 0}
                </span>
              </div>
            </div>
          </section>

          {/* TAB 1: OVERVIEW (DASHBOARD GRID EXACTLY AS MOCKUP) */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEFT COLUMN: CALENDAR & ATTENDANCE + ACTIVITIES NOTIFICATION (~5/12 or 5.5/12) */}
              <div className="lg:col-span-5 space-y-6">

                <RegistrationQrCard />
                
                {/* CARD 1: CALENDAR & ATTENDANCE */}
                <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/70 space-y-4">
                  {/* Calendar Header with Coral Left Button & Date Title */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                      Calendar & Attendance
                    </h3>
                    <div className="flex items-center gap-2">
                      <button 
                        className="w-6 h-6 rounded-full bg-rose-400 text-white flex items-center justify-center hover:bg-rose-500 shadow-xs transition-colors"
                        title="Bulan Sebelumnya"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-extrabold text-slate-800">
                        15 November, 2026
                      </span>
                      <button 
                        className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 shadow-xs transition-colors"
                        title="Bulan Berikutnya"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Day Names Row */}
                  <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 pt-1">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>

                  {/* Real November 2026 Date Grid (Nov 1, 2026 is Sunday) */}
                  {(() => {
                    // Extract real registration days from participants
                    const participantDays = new Map<number, number>();
                    participants.forEach(p => {
                      if (p.created_at) {
                        const d = new Date(p.created_at);
                        const day = d.getDate();
                        participantDays.set(day, (participantDays.get(day) || 0) + 1);
                      }
                    });

                    // 30 days of November 2026
                    const days = Array.from({ length: 30 }, (_, i) => i + 1);

                    return (
                      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-semibold text-slate-600">
                        {days.map(day => {
                          const isEventDay = day === 15;
                          const regCount = participantDays.get(day) || 0;
                          const hasRegs = regCount > 0;

                          if (isEventDay) {
                            return (
                              <div key={day} className="flex items-center justify-center">
                                <span 
                                  className="w-7 h-7 rounded-full bg-amber-400 text-slate-900 font-black flex items-center justify-center text-xs shadow-md ring-2 ring-amber-200 cursor-pointer"
                                  title="15 Nov 2026: Hari H KTT Estrada di JCC Senayan"
                                >
                                  15
                                </span>
                              </div>
                            );
                          }

                          if (hasRegs) {
                            return (
                              <div key={day} className="flex items-center justify-center">
                                <span 
                                  className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs cursor-pointer hover:bg-emerald-600 transition-colors"
                                  title={`${regCount} Peserta terdaftar pada tanggal ${day}`}
                                >
                                  {String(day).padStart(2, '0')}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <span key={day} className="py-1 text-slate-600 hover:text-slate-900">
                              {String(day).padStart(2, '0')}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Event Sub-note with Real Statistics */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>15 Nov 2026: Grand Ballroom JCC Senayan</span>
                    </div>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {hadirCount} Hadir ({stats?.total_participants ? Math.round((hadirCount / stats.total_participants) * 100) : 0}%)
                    </span>
                  </div>
                </div>

                {/* CARD 2: ACTIVITIES NOTIFICATION (REAL PARTICIPANTS FEED) */}
                <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                        Activities Notification
                      </h3>
                      <p className="text-[10px] text-slate-400">Pendaftaran terbaru dari sistem</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('participants')}
                      className="px-3 py-1 rounded-full border border-emerald-500 text-emerald-600 hover:bg-emerald-50 text-[11px] font-bold transition-colors"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {participants.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Belum ada aktivitas pendaftaran peserta.</p>
                    ) : (
                      participants.slice(0, 3).map((p, idx) => (
                        <div key={p.id || idx} className="space-y-1 pb-3 border-b border-slate-100 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-900 truncate pr-2" title={p.institution_name}>
                              {p.institution_name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {new Date(p.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            <TicketLink person={p} className="font-bold text-slate-800 hover:underline">{p.full_name}</TicketLink> ({p.role_position.includes('Direktur') ? 'Direktur RS' : p.role_position.includes('Mitra') ? 'Mitra Telkom' : 'Narasumber'}) terdaftar resmi dengan kode <TicketLink person={p} className="font-mono font-bold text-[#4A3B73] hover:underline">{p.reg_number}</TicketLink>.
                          </p>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              p.status === 'Hadir' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              Status: {p.status}
                            </span>
                            <button
                              onClick={() => onOpenBadge(p)}
                              className="text-[10px] text-sky-700 hover:text-sky-900 font-bold hover:underline"
                            >
                              Lihat QR Badge →
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN: PERFORMANCE + TOP SCORER + FEES STRUCTURE (~7/12) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* CARD 1: PERFORMANCE CHART (TOPIC DISTRIBUTION BAR CHART - 100% REAL DATA) */}
                {(() => {
                  const totalP = stats?.total_participants || 1;
                  const realTopics = (stats?.topics && stats.topics.length > 0)
                    ? stats.topics.slice(0, 3)
                    : [];

                  const topicColorThemes = [
                    {
                      barGradient: 'from-[#45346A] to-[#675296]',
                      slantColor: 'bg-[#7661A6]',
                      textColor: 'text-[#513F7B]',
                      dotColor: 'bg-[#513F7B]'
                    },
                    {
                      barGradient: 'from-amber-500 to-amber-300',
                      slantColor: 'bg-amber-200',
                      textColor: 'text-amber-500',
                      dotColor: 'bg-amber-400'
                    },
                    {
                      barGradient: 'from-emerald-600 to-emerald-400',
                      slantColor: 'bg-emerald-300',
                      textColor: 'text-emerald-600',
                      dotColor: 'bg-emerald-500'
                    }
                  ];

                  return (
                    <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/70 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                            School Performance (Topik Teknologi)
                          </h3>
                          <p className="text-[10px] text-slate-400">Distribusi peminatan modul teknologi kesehatan (Data Real Database)</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">All the data in percentage (%)</span>
                      </div>

                      {/* Chart Content Area */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2">
                        {/* Legend with Real Topics */}
                        <div className="sm:col-span-5 space-y-3">
                          {realTopics.length === 0 ? (
                            <p className="text-xs text-slate-400">Belum ada topik yang dipilih.</p>
                          ) : (
                            realTopics.map((t, idx) => {
                              const theme = topicColorThemes[idx % topicColorThemes.length];
                              const pct = Math.round((t.participant_count / totalP) * 100);
                              return (
                                <div key={t.code} className="flex items-center gap-2 text-xs">
                                  <span className={`w-3 h-3 rounded-full ${theme.dotColor} shrink-0`} />
                                  <div className="truncate">
                                    <p className="font-bold text-slate-800 leading-tight truncate" title={t.title}>
                                      [{t.code}] {t.title}
                                    </p>
                                    <span className="text-[10px] text-slate-500">
                                      {t.category} · <strong className="text-slate-700">{t.participant_count} Peserta ({pct}%)</strong>
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Stylized 3D Column Bars with Dedicated Y-Axis */}
                        <div className="sm:col-span-7 flex items-end h-44 border-b border-l border-slate-100 pl-2 pb-2">
                          {/* Dedicated Y-Axis Labels (Separated to eliminate text overlap) */}
                          <div className="flex flex-col justify-between h-full text-[9px] font-mono text-slate-400 pr-3 pb-6 select-none text-right shrink-0">
                            <span>100%</span>
                            <span>75%</span>
                            <span>50%</span>
                            <span>25%</span>
                            <span>0%</span>
                          </div>

                          {/* Bars container */}
                          <div className="flex-1 flex items-end justify-around h-full">
                            {realTopics.length === 0 ? (
                              <p className="text-xs text-slate-400 self-center">Tidak ada data topik.</p>
                            ) : (
                              realTopics.map((t, idx) => {
                                const theme = topicColorThemes[idx % topicColorThemes.length];
                                const pct = Math.round((t.participant_count / totalP) * 100);
                                const barHeightPx = Math.max(Math.round((pct / 100) * 115), 18);

                                return (
                                  <div key={t.code} className="flex flex-col items-center gap-1 group">
                                    <span className={`text-[10px] font-extrabold ${theme.textColor} tabular-nums`}>
                                      {pct}%
                                    </span>
                                    <div 
                                      className={`w-10 sm:w-12 bg-gradient-to-t ${theme.barGradient} rounded-t-lg shadow-md transition-all group-hover:brightness-110 relative`}
                                      style={{ height: `${barHeightPx}px` }}
                                    >
                                      <div className={`absolute -top-1.5 left-0 right-0 h-2 ${theme.slantColor} rounded-t-md opacity-90 transform -skew-x-12`} />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 mt-1 uppercase" title={t.title}>
                                      [{t.code}] {t.category ? t.category.slice(0, 7) : t.title.slice(0, 7)}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 2: TOP SCORER STYLE 3 DELEGASI CARDS (REAL DATA DARI DATABASE) */}
                {(() => {
                  const totalP = stats?.total_participants || 1;
                  const sortedRoles = [...(stats?.roles || [])].sort((a, b) => b.count - a.count);

                  // Guaranteed 3 ranks
                  const role1 = sortedRoles[0] || { role_position: 'Direktur / Wakil Manajemen Rumah Sakit', count: dirCount };
                  const role2 = sortedRoles[1] || { role_position: 'Mitra Telkom', count: telkomCount };
                  const role3 = sortedRoles[2] || { role_position: 'Narasumber', count: narsumCount };

                  const p1 = Math.round((role1.count / totalP) * 100);
                  const p2 = Math.round((role2.count / totalP) * 100);
                  const p3 = Math.round((role3.count / totalP) * 100);

                  const formatRoleTitle = (r: string) => {
                    if (r.includes('Direktur')) return 'Direktur RS';
                    if (r.includes('Mitra')) return 'Mitra Telkom';
                    if (r.includes('Narasumber')) return 'Narasumber';
                    return r.slice(0, 16);
                  };

                  return (
                    <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/70 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                            Top Scorer (Komposisi Delegasi Terbanyak)
                          </h3>
                          <p className="text-[10px] text-slate-400">Peringkat kategori peserta berdasarkan database aktual</p>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg px-2 py-0.5">
                          <span>Estrada 2026</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* 1st Card: Emerald Green Card */}
                        <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 text-white rounded-2xl p-4 text-center shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden">
                          <div className="space-y-1">
                            <div className="w-10 h-10 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold mx-auto shadow-sm">
                              <Award className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-extrabold text-white mt-1">{formatRoleTitle(role1.role_position)}</h4>
                            <p className="text-[10px] text-emerald-100 font-medium">Peringkat 1 Terbanyak</p>
                          </div>

                          <div>
                            <span className="text-2xl font-black tracking-tight text-white block tabular-nums">
                              {p1}%
                            </span>
                            <span className="text-[10px] text-emerald-100 font-bold">{role1.count} Delegasi</span>
                          </div>

                          <div className="pt-2">
                            <span className="inline-block px-4 py-1 rounded-full bg-white/20 text-white font-extrabold text-[11px]">
                              1st Rank
                            </span>
                          </div>
                        </div>

                        {/* 2nd Card: Deep Purple Card */}
                        <div className="bg-gradient-to-b from-[#513F7B] to-[#3F2F64] text-white rounded-2xl p-4 text-center shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden">
                          <div className="space-y-1">
                            <div className="w-10 h-10 rounded-full bg-white text-[#513F7B] flex items-center justify-center font-bold mx-auto shadow-sm">
                              <Users className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-extrabold text-white mt-1">{formatRoleTitle(role2.role_position)}</h4>
                            <p className="text-[10px] text-purple-200 font-medium">Peringkat 2 Terbanyak</p>
                          </div>

                          <div>
                            <span className="text-2xl font-black tracking-tight text-white block tabular-nums">
                              {p2}%
                            </span>
                            <span className="text-[10px] text-purple-200 font-bold">{role2.count} Delegasi</span>
                          </div>

                          <div className="pt-2">
                            <span className="inline-block px-4 py-1 rounded-full bg-white/20 text-white font-extrabold text-[11px]">
                              2nd Rank
                            </span>
                          </div>
                        </div>

                        {/* 3rd Card: Amber / Yellow Card */}
                        <div className="bg-gradient-to-b from-amber-400 to-amber-500 text-slate-900 rounded-2xl p-4 text-center shadow-md flex flex-col justify-between space-y-3 relative overflow-hidden">
                          <div className="space-y-1">
                            <div className="w-10 h-10 rounded-full bg-white text-amber-600 flex items-center justify-center font-bold mx-auto shadow-sm">
                              <Sparkles className="w-5 h-5" />
                            </div>
                            <h4 className="text-xs font-extrabold text-slate-900 mt-1">{formatRoleTitle(role3.role_position)}</h4>
                            <p className="text-[10px] text-amber-900 font-semibold">Peringkat 3 Terbanyak</p>
                          </div>

                          <div>
                            <span className="text-2xl font-black tracking-tight text-slate-900 block tabular-nums">
                              {p3}%
                            </span>
                            <span className="text-[10px] text-amber-950 font-bold">{role3.count} Delegasi</span>
                          </div>

                          <div className="pt-2">
                            <span className="inline-block px-4 py-1 rounded-full bg-black/10 text-slate-900 font-extrabold text-[11px]">
                              3rd Rank
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* CARD 3: CITY DISTRIBUTION STRUCTURE (REAL DATA DARI DATABASE) */}
                <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                        Schools & Faskes Distribution (Sebaran Kota)
                      </h3>
                      <p className="text-[10px] text-slate-400">Sebaran delegasi berdasarkan kota domisili faskes terdaftar</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{stats?.cities?.length || 0} Kota Terdata</span>
                  </div>

                  {stats?.cities && stats.cities.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {stats.cities.slice(0, 8).map((c, i) => {
                        const totalP = stats?.total_participants || 1;
                        const cityPct = Math.round((c.count / totalP) * 100);
                        return (
                          <div key={c.city || i} className="p-3 bg-[#F4F5FA] rounded-xl border border-slate-200/60 text-center space-y-1">
                            <span className="text-[11px] font-bold text-slate-800 block truncate" title={c.city}>
                              {c.city}
                            </span>
                            <div className="flex items-baseline justify-center gap-1">
                              <span className="text-base font-black text-[#4A3B73] tabular-nums">{c.count}</span>
                              <span className="text-[10px] text-slate-500 font-semibold">({cityPct}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-[#4A3B73] h-full rounded-full" style={{ width: `${Math.max(cityPct, 8)}%` }} />
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium block">Peserta</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-3 text-center">Belum ada data wilayah faskes.</p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: PARTICIPANTS TABLE */}
          {activeTab === 'participants' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Manajemen Peserta Terdaftar</h3>
                  <p className="text-xs text-slate-500">Total {participants.length} peserta tercatat dalam database sistem</p>
                </div>

                {/* Export Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Cari nama, RS, No. Reg..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F4F5FA] border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:border-[#4A3B73]"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <select
                  value={filterRole}
                  onChange={e => setFilterRole(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F4F5FA] border border-slate-200 rounded-xl text-slate-900"
                >
                  <option value="ALL">Semua Jabatan</option>
                  <option value="Direktur / Wakil Manajemen Rumah Sakit">Direktur RS</option>
                  <option value="Mitra Telkom">Mitra Telkom</option>
                  <option value="Narasumber">Narasumber</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F4F5FA] border border-slate-200 rounded-xl text-slate-900"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Terdaftar">Terdaftar</option>
                  <option value="Terverifikasi">Terverifikasi</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Tidak Hadir">Tidak Hadir</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>

                <select
                  value={filterTopic}
                  onChange={e => setFilterTopic(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#F4F5FA] border border-slate-200 rounded-xl text-slate-900"
                >
                  <option value="ALL">Semua Topik</option>
                  {topics.map(t => (
                    <option key={t.code} value={t.code}>[{t.code}] {t.title.slice(0, 22)}</option>
                  ))}
                </select>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3.5">No. Reg</th>
                      <th className="py-3 px-3.5">Nama Peserta</th>
                      <th className="py-3 px-3.5">Instansi Rumah Sakit</th>
                      <th className="py-3 px-3.5">Jabatan</th>
                      <th className="py-3 px-3.5">WhatsApp</th>
                      <th className="py-3 px-3.5">Status</th>
                      <th className="py-3 px-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">Memuat data peserta...</td>
                      </tr>
                    ) : participants.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">Tidak ada peserta yang cocok dengan filter.</td>
                      </tr>
                    ) : (
                      participants.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-[#4A3B73] whitespace-nowrap">
                            <TicketLink person={p} className="hover:underline">{p.reg_number}</TicketLink>
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-900 max-w-[190px] truncate" title={p.full_name}>
                            <TicketLink person={p} className="hover:underline">{p.full_name}</TicketLink>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-700 max-w-[180px] truncate" title={p.institution_name}>
                            {p.institution_name}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap font-medium">
                            {p.role_position.includes('Direktur') ? 'Direktur RS' : p.role_position.includes('Mitra') ? 'Mitra Telkom' : 'Narasumber'}
                          </td>
                          <td className="py-2.5 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                            {p.phone_wa}
                          </td>
                          <td className="py-2.5 px-3.5 whitespace-nowrap">
                            <select
                              value={p.status}
                              onChange={e => handleUpdateStatus(p.id, e.target.value as RegistrationStatus)}
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border focus:outline-none cursor-pointer ${
                                p.status === 'Hadir' 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : p.status === 'Terverifikasi'
                                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                                  : 'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              <option value="Terdaftar">Terdaftar</option>
                              <option value="Terverifikasi">Terverifikasi</option>
                              <option value="Hadir">Hadir</option>
                              <option value="Tidak Hadir">Tidak Hadir</option>
                              <option value="Dibatalkan">Dibatalkan</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => { setSelectedParticipant(p); setIsViewingDetail(true); }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                                title="Lihat Detail"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenBadge(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#4A3B73] hover:bg-purple-50 transition-colors"
                                title="Cetak Badge Pass"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { setSelectedParticipant(p); setIsEditing(true); }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                title="Edit Peserta"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteCandidate(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Hapus Peserta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SCAN QR CHECK-IN */}
          {activeTab === 'checkin' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Check-In Pengunjung di Gate</h3>
                  <p className="text-xs text-slate-500">Scan QR Code E-Ticket atau masukkan nomor registrasi unik peserta</p>
                </div>

                <form onSubmit={e => { e.preventDefault(); executeCheckIn(scannerInput); }} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={scannerInput}
                      onChange={e => setScannerInput(e.target.value)}
                      placeholder="Scan QR Pass atau ketik ESTR-2026-..."
                      className="flex-1 px-4 py-2.5 text-xs bg-[#F4F5FA] border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#4A3B73]"
                    />
                    <button
                      type="submit"
                      disabled={scanProcessing || !scannerInput.trim()}
                      className="px-5 py-2.5 bg-[#4A3B73] hover:bg-[#3D2E62] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      {scanProcessing ? 'Memproses...' : 'Check-In'}
                    </button>
                  </div>
                </form>

                {/* Quick Simulation Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 self-center font-medium">Uji Cepat:</span>
                  {participants.slice(0, 4).map(p => (
                    <button
                      key={p.id}
                      onClick={() => executeCheckIn(p.reg_number)}
                      className="text-[11px] font-mono px-2.5 py-1 bg-[#F4F5FA] hover:bg-slate-200 rounded-lg text-slate-700 transition-colors"
                    >
                      {p.reg_number}
                    </button>
                  ))}
                </div>

                {/* Result Card */}
                {scanResult && (
                  <div
                    className={`p-4 rounded-xl border text-xs ${
                      scanResult.success && !scanResult.alreadyAttended
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : scanResult.alreadyAttended
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-rose-50 border-rose-300 text-rose-900'
                    }`}
                  >
                    <p className="font-extrabold text-sm">{scanResult.message}</p>
                    {scanResult.participant && (
                      <div className="mt-2 pt-2 border-t border-current/20 space-y-0.5">
                        <p className="font-bold text-xs">
                          <TicketLink person={scanResult.participant} className="hover:underline">{scanResult.participant.full_name}</TicketLink>
                        </p>
                        <p className="text-[11px] opacity-80">{scanResult.participant.institution_name} · {scanResult.participant.role_position}</p>
                        <p className="font-mono text-[11px] opacity-80">No. Reg: {scanResult.participant.reg_number}</p>
                        <a href={ticketHref(scanResult.participant)} target="_blank" rel="noopener noreferrer" className="block pt-1 text-[11px] underline break-all">
                          {ticketHref(scanResult.participant)}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Check-Ins List */}
              <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-4">
                <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase">
                  Aktivitas Check-In Gate Terbaru
                </h3>
                <div className="space-y-2.5">
                  {recentCheckIns.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Belum ada check-in gate yang dipindai.</p>
                  ) : (
                    recentCheckIns.map((item, idx) => (
                      <div key={idx} className="p-3 bg-[#F4F5FA] rounded-xl border border-slate-100 text-xs flex justify-between items-center">
                        <div>
                          <p className="font-bold text-slate-900">
                            <TicketLink person={item} className="hover:underline">{item.full_name}</TicketLink>
                          </p>
                          <p className="text-[11px] text-slate-500">{item.institution_name}</p>
                          <TicketLink person={item} className="font-mono text-[10px] text-sky-700 hover:underline break-all">{ticketHref(item)}</TicketLink>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          Hadir Gate
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MASTER TOPIK TEKNOLOGI */}
          {activeTab === 'topics' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Master Topik Teknologi Pilihan</h3>
                  <p className="text-xs text-slate-500">Kelola daftar topik minat teknologi yang muncul pada formulir registrasi peserta</p>
                </div>

                <button
                  onClick={() => {
                    setEditingTopic(null);
                    setTopicModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A3B73] hover:bg-[#3D2E62] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Topik Baru</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3.5 w-16">Kode</th>
                      <th className="py-3 px-3.5">Judul Topik Teknologi</th>
                      <th className="py-3 px-3.5">Kategori</th>
                      <th className="py-3 px-3.5 text-center">Peminat</th>
                      <th className="py-3 px-3.5 text-right w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminTopics.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          Belum ada topik teknologi. Klik "Tambah Topik Baru".
                        </td>
                      </tr>
                    ) : (
                      adminTopics.map(t => (
                        <tr key={t.id || t.code} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-bold text-[#4A3B73]">
                            [{t.code}]
                          </td>
                          <td className="py-2.5 px-3.5 font-bold text-slate-900">
                            {t.title}
                            {t.description && (
                              <p className="text-[11px] text-slate-400 font-normal line-clamp-1 mt-0.5">
                                {t.description}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 font-medium">
                            <span className="px-2.5 py-0.5 bg-[#F4F5FA] rounded-md text-[11px] text-slate-700 font-semibold border border-slate-200/60">
                              {t.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-center font-mono font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded-full bg-purple-50 text-[#4A3B73] font-bold">
                              {t.participant_count ?? 0}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingTopic(t);
                                  setTopicModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                title="Edit Topik"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setTopicDeleteCandidate(t)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Hapus Topik"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: MASTER SEGMENTASI MINAT */}
          {activeTab === 'segmentation' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Master Segmentasi Minat & Clustering Peserta</h3>
                  <p className="text-xs text-slate-500">Kelompokkan peserta secara otomatis berdasarkan kombinasi topik teknologi yang mereka pilih</p>
                </div>

                <button
                  onClick={() => {
                    setEditingSegment(null);
                    setSegmentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A3B73] hover:bg-[#3D2E62] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Segmentasi Baru</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8F9FD] border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3.5">Nama Segmentasi</th>
                      <th className="py-3 px-3.5">Topik Acuan</th>
                      <th className="py-3 px-3.5 text-center">Peserta Terkait</th>
                      <th className="py-3 px-3.5">Daftar RS & Instansi Terkoneksi</th>
                      <th className="py-3 px-3.5 text-right w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {segments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          Belum ada segmentasi. Klik "Tambah Segmentasi Baru".
                        </td>
                      </tr>
                    ) : (
                      segments.map(seg => {
                        const topicList = seg.topic_codes ? seg.topic_codes.split(',') : [];

                        return (
                          <tr key={seg.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#4A3B73] mr-2"></span>
                              {seg.name}
                            </td>
                            <td className="py-3 px-3.5 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {topicList.map(t => (
                                  <span key={t} className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F4F5FA] text-slate-800 border border-slate-200/60">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-900">
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                                {seg.matched_participants_count ?? 0}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-600 max-w-xs truncate">
                              {seg.matched_participants && seg.matched_participants.length > 0 ? (
                                seg.matched_participants.slice(0, 3).map(p => p.institution_name).join(', ') + 
                                (seg.matched_participants.length > 3 ? ` (+${seg.matched_participants.length - 3})` : '')
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingSegment(seg);
                                    setSegmentModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                  title="Edit Segmentasi"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setTopicDeleteCandidate(null);
                                    setSegmentDeleteCandidate(seg);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                  title="Hapus Segmentasi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'settings' && <BrandSettings />}

          {/* TAB 6: AUDIT LOG */}
          {activeTab === 'audit' && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-4">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Log Audit Aktivitas Sistem
              </h3>
              <div className="space-y-2">
                {(auditLogs.length > 0 ? auditLogs : stats?.recent_audits || []).map(log => (
                  <div key={log.id} className="p-3 bg-[#F4F5FA] rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-[#4A3B73] mr-2">[{log.action}]</span>
                      <span className="text-slate-700 font-medium">{log.details}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(log.created_at.replace(' ', 'T')).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DETAIL MODAL */}
      {isViewingDetail && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <TicketLink person={selectedParticipant} className="font-mono font-bold text-[#4A3B73] text-sm hover:underline">{selectedParticipant.reg_number}</TicketLink>
              <button onClick={() => setIsViewingDetail(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <p><strong>Nama:</strong> {selectedParticipant.full_name}</p>
              <p><strong>Instansi:</strong> {selectedParticipant.institution_name}</p>
              <p><strong>Jabatan:</strong> {selectedParticipant.role_position}</p>
              <p><strong>WhatsApp:</strong> {selectedParticipant.phone_wa}</p>
              <p><strong>Email:</strong> {selectedParticipant.email}</p>
              <p><strong>Kota:</strong> {selectedParticipant.city}</p>
              <p><strong>Status:</strong> {selectedParticipant.status}</p>
              <p>
                <strong>URL tiket:</strong>{' '}
                <a href={ticketHref(selectedParticipant)} target="_blank" rel="noopener noreferrer" className="text-sky-700 break-all hover:underline">
                  {ticketHref(selectedParticipant)}
                </a>
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => { setIsViewingDetail(false); onOpenBadge(selectedParticipant); }}
                className="px-4 py-2 bg-[#4A3B73] hover:bg-[#3D2E62] text-white rounded-xl text-xs font-bold"
              >
                Cetak Badge
              </button>
              <button
                onClick={() => setIsViewingDetail(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditing && selectedParticipant && (
        <EditModal
          participant={selectedParticipant}
          topics={topics}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            loadParticipants();
            loadStats();
            loadSegments();
            loadAuditLogs();
          }}
        />
      )}

      {/* TOPIC MODAL (CREATE / EDIT) */}
      {topicModalOpen && (
        <TopicFormModal
          topic={editingTopic}
          onClose={() => setTopicModalOpen(false)}
          onSaved={() => {
            setTopicModalOpen(false);
            loadAdminTopics();
            loadStats();
            loadSegments();
            loadAuditLogs();
          }}
        />
      )}

      {/* SEGMENT MODAL (CREATE / EDIT) */}
      {segmentModalOpen && (
        <SegmentFormModal
          segment={editingSegment}
          availableTopics={topics}
          onClose={() => setSegmentModalOpen(false)}
          onSaved={() => {
            setSegmentModalOpen(false);
            loadSegments();
            loadAuditLogs();
          }}
        />
      )}

      {/* TOPIC DELETE CONFIRM */}
      {topicDeleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <h4 className="font-bold text-slate-900 text-sm">Hapus Topik Teknologi?</h4>
            <p className="text-xs text-slate-600">
              Topik [{topicDeleteCandidate.code}] {topicDeleteCandidate.title} akan dihapus dari pilihan formulir registrasi.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setTopicDeleteCandidate(null)}
                className="flex-1 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteTopic}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENT DELETE CONFIRM */}
      {segmentDeleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <h4 className="font-bold text-slate-900 text-sm">Hapus Segmentasi?</h4>
            <p className="text-xs text-slate-600">
              Segmentasi "{segmentDeleteCandidate.name}" akan dihapus dari master segmentasi.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSegmentDeleteCandidate(null)}
                className="flex-1 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSegment}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARTICIPANT DELETE CONFIRM */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4 text-center">
            <h4 className="font-bold text-slate-900 text-sm">Hapus Peserta?</h4>
            <p className="text-xs text-slate-600">
              {deleteCandidate.full_name} ({deleteCandidate.reg_number})
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="flex-1 py-2 bg-slate-100 rounded-xl text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteParticipant}
                className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal Form for Master Segmentasi (Add & Edit)
interface SegmentFormModalProps {
  segment: InterestSegment | null;
  availableTopics: TechnologyTopic[];
  onClose: () => void;
  onSaved: () => void;
}

function SegmentFormModal({ segment, availableTopics, onClose, onSaved }: SegmentFormModalProps) {
  const [name, setName] = useState(segment?.name || '');
  const [color, setColor] = useState(segment?.color || 'sky');
  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    segment?.topic_codes ? segment.topic_codes.split(',').map(s => s.trim()) : []
  );
  const [description, setDescription] = useState(segment?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCode = (code: string) => {
    setSelectedCodes(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Nama Segmentasi wajib diisi');
      return;
    }
    if (selectedCodes.length === 0) {
      setError('Pilih minimal 1 topik teknologi untuk segmentasi ini');
      return;
    }

    setSaving(true);
    const isEdit = !!segment?.id;
    const url = isEdit ? `/api/admin/segments/${segment.id}` : '/api/admin/segments';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          color,
          topic_codes: selectedCodes,
          description: description.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menyimpan segmentasi');
        setSaving(false);
        return;
      }

      onSaved();
    } catch (err) {
      setError('Kesalahan koneksi ke server');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg space-y-4 border border-slate-200">
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-bold text-sm text-slate-900">
            {segment ? `Edit Segmentasi "${segment.name}"` : 'Tambah Master Segmentasi Baru'}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Nama Segmentasi</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Contoh: Digitalisasi SIMRS & Integrasi SATUSEHAT"
              className="w-full px-3 py-2 border rounded-xl font-semibold text-slate-900 focus:outline-none focus:border-[#4A3B73]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Warna Label</label>
              <select
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
              >
                <option value="sky">Biru (Sky)</option>
                <option value="amber">Kuning / Oranye (Amber)</option>
                <option value="purple">Ungu (Purple)</option>
                <option value="emerald">Hijau (Emerald)</option>
                <option value="rose">Merah (Rose)</option>
                <option value="slate">Abu-abu (Slate)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Topik Terpilih</label>
              <div className="px-3 py-2 bg-[#F4F5FA] border rounded-xl text-[11px] font-mono font-bold text-[#4A3B73] truncate">
                {selectedCodes.length > 0 ? selectedCodes.join(', ') : 'Belum ada'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Pilih Topik Terkait ({selectedCodes.length} dipilih):
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-2.5 bg-[#F4F5FA] border border-slate-200 rounded-xl">
              {availableTopics.map(t => {
                const isChecked = selectedCodes.includes(t.code);
                return (
                  <label key={t.code} className="flex items-center gap-1.5 cursor-pointer text-[11px] hover:text-slate-900 select-none">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCode(t.code)}
                      className="rounded text-[#4A3B73]"
                    />
                    <span className="truncate">
                      <strong className="font-mono text-[#4A3B73] mr-1">[{t.code}]</strong>
                      {t.title}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Deskripsi Singkat (Opsional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Catatan tujuan segmentasi ini..."
              className="w-full px-3 py-2 border rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#4A3B73] hover:bg-[#3D2E62] text-white rounded-xl font-bold transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan Segmentasi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Form for Master Topik (Add & Edit)
interface TopicFormModalProps {
  topic: TechnologyTopic | null;
  onClose: () => void;
  onSaved: () => void;
}

function TopicFormModal({ topic, onClose, onSaved }: TopicFormModalProps) {
  const [code, setCode] = useState(topic?.code || '');
  const [title, setTitle] = useState(topic?.title || '');
  const [category, setCategory] = useState(topic?.category || 'Clinical Core');
  const [description, setDescription] = useState(topic?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const isEdit = !!topic?.id;
    const url = isEdit ? `/api/admin/topics/${topic.id}` : '/api/admin/topics';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          title: title.trim(),
          category: category.trim(),
          description: description.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menyimpan topik');
        setSaving(false);
        return;
      }

      onSaved();
    } catch (err) {
      setError('Kesalahan koneksi ke server');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4 border border-slate-200">
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-bold text-sm text-slate-900">
            {topic ? `Edit Topik [${topic.code}]` : 'Tambah Topik Teknologi Baru'}
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Kode (A-Z)</label>
              <input
                type="text"
                required
                maxLength={4}
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="M"
                className="w-full px-3 py-2 border rounded-xl uppercase font-mono font-bold focus:outline-none focus:border-[#4A3B73]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-700 font-bold mb-1">Kategori</label>
              <input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Contoh: Telemedicine / AI"
                className="w-full px-3 py-2 border rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Judul Topik Teknologi</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Telemedicine & Remote Patient Monitoring (RPM)"
              className="w-full px-3 py-2 border rounded-xl font-semibold focus:outline-none focus:border-[#4A3B73]"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Deskripsi Singkat (Opsional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Penjelasan ringkas mengenai solusi teknologi..."
              className="w-full px-3 py-2 border rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#4A3B73] hover:bg-[#3D2E62] text-white rounded-xl font-bold transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan Topik'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Modal for Participant
function EditModal({ participant, topics, onClose, onSaved }: any) {
  const [fullName, setFullName] = useState(participant.full_name);
  const [rolePosition, setRolePosition] = useState(participant.role_position);
  const [institutionName, setInstitutionName] = useState(participant.institution_name);
  const [phoneWa, setPhoneWa] = useState(participant.phone_wa);
  const [email, setEmail] = useState(participant.email);
  const [city, setCity] = useState(participant.city);
  const [status, setStatus] = useState(participant.status);
  const [notes, setNotes] = useState(participant.notes || '');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(
    (participant.topics || []).map((topic: { code: string }) => topic.code)
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/participants/${participant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          role_position: rolePosition,
          institution_name: institutionName,
          phone_wa: phoneWa,
          email,
          city,
          status,
          notes,
          topics: selectedTopics
        })
      });
      const data = await res.json();
      if (data.success) onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4 border border-slate-200">
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-bold text-sm text-slate-900">
            Edit Peserta: <TicketLink person={participant} className="text-[#4A3B73] hover:underline">{participant.reg_number}</TicketLink>
          </span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Jabatan</label>
            <select
              value={rolePosition}
              onChange={e => setRolePosition(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none"
            >
              <option value="Direktur / Wakil Manajemen Rumah Sakit">Direktur / Wakil Manajemen RS</option>
              <option value="Mitra Telkom">Mitra Telkom</option>
              <option value="Narasumber">Narasumber</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Instansi</label>
            <input
              type="text"
              required
              value={institutionName}
              onChange={e => setInstitutionName(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Kota</label>
              <input
                type="text"
                required
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">WhatsApp</label>
              <input
                type="text"
                required
                value={phoneWa}
                onChange={e => setPhoneWa(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl focus:outline-none font-bold"
              >
                <option value="Terdaftar">Terdaftar</option>
                <option value="Terverifikasi">Terverifikasi</option>
                <option value="Hadir">Hadir</option>
                <option value="Tidak Hadir">Tidak Hadir</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Topik minat</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#F4F5FA] border border-slate-200 rounded-xl">
              {(topics || []).map((topic: { code: string; title: string }) => (
                <label key={topic.code} className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={selectedTopics.includes(topic.code)}
                    onChange={() => setSelectedTopics((current: string[]) => (
                      current.includes(topic.code)
                        ? current.filter((code) => code !== topic.code)
                        : [...current, topic.code]
                    ))}
                  />
                  <span className="truncate"><strong>[{topic.code}]</strong> {topic.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Catatan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 bg-[#4A3B73] hover:bg-[#3D2E62] text-white rounded-xl font-bold transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ticketHref(person: { qr_token?: string | null; reg_number: string }) {
  return ticketPageUrl({
    qr_token: person.qr_token || person.reg_number,
    reg_number: person.reg_number,
  });
}

function TicketLink({
  person,
  className,
  children,
}: {
  person: { qr_token?: string | null; reg_number: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a href={ticketHref(person)} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}
