import React, { useState } from 'react';
import { useBrand } from '../brand.ts';
import { RegistrationQrModal } from './RegistrationQrCard.tsx';

export type AppView = 'register' | 'admin';

interface NavbarProps {
  setActiveView: (view: AppView) => void;
  onOpenTicketLookup: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  setActiveView,
  onOpenTicketLookup
}) => {
  const brand = useBrand();
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <header className="w-full bg-[#F3F6FA]">
      <div className="max-w-2xl mx-auto px-3 sm:px-5 h-12 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900 shrink-0 min-w-0">
          {brand.icon_url && (
            <img src={brand.icon_url} alt="" className="w-7 h-7 rounded-md object-cover" />
          )}
          Estrada
        </span>
        <div className="flex items-center gap-3 sm:gap-4 text-sm shrink-0">
          <button
            onClick={() => setQrOpen(true)}
            className="text-slate-600 hover:text-slate-900"
          >
            QR Daftar
          </button>
          <button
            onClick={onOpenTicketLookup}
            className="text-slate-600 hover:text-slate-900"
          >
            Cek tiket
          </button>
          <button
            onClick={() => setActiveView('admin')}
            className="text-slate-400 hover:text-slate-700"
          >
            Admin
          </button>
        </div>
      </div>
      {qrOpen && <RegistrationQrModal onClose={() => setQrOpen(false)} />}
    </header>
  );
};
