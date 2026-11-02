import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Participant, TechnologyTopic } from '../types.ts';

interface RegistrationFormProps {
  onSuccess: (participant: Participant, notificationInfo: any) => void;
}

const CITIES = [
  'Ambon',
  'Balikpapan',
  'Banda Aceh',
  'Bandar Lampung',
  'Bandung',
  'Banjarmasin',
  'Batam',
  'Bekasi',
  'Bengkulu',
  'Bogor',
  'Cirebon',
  'Denpasar',
  'Depok',
  'DKI Jakarta',
  'Gorontalo',
  'Jambi',
  'Jayapura',
  'Kediri',
  'Kendari',
  'Kupang',
  'Makassar',
  'Malang',
  'Manado',
  'Mataram',
  'Medan',
  'Padang',
  'Palembang',
  'Palu',
  'Pekanbaru',
  'Pontianak',
  'Samarinda',
  'Semarang',
  'Serang',
  'Solo',
  'Surabaya',
  'Tangerang',
  'Tangerang Selatan',
  'Tasikmalaya',
  'Yogyakarta',
];

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const [topics, setTopics] = useState<TechnologyTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Form State
  const [fullName, setFullName] = useState('');
  const [rolePosition, setRolePosition] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [phoneWa, setPhoneWa] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [cityCustom, setCityCustom] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [pdpConsent, setPdpConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const resolvedCity = (city === '__other__' ? cityCustom : city).trim();

  // UI States
  const [step, setStep] = useState<1 | 2>(1);
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

  const profileError = () => {
    if (!fullName.trim()) return 'Nama Lengkap wajib diisi.';
    if (!rolePosition) return 'Jabatan / Posisi wajib dipilih.';
    if (!institutionName.trim()) return 'Nama RS / Instansi wajib diisi.';
    if (phoneWa.replace(/\D/g, '').length < 9) return 'Nomor WhatsApp tidak valid.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Alamat email tidak valid.';
    if (!resolvedCity) return 'Kota domisili wajib diisi.';
    return '';
  };

  const goToStep = (next: 1 | 2) => {
    setStep(next);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const profile = profileError();
    if (profile) {
      setStep(1);
      setErrorMessage(profile);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (step === 1) {
      goToStep(2);
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
          city: resolvedCity,
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
    <div id="registration-form-section" className="w-full min-w-0">
      <header className="bg-[#102C45] text-white rounded-2xl p-5 sm:p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[#102C45] shrink-0">
            <span className="text-xl font-bold">E</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold tracking-[3px] text-lg">ESTRADA</h2>
            <p className="text-[10px] text-blue-200 tracking-wider">HEALTHCARE TECHNOLOGY</p>
          </div>
        </div>
        <div className="mt-7">
          <span className="text-xs text-blue-200 tracking-widest">EVENT REGISTRATION</span>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2">Registrasi Peserta</h1>
          <p className="text-sm text-blue-100 mt-3 leading-relaxed break-words">
            Silakan lengkapi data diri dan informasi instansi Anda untuk mengikuti acara Estrada.
          </p>
        </div>
        <div className="mt-6">
          <div className="flex gap-1.5">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full ${n <= step ? 'bg-blue-300' : 'bg-white/25'}`}
              />
            ))}
          </div>
          <p className="text-[11px] text-blue-200 mt-2 tracking-wide">Langkah {step} dari 2</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm mt-4 p-4 sm:p-8 space-y-8">
        <input
          type="text"
          name="website_secondary"
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
        />

        {step === 1 && (
        <section className="space-y-5">
          <SectionTitle
            number="01"
            title="Informasi Peserta"
            description="Lengkapi identitas dan informasi kontak Anda."
          />
          <div className="space-y-4">
            <InputField label="Nama Lengkap" required>
              <input
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Contoh: dr. Budi Santoso, M.Kes."
                autoComplete="name"
                className="field"
              />
            </InputField>

            <InputField label="Jabatan / Posisi" required>
              <select
                required
                value={rolePosition}
                onChange={e => setRolePosition(e.target.value)}
                className="field"
              >
                <option value="">Pilih jabatan / posisi</option>
                <option value="Direktur / Wakil Manajemen Rumah Sakit">Direktur / Wakil Manajemen Rumah Sakit</option>
                <option value="Mitra Telkom">Mitra Telkom</option>
                <option value="Narasumber">Narasumber</option>
              </select>
            </InputField>

            <InputField label="Nama Rumah Sakit / Perusahaan / Instansi" required>
              <input
                required
                value={institutionName}
                onChange={e => setInstitutionName(e.target.value)}
                placeholder="Masukkan nama instansi"
                autoComplete="organization"
                className="field"
              />
            </InputField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField label="Nomor WhatsApp Aktif" required>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={phoneWa}
                  onChange={e => setPhoneWa(e.target.value)}
                  placeholder="081234567890"
                  autoComplete="tel"
                  className="field"
                />
              </InputField>
              <InputField label="Kota / Domisili Instansi" required>
                <select
                  required
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="field"
                >
                  <option value="">Pilih kota / domisili</option>
                  {CITIES.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="__other__">Lainnya</option>
                </select>
              </InputField>
            </div>

            {city === '__other__' && (
              <InputField label="Nama Kota" required>
                <input
                  required
                  value={cityCustom}
                  onChange={e => setCityCustom(e.target.value)}
                  placeholder="Tulis nama kota"
                  className="field"
                />
              </InputField>
            )}

            <InputField label="Alamat Email Aktif" required>
              <input
                required
                type="email"
                inputMode="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                className="field"
              />
            </InputField>
          </div>
        </section>
        )}

        {step === 2 && (
        <>
        <section id="topics-section" className="space-y-5 min-w-0">
          <SectionTitle
            number="02"
            title="Minat Teknologi"
            description="Pilih satu atau lebih topik yang menjadi perhatian Anda. Bagian ini opsional."
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">Pilihan topik</span>
            <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full shrink-0">
              {selectedTopics.length} dipilih
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {loadingTopics ? (
              <p className="text-sm text-slate-500">Memuat topik...</p>
            ) : (
              topics.map((topic, index) => {
                const active = selectedTopics.includes(topic.code);
                return (
                  <label
                    key={topic.code}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer min-h-[68px] min-w-0 ${
                      active
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleTopic(topic.code)}
                      className="w-5 h-5 mt-0.5 shrink-0 accent-blue-700"
                    />
                    <span className="text-sm leading-relaxed text-slate-700 min-w-0 break-words">
                      <span className="font-semibold text-slate-400 mr-1">
                        {topic.code || String.fromCharCode(65 + index)}.
                      </span>
                      {topic.title}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </section>

        <section className="space-y-4">
          <label className="flex gap-3 items-start bg-slate-50 p-4 rounded-xl cursor-pointer min-w-0">
            <input
              required
              type="checkbox"
              checked={pdpConsent}
              onChange={e => setPdpConsent(e.target.checked)}
              className="w-5 h-5 mt-0.5 shrink-0 accent-blue-700"
            />
            <span className="text-sm leading-relaxed text-slate-600 min-w-0 break-words">
              Saya menyetujui penggunaan data pribadi saya untuk keperluan administrasi dan komunikasi terkait kegiatan Estrada sesuai kebijakan privasi.
            </span>
          </label>
        </section>
        </>
        )}

        {errorMessage && (
          <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">{errorMessage}</div>
        )}

        {step === 1 ? (
          <button
            type="submit"
            className="w-full min-h-[54px] rounded-xl bg-[#102C45] hover:bg-[#193F60] active:scale-[0.99] text-white font-bold text-sm tracking-wide transition"
          >
            LANJUT →
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3">
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="min-h-[54px] px-6 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm tracking-wide hover:bg-slate-50"
            >
              ← KEMBALI
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[54px] rounded-xl bg-[#102C45] hover:bg-[#193F60] active:scale-[0.99] text-white font-bold text-sm tracking-wide transition disabled:opacity-50"
            >
              {submitting ? 'MENGIRIM...' : 'DAFTAR SEKARANG →'}
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          ESTRADA · Healthcare Technology & Innovation
        </p>
      </form>
    </div>
  );
}

function SectionTitle({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div className="min-w-0">
        <h2 className="font-bold text-lg text-slate-800">{title}</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed break-words">{description}</p>
      </div>
    </div>
  );
}

function InputField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2 min-w-0">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
