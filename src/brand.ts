import { useEffect, useState } from 'react';

export interface BrandAssets {
  icon_url: string | null;
  image_url: string | null;
}

const empty: BrandAssets = { icon_url: null, image_url: null };
let cache: Promise<BrandAssets> | null = null;

export function loadBrand() {
  if (!cache) {
    cache = fetch('/api/brand')
      .then(res => res.json())
      .then(data => ({
        icon_url: data.icon_url || null,
        image_url: data.image_url || null,
      }))
      .catch(() => empty);
  }
  return cache;
}

export function notifyBrandChanged() {
  cache = null;
  window.dispatchEvent(new Event('estrada-brand'));
}

function applyFavicon(iconUrl: string | null) {
  if (!iconUrl) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = iconUrl;
}

export function useBrand() {
  const [brand, setBrand] = useState<BrandAssets>(empty);

  useEffect(() => {
    let live = true;
    const pull = () => {
      loadBrand().then(next => {
        if (!live) return;
        setBrand(next);
        applyFavicon(next.icon_url);
      });
    };
    pull();
    window.addEventListener('estrada-brand', pull);
    return () => {
      live = false;
      window.removeEventListener('estrada-brand', pull);
    };
  }, []);

  return brand;
}
