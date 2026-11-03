import React, { useEffect, useState } from 'react';
import { notifyEventChanged } from '../eventSchedule.ts';
import { formatEventDate, formatEventTime } from '../utils/datetime.ts';

interface EventRow {
  id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  active: number;
}

const blank = { event_date: '', start_time: '08:30', end_time: '16:30', venue: '' };

export const EventMaster: React.FC = () => {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch('/api/admin/events');
    const data = await res.json();
    if (data.success) setRows(data.events);
  };

  useEffect(() => {
    load().catch(() => setError('Gagal memuat master acara.'));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(editingId ? `/api/admin/events/${editingId}` : '/api/admin/events', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Gagal menyimpan acara.');
        return;
      }
      setForm(blank);
      setEditingId(null);
      await load();
      notifyEventChanged();
    } catch {
      setError('Gagal menyimpan acara.');
    } finally {
      setBusy(false);
    }
  };

  const activate = async (id: number) => {
    setError('');
    const res = await fetch(`/api/admin/events/${id}/active`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || 'Gagal mengaktifkan acara.');
      return;
    }
    await load();
    notifyEventChanged();
  };

  const remove = async (row: EventRow) => {
    if (!window.confirm(`Hapus acara ${formatEventDate(row.event_date, 'short')}?`)) return;
    const res = await fetch(`/api/admin/events/${row.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok || !data.success) {
      setError(data.error || 'Gagal menghapus acara.');
      return;
    }
    if (editingId === row.id) {
      setEditingId(null);
      setForm(blank);
    }
    await load();
    notifyEventChanged();
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/70 p-5 space-y-5">
      <div>
        <h3 className="text-sm font-black text-slate-900 tracking-tight">Master Acara</h3>
        <p className="text-xs text-slate-500">Tanggal, jam, dan lokasi. Hanya acara yang diaktifkan yang tampil di QR.</p>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
        <label className="space-y-1">
          <span className="text-[11px] font-bold text-slate-600">Tanggal</span>
          <input required type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-bold text-slate-600">Jam mulai</span>
          <input required type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-bold text-slate-600">Jam selesai</span>
          <input required type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        </label>
        <label className="space-y-1 lg:col-span-1">
          <span className="text-[11px] font-bold text-slate-600">Lokasi</span>
          <input required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Grand Ballroom JCC Senayan" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="flex-1 rounded-xl bg-[#4A3B73] text-white text-xs font-bold py-2 disabled:opacity-50">
            {editingId ? 'Simpan' : 'Tambah'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(blank); }} className="rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600">
              Batal
            </button>
          )}
        </div>
      </form>
      {error && <p className="text-xs text-rose-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
              <th className="py-2 pr-3">Tanggal</th>
              <th className="py-2 pr-3">Jam</th>
              <th className="py-2 pr-3">Lokasi</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-slate-400">Belum ada acara.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50">
                <td className="py-3 pr-3 font-semibold text-slate-800 whitespace-nowrap">{formatEventDate(row.event_date, 'short')}</td>
                <td className="py-3 pr-3 whitespace-nowrap">{formatEventTime(row.start_time, row.end_time)}</td>
                <td className="py-3 pr-3">{row.venue}</td>
                <td className="py-3 pr-3">
                  {row.active ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Aktif</span>
                  ) : (
                    <button type="button" onClick={() => activate(row.id)} className="text-[11px] font-bold text-[#4A3B73] hover:underline">Aktifkan</button>
                  )}
                </td>
                <td className="py-3 text-right whitespace-nowrap space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(row.id);
                      setForm({
                        event_date: row.event_date,
                        start_time: row.start_time.slice(0, 5),
                        end_time: row.end_time.slice(0, 5),
                        venue: row.venue,
                      });
                    }}
                    className="font-bold text-slate-600 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(row)} className="font-bold text-rose-600 hover:text-rose-800">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
