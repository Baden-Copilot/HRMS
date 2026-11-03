import fs from 'fs';
import path from 'path';
import { data, mutate, stamp } from './db.ts';

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
  return data().app_settings.find((item) => item.key === kind);
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
  mutate((store) => {
    const saved = store.app_settings.find((item) => item.key === kind);
    const updated_at = stamp();
    if (saved) {
      saved.value = filename;
      saved.updated_at = updated_at;
    } else {
      store.app_settings.push({ key: kind, value: filename, updated_at });
    }
  });

  return publicBrand();
}

export function clearBrand(kind: string) {
  if (!isKind(kind)) throw new Error('Jenis berkas tidak dikenal.');
  clearFiles(kind);
  mutate((store) => {
    store.app_settings = store.app_settings.filter((item) => item.key !== kind);
  });
  return publicBrand();
}

function clearFiles(kind: BrandKind) {
  if (!fs.existsSync(brandDir)) return;
  for (const name of fs.readdirSync(brandDir)) {
    if (name.startsWith(`${kind}.`)) fs.unlinkSync(path.join(brandDir, name));
  }
}
