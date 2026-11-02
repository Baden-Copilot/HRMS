import React, { useState, useEffect } from 'react';
import { 
  User, 
  CheckSquare, 
  Square, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Participant, TechnologyTopic } from '../types.ts';

interface RegistrationFormProps {
  onSuccess: (participant: Participant, notificationInfo: any) => void;
}

const CITY_SUGGESTIONS = [
  'DKI Jakarta',
  'Surabaya',
  'Bandung',
  'Medan',
  'Semarang',
  'Makassar',
  'Denpasar',
  'Palembang',
  'Yogyakarta',
  'Malang'
];

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const [topics, setTopics] = useState<TechnologyTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [rolePosition, setRolePosition] = useState<string>('Direktur / Wakil Manajemen Rumah Sakit');
  const [institutionName, setInstitutionName] = useState('');
  const [phoneWa, setPhoneWa] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [pdpConsent, setPdpConsent] = useState(true);
  const [honeypot, setHoneypot] = useState('');

  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch topics
  useEffect(() => {
    fetch('/api/topics')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.topics)) {
          setTopics(data.topics);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingTopics(false));
  }, []);

  const toggleTopic = (code: string) => {
    setSelectedTopics(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectAllTopics = () => {
    if (selectedTopics.length === topics.length) {
      setSelectedTopics([]);
    } else {
      setSelectedTopics(topics.map(t => t.code));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Nama Lengkap wajib diisi.');
      return;
    }
    if (!rolePosition) {
      setErrorMessage('Jabatan / Posisi wajib dipilih.');
      return;
    }
    if (!institutionName.trim()) {
      setErrorMessage('Nama RS / Instansi wajib diisi.');
      return;
    }
    if (!phoneWa.trim()) {
      setErrorMessage('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Email tidak valid.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('Kota domisili wajib diisi.');
      return;
    }
    if (!pdpConsent) {
      setErrorMessage('Persetujuan data pribadi wajib dicentang.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          role_position: rolePosition,
          institution_name: institutionName.trim(),
          phone_wa: phoneWa.trim(),
          email: email.trim(),
          city: city.trim(),
          topics: selectedTopics,
          pdp_consent: pdpConsent ? 1 : 0,
          honeypot
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || 'Gagal menyimpan pendaftaran.');
        setSubmitting(false);
        return;
      }

      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      onSuccess(data.participant, data.notification);
    } catch (err) {
      setErrorMessage('Koneksi server terputus.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="registration-form-section" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Form Header: Simple & Direct */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800">
        <h2 className="text-xl font-black text-white tracking-tight">
          FORMULIR REGISTRASI PESERTA
        </h2>
        <p className="text-slate-400 text-xs mt-0.5">
          ESTRADA Healthcare Technology & Innovation 2026
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        )}

        {/* Hidden Anti-Spam */}
        <input 
          type="text" 
          name="website_secondary" 
          value={honeypot} 
          onChange={e => setHoneypot(e.target.value)} 
          className="hidden" 
          tabIndex={-1} 
        />

        {/* SECTION A: IDENTITAS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <User className="w-4 h-4 text-sky-700" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Data Identitas Peserta
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Nama Lengkap */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Nama Lengkap & Gelar</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="dr. Nama Lengkap, Sp.A / Nama Lengkap, S.Kom"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              />
            </div>

            {/* 2. Jabatan */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Jabatan / Posisi</span>
                <span className="text-rose-600">*</span>
              </label>
              <select
                value={rolePosition}
                onChange={e => setRolePosition(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              >
                <option value="Direktur / Wakil Manajemen Rumah Sakit">Direktur / Wakil Manajemen Rumah Sakit</option>
                <option value="Mitra Telkom">Mitra Telkom</option>
                <option value="Narasumber">Narasumber</option>
              </select>
            </div>

            {/* 3. Instansi */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Nama Rumah Sakit / Instansi</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={institutionName}
                onChange={e => setInstitutionName(e.target.value)}
                placeholder="Contoh: RSUP Dr. Sardjito / PT Telkom"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              />
            </div>

            {/* 4. WhatsApp */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Nomor WhatsApp Aktif</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneWa}
                onChange={e => setPhoneWa(e.target.value)}
                placeholder="081234567890 (otomatis +62)"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              />
            </div>

            {/* 5. Email */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Alamat Email Aktif</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="direksi@rumahsakit.co.id"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              />
            </div>

            {/* 6. Kota */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-1.5 text-xs font-black text-slate-900 uppercase tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                <span>Kota Domisili Instansi</span>
                <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                list="city-options"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Contoh: DKI Jakarta, Surabaya, Bandung, Medan"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600"
              />
              <datalist id="city-options">
                {CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
        </div>

        {/* SECTION B: TOPIK TEKNOLOGI (Clean Compact Grid) */}
        <div id="topics-section" className="space-y-3 pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-700" />
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Topik Teknologi Pilihan (Opsional)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {selectedTopics.length} dipilih
              </span>
              <button
                type="button"
                onClick={handleSelectAllTopics}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline"
              >
                {selectedTopics.length === topics.length ? 'Batal' : 'Pilih Semua'}
              </button>
            </div>
          </div>

          {loadingTopics ? (
            <p className="text-xs text-slate-400 py-3 text-center">Memuat topik...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topics.map(topic => {
                const isSelected = selectedTopics.includes(topic.code);
                return (
                  <div
                    key={topic.code}
                    onClick={() => toggleTopic(topic.code)}
                    className={`cursor-pointer px-3 py-2 rounded-lg border text-left transition-colors flex items-center gap-2.5 select-none ${
                      isSelected 
                        ? 'bg-sky-50/80 border-sky-400 text-sky-950' 
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="shrink-0 text-sky-700">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 fill-sky-700 text-white" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold leading-tight truncate">
                        <strong className="font-mono text-sky-800 mr-1.5">[{topic.code}]</strong>
                        {topic.title}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION C: PERSETUJUAN PDP (Short & Clean) */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={pdpConsent}
              onChange={e => setPdpConsent(e.target.checked)}
              className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 shrink-0"
            />
            <span className="font-medium leading-tight">
              Saya menyetujui pemrosesan data pribadi untuk verifikasi dan penerbitan tiket resmi ESTRADA 2026 (UU PDP No. 27/2022).
            </span>
          </label>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Koneksi Aman TLS · Bebas Biaya</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 text-xs font-bold text-white bg-sky-700 hover:bg-sky-800 active:bg-sky-900 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <span>MEMPROSES...</span>
            ) : (
              <>
                <span>DAFTAR SEKARANG</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
