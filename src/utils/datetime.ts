const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export interface EventScheduleView {
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
}

export function formatEventDate(value: string, style: 'short' | 'long' = 'long'): string {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  const months = style === 'short' ? MONTHS : MONTHS_LONG;
  const month = months[Number(match[2]) - 1] || match[2];
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatEventClock(value: string): string {
  return String(value || '').slice(0, 5).replace(':', '.');
}

export function formatEventTime(start: string, end: string): string {
  return `${formatEventClock(start)}–${formatEventClock(end)} WIB`;
}

export function formatEventLine(event: EventScheduleView): string {
  return `${formatEventDate(event.event_date, 'short')} · ${formatEventTime(event.start_time, event.end_time)} · ${event.venue}`;
}

export function formatRegisteredAt(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ])(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return raw || '-';
  const month = MONTHS[Number(match[2]) - 1] || match[2];
  return `${match[3]} ${month} ${match[1]}, ${match[4]}:${match[5]}:${match[6]}`;
}
