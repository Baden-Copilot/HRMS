import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file path
const dbDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'estrada_events.db');

export const db = new Database(dbPath);

// Enable foreign keys and WAL mode for reliability and speed
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  // 1. Users table (Admin & Staff Authentication)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'ADMIN',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Participants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reg_number TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role_position TEXT NOT NULL,
      institution_name TEXT NOT NULL,
      phone_wa TEXT NOT NULL,
      email TEXT NOT NULL,
      city TEXT NOT NULL,
      pdp_consent INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_participants_phone ON participants(phone_wa);
    CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
    CREATE INDEX IF NOT EXISTS idx_participants_reg_number ON participants(reg_number);
    CREATE INDEX IF NOT EXISTS idx_participants_city ON participants(city);
    CREATE INDEX IF NOT EXISTS idx_participants_role ON participants(role_position);
  `);

  // 3. Technology Topics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS technology_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT
    );
  `);

  // 4. Participant Topics table (Many-to-Many relation)
  db.exec(`
    CREATE TABLE IF NOT EXISTS participant_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      topic_code TEXT NOT NULL REFERENCES technology_topics(code) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(participant_id, topic_code)
    );

    CREATE INDEX IF NOT EXISTS idx_pt_participant ON participant_topics(participant_id);
    CREATE INDEX IF NOT EXISTS idx_pt_topic ON participant_topics(topic_code);
  `);

  // 5. Event Registrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
      event_name TEXT NOT NULL DEFAULT 'ESTRADA 2026',
      status TEXT NOT NULL DEFAULT 'Terdaftar',
      qr_token TEXT UNIQUE NOT NULL,
      check_in_time TEXT,
      badge_printed INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(participant_id, event_name)
    );

    CREATE INDEX IF NOT EXISTS idx_er_status ON event_registrations(status);
    CREATE INDEX IF NOT EXISTS idx_er_qr ON event_registrations(qr_token);
  `);

  // 6. Attendance Records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
      check_in_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      check_in_method TEXT NOT NULL DEFAULT 'QR_SCANNER',
      operator_name TEXT NOT NULL DEFAULT 'System Staff',
      ip_address TEXT,
      device_info TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_ar_reg_id ON attendance_records(registration_id);
  `);

  // 7. Audit Logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      user_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(created_at);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 8. Interest Segments table (Master Segmentasi Minat)
  db.exec(`
    CREATE TABLE IF NOT EXISTS interest_segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT 'sky',
      topic_codes TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default segments if empty
  const segmentCount = db.prepare('SELECT COUNT(*) as count FROM interest_segments').get() as { count: number };
  if (segmentCount.count === 0) {
    const insertSeg = db.prepare(`
      INSERT INTO interest_segments (name, color, topic_codes, description)
      VALUES (?, ?, ?, ?)
    `);
    insertSeg.run('SIMRS & SATUSEHAT', 'sky', 'A,D', 'Fokus pada digitalisasi RME dan kepatuhan standar FHIR SATUSEHAT');
    insertSeg.run('AI BPJS Claim Intelligence', 'amber', 'B', 'Optimalisasi verifikasi klaim otomatis dan pencegahan dispute INA-CBG');
    insertSeg.run('Infrastruktur & Keamanan Siber', 'purple', 'G,H,I', 'Data Center, managed network, dan kepatuhan UU PDP');
  }

  // Seed default admin if none exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin', 'estrada2026', 'Administrator Estrada', 'SUPER_ADMIN');
  }

  // Seed Technology Topics (A through L)
  const topicCount = db.prepare('SELECT COUNT(*) as count FROM technology_topics').get() as { count: number };
  if (topicCount.count === 0) {
    const topics = [
      {
        code: 'A',
        title: 'Integrated Hospital Information System (SIMRS)',
        category: 'Clinical Core',
        description: 'Sistem Informasi Manajemen Rumah Sakit terintegrasi untuk rekam medis elektronik, rawat jalan, rawat inap, farmasi, dan billing.'
      },
      {
        code: 'B',
        title: 'AI Healthcare Claim Intelligence (Optimalisasi Klaim BPJS)',
        category: 'AI & Revenue',
        description: 'Solusi kecerdasan buatan untuk verifikasi berkas klaim otomatis, prediksi dispute kode INA-CBG, dan percepatan pencairan klaim BPJS.'
      },
      {
        code: 'C',
        title: 'Healthcare Operations & Reporting Intelligence',
        category: 'Hospital Ops',
        description: 'Analitik utilisasi tempat tidur (BOR/LOS), waktu tunggu poliklinik, dan pelaporan otomatis ke Kemenkes RI.'
      },
      {
        code: 'D',
        title: 'Integrasi SIMRS, SATUSEHAT & BPJS Kesehatan',
        category: 'Interoperability',
        description: 'Jembatan interoperabilitas data rekam medis standar FHIR/HL7 ke platform SATUSEHAT Kemenkes dan V-Claim BPJS.'
      },
      {
        code: 'E',
        title: 'Business Intelligence & Dashboard Manajemen RS',
        category: 'Executive BI',
        description: 'Executive dashboard visual untuk direksi RS memantau performa finansial, indikator klinis, dan efisiensi unit secara real-time.'
      },
      {
        code: 'F',
        title: 'Digitalisasi Administrasi dan Proses Operasional RS',
        category: 'Automation',
        description: 'Automasi alur persetujuan digital, digital signing dokter, e-prescribing tanpa kertas, dan smart inventory.'
      },
      {
        code: 'G',
        title: 'Data Center, Server, Storage & Backup',
        category: 'Infrastructure',
        description: 'Infrastruktur private & hybrid cloud dengan redundansi tinggi dan disaster recovery khusus kepatuhan data medis.'
      },
      {
        code: 'H',
        title: 'Enterprise Network & Managed Connectivity',
        category: 'Connectivity',
        description: 'Jaringan konektivitas berkecepatan tinggi, dedicated fiber optic, SD-WAN, dan Wi-Fi 6 khusus lingkungan rumah sakit.'
      },
      {
        code: 'I',
        title: 'Cybersecurity & Data Protection',
        category: 'Security & PDP',
        description: 'Keamanan perimeter, proteksi serangan ransomware terhadap data pasien, enkripsi database, dan kepatuhan UU PDP.'
      },
      {
        code: 'J',
        title: 'Smart Surveillance & Video Analytics',
        category: 'Surveillance',
        description: 'CCTV cerdas berbasis AI untuk pengawasan area steril, pendeteksian antrean, dan keselamatan fasilitas rumah sakit.'
      },
      {
        code: 'K',
        title: 'Smart Building & Facility Management',
        category: 'Smart Facilities',
        description: 'Manajemen energi terpusat, monitoring suhu ruangan obat/vaksin, dan automasi fasilitas penunjang medis.'
      },
      {
        code: 'L',
        title: 'Konsultasi Transformasi Digital Rumah Sakit',
        category: 'Consulting',
        description: 'Pendampingan strategis roadmap digital, audit kesiapan IT, dan sertifikasi kematangan digital rumah sakit.'
      }
    ];

    const insertTopic = db.prepare(`
      INSERT INTO technology_topics (code, title, category, description)
      VALUES (@code, @title, @category, @description)
    `);

    const insertMany = db.transaction((list) => {
      for (const t of list) insertTopic.run(t);
    });
    insertMany(topics);
  }

  // Seed sample enterprise participants if empty (for instant rich visual analytics & testing)
  const participantCount = db.prepare('SELECT COUNT(*) as count FROM participants').get() as { count: number };
  if (participantCount.count === 0) {
    seedInitialDemoParticipants();
  }
}

function seedInitialDemoParticipants() {
  const seedList = [
    {
      reg_number: 'ESTR-2026-000001',
      full_name: 'Dr. dr. H. Bambang Suryanto, Sp.OG(K), MARS',
      role_position: 'Direktur / Wakil Manajemen Rumah Sakit',
      institution_name: 'RSUP Dr. Cipto Mangunkusumo',
      phone_wa: '+628111223344',
      email: 'bambang.suryanto@rscm.id',
      city: 'DKI Jakarta',
      topics: ['A', 'B', 'D', 'E'],
      status: 'Hadir'
    },
    {
      reg_number: 'ESTR-2026-000002',
      full_name: 'Ir. Ahmad Zulkarnaen, M.Eng',
      role_position: 'Mitra Telkom',
      institution_name: 'PT Telkom Indonesia (Enterprise Health)',
      phone_wa: '+628129876543',
      email: 'ahmad.zulkarnaen@telkom.co.id',
      city: 'Bandung',
      topics: ['B', 'G', 'H', 'I'],
      status: 'Terverifikasi'
    },
    {
      reg_number: 'ESTR-2026-000003',
      full_name: 'Prof. Dr. apt. Retno Widyastuti, Ph.D',
      role_position: 'Narasumber',
      institution_name: 'Asosiasi Rumah Sakit Swasta Indonesia (ARSSI)',
      phone_wa: '+6281311223344',
      email: 'retno.w@arssi.or.id',
      city: 'DKI Jakarta',
      topics: ['B', 'C', 'D', 'L'],
      status: 'Hadir'
    },
    {
      reg_number: 'ESTR-2026-000004',
      full_name: 'dr. Hendra Kusuma, Sp.A, M.Kes',
      role_position: 'Direktur / Wakil Manajemen Rumah Sakit',
      institution_name: 'RSUD Dr. Soetomo Surabaya',
      phone_wa: '+6281333445566',
      email: 'hendra.kusuma@soetomo.jatimprov.go.id',
      city: 'Surabaya',
      topics: ['A', 'B', 'C', 'D', 'E'],
      status: 'Terdaftar'
    },
    {
      reg_number: 'ESTR-2026-000005',
      full_name: 'drg. Maya Kartika, MARS, FISQua',
      role_position: 'Direktur / Wakil Manajemen Rumah Sakit',
      institution_name: 'RS Hermina Kemayoran',
      phone_wa: '+6281288776655',
      email: 'maya.kartika@herminahospitals.com',
      city: 'DKI Jakarta',
      topics: ['A', 'B', 'F', 'I'],
      status: 'Terverifikasi'
    },
    {
      reg_number: 'ESTR-2026-000006',
      full_name: 'Dion Permadi, S.Kom, M.T',
      role_position: 'Mitra Telkom',
      institution_name: 'PT Telkom Metra Digital',
      phone_wa: '+6285211998877',
      email: 'dion.permadi@telkommetra.co.id',
      city: 'DKI Jakarta',
      topics: ['B', 'G', 'I', 'J'],
      status: 'Terdaftar'
    },
    {
      reg_number: 'ESTR-2026-000007',
      full_name: 'dr. Farhan Syahputra, Sp.B, FINACS',
      role_position: 'Direktur / Wakil Manajemen Rumah Sakit',
      institution_name: 'RSUP H. Adam Malik',
      phone_wa: '+6281266554433',
      email: 'farhan.s@rsham.co.id',
      city: 'Medan',
      topics: ['A', 'D', 'E', 'G'],
      status: 'Terdaftar'
    },
    {
      reg_number: 'ESTR-2026-000008',
      full_name: 'dr. Siti Nurhaliza, M.Biomed, AAM',
      role_position: 'Direktur / Wakil Manajemen Rumah Sakit',
      institution_name: 'RSUD dr. Zainoel Abidin',
      phone_wa: '+6285277889900',
      email: 'siti.nurhaliza@rsuda.acehprov.go.id',
      city: 'Banda Aceh',
      topics: ['B', 'C', 'D', 'L'],
      status: 'Terverifikasi'
    },
    {
      reg_number: 'ESTR-2026-000009',
      full_name: 'dr. I Gusti Ngurah Agung, Sp.PD, K-GEH',
      role_position: 'Direktur / Wakil Manajemen Rumah Sakit',
      institution_name: 'RSUP Prof. Dr. I.G.N.G. Ngoerah',
      phone_wa: '+6281999887766',
      email: 'ngurah.agung@sanglahhospitals.com',
      city: 'Denpasar',
      topics: ['A', 'B', 'E', 'I', 'K'],
      status: 'Hadir'
    },
    {
      reg_number: 'ESTR-2026-000010',
      full_name: 'Budi Santoso, S.T, MBA',
      role_position: 'Mitra Telkom',
      institution_name: 'PT Infomedia Nusantara (Healthcare BPO)',
      phone_wa: '+62811882233',
      email: 'budi.santoso@infomedia.co.id',
      city: 'DKI Jakarta',
      topics: ['C', 'F', 'J'],
      status: 'Terverifikasi'
    }
  ];

  const insertParticipant = db.prepare(`
    INSERT INTO participants (reg_number, full_name, role_position, institution_name, phone_wa, email, city, pdp_consent, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now', '-2 days'), datetime('now', '-2 days'))
  `);

  const insertTopicRel = db.prepare(`
    INSERT OR IGNORE INTO participant_topics (participant_id, topic_code, created_at)
    VALUES (?, ?, datetime('now', '-2 days'))
  `);

  const insertReg = db.prepare(`
    INSERT INTO event_registrations (participant_id, event_name, status, qr_token, check_in_time, badge_printed, created_at, updated_at)
    VALUES (?, 'ESTRADA 2026', ?, ?, ?, ?, datetime('now', '-2 days'), datetime('now', '-2 days'))
  `);

  const insertAttendance = db.prepare(`
    INSERT INTO attendance_records (registration_id, check_in_timestamp, check_in_method, operator_name)
    VALUES (?, datetime('now', '-1 hours'), 'QR_SCANNER', 'Gate 1 Operator')
  `);

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
    VALUES ('SEED_DATA', 'SYSTEM', ?, 'system', 'Demo participant initialization')
  `);

  const tx = db.transaction(() => {
    for (const item of seedList) {
      const pResult = insertParticipant.run(
        item.reg_number,
        item.full_name,
        item.role_position,
        item.institution_name,
        item.phone_wa,
        item.email,
        item.city
      );
      const participantId = Number(pResult.lastInsertRowid);

      for (const tCode of item.topics) {
        insertTopicRel.run(participantId, tCode);
      }

      const qrToken = `ESTRADA-PASS-${item.reg_number}`;
      const checkInTime = item.status === 'Hadir' ? new Date().toISOString() : null;
      const regResult = insertReg.run(participantId, item.status, qrToken, checkInTime, item.status === 'Hadir' ? 1 : 0);
      const regId = Number(regResult.lastInsertRowid);

      if (item.status === 'Hadir') {
        insertAttendance.run(regId);
      }

      insertAudit.run(item.reg_number);
    }
  });

  tx();
}

// Generate the next unique registration number: ESTR-2026-000001
export function generateNextRegNumber(): string {
  const row = db.prepare(`
    SELECT reg_number FROM participants
    ORDER BY id DESC LIMIT 1
  `).get() as { reg_number: string } | undefined;

  let nextSeq = 1;
  if (row && row.reg_number) {
    const match = row.reg_number.match(/ESTR-2026-(\d+)/);
    if (match && match[1]) {
      nextSeq = parseInt(match[1], 10) + 1;
    }
  }

  const padded = String(nextSeq).padStart(6, '0');
  return `ESTR-2026-${padded}`;
}
