import React, { useState } from 'react';
import { Navbar, AppView } from './components/Navbar.tsx';
import { RegistrationForm } from './components/RegistrationForm.tsx';
import { RegistrationSuccessModal } from './components/RegistrationSuccessModal.tsx';
import { TicketLookupModal } from './components/TicketLookupModal.tsx';
import { VisitorBadgeModal } from './components/VisitorBadgeModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { Participant } from './types.ts';
import { 
  Calendar, 
  MapPin, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  QrCode, 
  Activity, 
  Search,
  UserPlus,
  Building2,
  ShieldCheck,
  Cpu,
  Clock,
  Sparkles,
  Users,
  FileText,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('landing');
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);
  const [notificationInfo, setNotificationInfo] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isTicketLookupOpen, setIsTicketLookupOpen] = useState(false);
  const [badgeParticipant, setBadgeParticipant] = useState<Participant | null>(null);

  const handleRegistrationSuccess = (participant: Participant, notification: any) => {
    setRegisteredParticipant(participant);
    setNotificationInfo(notification);
    setIsSuccessModalOpen(true);
  };

  const handleScrollToSection = (id: string) => {
    if (activeView !== 'landing') {
      setActiveView('landing');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navigateToRegister = () => {
    setActiveView('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Navbar (Hidden on Admin Dashboard) */}
      {activeView !== 'admin' && (
        <Navbar
          activeView={activeView}
          setActiveView={setActiveView}
          onOpenTicketLookup={() => setIsTicketLookupOpen(true)}
          onScrollToSection={handleScrollToSection}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {activeView === 'admin' ? (
          <AdminDashboard
            onOpenBadge={p => setBadgeParticipant(p)}
            onExit={() => setActiveView('landing')}
          />
        ) : activeView === 'register' ? (
          /* DEDICATED REGISTRATION PAGE */
          <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <button
                onClick={() => setActiveView('landing')}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Beranda</span>
              </button>
              <span className="text-xs font-semibold text-slate-400">
                Pendaftaran Peserta KTT Estrada 2026
              </span>
            </div>

            {/* Dedicated Registration Form */}
            <RegistrationForm onSuccess={handleRegistrationSuccess} />
          </div>
        ) : (
          <div className="space-y-16 pb-20 animate-fade-in">
            {/* HERO SECTION */}
            <section className="relative bg-slate-900 text-white overflow-hidden border-b border-slate-800">
              {/* Background Summit Image with Dark Gradient Scrim */}
              <div className="absolute inset-0 z-0">
                <img
                  src="/src/assets/images/estrada_summit_hero_1793630362484.jpg"
                  alt="Estrada Healthcare Summit"
                  className="w-full h-full object-cover opacity-20 object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/85 to-slate-900/70" />
              </div>

              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="max-w-3xl space-y-6">
                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-sky-400 font-semibold tracking-wider uppercase">
                    <span>KTT Transformasi Kesehatan Indonesia</span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span>15 November 2026</span>
                    <span aria-hidden="true" className="text-slate-500">·</span>
                    <span className="text-emerald-400 font-bold">Pendaftaran Dibuka</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15] text-balance">
                    ESTRADA Healthcare Technology & Innovation Summit
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                    Pertemuan akbar pimpinan rumah sakit, kementerian regulator, dan inovator teknologi kesehatan terdepan untuk percepatan integrasi SIMRS, kematangan ekosistem SATUSEHAT, serta efisiensi pembiayaan BPJS berbasis kecerdasan buatan.
                  </p>

                  {/* Summit Details Strip */}
                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-800">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Waktu Acara</span>
                        <p className="text-xs font-semibold text-white">15 November 2026</p>
                        <p className="text-[11px] text-slate-400">08.30 - 16.30 WIB</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Lokasi Venue</span>
                        <p className="text-xs font-semibold text-white">Jakarta Convention Center</p>
                        <p className="text-[11px] text-slate-400">Grand Ballroom, Senayan</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <QrCode className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Akses Masuk</span>
                        <p className="text-xs font-semibold text-white">Digital QR Pass Gate</p>
                        <p className="text-[11px] text-slate-400">E-Ticket & Badge Peserta</p>
                      </div>
                    </div>
                  </div>

                  {/* Primary Call to Action - Single Registration Button per user request */}
                  <div className="pt-4 flex flex-wrap items-center gap-4">
                    <button
                      onClick={navigateToRegister}
                      className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-sky-900/40 hover:shadow-sky-600/30 active:scale-[0.98]"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Daftar Sekarang</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsTicketLookupOpen(true)}
                      className="inline-flex items-center gap-2 px-5 py-3.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold transition-colors border border-slate-700/80"
                    >
                      <Search className="w-4 h-4 text-sky-400" />
                      <span>Sudah Mendaftar? Cek Tiket QR</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Metrics Strip */}
              <div className="border-t border-slate-800/90 bg-slate-950/60 backdrop-blur-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-slate-800">
                    <div className="pt-3 md:pt-0 md:px-4 first:pl-0">
                      <div className="text-2xl sm:text-3xl font-black text-white">500+</div>
                      <div className="text-xs text-slate-400 font-medium mt-0.5">Pemimpin RS & Faskes Nasional</div>
                    </div>
                    <div className="pt-3 md:pt-0 md:px-4">
                      <div className="text-2xl sm:text-3xl font-black text-sky-400">40+</div>
                      <div className="text-xs text-slate-400 font-medium mt-0.5">Narasumber Pakar & Regulator</div>
                    </div>
                    <div className="pt-3 md:pt-0 md:px-4">
                      <div className="text-2xl sm:text-3xl font-black text-white">6</div>
                      <div className="text-xs text-slate-400 font-medium mt-0.5">Sesi Simposium & Panel Diskusi</div>
                    </div>
                    <div className="pt-3 md:pt-0 md:px-4">
                      <div className="text-2xl sm:text-3xl font-black text-emerald-400">100%</div>
                      <div className="text-xs text-slate-400 font-medium mt-0.5">Standar Rekam Medis SATUSEHAT</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* PILAR FOKUS INOVASI */}
            <section id="pillars-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-3 mb-8">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-sky-700" />
                  <span>Pilar Inovasi & Diskusi</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Fokus Transformasi Digital Rumah Sakit Modern
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl">
                  Dirancang khusus untuk menjawab tantangan strategis manajemen rumah sakit, efisiensi operasional faskes, serta regulasi kepatuhan data kesehatan.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Pillar 1 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold">
                      <Activity className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      Interoperabilitas SIMRS & SATUSEHAT
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Implementasi arsitektur standar HL7 FHIR dan bridging API SatuSehat Kemenkes RI untuk pertukaran rekam medis elektronik lintas fasilitas secara seamless.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-sky-700 flex items-center gap-1">
                    <span>Standar Kemenkes RI</span>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      Automasi AI Verifikasi Klaim BPJS
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pemanfaatan kecerdasan buatan untuk verifikasi berkas klaim INA-CBG, memitigasi potensi pending dan dispute klaim secara preventif demi menjaga cashflow RS.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                    <span>Efisiensi Arus Kas</span>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      Keamanan Siber & Kepatuhan UU PDP
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pengamanan data rekam medis pasien sesuai mandat UU PDP No. 27/2022 dengan enkripsi end-to-end, audit akses klinis, serta ketahanan data center rumah sakit.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                    <span>Kepatuhan Regulasi</span>
                  </div>
                </div>

                {/* Pillar 4 */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      Smart Hospital Command Center
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Pusat kendali operasional rumah sakit berbasis IoT untuk pemantauan ketersediaan bed, antrean IGD, utilisasi alat medis kritis, serta tele-konsultasi dokter.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                    <span>Live Operations Center</span>
                  </div>
                </div>
              </div>
            </section>

            {/* EVENT HIGHLIGHTS & SHOWCASE SECTION */}
            <section id="about-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-800 uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-sky-700" />
                    <span>Tentang Kegiatan KTT Estrada 2026</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    Akselerasi Solusi Digital Terpadu untuk Kualitas Layanan Kesehatan
                  </h2>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    KTT ESTRADA diselenggarakan sebagai wadah strategis bagi pimpinan rumah sakit dan pemangku kepentingan industri kesehatan di Indonesia. Pertemuan ini menghadirkan demonstrasi teknologi mutakhir yang langsung dapat diterapkan untuk menjawab tantangan operasional harian rumah sakit.
                  </p>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/90">
                      <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="text-slate-900 font-bold block mb-0.5">
                          Forum Dialog Pemangku Kepentingan
                        </strong>
                        <span className="text-slate-600">
                          Diskusi mendalam bersama perwakilan Kementerian Kesehatan RI, BPJS Kesehatan, dan asosiasi perumahsakitan nasional.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/90">
                      <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="text-slate-900 font-bold block mb-0.5">
                          Eksibisi Solusi Teknologi Langsung (Live Demo)
                        </strong>
                        <span className="text-slate-600">
                          Uji coba langsung solusi Smart Hospital, AI coding INA-CBG, hingga command center terintegrasi dari mitra industri.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200/90">
                      <CheckCircle2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <strong className="text-slate-900 font-bold block mb-0.5">
                          Profil Peserta yang Diundang
                        </strong>
                        <span className="text-slate-600">
                          Direktur Utama & Direksi RS, Kepala Instalasi IT/SIMRS, Manajer Keuangan & Klaim BPJS, Komite Medis, dan Kepala Rekam Medis.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Showcase Image Gallery */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-4/3 bg-slate-900">
                      <img
                        src="/src/assets/images/estrada_smart_hospital_1793630362694.jpg"
                        alt="Smart Hospital Operations"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Live Demo Area</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">Smart Hospital Command Center</p>
                      <p className="text-[11px] text-slate-500 mt-1">Eksplorasi dashboard utilisasi tempat tidur, IGD, dan bridging SATUSEHAT.</p>
                    </div>
                  </div>

                  <div className="space-y-3 sm:pt-6">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm aspect-4/3 bg-slate-900">
                      <img
                        src="/src/assets/images/estrada_keynote_stage_1793630362322.jpg"
                        alt="Keynote Innovation Stage"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Keynote Stage</span>
                      <p className="text-xs font-bold text-slate-900 mt-0.5">Simposium Pemimpin Eksekutif</p>
                      <p className="text-[11px] text-slate-500 mt-1">Sesi panel bersama Kementerian Kesehatan, BPJS Kesehatan, dan Telkom Indonesia.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* AGENDA & RUNDOWN SECTION */}
            <section id="agenda-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="space-y-3 mb-8">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-800 uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-sky-700" />
                  <span>Susunan Acara</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Agenda KTT 15 November 2026
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl">
                  Rangkaian sesi plenari, panel diskusi, dan showcase teknologi yang disusun padat untuk kenyamanan para delegasi eksekutif rumah sakit.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Agenda Item 1 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 flex gap-4 items-start">
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-xs font-bold text-sky-800 block">07.45 - 08.30</span>
                    <span className="text-[10px] text-slate-400 uppercase">WIB</span>
                  </div>
                  <div className="border-l border-slate-200 pl-4 space-y-1">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Registrasi & Gate In</span>
                    <h4 className="text-xs font-bold text-slate-900">Check-in QR Pass & Executive Networking Breakfast</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Verifikasi barcode kedatangan, pembagian visitor kit & badge, serta coffee morning delegasi.
                    </p>
                  </div>
                </div>

                {/* Agenda Item 2 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 flex gap-4 items-start">
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-xs font-bold text-sky-800 block">08.30 - 10.00</span>
                    <span className="text-[10px] text-slate-400 uppercase">WIB</span>
                  </div>
                  <div className="border-l border-slate-200 pl-4 space-y-1">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Keynote Plenary</span>
                    <h4 className="text-xs font-bold text-slate-900">Arah Kebijakan SatuSehat & Transformasi Digital Kesehatan Nasional</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Paparan roadmap integrasi data faskes nasional bersama perwakilan Kementerian Kesehatan RI.
                    </p>
                  </div>
                </div>

                {/* Agenda Item 3 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 flex gap-4 items-start">
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-xs font-bold text-sky-800 block">10.15 - 12.00</span>
                    <span className="text-[10px] text-slate-400 uppercase">WIB</span>
                  </div>
                  <div className="border-l border-slate-200 pl-4 space-y-1">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Panel Session 1</span>
                    <h4 className="text-xs font-bold text-slate-900">Arsitektur SIMRS Modern & Standardisasi Rekam Medis Elektronik</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Best practice integrasi HL7 FHIR dan kesiapan data center rumah sakit menghadapi regulasi UU PDP.
                    </p>
                  </div>
                </div>

                {/* Agenda Item 4 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 flex gap-4 items-start">
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-xs font-bold text-sky-800 block">12.00 - 13.00</span>
                    <span className="text-[10px] text-slate-400 uppercase">WIB</span>
                  </div>
                  <div className="border-l border-slate-200 pl-4 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Networking Lunch</span>
                    <h4 className="text-xs font-bold text-slate-900">Executive Lunch & Exhibition Walkthrough</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Makan siang bersama dan tinjauan langsung ke stan inovasi teknologi mitra kesehatan.
                    </p>
                  </div>
                </div>

                {/* Agenda Item 5 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 flex gap-4 items-start">
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-xs font-bold text-sky-800 block">13.00 - 14.30</span>
                    <span className="text-[10px] text-slate-400 uppercase">WIB</span>
                  </div>
                  <div className="border-l border-slate-200 pl-4 space-y-1">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Panel Session 2</span>
                    <h4 className="text-xs font-bold text-slate-900">Kecerdasan Buatan (AI) untuk Efisiensi Pembiayaan & Verifikasi Klaim BPJS</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Strategi reduksi dispute dan pending klaim INA-CBG secara otomatis dengan model prediktif klinis.
                    </p>
                  </div>
                </div>

                {/* Agenda Item 6 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 flex gap-4 items-start">
                  <div className="shrink-0 w-24 text-right">
                    <span className="text-xs font-bold text-sky-800 block">14.45 - 16.30</span>
                    <span className="text-[10px] text-slate-400 uppercase">WIB</span>
                  </div>
                  <div className="border-l border-slate-200 pl-4 space-y-1">
                    <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">Live Demo & Closing</span>
                    <h4 className="text-xs font-bold text-slate-900">Smart Hospital Command Center Simulation & Executive Closing</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Simulasi operasional terpusat ruangan intensif & rawat inap, penyerahan apresiasi inovasi, dan penutupan.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* VENUE & GUIDELINES SECTION */}
            <section id="venue-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-10 border border-slate-800 relative overflow-hidden">
                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Location Info */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider">
                      <MapPin className="w-4 h-4" />
                      <span>Lokasi Venue Acara</span>
                    </div>

                    <h3 className="text-2xl font-bold tracking-tight text-white">
                      Grand Ballroom, Jakarta Convention Center (JCC)
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      Jl. Gatot Subroto No.1, Gelora, Tanah Abang, Jakarta Pusat. Berlokasi strategis di pusat kawasan bisnis Jakarta dengan fasilitas bertaraf internasional.
                    </p>

                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                        <span className="font-bold text-sky-400 block">Akses Transportasi Publik</span>
                        <p className="text-slate-300">
                          Stasiun MRT Istora Mandiri (5 menit via shuttle pintu timur GBK) & Halte TransJakarta JCC Senayan.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                        <span className="font-bold text-sky-400 block">Fasilitas Area & Parkir</span>
                        <p className="text-slate-300">
                          Tersedia area parkir delegasi di Gedung Parkir Timur Senayan & valet service di lobi utama JCC.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Attendance Instructions */}
                  <div className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                        <Info className="w-4 h-4 text-sky-400" />
                        <span>Petunjuk Check-in Gate</span>
                      </div>

                      <ul className="text-xs text-slate-300 space-y-2.5">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Pintu registrasi & scan QR gate dibuka mulai pukul <strong>07.45 WIB</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Cukup tunjukkan <strong>QR Pass</strong> di layar smartphone kepada staf penerima tamu.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>Dresscode resmi: <strong>Batik Formal / Executive Business Attire</strong>.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
                      <span>Layanan Tiket & Bantuan:</span>
                      <button
                        onClick={() => setIsTicketLookupOpen(true)}
                        className="text-sky-400 hover:text-sky-300 font-bold hover:underline flex items-center gap-1"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Cek Tiket Anda</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER (Hidden on Admin Dashboard) */}
      {activeView !== 'admin' && (
        <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left space-y-1">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-white font-extrabold text-sm tracking-tight">ESTRADA 2026</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-sky-400 font-semibold text-xs">Healthcare Technology & Innovation</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Penyelenggara: Panitia Bersama Inovasi Teknologi Kesehatan Indonesia & Mitra Enterprise Telkom
                </p>
              </div>

              <div className="flex items-center gap-6 text-[11px] text-slate-400">
                <span>Jakarta Convention Center</span>
                <span aria-hidden="true">·</span>
                <span>15 November 2026</span>
                <span aria-hidden="true">·</span>
                <span>Kepatuhan UU PDP No. 27/2022</span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-[10px] text-slate-500">
              Hak Cipta © 2026 ESTRADA Event Registration System. Seluruh hak dilindungi undang-undang.
            </div>
          </div>
        </footer>
      )}

      {/* MODALS */}
      {isSuccessModalOpen && (
        <RegistrationSuccessModal
          participant={registeredParticipant}
          notificationInfo={notificationInfo}
          onClose={() => setIsSuccessModalOpen(false)}
          onOpenBadge={p => setBadgeParticipant(p)}
        />
      )}

      {isTicketLookupOpen && (
        <TicketLookupModal
          onClose={() => setIsTicketLookupOpen(false)}
          onOpenBadge={p => setBadgeParticipant(p)}
        />
      )}

      {badgeParticipant && (
        <VisitorBadgeModal
          participant={badgeParticipant}
          onClose={() => setBadgeParticipant(null)}
        />
      )}
    </div>
  );
}
