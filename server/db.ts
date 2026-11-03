import fs from 'fs';
import path from 'path';

export interface User {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: string;
  created_at: string;
}

export interface Participant {
  id: number;
  reg_number: string;
  full_name: string;
  role_position: string;
  institution_name: string;
  phone_wa: string;
  email: string;
  city: string;
  pdp_consent: number;
  created_at: string;
  updated_at: string;
}

export interface TechnologyTopic {
  id: number;
  code: string;
  title: string;
  category: string;
  description: string | null;
}

export interface ParticipantTopic {
  id: number;
  participant_id: number;
  topic_code: string;
  created_at: string;
}

export interface EventRegistration {
  id: number;
  participant_id: number;
  event_name: string;
  status: string;
  qr_token: string;
  check_in_time: string | null;
  badge_printed: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: number;
  registration_id: number;
  check_in_timestamp: string;
  check_in_method: string;
  operator_name: string;
  ip_address: string | null;
  device_info: string | null;
}

export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  details: string | null;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface InterestSegment {
  id: number;
  name: string;
  color: string;
  topic_codes: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventSchedule {
  id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface Store {
  users: User[];
  participants: Participant[];
  technology_topics: TechnologyTopic[];
  participant_topics: ParticipantTopic[];
  event_registrations: EventRegistration[];
  attendance_records: AttendanceRecord[];
  audit_logs: AuditLog[];
  app_settings: AppSetting[];
  interest_segments: InterestSegment[];
  event_schedules: EventSchedule[];
}

const dbDir = path.resolve(process.cwd(), 'data');
const dbFile = path.join(dbDir, 'estrada.json');
const tmpFile = dbFile + '.tmp';

let store: Store = emptyStore();

export function stamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function dateOnly(value: string | null | undefined): string {
  return String(value || '').slice(0, 10);
}

export function nextId(rows: { id: number }[]): number {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

export function data(): Store {
  return store;
}

export function activeEvent(): EventSchedule | null {
  return store.event_schedules.find((row) => row.active === 1) || null;
}

export function mutate<T>(fn: (db: Store) => T): T {
  const backup = structuredClone(store);
  try {
    const result = fn(store);
    persist();
    return result;
  } catch (error) {
    store = backup;
    throw error;
  }
}

export function initDatabase() {
  fs.mkdirSync(dbDir, { recursive: true });
  if (!fs.existsSync(dbFile) && fs.existsSync(tmpFile)) {
    fs.renameSync(tmpFile, dbFile);
  }
  if (fs.existsSync(dbFile)) {
    store = normalize(JSON.parse(fs.readFileSync(dbFile, 'utf8')));
  } else {
    store = emptyStore();
  }

  let changed = false;
  if (store.technology_topics.length === 0) {
    seedTopics();
    changed = true;
  }
  if (store.interest_segments.length === 0) {
    seedSegments();
    changed = true;
  }
  if (store.event_schedules.length === 0) {
    seedEvents();
    changed = true;
  }
  if (!store.users.some((user) => user.username === 'admin')) {
    store.users.push({
      id: nextId(store.users),
      username: 'admin',
      password_hash: 'estrada2026',
      full_name: 'Administrator Estrada',
      role: 'SUPER_ADMIN',
      created_at: stamp(),
    });
    changed = true;
  }
  if (store.participants.length === 0) {
    seedParticipants();
    changed = true;
  }
  if (changed) persist();
}

export function generateNextRegNumber(): string {
  const row = [...store.participants].sort((a, b) => b.id - a.id)[0];
  let nextSeq = 1;
  if (row?.reg_number) {
    const match = row.reg_number.match(/ESTR-2026-(\d+)/);
    if (match?.[1]) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `ESTR-2026-${String(nextSeq).padStart(6, '0')}`;
}

export function topicsFor(participantId: number, fields: 'brief' | 'full' = 'brief') {
  const codes = new Set(
    store.participant_topics
      .filter((row) => row.participant_id === participantId)
      .map((row) => row.topic_code)
  );
  return store.technology_topics
    .filter((topic) => codes.has(topic.code))
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((topic) => fields === 'full'
      ? { code: topic.code, title: topic.title, category: topic.category, description: topic.description }
      : { code: topic.code, title: topic.title, category: topic.category });
}

export function linkTopics(db: Store, participantId: number, codes: unknown[]) {
  for (const raw of codes) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const topic = db.technology_topics.find((item) => item.code.toUpperCase() === raw.trim().toUpperCase());
    if (!topic) continue;
    const exists = db.participant_topics.some(
      (row) => row.participant_id === participantId && row.topic_code === topic.code
    );
    if (exists) continue;
    db.participant_topics.push({
      id: nextId(db.participant_topics),
      participant_id: participantId,
      topic_code: topic.code,
      created_at: stamp(),
    });
  }
}

export function pushAudit(
  db: Store,
  action: string,
  entityType: string,
  entityId: string | null,
  userId: string,
  details: string
) {
  db.audit_logs.push({
    id: nextId(db.audit_logs),
    action,
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    details,
    created_at: stamp(),
  });
}

export function removeParticipant(db: Store, id: number) {
  const regIds = new Set(
    db.event_registrations.filter((row) => row.participant_id === id).map((row) => row.id)
  );
  db.attendance_records = db.attendance_records.filter((row) => !regIds.has(row.registration_id));
  db.event_registrations = db.event_registrations.filter((row) => row.participant_id !== id);
  db.participant_topics = db.participant_topics.filter((row) => row.participant_id !== id);
  db.participants = db.participants.filter((row) => row.id !== id);
}

function emptyStore(): Store {
  return {
    users: [],
    participants: [],
    technology_topics: [],
    participant_topics: [],
    event_registrations: [],
    attendance_records: [],
    audit_logs: [],
    app_settings: [],
    interest_segments: [],
    event_schedules: [],
  };
}

function normalize(raw: Partial<Store> | null): Store {
  const base = emptyStore();
  if (!raw || typeof raw !== 'object') return base;
  (Object.keys(base) as (keyof Store)[]).forEach((key) => {
    if (Array.isArray(raw[key])) (base[key] as unknown[]) = raw[key] as unknown[];
  });
  return base;
}

function persist() {
  fs.mkdirSync(dbDir, { recursive: true });
  fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), 'utf8');
  fs.rmSync(dbFile, { force: true });
  fs.renameSync(tmpFile, dbFile);
}

function seedEvents() {
  const created = stamp();
  store.event_schedules.push({
    id: 1,
    event_date: '2026-11-15',
    start_time: '08:30',
    end_time: '16:30',
    venue: 'Grand Ballroom JCC Senayan',
    active: 1,
    created_at: created,
    updated_at: created,
  });
}

function seedSegments() {
  const rows = [
    ['SIMRS & SATUSEHAT', 'sky', 'A,D', 'Fokus pada digitalisasi RME dan kepatuhan standar FHIR SATUSEHAT'],
    ['AI BPJS Claim Intelligence', 'amber', 'B', 'Optimalisasi verifikasi klaim otomatis dan pencegahan dispute INA-CBG'],
    ['Infrastruktur & Keamanan Siber', 'purple', 'G,H,I', 'Data Center, managed network, dan kepatuhan UU PDP'],
  ] as const;
  const created = stamp();
  for (const [name, color, topic_codes, description] of rows) {
    store.interest_segments.push({
      id: nextId(store.interest_segments),
      name,
      color,
      topic_codes,
      description,
      created_at: created,
      updated_at: created,
    });
  }
}

function seedTopics() {
  const topics = [
    ['A', 'Integrated Hospital Information System (SIMRS)', 'Clinical Core', 'Sistem Informasi Manajemen Rumah Sakit terintegrasi untuk rekam medis elektronik, rawat jalan, rawat inap, farmasi, dan billing.'],
    ['B', 'AI Healthcare Claim Intelligence (Optimalisasi Klaim BPJS)', 'AI & Revenue', 'Solusi kecerdasan buatan untuk verifikasi berkas klaim otomatis, prediksi dispute kode INA-CBG, dan percepatan pencairan klaim BPJS.'],
    ['C', 'Healthcare Operations & Reporting Intelligence', 'Hospital Ops', 'Analitik utilisasi tempat tidur (BOR/LOS), waktu tunggu poliklinik, dan pelaporan otomatis ke Kemenkes RI.'],
    ['D', 'Integrasi SIMRS, SATUSEHAT & BPJS Kesehatan', 'Interoperability', 'Jembatan interoperabilitas data rekam medis standar FHIR/HL7 ke platform SATUSEHAT Kemenkes dan V-Claim BPJS.'],
    ['E', 'Business Intelligence & Dashboard Manajemen RS', 'Executive BI', 'Executive dashboard visual untuk direksi RS memantau performa finansial, indikator klinis, dan efisiensi unit secara real-time.'],
    ['F', 'Digitalisasi Administrasi dan Proses Operasional RS', 'Automation', 'Automasi alur persetujuan digital, digital signing dokter, e-prescribing tanpa kertas, dan smart inventory.'],
    ['G', 'Data Center, Server, Storage & Backup', 'Infrastructure', 'Infrastruktur private & hybrid cloud dengan redundansi tinggi dan disaster recovery khusus kepatuhan data medis.'],
    ['H', 'Enterprise Network & Managed Connectivity', 'Connectivity', 'Jaringan konektivitas berkecepatan tinggi, dedicated fiber optic, SD-WAN, dan Wi-Fi 6 khusus lingkungan rumah sakit.'],
    ['I', 'Cybersecurity & Data Protection', 'Security & PDP', 'Keamanan perimeter, proteksi serangan ransomware terhadap data pasien, enkripsi database, dan kepatuhan UU PDP.'],
    ['J', 'Smart Surveillance & Video Analytics', 'Surveillance', 'CCTV cerdas berbasis AI untuk pengawasan area steril, pendeteksian antrean, dan keselamatan fasilitas rumah sakit.'],
    ['K', 'Smart Building & Facility Management', 'Smart Facilities', 'Manajemen energi terpusat, monitoring suhu ruangan obat/vaksin, dan automasi fasilitas penunjang medis.'],
    ['L', 'Konsultasi Transformasi Digital Rumah Sakit', 'Consulting', 'Pendampingan strategis roadmap digital, audit kesiapan IT, dan sertifikasi kematangan digital rumah sakit.'],
  ] as const;
  for (const [code, title, category, description] of topics) {
    store.technology_topics.push({
      id: nextId(store.technology_topics),
      code,
      title,
      category,
      description,
    });
  }
}

function seedParticipants() {
  const seedList = [
    { reg_number: 'ESTR-2026-000001', full_name: 'Dr. dr. H. Bambang Suryanto, Sp.OG(K), MARS', role_position: 'Direktur / Wakil Manajemen Rumah Sakit', institution_name: 'RSUP Dr. Cipto Mangunkusumo', phone_wa: '+628111223344', email: 'bambang.suryanto@rscm.id', city: 'DKI Jakarta', topics: ['A', 'B', 'D', 'E'], status: 'Hadir' },
    { reg_number: 'ESTR-2026-000002', full_name: 'Ir. Ahmad Zulkarnaen, M.Eng', role_position: 'Mitra Telkom', institution_name: 'PT Telkom Indonesia (Enterprise Health)', phone_wa: '+628129876543', email: 'ahmad.zulkarnaen@telkom.co.id', city: 'Bandung', topics: ['B', 'G', 'H', 'I'], status: 'Terverifikasi' },
    { reg_number: 'ESTR-2026-000003', full_name: 'Prof. Dr. apt. Retno Widyastuti, Ph.D', role_position: 'Narasumber', institution_name: 'Asosiasi Rumah Sakit Swasta Indonesia (ARSSI)', phone_wa: '+6281311223344', email: 'retno.w@arssi.or.id', city: 'DKI Jakarta', topics: ['B', 'C', 'D', 'L'], status: 'Hadir' },
    { reg_number: 'ESTR-2026-000004', full_name: 'dr. Hendra Kusuma, Sp.A, M.Kes', role_position: 'Direktur / Wakil Manajemen Rumah Sakit', institution_name: 'RSUD Dr. Soetomo Surabaya', phone_wa: '+6281333445566', email: 'hendra.kusuma@soetomo.jatimprov.go.id', city: 'Surabaya', topics: ['A', 'B', 'C', 'D', 'E'], status: 'Terdaftar' },
    { reg_number: 'ESTR-2026-000005', full_name: 'drg. Maya Kartika, MARS, FISQua', role_position: 'Direktur / Wakil Manajemen Rumah Sakit', institution_name: 'RS Hermina Kemayoran', phone_wa: '+6281288776655', email: 'maya.kartika@herminahospitals.com', city: 'DKI Jakarta', topics: ['A', 'B', 'F', 'I'], status: 'Terverifikasi' },
    { reg_number: 'ESTR-2026-000006', full_name: 'Dion Permadi, S.Kom, M.T', role_position: 'Mitra Telkom', institution_name: 'PT Telkom Metra Digital', phone_wa: '+6285211998877', email: 'dion.permadi@telkommetra.co.id', city: 'DKI Jakarta', topics: ['B', 'G', 'I', 'J'], status: 'Terdaftar' },
    { reg_number: 'ESTR-2026-000007', full_name: 'dr. Farhan Syahputra, Sp.B, FINACS', role_position: 'Direktur / Wakil Manajemen Rumah Sakit', institution_name: 'RSUP H. Adam Malik', phone_wa: '+6281266554433', email: 'farhan.s@rsham.co.id', city: 'Medan', topics: ['A', 'D', 'E', 'G'], status: 'Terdaftar' },
    { reg_number: 'ESTR-2026-000008', full_name: 'dr. Siti Nurhaliza, M.Biomed, AAM', role_position: 'Direktur / Wakil Manajemen Rumah Sakit', institution_name: 'RSUD dr. Zainoel Abidin', phone_wa: '+6285277889900', email: 'siti.nurhaliza@rsuda.acehprov.go.id', city: 'Banda Aceh', topics: ['B', 'C', 'D', 'L'], status: 'Terverifikasi' },
    { reg_number: 'ESTR-2026-000009', full_name: 'dr. I Gusti Ngurah Agung, Sp.PD, K-GEH', role_position: 'Direktur / Wakil Manajemen Rumah Sakit', institution_name: 'RSUP Prof. Dr. I.G.N.G. Ngoerah', phone_wa: '+6281999887766', email: 'ngurah.agung@sanglahhospitals.com', city: 'Denpasar', topics: ['A', 'B', 'E', 'I', 'K'], status: 'Hadir' },
    { reg_number: 'ESTR-2026-000010', full_name: 'Budi Santoso, S.T, MBA', role_position: 'Mitra Telkom', institution_name: 'PT Infomedia Nusantara (Healthcare BPO)', phone_wa: '+62811882233', email: 'budi.santoso@infomedia.co.id', city: 'DKI Jakarta', topics: ['C', 'F', 'J'], status: 'Terverifikasi' },
  ];
  const created = stamp();
  for (const item of seedList) {
    const participantId = nextId(store.participants);
    store.participants.push({
      id: participantId,
      reg_number: item.reg_number,
      full_name: item.full_name,
      role_position: item.role_position,
      institution_name: item.institution_name,
      phone_wa: item.phone_wa,
      email: item.email,
      city: item.city,
      pdp_consent: 1,
      created_at: created,
      updated_at: created,
    });
    linkTopics(store, participantId, item.topics);
    const registrationId = nextId(store.event_registrations);
    const checkIn = item.status === 'Hadir' ? new Date().toISOString() : null;
    store.event_registrations.push({
      id: registrationId,
      participant_id: participantId,
      event_name: 'ESTRADA 2026',
      status: item.status,
      qr_token: `ESTRADA-PASS-${item.reg_number}`,
      check_in_time: checkIn,
      badge_printed: item.status === 'Hadir' ? 1 : 0,
      notes: null,
      created_at: created,
      updated_at: created,
    });
    if (item.status === 'Hadir') {
      store.attendance_records.push({
        id: nextId(store.attendance_records),
        registration_id: registrationId,
        check_in_timestamp: stamp(),
        check_in_method: 'QR_SCANNER',
        operator_name: 'Gate 1 Operator',
        ip_address: null,
        device_info: null,
      });
    }
    pushAudit(store, 'SEED_DATA', 'SYSTEM', item.reg_number, 'system', 'Demo participant initialization');
  }
}
