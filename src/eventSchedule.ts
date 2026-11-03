import { useEffect, useState } from 'react';
import { EventScheduleView } from './utils/datetime.ts';

export interface PublicEvent extends EventScheduleView {
  id: number;
}

const empty = null;
let cache: Promise<PublicEvent | null> | null = null;

export function loadActiveEvent() {
  if (!cache) {
    cache = fetch('/api/event')
      .then((res) => res.json())
      .then((data) => (data.event ? data.event as PublicEvent : null))
      .catch(() => empty);
  }
  return cache;
}

export function notifyEventChanged() {
  cache = null;
  window.dispatchEvent(new Event('estrada-event'));
}

export function useActiveEvent() {
  const [event, setEvent] = useState<PublicEvent | null>(null);

  useEffect(() => {
    let live = true;
    const pull = () => {
      loadActiveEvent().then((next) => {
        if (live) setEvent(next);
      });
    };
    pull();
    window.addEventListener('estrada-event', pull);
    return () => {
      live = false;
      window.removeEventListener('estrada-event', pull);
    };
  }, []);

  return event;
}
