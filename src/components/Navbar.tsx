import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, QrCode, Ticket } from 'lucide-react';
import { useBrand } from '../brand.ts';
import { RegistrationQrModal } from './RegistrationQrCard.tsx';

export type AppView = 'register' | 'admin';

interface NavbarProps {
  onOpenTicketLookup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenTicketLookup }) => {
  const brand = useBrand();
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <header className="w-full bg-[#F3F6FA]">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 h-12 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900 shrink-0 min-w-0">
          {brand.icon_url && (
            <img src={brand.icon_url} alt="" className="w-7 h-7 rounded-md object-cover" />
          )}
          Estrada
        </span>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Menu
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-40"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setQrOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                <QrCode className="w-4 h-4 text-slate-400" />
                QR Daftar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenTicketLookup();
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
              >
                <Ticket className="w-4 h-4 text-slate-400" />
                Cek tiket
              </button>
            </div>
          )}
        </div>
      </div>
      {qrOpen && <RegistrationQrModal onClose={() => setQrOpen(false)} />}
    </header>
  );
};
