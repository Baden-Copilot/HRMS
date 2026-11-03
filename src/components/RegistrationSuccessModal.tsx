import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  Printer, 
  X, 
  QrCode, 
  Send
} from 'lucide-react';
import { Participant } from '../types.ts';
import { generateQRCodeDataUrl, downloadPdfTicket, ticketPageUrl, ticketQrPayload } from '../utils/ticketGenerator.ts';
import { formatRegisteredAt } from '../utils/datetime.ts';

interface RegistrationSuccessModalProps {
  participant: Participant | null;
  notificationInfo?: any;
  onClose: () => void;
  onOpenBadge: (p: Participant) => void;
}

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  participant,
  onClose,
  onOpenBadge
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (participant) {
      generateQRCodeDataUrl(ticketQrPayload(participant)).then(setQrCodeUrl);
    }
  }, [participant]);

  if (!participant) return null;

  const pageUrl = ticketPageUrl(participant);

  const handleDownloadTicket = async () => {
    try {
      setDownloadingPdf(true);
      await downloadPdfTicket(participant);
    } catch (err) {
      console.error('Error downloading ticket PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const waClean = participant.phone_wa.replace(/\+/g, '');
  const waMessage = encodeURIComponent(
    `*ESTRADA 2026 — Tiket Masuk*\n\n` +
    `Nama: *${participant.full_name}*\n` +
    `No. Registrasi: *${participant.reg_number}*\n` +
    `Instansi: ${participant.institution_name}\n` +
    `Jabatan: ${participant.role_position}\n` +
    `Waktu registrasi: ${formatRegisteredAt(participant.created_at)}\n` +
    `Status: Terdaftar\n` +
    `Tiket: ${pageUrl}\n\n` +
    `Tunjukkan pesan ini & QR Code pada pintu masuk acara.`
  );
  const waUrl = `https://wa.me/${waClean}?text=${waMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header Ringkas */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Pendaftaran Berhasil</h2>
              <p className="text-[11px] text-slate-400">ESTRADA Healthcare Technology 2026</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Card Tiket & QR */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            {/* QR Box */}
            <div className="shrink-0 bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-28 h-28 object-contain"
                />
              ) : (
                <div className="w-28 h-28 bg-slate-100 flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-slate-400 animate-pulse" />
                </div>
              )}
            </div>

            {/* Detail Peserta Ringkas */}
            <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  No. Registrasi
                </span>
                <span className="font-mono text-xl font-black text-sky-700 tracking-tight block">
                  {participant.reg_number}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Peserta
                </span>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {participant.full_name}
                </p>
                <p className="text-xs text-slate-600 truncate">
                  {participant.institution_name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {participant.role_position} · {participant.city}
                </p>
                <p className="text-[11px] font-mono text-slate-500">
                  {formatRegisteredAt(participant.created_at)}
                </p>
              </div>

              <div className="pt-1">
                <span className="inline-block font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                  {participant.status || 'Terdaftar'}
                </span>
              </div>
              <a
                href={pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block pt-1 text-[11px] leading-snug text-sky-700 break-all"
              >
                {pageUrl}
              </a>
            </div>
          </div>

          {/* Tombol Aksi Langsung */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleDownloadTicket}
              disabled={downloadingPdf}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingPdf ? '...' : 'Unduh PDF'}</span>
            </button>

            <button
              onClick={() => onOpenBadge(participant)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu</span>
            </button>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs text-center"
            >
              <Send className="w-4 h-4" />
              <span>Kirim WA</span>
            </a>
          </div>

          {/* Info Singkat */}
          <div className="bg-sky-50 border border-sky-100 rounded-lg p-2.5 flex items-center justify-between text-xs text-sky-900">
            <span className="truncate">WA: <strong className="font-mono">{participant.phone_wa}</strong></span>
            <span className="text-[11px] text-slate-500 shrink-0">Buka 07.45 WIB</span>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
