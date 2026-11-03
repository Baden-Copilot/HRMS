import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Printer, RotateCcw, X } from 'lucide-react';
import { useBrand } from '../brand.ts';
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

function absoluteAsset(path: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

interface RegistrationQrCardProps {
  onClose?: () => void;
}

export const RegistrationQrCard: React.FC<RegistrationQrCardProps> = ({ onClose }) => {
  const brand = useBrand();
  const [url, setUrl] = useState(readStoredUrl);
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
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

  const downloadPng = async () => {
    if (!qrUrl || downloading) return;
    setDownloading(true);
    try {
      const [logoImg, bannerImg, qrImg] = await Promise.all([
        brand.icon_url ? loadImage(absoluteAsset(brand.icon_url)) : Promise.resolve(null),
        brand.image_url ? loadImage(absoluteAsset(brand.image_url)) : Promise.resolve(null),
        loadImage(qrUrl),
      ]);
      if (!qrImg) return;

      const width = 800;
      const headerH = 112;
      const bannerH = bannerImg ? 180 : 0;
      const qrSize = 320;
      const measure = document.createElement('canvas').getContext('2d');
      if (!measure) return;
      measure.font = '500 22px "Plus Jakarta Sans", sans-serif';
      const urlLines = wrapCanvasText(measure, trimmed, width - 96);
      const height = headerH + bannerH + 148 + qrSize + 28 + urlLines.length * 28 + 132;

      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#102C45';
      ctx.fillRect(0, 0, width, headerH);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(32, 20, 72, 72, 14);
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(32, 20, 72, 72);
      if (logoImg) ctx.drawImage(logoImg, 32, 20, 72, 72);
      ctx.restore();
      if (!logoImg) {
        ctx.fillStyle = '#102C45';
        ctx.font = '800 34px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', 68, 56);
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('ESTRADA', 120, 52);
      ctx.fillStyle = '#bfdbfe';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('HEALTHCARE TECHNOLOGY', 120, 76);

      ctx.font = '700 18px "Plus Jakarta Sans", sans-serif';
      const pill = 'QR Daftar';
      const pillW = ctx.measureText(pill).width + 28;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(width - 32 - pillW, 38, pillW, 36, 18);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(pill, width - 32 - pillW / 2, 62);

      if (bannerImg) ctx.drawImage(bannerImg, 0, headerH, width, bannerH);

      let y = headerH + bannerH + 36;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('EVENT REGISTRATION', width / 2, y);
      y += 40;
      ctx.fillStyle = '#102033';
      ctx.font = '800 40px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Registrasi Peserta', width / 2, y);
      y += 32;
      ctx.fillStyle = '#475569';
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Scan untuk langsung mengisi formulir.', width / 2, y);
      y += 28;
      ctx.drawImage(qrImg, (width - qrSize) / 2, y, qrSize, qrSize);
      y += qrSize + 28;
      ctx.fillStyle = '#102C45';
      ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
      for (const line of urlLines) {
        ctx.fillText(line, width / 2, y);
        y += 28;
      }

      y += 16;
      ctx.fillStyle = '#64748b';
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('TANGGAL', width * 0.28, y);
      ctx.fillText('WAKTU', width * 0.72, y);
      y += 28;
      ctx.fillStyle = '#102033';
      ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('15 November 2026', width * 0.28, y);
      ctx.fillText('08.30–16.30 WIB', width * 0.72, y);
      y += 40;
      ctx.fillStyle = '#334155';
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Grand Ballroom, Jakarta Convention Center', width / 2, y);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'qr-registrasi-estrada.png';
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const printQr = () => {
    if (!qrUrl || !valid) return;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=520,height=760');
    if (!popup) return;
    const logo = absoluteAsset(brand.icon_url);
    const banner = absoluteAsset(brand.image_url);
    popup.document.write(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>QR Registrasi Estrada</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; }
    body {
      min-height: 100vh;
      background: #E7EEF4;
      color: #102033;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    }
    main {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem 0.9rem 2rem;
    }
    .ticket {
      width: min(100%, 26rem);
      background: #fff;
      border-radius: 18px;
      overflow: hidden;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem 1.15rem;
      background: #102C45;
      color: #fff;
    }
    .brand { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
    .mark {
      width: 2.4rem; height: 2.4rem; flex: none;
      border-radius: 0.7rem; background: #fff; color: #102C45;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; object-fit: cover;
    }
    .brand strong { display: block; letter-spacing: 0.16em; font-size: 0.95rem; }
    .brand small { display: block; margin-top: 2px; color: #bfdbfe; letter-spacing: 0.08em; font-size: 9px; }
    .kind {
      margin: 0; flex: none;
      padding: 0.35rem 0.55rem;
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 999px;
      font-size: 11px;
    }
    .banner { display: block; width: 100%; height: 7.5rem; object-fit: cover; background: #0b1c2e; }
    .identity { padding: 1.15rem 1.15rem 0.2rem; text-align: center; }
    .kicker { margin: 0; color: #64748b; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0.3rem 0 0; font-size: 1.55rem; line-height: 1.25; }
    .hint { margin: 0.45rem 0 0; color: #475569; font-size: 0.86rem; }
    .qr-wrap { display: flex; justify-content: center; padding: 0.8rem 1.15rem 0.2rem; }
    .qr-wrap img { width: 220px; height: 220px; }
    .url {
      margin: 0;
      padding: 0 1.15rem 0.4rem;
      text-align: center;
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.72rem;
      color: #102C45;
      word-break: break-all;
    }
    footer { padding: 0.35rem 1.15rem 1.15rem; }
    .when { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .when p { margin: 0; display: grid; gap: 0.15rem; }
    .when span { color: #64748b; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .when strong { font-size: 0.92rem; }
    .place { margin: 0.85rem 0 0; color: #334155; font-size: 0.88rem; }
    @media print {
      body { background: #fff; }
      main { padding: 0; min-height: auto; }
      .ticket { width: 100%; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <main>
    <article class="ticket">
      <header>
        <div class="brand">
          ${logo ? `<img class="mark" src="${escapeHtml(logo)}" alt="">` : '<span class="mark">E</span>'}
          <div>
            <strong>ESTRADA</strong>
            <small>HEALTHCARE TECHNOLOGY</small>
          </div>
        </div>
        <p class="kind">QR Daftar</p>
      </header>
      ${banner ? `<img class="banner" src="${escapeHtml(banner)}" alt="">` : ''}
      <div class="identity">
        <p class="kicker">Event Registration</p>
        <h1>Registrasi Peserta</h1>
        <p class="hint">Scan untuk langsung mengisi formulir.</p>
      </div>
      <div class="qr-wrap">
        <img src="${qrUrl}" alt="QR registrasi Estrada">
      </div>
      <p class="url">${escapeHtml(trimmed)}</p>
      <footer>
        <div class="when">
          <p><span>Tanggal</span><strong>15 November 2026</strong></p>
          <p><span>Waktu</span><strong>08.30–16.30 WIB</strong></p>
        </div>
        <p class="place">Grand Ballroom, Jakarta Convention Center</p>
      </footer>
    </article>
  </main>
</body>
</html>`);
    popup.document.close();
    const images = Array.from(popup.document.images);
    Promise.all(images.map((img) => img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }))).then(() => {
      popup.focus();
      popup.print();
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 overflow-hidden">
      <header className="bg-[#102C45] text-white p-5 relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 text-blue-100 hover:text-white p-1 rounded-lg hover:bg-white/10"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-11 h-11 bg-white rounded-xl overflow-hidden flex items-center justify-center text-[#102C45] shrink-0">
            {brand.icon_url ? (
              <img src={brand.icon_url} alt="Logo Estrada" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold">E</span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold tracking-[3px] text-lg leading-none">ESTRADA</h2>
            <p className="text-[10px] text-blue-200 tracking-wider mt-1">HEALTHCARE TECHNOLOGY</p>
          </div>
        </div>
        {brand.image_url && (
          <img src={brand.image_url} alt="" className="mt-4 w-full h-24 object-cover rounded-xl" />
        )}
        <div className="mt-5">
          <span className="text-[11px] text-blue-200 tracking-widest">EVENT REGISTRATION</span>
          <h1 className="text-xl font-bold mt-1">Registrasi Peserta</h1>
        </div>
      </header>

      <div className="p-5 space-y-4">
      <p className="text-[11px] text-slate-500">
        Scan langsung membuka formulir. Peserta tidak perlu mengetik alamat.
      </p>

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
          disabled={!qrUrl || downloading}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-[11px] font-bold disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Menyiapkan...' : 'Unduh PNG'}
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
