const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatRegisteredAt(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ])(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return raw || '-';
  const month = MONTHS[Number(match[2]) - 1] || match[2];
  return `${match[3]} ${month} ${match[1]}, ${match[4]}:${match[5]}:${match[6]}`;
}
