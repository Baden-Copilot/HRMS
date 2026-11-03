import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Printer, QrCode, RotateCcw, X } from 'lucide-react';
import { generateQRCodeDataUrl } from '../utils/ticketGenerator.ts';

const STORAGE_KEY = 'estrada_registration_url';

export function defaultRegistrationUrl(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.origin}/`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLoopback(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

function readStoredUrl(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && isHttpUrl(saved)) return saved;
  } catch {
    /* ignore private-mode storage errors */
  }
  return defaultRegistrationUrl();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[char];
  });
}

interface RegistrationQrCardProps {
  onClose?: () => void;
}

export const RegistrationQrCard: React.FC<RegistrationQrCardProps> = ({ onClose }) => {
  const [url, setUrl] = useState(readStoredUrl);
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const trimmed = url.trim();
  const valid = isHttpUrl(trimmed);

  useEffect(() => {
    if (!valid) {
      setQrUrl('');
      return;
    }

    let cancelled = false;
    generateQRCodeDataUrl(trimmed).then((data) => {
      if (!cancelled) setQrUrl(data);
    });

    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }

    return () => {
      cancelled = true;
    };
  }, [trimmed, valid]);

  const copyLink = async () => {
    if (!valid) return;
    try {
      await navigator.clipboard.writeText(trimmed);
    } catch {
      const input = document.createElement('textarea');
      input.value = trimmed;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const downloadPng = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = 'qr-registrasi-estrada.png';
    link.click();
  };

  const printQr = () => {
    if (!qrUrl || !valid) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=520,height=760');
    if (!popup) return;
    popup.document.write(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>QR Registrasi Estrada</title>
  <style>
    body { margin: 0; font-family: "Plus Jakarta Sans", system-ui, sans-serif; color: #102C45; }
    .sheet { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 32px; }
    .kicker { letter-spacing: .22em; font-size: 12px; font-weight: 700; }
    h1 { margin: 8px 0 0; font-size: 28px; }
    p { margin: 8px 0 0; color: #475569; font-size: 14px; }
    img { width: 280px; height: 280px; margin: 24px 0; }
    .url { font-family: ui-monospace, monospace; font-size: 12px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="kicker">ESTRADA</div>
    <h1>Registrasi Peserta</h1>
    <p>Scan QR ini untuk langsung mengisi formulir pendaftaran.</p>
    <img src="${qrUrl}" alt="QR registrasi Estrada" onload="window.print()" />
    <div class="url">${escapeHtml(trimmed)}</div>
  </div>
</body>
</html>`);
    popup.document.close();
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/70 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-black text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5 text-[#4A3B73]" />
            QR Formulir Registrasi
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Scan langsung membuka formulir. Peserta tidak perlu mengetik alamat.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs">
          {qrUrl ? (
            <img src={qrUrl} alt="QR code formulir registrasi Estrada" className="w-44 h-44 sm:w-52 sm:h-52" />
          ) : (
            <div className="w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center text-center text-[11px] text-slate-400 px-4">
              Masukkan URL yang valid untuk membuat QR.
            </div>
          )}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold text-slate-600">URL yang di-encode QR</span>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
          spellCheck={false}
          className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-[#4A3B73] focus:bg-white"
        />
      </label>

      {!valid && (
        <p className="text-[11px] text-rose-600">URL harus diawali http:// atau https://</p>
      )}
      {valid && isLoopback(trimmed) && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Alamat localhost hanya terbuka di komputer ini. Ganti dengan IP jaringan atau domain publik supaya HP peserta bisa scan.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyLink}
          disabled={!valid}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#102C45] text-white text-[11px] font-bold disabled:opacity-40"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Tersalin' : 'Salin tautan'}
        </button>
        <button
          type="button"
          onClick={downloadPng}
          disabled={!qrUrl}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          Unduh PNG
        </button>
        <button
          type="button"
          onClick={printQr}
          disabled={!qrUrl}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold disabled:opacity-40"
        >
          <Printer className="w-3.5 h-3.5" />
          Cetak
        </button>
        {trimmed !== defaultRegistrationUrl() && (
          <button
            type="button"
            onClick={() => setUrl(defaultRegistrationUrl())}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 text-[11px] font-bold hover:text-slate-800"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Pakai alamat situs ini
          </button>
        )}
      </div>
    </div>
  );
};

export const RegistrationQrModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
    onClick={onClose}
  >
    <div className="w-full max-w-md my-4" onClick={(e) => e.stopPropagation()}>
      <RegistrationQrCard onClose={onClose} />
    </div>
  </div>
);
