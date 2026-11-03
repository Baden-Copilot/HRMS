import { activeEvent, data } from './db.ts';
import { publicBrand } from './brand.ts';
import { formatEventDate, formatEventTime, formatRegisteredAt } from '../src/utils/datetime.ts';

export function extractTicketCodes(raw: string): string[] {
  const text = raw.trim();
  const found = new Set<string>();
  if (text && text.length <= 180 && !text.includes('\n')) found.add(text);

  const pathCode = text.match(/\/tiket\/([^/?#\s]+)/i);
  if (pathCode?.[1]) {
    try {
      found.add(decodeURIComponent(pathCode[1]));
    } catch {
      found.add(pathCode[1]);
    }
  }

  for (const match of text.matchAll(/ESTRADA-2026-ESTR-2026-\d{3,}-[A-Z0-9]+/gi)) found.add(match[0]);
  for (const match of text.matchAll(/ESTRADA-PASS-ESTR-2026-\d{3,}/gi)) found.add(match[0]);
  for (const match of text.matchAll(/ESTR-2026-\d{3,}/gi)) found.add(match[0]);

  return [...found];
}

export function findTicket(raw: string) {
  const codes = extractTicketCodes(raw);
  if (codes.length === 0) return null;
  const uppers = new Set(codes.map((code) => code.toUpperCase()));
  const store = data();
  for (const registration of store.event_registrations) {
    const participant = store.participants.find((row) => row.id === registration.participant_id);
    if (!participant) continue;
    if (!uppers.has(registration.qr_token.toUpperCase()) && !uppers.has(participant.reg_number.toUpperCase())) continue;
    return {
      reg_number: participant.reg_number,
      full_name: participant.full_name,
      role_position: participant.role_position,
      institution_name: participant.institution_name,
      city: participant.city,
      status: registration.status,
      qr_token: registration.qr_token,
      check_in_time: registration.check_in_time,
      created_at: participant.created_at,
    };
  }
  return undefined;
}

function esc(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderTicketPage(rawCode: string) {
  const ticket = findTicket(decodeURIComponent(rawCode));
  if (!ticket) {
    return {
      status: 404,
      html: pageShell('Tiket tidak ditemukan', ticketCard({
        name: 'Tiket tidak ditemukan',
        reg: 'Kode tidak dikenal',
        rows: [
          ['Keterangan', 'Kode ini tidak ada di daftar peserta.'],
          ['Kode', rawCode],
        ],
        status: '',
        schedule: null,
        ...publicBrand(),
      })),
    };
  }

  const status = ticket.status || 'Terdaftar';
  const rows: Array<[string, string]> = [
    ['Jabatan', ticket.role_position],
    ['Instansi', ticket.institution_name],
    ['Kota', ticket.city],
    ['Waktu registrasi', formatRegisteredAt(ticket.created_at)],
  ];
  if (ticket.check_in_time) {
    rows.push(['Check-in', new Date(ticket.check_in_time).toLocaleString('id-ID')]);
  }

  const event = activeEvent();
  return {
    status: 200,
    html: pageShell(ticket.full_name, ticketCard({
      name: ticket.full_name,
      reg: ticket.reg_number,
      rows,
      status,
      schedule: event ? {
        date: formatEventDate(event.event_date),
        time: formatEventTime(event.start_time, event.end_time),
        place: event.venue,
      } : null,
      ...publicBrand(),
    })),
  };
}

function ticketCard({
  name,
  reg,
  rows,
  status,
  icon_url,
  image_url,
  schedule,
}: {
  name: string;
  reg: string;
  rows: Array<[string, string]>;
  status: string;
  icon_url: string | null;
  image_url: string | null;
  schedule: { date: string; time: string; place: string } | null;
}) {
  const fields = rows.map(([label, value]) => `
    <div>
      <dt>${esc(label)}</dt>
      <dd>${esc(value)}</dd>
    </div>
  `).join('');
  const stamp = status
    ? `<div><dt>Status</dt><dd><span class="stamp ${statusClass(status)}">${esc(status)}</span></dd></div>`
    : '';

  return `
    <article class="ticket">
      <header>
        <div class="brand">
          ${icon_url ? `<img class="mark" src="${esc(icon_url)}" alt="">` : '<span class="mark">E</span>'}
          <div>
            <strong>ESTRADA</strong>
            <small>HEALTHCARE TECHNOLOGY</small>
          </div>
        </div>
        <p class="kind">Tiket medis</p>
      </header>
      ${image_url ? `<img class="banner" src="${esc(image_url)}" alt="">` : ''}
      <div class="identity">
        <p class="kicker">Nama peserta</p>
        <h1>${esc(name)}</h1>
        <p class="reg"><span>No. registrasi</span>${esc(reg)}</p>
      </div>
      <div class="cut" aria-hidden="true"><span></span></div>
      <dl>
        ${fields}
        ${stamp}
      </dl>
      <div class="cut" aria-hidden="true"><span></span></div>
      ${schedule ? `<footer>
        <div class="when">
          <p><span>Tanggal</span><strong>${esc(schedule.date)}</strong></p>
          <p><span>Waktu</span><strong>${esc(schedule.time)}</strong></p>
        </div>
        <p class="place">${esc(schedule.place)}</p>
      </footer>` : ''}
    </article>
  `;
}

function statusClass(status: string) {
  if (status === 'Hadir') return 'ok';
  if (status === 'Terverifikasi') return 'info';
  if (status === 'Dibatalkan' || status === 'Tidak Hadir') return 'muted-pill';
  return '';
}

function pageShell(title: string, body: string) {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · Estrada</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; max-width: 100%; overflow-x: clip; }
    body {
      min-height: 100vh;
      background: #E7EEF4;
      color: #102033;
      font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    }
    main {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem 0.9rem 2rem;
    }
    .ticket {
      width: min(100%, 26rem);
      background: #fff;
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 16px 40px rgba(16, 44, 69, 0.12);
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem 1.15rem;
      background: #102C45;
      color: #fff;
    }
    .brand { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
    .mark {
      width: 2.4rem; height: 2.4rem; flex: none;
      border-radius: 0.7rem; background: #fff; color: #102C45;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; object-fit: cover;
    }
    .banner { display: block; width: 100%; height: 7.5rem; object-fit: cover; background: #0b1c2e; }
    .brand strong { display: block; letter-spacing: 0.16em; font-size: 0.95rem; }
    .brand small { display: block; margin-top: 2px; color: #bfdbfe; letter-spacing: 0.08em; font-size: 9px; }
    .kind {
      margin: 0;
      flex: none;
      padding: 0.35rem 0.55rem;
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 999px;
      font-size: 11px;
      letter-spacing: 0.04em;
    }
    .identity { padding: 1.15rem 1.15rem 0.35rem; }
    .kicker { margin: 0; color: #64748b; font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; }
    h1 { margin: 0.3rem 0 0; font-size: 1.55rem; line-height: 1.25; overflow-wrap: anywhere; }
    .reg { margin: 0.85rem 0 0; display: grid; gap: 0.15rem; font-family: ui-monospace, Consolas, monospace; font-size: 0.95rem; font-weight: 700; color: #102C45; }
    .reg span { color: #64748b; font-family: "Plus Jakarta Sans", system-ui, sans-serif; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
    .cut { position: relative; height: 1.35rem; }
    .cut span {
      position: absolute; left: 1.15rem; right: 1.15rem; top: 0.62rem;
      border-top: 1px dashed #cbd5e1;
    }
    .cut::before, .cut::after {
      content: "";
      position: absolute;
      top: 0.2rem;
      width: 1rem; height: 1rem;
      border-radius: 50%;
      background: #E7EEF4;
    }
    .cut::before { left: -0.5rem; }
    .cut::after { right: -0.5rem; }
    dl { margin: 0; padding: 0.15rem 1.15rem 0.2rem; display: grid; gap: 0.85rem; }
    dt { color: #64748b; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; }
    dd { margin: 0.15rem 0 0; font-size: 0.98rem; line-height: 1.4; overflow-wrap: anywhere; }
    .stamp {
      display: inline-flex;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      color: #334155;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .stamp.ok { border-color: #86efac; background: #f0fdf4; color: #166534; }
    .stamp.info { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
    .stamp.muted-pill { color: #64748b; }
    footer { padding: 0.15rem 1.15rem 1.15rem; }
    .when { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .when p { margin: 0; display: grid; gap: 0.15rem; }
    .when span { color: #64748b; font-size: 0.72rem; letter-spacing: 0.06em; text-transform: uppercase; }
    .when strong { font-size: 0.92rem; }
    .place { margin: 0.85rem 0 0; color: #334155; font-size: 0.88rem; line-height: 1.45; }
  </style>
</head>
<body>
  <main>${body}</main>
</body>
</html>`;
}
