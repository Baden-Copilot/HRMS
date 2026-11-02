import React, { useEffect, useRef, useState } from 'react';
import { notifyBrandChanged, useBrand } from '../brand.ts';

type Kind = 'icon' | 'image';

export const BrandSettings: React.FC = () => {
  const brand = useBrand();

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-5">
      <div>
        <h3 className="text-sm font-black text-slate-900 tracking-tight">Pengaturan Gambar</h3>
        <p className="text-xs text-slate-500">Ikon dan gambar ini tampil di formulir pendaftaran serta tiket peserta.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AssetCard
          kind="icon"
          title="Ikon"
          hint="Logo kecil di pojok header. PNG, JPG, WEBP, atau GIF, maksimal 800 KB."
          url={brand.icon_url}
        />
        <AssetCard
          kind="image"
          title="Gambar"
          hint="Banner di header formulir dan tiket. Maksimal 2,5 MB."
          url={brand.image_url}
        />
      </div>
    </div>
  );
};

function AssetCard({
  kind,
  title,
  hint,
  url,
}: {
  kind: Kind;
  title: string;
  hint: string;
  url: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(url);

  useEffect(() => {
    setPreview(url);
  }, [url]);

  const upload = async (file: File) => {
    setError('');
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError('Gunakan berkas PNG, JPG, WEBP, atau GIF.');
      return;
    }
    const max = kind === 'icon' ? 800 * 1024 : 2.5 * 1024 * 1024;
    if (file.size > max) {
      setError(kind === 'icon' ? 'Ikon maksimal 800 KB.' : 'Gambar maksimal 2,5 MB.');
      return;
    }
    const dataUrl = await readFile(file);
    setPreview(dataUrl);
    setBusy(true);
    try {
      const res = await fetch('/api/admin/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, data_url: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menyimpan.');
        setPreview(url);
        return;
      }
      notifyBrandChanged();
    } catch {
      setError('Koneksi server terputus.');
      setPreview(url);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/brand/${kind}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menghapus.');
        return;
      }
      setPreview(null);
      notifyBrandChanged();
    } catch {
      setError('Koneksi server terputus.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{hint}</p>
      </div>
      <div className={`bg-[#F4F5FA] border border-slate-200 rounded-xl overflow-hidden flex items-center justify-center ${kind === 'icon' ? 'h-28' : 'h-36'}`}>
        {preview ? (
          <img src={preview} alt="" className={kind === 'icon' ? 'w-16 h-16 rounded-xl object-cover bg-white' : 'w-full h-full object-cover'} />
        ) : (
          <span className="text-xs text-slate-400">{kind === 'icon' ? 'Huruf E bawaan' : 'Belum ada gambar'}</span>
        )}
      </div>
      {error && <p className="text-xs text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 bg-[#4A3B73] hover:bg-[#3D2E62] disabled:opacity-50 text-white rounded-xl text-xs font-bold"
        >
          {busy ? 'Menyimpan...' : 'Pilih berkas'}
        </button>
        {preview && (
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold"
          >
            Hapus
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) upload(file);
        }}
      />
    </div>
  );
}

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
}
