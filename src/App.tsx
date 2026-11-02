import React, { useState } from 'react';
import { Navbar, AppView } from './components/Navbar.tsx';
import { RegistrationForm } from './components/RegistrationForm.tsx';
import { RegistrationSuccessModal } from './components/RegistrationSuccessModal.tsx';
import { TicketLookupModal } from './components/TicketLookupModal.tsx';
import { VisitorBadgeModal } from './components/VisitorBadgeModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { Participant } from './types.ts';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('register');
  const [registeredParticipant, setRegisteredParticipant] = useState<Participant | null>(null);
  const [notificationInfo, setNotificationInfo] = useState<any>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isTicketLookupOpen, setIsTicketLookupOpen] = useState(false);
  const [badgeParticipant, setBadgeParticipant] = useState<Participant | null>(null);

  const handleRegistrationSuccess = (participant: Participant, notification: any) => {
    setRegisteredParticipant(participant);
    setNotificationInfo(notification);
    setIsSuccessModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F3F6FA] text-slate-900 flex flex-col">
      {activeView !== 'admin' && (
        <Navbar
          setActiveView={setActiveView}
          onOpenTicketLookup={() => setIsTicketLookupOpen(true)}
        />
      )}

      <main className="flex-1">
        {activeView === 'admin' ? (
          <AdminDashboard
            onOpenBadge={p => setBadgeParticipant(p)}
            onExit={() => setActiveView('register')}
          />
        ) : (
          <div className="w-full max-w-2xl mx-auto px-3 sm:px-5 py-5 sm:py-10">
            <RegistrationForm onSuccess={handleRegistrationSuccess} />
          </div>
        )}
      </main>

      {isSuccessModalOpen && (
        <RegistrationSuccessModal
          participant={registeredParticipant}
          notificationInfo={notificationInfo}
          onClose={() => setIsSuccessModalOpen(false)}
          onOpenBadge={p => setBadgeParticipant(p)}
        />
      )}

      {isTicketLookupOpen && (
        <TicketLookupModal
          onClose={() => setIsTicketLookupOpen(false)}
          onOpenBadge={p => setBadgeParticipant(p)}
        />
      )}

      {badgeParticipant && (
        <VisitorBadgeModal
          participant={badgeParticipant}
          onClose={() => setBadgeParticipant(null)}
        />
      )}
    </div>
  );
}
