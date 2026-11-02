import { db } from './db.ts';

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
  const uppers = codes.map((code) => code.toUpperCase());
  const marks = uppers.map(() => '?').join(', ');
  return db.prepare(`
    SELECT
      p.reg_number,
      p.full_name,
      p.role_position,
      p.institution_name,
      p.city,
      er.status,
      er.qr_token,
      er.check_in_time
    FROM participants p
    JOIN event_registrations er ON er.participant_id = p.id
    WHERE UPPER(er.qr_token) IN (${marks})
       OR UPPER(p.reg_number) IN (${marks})
    LIMIT 1
  `).get(...uppers, ...uppers) as {
    reg_number: string;
    full_name: string;
    role_position: string;
    institution_name: string;
    city: string;
    status: string;
    qr_token: string;
    check_in_time: string | null;
  } | undefined;
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
      html: pageShell('Tiket tidak ditemukan', `
        <p class="muted">Kode ini tidak ada di daftar peserta.</p>
        <p class="code">${esc(rawCode)}</p>
      `),
    };
  }

  const arrived = ticket.check_in_time
    ? new Date(ticket.check_in_time).toLocaleString('id-ID')
    : '';

  return {
    status: 200,
    html: pageShell(ticket.full_name, `
      <p class="muted">Estrada · 15 November 2026</p>
      <h1>${esc(ticket.full_name)}</h1>
      <p class="reg">${esc(ticket.reg_number)}</p>
      <dl>
        <dt>Jabatan</dt>
        <dd>${esc(ticket.role_position)}</dd>
        <dt>Instansi</dt>
        <dd>${esc(ticket.institution_name)}</dd>
        <dt>Kota</dt>
        <dd>${esc(ticket.city)}</dd>
        <dt>Status</dt>
        <dd>${esc(ticket.status || 'Terdaftar')}</dd>
        ${arrived ? `<dt>Check-in</dt><dd>${esc(arrived)}</dd>` : ''}
      </dl>
      <p class="venue">Grand Ballroom, Jakarta Convention Center</p>
    `),
  };
}

function pageShell(title: string, body: string) {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    body { margin: 0; background: #fff; color: #0f172a; font-family: "Segoe UI", system-ui, sans-serif; }
    main { max-width: 28rem; margin: 0 auto; padding: 2.5rem 1.25rem 3rem; }
    h1 { font-size: 1.6rem; font-weight: 600; line-height: 1.3; margin: 0.4rem 0 0; }
    .muted, .venue { color: #64748b; }
    .reg { margin: 0.75rem 0 0; font-family: ui-monospace, Consolas, monospace; letter-spacing: 0.02em; }
    dl { margin: 1.5rem 0 0; }
    dt { margin-top: 1rem; font-size: 0.8rem; color: #64748b; }
    dd { margin: 0.15rem 0 0; font-size: 1.05rem; }
    .venue { margin-top: 2rem; font-size: 0.9rem; }
    .code { word-break: break-all; }
  </style>
</head>
<body>
  <main>
    ${body}
  </main>
</body>
</html>`;
}
