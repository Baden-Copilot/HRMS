import React, { useState } from 'react';
import { Search, X, QrCode, AlertCircle, Download, Printer, User, Building2, MapPin, CheckCircle2 } from 'lucide-react';
import { Participant } from '../types.ts';
import { generateQRCodeDataUrl, downloadPdfTicket, ticketQrPayload } from '../utils/ticketGenerator.ts';

interface TicketLookupModalProps {
  onClose: () => void;
  onOpenBadge: (p: Participant) => void;
}

export const TicketLookupModal: React.FC<TicketLookupModalProps> = ({ onClose, onOpenBadge }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setParticipant(null);

    try {
      const res = await fetch(`/api/ticket/${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Data registrasi tidak ditemukan.');
        setLoading(false);
        return;
      }

      setParticipant(data.participant);
      const q = await generateQRCodeDataUrl(ticketQrPayload(data.participant));
      setQrUrl(q);
    } catch (err) {
      console.error('Lookup error:', err);
      setError('Gagal mencari tiket. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!participant) return;
    try {
      setDownloadingPdf(true);
      await downloadPdfTicket(participant);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold mb-1">
            <QrCode className="w-4 h-4" />
            <span>PENCARIAN E-TICKET RESMI</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Cek Pendaftaran & Unduh Tiket QR
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Masukkan Nomor Registrasi (contoh: ESTR-2026-000001) atau Nomor WhatsApp yang Anda daftarkan.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Nomor Registrasi atau WhatsApp (08xxxxxxx)..."
                className="w-full pl-10 pr-24 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 transition-all font-mono"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-1.5 top-1.5 px-4 py-1.5 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
              >
                {loading ? 'Mencari...' : 'Cari Data'}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900">
                <p className="font-bold">Tidak Ditemukan</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {participant && (
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-5 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs shrink-0 text-center">
                  {qrUrl && <img src={qrUrl} alt="QR Code" className="w-32 h-32 object-contain" />}
                  <span className="text-[10px] font-mono font-bold text-slate-500 block mt-1">
                    QR PASS PENGUNJUNG
                  </span>
                </div>

                <div className="flex-1 space-y-1.5 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">No. Registrasi</span>
                    <p className="font-mono text-lg font-black text-sky-800">{participant.reg_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">{participant.full_name}</p>
                    <p className="text-xs text-slate-600 font-medium">{participant.institution_name}</p>
                    <p className="text-xs text-slate-500">{participant.role_position} · {participant.city}</p>
                  </div>
                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs text-slate-500">Status:</span>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      {participant.status || 'Terdaftar'}
                    </span>
                    {participant.check_in_time && (
                      <span className="text-[11px] text-slate-500">
                        (Check-in: {new Date(participant.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Topics selected */}
              {participant.topics && participant.topics.length > 0 && (
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Fokus Topik Teknologi yang Dipilih ({participant.topics.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {participant.topics.map(t => (
                      <span key={t.code} className="text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                        <strong className="text-sky-700 font-mono mr-1">[{t.code}]</strong>
                        {t.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDownload}
                  disabled={downloadingPdf}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingPdf ? 'Mengunduh...' : 'Unduh Tiket PDF'}</span>
                </button>
                <button
                  onClick={() => onOpenBadge(participant)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak ID Badge</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
