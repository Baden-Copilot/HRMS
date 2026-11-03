import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, Download, Sparkles, Building2, UserCheck, Shield } from 'lucide-react';
import { Participant } from '../types.ts';
import { generateQRCodeDataUrl, ticketPageUrl, ticketQrPayload } from '../utils/ticketGenerator.ts';
import { formatRegisteredAt, formatEventLine } from '../utils/datetime.ts';
import { useActiveEvent } from '../eventSchedule.ts';

interface VisitorBadgeModalProps {
  participant: Participant | null;
  onClose: () => void;
}

export const VisitorBadgeModal: React.FC<VisitorBadgeModalProps> = ({ participant, onClose }) => {
  const event = useActiveEvent();
  const [qrUrl, setQrUrl] = useState<string>('');
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (participant) {
      generateQRCodeDataUrl(ticketQrPayload(participant)).then(setQrUrl);
    }
  }, [participant]);

  if (!participant) return null;

  const handlePrint = () => {
    window.print();
  };

  const getRoleBadgeStyle = (role: string) => {
    if (role.includes('Direktur')) {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    if (role.includes('Mitra')) {
      return 'bg-sky-100 text-sky-900 border-sky-300';
    }
    return 'bg-purple-100 text-purple-900 border-purple-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-4 print:shadow-none print:border-none print:w-full print:max-w-none">
        {/* Modal Controls (hidden on print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
            <UserCheck className="w-4 h-4" />
            <span>KARTU IDENTITAS PESERTA (ID BADGE)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE BADGE CONTAINER */}
        <div className="p-6 flex justify-center bg-slate-100 print:p-0 print:bg-white">
          <div 
            ref={badgeRef}
            className="w-[340px] bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col print:border print:border-slate-400 print:shadow-none"
            style={{ minHeight: '490px' }}
          >
            {/* Lanyard Hole Guide */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-2.5 rounded-full bg-slate-200 border border-slate-300"></div>
            </div>

            {/* Top Brand Banner */}
            <div className="bg-slate-900 text-white px-5 py-4 text-center relative">
              <div className="text-[10px] tracking-widest text-sky-400 font-bold uppercase">
                HEALTHCARE TECHNOLOGY SUMMIT 2026
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
                ESTRADA
              </h1>
              <div className="h-0.5 w-12 bg-sky-500 mx-auto mt-1.5"></div>
            </div>

            {/* Participant Category Pill */}
            <div className="px-5 pt-4 text-center">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${getRoleBadgeStyle(participant.role_position)}`}>
                {participant.role_position}
              </span>
            </div>

            {/* Attendee Name & Instansi */}
            <div className="px-5 pt-3 pb-2 text-center flex-1 flex flex-col justify-center">
              <h2 className="text-base font-extrabold text-slate-900 leading-snug">
                {participant.full_name}
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-1">
                {participant.institution_name}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {participant.city}
              </p>
            </div>

            {/* Visitor QR Code */}
            <div className="px-5 py-3 bg-slate-50 border-t border-b border-slate-200 flex flex-col items-center">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                {qrUrl ? (
                  <img src={qrUrl} alt="Visitor QR" className="w-32 h-32 object-contain" />
                ) : (
                  <div className="w-32 h-32 bg-slate-100 flex items-center justify-center">
                    <span className="text-xs text-slate-400">Loading QR...</span>
                  </div>
                )}
              </div>
              <div className="mt-1 text-center">
                <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                  {participant.reg_number}
                </span>
                <span className="block text-[9px] font-mono text-slate-500">
                  {formatRegisteredAt(participant.created_at)}
                </span>
                <a
                  href={ticketPageUrl(participant)}
                  className="block max-w-[280px] text-[8px] leading-snug text-sky-700 break-all"
                >
                  {ticketPageUrl(participant)}
                </a>
              </div>
            </div>

            {/* Badge Footer */}
            <div className="px-5 py-2.5 bg-slate-900 text-white text-center text-[10px]">
              {event && <span className="text-slate-300">{formatEventLine(event)}</span>}
            </div>
          </div>
        </div>

        {/* Modal Bottom Note (hidden on print) */}
        <div className="p-3 bg-white border-t border-slate-200 text-[11px] text-slate-500 text-center print:hidden">
          Format kartu ID: 9x13 cm (Kertas Lanyard).
        </div>
      </div>
    </div>
  );
};
