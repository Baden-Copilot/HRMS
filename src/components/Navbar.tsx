import React, { useState } from 'react';
import { LayoutDashboard, QrCode, Menu, X, ArrowLeft } from 'lucide-react';

export type AppView = 'landing' | 'register' | 'admin';

interface NavbarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  onOpenTicketLookup: () => void;
  onScrollToSection?: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  onOpenTicketLookup,
  onScrollToSection
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    if (activeView !== 'landing') {
      setActiveView('landing');
      setTimeout(() => {
        onScrollToSection?.(sectionId);
      }, 50);
    } else {
      onScrollToSection?.(sectionId);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Mark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveView('landing')}
              className="flex items-center gap-2.5 text-left focus:outline-none group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-sky-400 flex items-center justify-center font-black text-sm tracking-wide shadow-xs group-hover:bg-slate-800 transition-colors">
                E
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black tracking-tight text-slate-900">
                  ESTRADA
                </span>
                <span className="hidden sm:inline text-xs text-slate-500 font-medium border-l border-slate-200 pl-2">
                  Healthcare Summit 2026
                </span>
              </div>
            </button>
          </div>

          {/* Navigation Links (Desktop) */}
          {activeView !== 'admin' ? (
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <button
                onClick={() => {
                  if (activeView !== 'landing') setActiveView('landing');
                  else window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`transition-colors whitespace-nowrap ${activeView === 'landing' ? 'text-slate-900 font-bold' : 'hover:text-slate-900'}`}
              >
                Beranda
              </button>
              <button
                onClick={() => handleNavClick('about-section')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Tentang KTT
              </button>
              <button
                onClick={() => handleNavClick('pillars-section')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Pilar Inovasi
              </button>
              <button
                onClick={() => handleNavClick('agenda-section')}
                className="hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Agenda & Lokasi
              </button>
              <button
                onClick={() => onOpenTicketLookup()}
                className="hover:text-slate-900 transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Cek Tiket QR</span>
              </button>
            </nav>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="font-bold text-slate-800">Administrator Console</span>
              <span>·</span>
              <span>Estrada 2026</span>
            </div>
          )}

          {/* Action Button & Mobile Menu Toggle */}
          <div className="flex items-center gap-2.5 shrink-0">
            {activeView === 'register' && (
              <button
                onClick={() => setActiveView('landing')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kembali</span>
              </button>
            )}

            {activeView !== 'admin' ? (
              <button
                onClick={() => setActiveView('admin')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-colors whitespace-nowrap border border-slate-200/80"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
                <span>Admin</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveView('landing')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors whitespace-nowrap border border-sky-200/80"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Halaman Publik</span>
              </button>
            )}

            {/* Mobile Hamburger Button */}
            {activeView !== 'admin' && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && activeView !== 'admin' && (
          <div className="md:hidden py-3 px-2 border-t border-slate-100 flex flex-col gap-1 text-xs font-semibold text-slate-700 animate-fade-in bg-white">
            <button
              onClick={() => { setMobileMenuOpen(false); setActiveView('landing'); }}
              className={`text-left px-3 py-2 rounded-lg ${activeView === 'landing' ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}`}
            >
              Beranda
            </button>
            <button
              onClick={() => handleNavClick('about-section')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Tentang KTT
            </button>
            <button
              onClick={() => handleNavClick('pillars-section')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Pilar Inovasi
            </button>
            <button
              onClick={() => handleNavClick('agenda-section')}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Agenda & Lokasi
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenTicketLookup(); }}
              className="text-left px-3 py-2 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sky-800"
            >
              <QrCode className="w-4 h-4 text-sky-700" />
              <span>Cek E-Ticket QR</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
