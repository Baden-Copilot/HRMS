import fs from 'fs';
import path from 'path';
import { db } from './db.ts';

const brandDir = path.resolve(process.cwd(), 'data', 'brand');
const kinds = ['icon', 'image'] as const;
export type BrandKind = (typeof kinds)[number];

const types: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

function isKind(value: string): value is BrandKind {
  return kinds.includes(value as BrandKind);
}

function row(kind: BrandKind) {
  return db.prepare('SELECT value, updated_at FROM app_settings WHERE key = ?').get(kind) as
    | { value: string; updated_at: string }
    | undefined;
}

function filePath(filename: string) {
  if (!/^(icon|image)\.(png|jpg|webp|gif)$/.test(filename)) return null;
  const full = path.join(brandDir, filename);
  return full.startsWith(brandDir) ? full : null;
}

export function publicBrand() {
  const result: { icon_url: string | null; image_url: string | null } = {
    icon_url: null,
    image_url: null,
  };
  for (const kind of kinds) {
    const saved = row(kind);
    const full = saved ? filePath(saved.value) : null;
    if (full && fs.existsSync(full)) {
      const version = encodeURIComponent(saved!.updated_at);
      result[`${kind}_url`] = `/brand/${kind}?v=${version}`;
    }
  }
  return result;
}

export function brandFile(kind: string) {
  if (!isKind(kind)) return null;
  const saved = row(kind);
  const full = saved ? filePath(saved.value) : null;
  if (!full || !fs.existsSync(full)) return null;
  const ext = path.extname(full).slice(1);
  return { file: full, type: types[ext] || 'application/octet-stream' };
}

export function saveBrand(kind: string, dataUrl: string) {
  if (!isKind(kind)) {
    throw new Error('Jenis berkas tidak dikenal.');
  }
  const match = String(dataUrl).match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new Error('Gunakan berkas PNG, JPG, WEBP, atau GIF.');
  }
  const ext = match[1] === 'jpeg' || match[1] === 'jpg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  const max = kind === 'icon' ? 800 * 1024 : 2.5 * 1024 * 1024;
  if (buffer.length < 32 || buffer.length > max) {
    throw new Error(kind === 'icon' ? 'Ikon maksimal 800 KB.' : 'Gambar maksimal 2,5 MB.');
  }

  fs.mkdirSync(brandDir, { recursive: true });
  clearFiles(kind);
  const filename = `${kind}.${ext}`;
  fs.writeFileSync(path.join(brandDir, filename), buffer);
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(kind, filename);

  return publicBrand();
}

export function clearBrand(kind: string) {
  if (!isKind(kind)) throw new Error('Jenis berkas tidak dikenal.');
  clearFiles(kind);
  db.prepare('DELETE FROM app_settings WHERE key = ?').run(kind);
  return publicBrand();
}

function clearFiles(kind: BrandKind) {
  if (!fs.existsSync(brandDir)) return;
  for (const name of fs.readdirSync(brandDir)) {
    if (name.startsWith(`${kind}.`)) fs.unlinkSync(path.join(brandDir, name));
  }
}
