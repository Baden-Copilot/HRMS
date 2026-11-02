import { Router, Request, Response } from 'express';
import { db, generateNextRegNumber } from '../db.ts';
import { normalizeIndonesianPhone, validateEmail, sanitizeText } from '../validation.ts';
import { extractTicketCodes } from '../ticketPage.ts';
import { clearBrand, publicBrand, saveBrand } from '../brand.ts';

const router = Router();

// 1. GET /api/topics - List all technology topics
router.get('/topics', (_req: Request, res: Response) => {
  try {
    const topics = db.prepare('SELECT * FROM technology_topics ORDER BY code ASC').all();
    res.json({ success: true, topics });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data topik teknologi' });
  }
});

// 2. POST /api/register - Public Participant Registration
router.post('/register', (req: Request, res: Response): any => {
  try {
    const {
      full_name,
      role_position,
      institution_name,
      phone_wa,
      email,
      city,
      topics = [],
      pdp_consent,
      honeypot // anti-spam bot trap
    } = req.body;

    // Honeypot check for bots
    if (honeypot) {
      return res.status(400).json({ success: false, error: 'Spam detected' });
    }

    // Validation checks
    const sanitizedName = sanitizeText(full_name);
    if (!sanitizedName || sanitizedName.length < 3) {
      return res.status(400).json({ success: false, error: 'Nama Lengkap wajib diisi minimal 3 karakter.' });
    }

    const validRoles = [
      'Direktur / Wakil Manajemen Rumah Sakit',
      'Mitra Telkom',
      'Narasumber'
    ];
    if (!role_position || !validRoles.includes(role_position)) {
      return res.status(400).json({
        success: false,
        error: 'Jabatan / Posisi tidak valid. Pilih dari opsi yang tersedia.'
      });
    }

    const sanitizedInst = sanitizeText(institution_name);
    if (!sanitizedInst || sanitizedInst.length < 2) {
      return res.status(400).json({ success: false, error: 'Nama Rumah Sakit / Perusahaan / Instansi wajib diisi.' });
    }

    // Phone validation & normalization
    const phoneCheck = normalizeIndonesianPhone(phone_wa);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, error: phoneCheck.error });
    }

    // Email validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, error: emailCheck.error });
    }

    const sanitizedCity = sanitizeText(city);
    if (!sanitizedCity) {
      return res.status(400).json({ success: false, error: 'Kota / Domisili Instansi wajib diisi.' });
    }

    if (!pdp_consent) {
      return res.status(400).json({
        success: false,
        error: 'Anda wajib menyetujui pemrosesan data pribadi sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.'
      });
    }

    // Deduplication check: check if phone or email already registered in Estrada 2026
    const existing = db.prepare(`
      SELECT p.reg_number, p.full_name, p.institution_name, er.status
      FROM participants p
      JOIN event_registrations er ON er.participant_id = p.id
      WHERE (p.phone_wa = ? OR p.email = ?) AND er.event_name = 'ESTRADA 2026'
    `).get(phoneCheck.normalized, emailCheck.normalized) as any;

    if (existing) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        reg_number: existing.reg_number,
        error: `Nomor WhatsApp atau Email ini telah terdaftar sebelumnya atas nama "${existing.full_name}" (${existing.institution_name}) dengan No. Registrasi: ${existing.reg_number}.`
      });
    }

    // Generate unique Registration Number
    const reg_number = generateNextRegNumber();
    const qr_token = `ESTRADA-2026-${reg_number}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Database transaction
    const insertParticipant = db.prepare(`
      INSERT INTO participants (
        reg_number, full_name, role_position, institution_name, phone_wa, email, city, pdp_consent, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const insertTopicRel = db.prepare(`
      INSERT OR IGNORE INTO participant_topics (participant_id, topic_code)
      VALUES (?, ?)
    `);

    const insertEventReg = db.prepare(`
      INSERT INTO event_registrations (
        participant_id, event_name, status, qr_token, created_at, updated_at
      ) VALUES (?, 'ESTRADA 2026', 'Terdaftar', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
      VALUES ('REGISTER', 'PARTICIPANT', ?, 'public_web', ?)
    `);

    let newParticipantId = 0;
    const executeTx = db.transaction(() => {
      const pRes = insertParticipant.run(
        reg_number,
        sanitizedName,
        role_position,
        sanitizedInst,
        phoneCheck.normalized,
        emailCheck.normalized,
        sanitizedCity
      );
      newParticipantId = Number(pRes.lastInsertRowid);

      if (Array.isArray(topics) && topics.length > 0) {
        for (const code of topics) {
          if (typeof code === 'string' && code.length === 1) {
            insertTopicRel.run(newParticipantId, code.toUpperCase());
          }
        }
      }

      insertEventReg.run(newParticipantId, qr_token);

      insertAudit.run(
        reg_number,
        JSON.stringify({
          name: sanitizedName,
          institution: sanitizedInst,
          role: role_position,
          topics_count: topics.length
        })
      );
    });

    executeTx();

    // Retrieve topic details
    const selectedTopicRows = db.prepare(`
      SELECT tt.code, tt.title, tt.category
      FROM participant_topics pt
      JOIN technology_topics tt ON tt.code = pt.topic_code
      WHERE pt.participant_id = ?
      ORDER BY tt.code ASC
    `).all(newParticipantId);

    res.status(201).json({
      success: true,
      message: 'Pendaftaran berhasil disimpan ke sistem ESTRADA',
      participant: {
        id: newParticipantId,
        reg_number,
        full_name: sanitizedName,
        role_position,
        institution_name: sanitizedInst,
        phone_wa: phoneCheck.normalized,
        email: emailCheck.normalized,
        city: sanitizedCity,
        status: 'Terdaftar',
        qr_token,
        topics: selectedTopicRows,
        registered_at: new Date().toISOString()
      },
      notification: {
        whatsapp_status: 'QUEUED',
        whatsapp_target: phoneCheck.normalized,
        email_status: 'QUEUED',
        email_target: emailCheck.normalized,
        note: 'Gateway siap mengirimkan e-ticket konfirmasi dan QR Code resmi.'
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan sistem saat memproses registrasi. Silakan coba beberapa saat lagi.'
    });
  }
});

// 3. GET /api/ticket/:query - Public ticket lookup (by registration number or phone)
router.get('/ticket/:query', (req: Request, res: Response): any => {
  try {
    const rawQuery = extractTicketCodes(req.params.query.trim())[0] || req.params.query.trim();

    // Check phone normalization if it looks like a phone number
    let phoneNormalized = '';
    if (/^[0-9+]+$/.test(rawQuery.replace(/[\s\-]/g, ''))) {
      const p = normalizeIndonesianPhone(rawQuery);
      if (p.valid) phoneNormalized = p.normalized;
    }

    const participant = db.prepare(`
      SELECT 
        p.id,
        p.reg_number,
        p.full_name,
        p.role_position,
        p.institution_name,
        p.phone_wa,
        p.email,
        p.city,
        p.created_at as registered_at,
        er.id as registration_id,
        er.status,
        er.qr_token,
        er.check_in_time,
        er.badge_printed
      FROM participants p
      JOIN event_registrations er ON er.participant_id = p.id
      WHERE UPPER(p.reg_number) = UPPER(?) 
         OR p.phone_wa = ? 
         OR UPPER(er.qr_token) = UPPER(?)
      LIMIT 1
    `).get(rawQuery, phoneNormalized || rawQuery, rawQuery) as any;

    if (!participant) {
      return res.status(404).json({
        success: false,
        error: 'Data pendaftaran tidak ditemukan. Pastikan Nomor Registrasi atau Nomor WhatsApp sudah benar.'
      });
    }

    const topics = db.prepare(`
      SELECT tt.code, tt.title, tt.category
      FROM participant_topics pt
      JOIN technology_topics tt ON tt.code = pt.topic_code
      WHERE pt.participant_id = ?
      ORDER BY tt.code ASC
    `).all(participant.id);

    res.json({
      success: true,
      participant: {
        ...participant,
        topics
      }
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data tiket pendaftaran' });
  }
});

// 4. POST /api/admin/login - Simple session auth
router.post('/admin/login', (req: Request, res: Response): any => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ success: false, error: 'Username atau password admin salah' });
    }

    // Log admin login
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
      VALUES ('ADMIN_LOGIN', 'SYSTEM', ?, ?, 'Admin user logged into dashboard')
    `).run(String(user.id), user.username);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      },
      token: 'ESTRADA_TOKEN_' + Buffer.from(`${user.username}:${Date.now()}`).toString('base64')
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Gagal login admin' });
  }
});

// 5. GET /api/admin/stats - Comprehensive Dashboard Analytics & KPIs
router.get('/admin/stats', (_req: Request, res: Response) => {
  try {
    // Total participants
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM participants').get() as { count: number };

    // Role breakdown
    const roleStats = db.prepare(`
      SELECT role_position, COUNT(*) as count
      FROM participants
      GROUP BY role_position
    `).all() as { role_position: string; count: number }[];

    // Unique institutions count
    const institutionCount = db.prepare(`
      SELECT COUNT(DISTINCT LOWER(institution_name)) as count
      FROM participants
    `).get() as { count: number };

    // Status breakdown
    const statusStats = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM event_registrations
      GROUP BY status
    `).all() as { status: string; count: number }[];

    // City distribution (top cities)
    const cityStats = db.prepare(`
      SELECT city, COUNT(*) as count
      FROM participants
      GROUP BY city
      ORDER BY count DESC
      LIMIT 10
    `).all() as { city: string; count: number }[];

    // Technology topics popularity
    const topicStats = db.prepare(`
      SELECT tt.code, tt.title, tt.category, COUNT(pt.id) as participant_count
      FROM technology_topics tt
      LEFT JOIN participant_topics pt ON pt.topic_code = tt.code
      GROUP BY tt.code, tt.title, tt.category
      ORDER BY participant_count DESC, tt.code ASC
    `).all() as { code: string; title: string; category: string; participant_count: number }[];

    // Registration timeline (daily counts for charts)
    const dailyRegistrations = db.prepare(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM participants
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all();

    // Recent 5 audit logs
    const recentAudits = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      stats: {
        total_participants: totalCount.count,
        total_institutions: institutionCount.count,
        roles: roleStats,
        statuses: statusStats,
        cities: cityStats,
        topics: topicStats,
        daily_registrations: dailyRegistrations,
        recent_audits: recentAudits
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil statistik dashboard' });
  }
});

// 6. GET /api/admin/participants - Filtered & Searched participants list
router.get('/admin/participants', (req: Request, res: Response) => {
  try {
    const {
      search = '',
      role = '',
      city = '',
      status = '',
      topic = '',
      date_from = '',
      date_to = ''
    } = req.query as Record<string, string>;

    let query = `
      SELECT 
        p.id,
        p.reg_number,
        p.full_name,
        p.role_position,
        p.institution_name,
        p.phone_wa,
        p.email,
        p.city,
        p.created_at,
        p.updated_at,
        er.id as registration_id,
        er.status,
        er.qr_token,
        er.check_in_time,
        er.badge_printed,
        er.notes,
        GROUP_CONCAT(pt.topic_code, ',') as topic_codes
      FROM participants p
      JOIN event_registrations er ON er.participant_id = p.id
      LEFT JOIN participant_topics pt ON pt.participant_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (search) {
      query += ` AND (
        p.full_name LIKE ? OR 
        p.institution_name LIKE ? OR 
        p.reg_number LIKE ? OR 
        p.phone_wa LIKE ? OR 
        p.email LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s);
    }

    if (role && role !== 'ALL') {
      query += ` AND p.role_position = ?`;
      params.push(role);
    }

    if (city && city !== 'ALL') {
      query += ` AND p.city = ?`;
      params.push(city);
    }

    if (status && status !== 'ALL') {
      query += ` AND er.status = ?`;
      params.push(status);
    }

    if (date_from) {
      query += ` AND DATE(p.created_at) >= ?`;
      params.push(date_from);
    }

    if (date_to) {
      query += ` AND DATE(p.created_at) <= ?`;
      params.push(date_to);
    }

    query += ` GROUP BY p.id, er.id`;

    if (topic && topic !== 'ALL') {
      query += ` HAVING instr(',' || topic_codes || ',', ?) > 0`;
      params.push(`,${topic},`);
    }

    query += ` ORDER BY p.id DESC`;

    const rows = db.prepare(query).all(...params) as any[];

    // Fetch all topic master to expand topic_codes
    const topicMaster = db.prepare('SELECT code, title FROM technology_topics').all() as { code: string; title: string }[];
    const topicMap = new Map(topicMaster.map(t => [t.code, t.title]));

    const formatted = rows.map(r => {
      const codes = r.topic_codes ? (r.topic_codes as string).split(',') : [];
      return {
        ...r,
        topics: codes.map(c => ({ code: c, title: topicMap.get(c) || c }))
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      participants: formatted
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat data peserta' });
  }
});

// 7. GET /api/admin/participants/:id - Detail participant
router.get('/admin/participants/:id', (req: Request, res: Response): any => {
  try {
    const id = req.params.id;
    const participant = db.prepare(`
      SELECT 
        p.*,
        er.id as registration_id,
        er.status,
        er.qr_token,
        er.check_in_time,
        er.badge_printed,
        er.notes
      FROM participants p
      JOIN event_registrations er ON er.participant_id = p.id
      WHERE p.id = ?
    `).get(id) as any;

    if (!participant) {
      return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan' });
    }

    const topics = db.prepare(`
      SELECT tt.code, tt.title, tt.category, tt.description
      FROM participant_topics pt
      JOIN technology_topics tt ON tt.code = pt.topic_code
      WHERE pt.participant_id = ?
      ORDER BY tt.code ASC
    `).all(id);

    const attendanceLogs = db.prepare(`
      SELECT * FROM attendance_records
      WHERE registration_id = ?
      ORDER BY check_in_timestamp DESC
    `).all(participant.registration_id);

    const auditTrail = db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_id = ? OR entity_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(participant.reg_number, String(participant.id));

    res.json({
      success: true,
      participant: {
        ...participant,
        topics,
        attendanceLogs,
        auditTrail
      }
    });
  } catch (error) {
    console.error('Error fetching detail:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat detail peserta' });
  }
});

// 8. PUT /api/admin/participants/:id - Update participant data
router.put('/admin/participants/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const {
      full_name,
      role_position,
      institution_name,
      phone_wa,
      email,
      city,
      topics = [],
      status,
      notes
    } = req.body;

    const existing = db.prepare('SELECT * FROM participants WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan' });
    }

    // Validation
    const phoneCheck = normalizeIndonesianPhone(phone_wa);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, error: phoneCheck.error });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, error: emailCheck.error });
    }

    const updateTx = db.transaction(() => {
      db.prepare(`
        UPDATE participants
        SET full_name = ?,
            role_position = ?,
            institution_name = ?,
            phone_wa = ?,
            email = ?,
            city = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        sanitizeText(full_name),
        role_position,
        sanitizeText(institution_name),
        phoneCheck.normalized,
        emailCheck.normalized,
        sanitizeText(city),
        id
      );

      // Update status and notes if provided
      if (status) {
        db.prepare(`
          UPDATE event_registrations
          SET status = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE participant_id = ?
        `).run(status, sanitizeText(notes || ''), id);
      }

      // Update topics
      db.prepare('DELETE FROM participant_topics WHERE participant_id = ?').run(id);
      const insertTopic = db.prepare('INSERT INTO participant_topics (participant_id, topic_code) VALUES (?, ?)');
      for (const t of topics) {
        if (typeof t === 'string') insertTopic.run(id, t);
      }

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
        VALUES ('UPDATE_PARTICIPANT', 'PARTICIPANT', ?, 'admin', ?)
      `).run(
        existing.reg_number,
        JSON.stringify({ full_name, institution_name, status })
      );
    });

    updateTx();

    res.json({ success: true, message: 'Data peserta berhasil diperbarui' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, error: 'Gagal memperbarui data peserta' });
  }
});

// 9. PATCH /api/admin/participants/:id/status - Quick status change (Terdaftar, Terverifikasi, Hadir, etc)
router.patch('/admin/participants/:id/status', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const { status, operator_name = 'Admin Staff' } = req.body;

    const validStatuses = ['Terdaftar', 'Terverifikasi', 'Hadir', 'Tidak Hadir', 'Dibatalkan'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status tidak valid' });
    }

    const reg = db.prepare(`
      SELECT er.id as registration_id, er.status, p.reg_number, p.full_name
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      WHERE er.participant_id = ?
    `).get(id) as any;

    if (!reg) {
      return res.status(404).json({ success: false, error: 'Pendaftaran tidak ditemukan' });
    }

    const tx = db.transaction(() => {
      const checkInTime = status === 'Hadir' ? new Date().toISOString() : null;
      db.prepare(`
        UPDATE event_registrations
        SET status = ?,
            check_in_time = COALESCE(?, check_in_time),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, checkInTime, reg.registration_id);

      if (status === 'Hadir') {
        db.prepare(`
          INSERT INTO attendance_records (registration_id, check_in_timestamp, check_in_method, operator_name)
          VALUES (?, CURRENT_TIMESTAMP, 'MANUAL_ADMIN', ?)
        `).run(reg.registration_id, operator_name);
      }

      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
        VALUES ('STATUS_CHANGE', 'REGISTRATION', ?, 'admin', ?)
      `).run(
        reg.reg_number,
        `Status changed from ${reg.status} to ${status} by ${operator_name}`
      );
    });

    tx();

    res.json({
      success: true,
      message: `Status peserta berhasil diubah menjadi: ${status}`
    });
  } catch (error) {
    console.error('Status change error:', error);
    res.status(500).json({ success: false, error: 'Gagal mengubah status peserta' });
  }
});

// 10. POST /api/admin/check-in - QR Code Scan Check-In Endpoint
router.post('/admin/check-in', (req: Request, res: Response): any => {
  try {
    const { code, operator_name = 'Check-in Desk Gate 1' } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Kode QR atau Nomor Registrasi tidak valid' });
    }

    const cleanCode = code.trim();
    const codes = extractTicketCodes(cleanCode).map((item) => item.toUpperCase());
    if (codes.length === 0) {
      return res.status(400).json({ success: false, error: 'Kode QR atau Nomor Registrasi tidak valid' });
    }
    const marks = codes.map(() => '?').join(', ');

    const reg = db.prepare(`
      SELECT 
        p.id as participant_id,
        p.reg_number,
        p.full_name,
        p.role_position,
        p.institution_name,
        p.phone_wa,
        p.city,
        er.id as registration_id,
        er.status,
        er.qr_token,
        er.check_in_time
      FROM event_registrations er
      JOIN participants p ON p.id = er.participant_id
      WHERE UPPER(er.qr_token) IN (${marks})
         OR UPPER(p.reg_number) IN (${marks})
    `).get(...codes, ...codes) as any;

    if (!reg) {
      return res.status(404).json({
        success: false,
        error: `Data registrasi dengan kode "${cleanCode}" tidak ditemukan dalam sistem.`
      });
    }

    // Check if already checked in
    const isAlreadyCheckedIn = reg.status === 'Hadir';

    // If not checked in yet, perform check in transaction
    if (!isAlreadyCheckedIn) {
      const now = new Date().toISOString();
      const tx = db.transaction(() => {
        db.prepare(`
          UPDATE event_registrations
          SET status = 'Hadir',
              check_in_time = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(now, reg.registration_id);

        db.prepare(`
          INSERT INTO attendance_records (registration_id, check_in_timestamp, check_in_method, operator_name)
          VALUES (?, ?, 'QR_SCANNER', ?)
        `).run(reg.registration_id, now, operator_name);

        db.prepare(`
          INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
          VALUES ('CHECK_IN', 'ATTENDANCE', ?, 'qr_scanner', ?)
        `).run(reg.reg_number, `Check-in recorded via QR Scanner by ${operator_name}`);
      });
      tx();
    }

    res.json({
      success: true,
      already_attended: isAlreadyCheckedIn,
      message: isAlreadyCheckedIn
        ? `PERINGATAN: Peserta ${reg.full_name} telah check-in sebelumnya pada ${reg.check_in_time}`
        : `CHECK-IN BERHASIL: Selamat datang ${reg.full_name}!`,
      participant: {
        reg_number: reg.reg_number,
        full_name: reg.full_name,
        role_position: reg.role_position,
        institution_name: reg.institution_name,
        city: reg.city,
        qr_token: reg.qr_token,
        status: 'Hadir',
        check_in_time: reg.check_in_time || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, error: 'Gagal memproses check-in' });
  }
});

// 11. DELETE /api/admin/participants/:id - Delete with confirmation and cascade
router.delete('/admin/participants/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT reg_number, full_name FROM participants WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan' });
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM participants WHERE id = ?').run(id);
      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
        VALUES ('DELETE_PARTICIPANT', 'PARTICIPANT', ?, 'admin', ?)
      `).run(existing.reg_number, `Participant ${existing.full_name} (${existing.reg_number}) deleted by admin`);
    });

    tx();

    res.json({ success: true, message: `Peserta ${existing.full_name} (${existing.reg_number}) berhasil dihapus` });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus data peserta' });
  }
});

// 12. GET /api/admin/audit-logs - Audit trail
router.get('/admin/audit-logs', (_req: Request, res: Response) => {
  try {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat log audit' });
  }
});

// 13. POST /api/admin/import - Batch import participants
router.post('/admin/import', (req: Request, res: Response): any => {
  try {
    const { participants: importData = [] } = req.body;
    if (!Array.isArray(importData) || importData.length === 0) {
      return res.status(400).json({ success: false, error: 'Data import tidak boleh kosong' });
    }

    let importedCount = 0;
    const errors: string[] = [];

    const importTx = db.transaction(() => {
      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        if (!item.full_name || !item.institution_name) {
          errors.push(`Baris ${i + 1}: Nama atau Instansi tidak lengkap`);
          continue;
        }

        const phoneCheck = normalizeIndonesianPhone(item.phone_wa || '081234567890');
        const emailCheck = validateEmail(item.email || `peserta${i}@instansi.id`);

        // Check deduplication
        const dup = db.prepare('SELECT id FROM participants WHERE phone_wa = ? OR email = ?')
          .get(phoneCheck.normalized, emailCheck.normalized);
        if (dup) {
          errors.push(`Baris ${i + 1}: ${item.full_name} sudah terdaftar sebelumnya`);
          continue;
        }

        const reg_number = generateNextRegNumber();
        const qr_token = `ESTRADA-2026-${reg_number}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        const pRes = db.prepare(`
          INSERT INTO participants (
            reg_number, full_name, role_position, institution_name, phone_wa, email, city, pdp_consent, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(
          reg_number,
          sanitizeText(item.full_name),
          item.role_position || 'Direktur / Wakil Manajemen Rumah Sakit',
          sanitizeText(item.institution_name),
          phoneCheck.normalized,
          emailCheck.normalized,
          sanitizeText(item.city || 'DKI Jakarta')
        );

        const newId = Number(pRes.lastInsertRowid);
        db.prepare(`
          INSERT INTO event_registrations (participant_id, event_name, status, qr_token, created_at, updated_at)
          VALUES (?, 'ESTRADA 2026', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `).run(newId, item.status || 'Terdaftar', qr_token);

        if (Array.isArray(item.topics)) {
          for (const t of item.topics) {
            db.prepare('INSERT OR IGNORE INTO participant_topics (participant_id, topic_code) VALUES (?, ?)').run(newId, t);
          }
        }

        importedCount++;
      }
    });

    importTx();

    res.json({
      success: true,
      message: `Berhasil mengimpor ${importedCount} data peserta`,
      importedCount,
      errors
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ success: false, error: 'Gagal memproses import data' });
  }
});

// 14. Master Topik Teknologi CRUD Endpoints
router.get('/admin/topics', (_req: Request, res: Response) => {
  try {
    const topics = db.prepare(`
      SELECT tt.*, COUNT(pt.id) as participant_count
      FROM technology_topics tt
      LEFT JOIN participant_topics pt ON pt.topic_code = tt.code
      GROUP BY tt.id
      ORDER BY tt.code ASC
    `).all();
    res.json({ success: true, topics });
  } catch (error) {
    console.error('Error fetching admin topics:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat master topik teknologi' });
  }
});

router.post('/admin/topics', (req: Request, res: Response): any => {
  try {
    const { code, title, category, description } = req.body;
    if (!code || !title) {
      return res.status(400).json({ success: false, error: 'Kode dan Judul Topik wajib diisi' });
    }

    const cleanCode = sanitizeText(code).toUpperCase();
    const cleanTitle = sanitizeText(title);
    const cleanCat = sanitizeText(category || 'General');
    const cleanDesc = sanitizeText(description || '');

    const existing = db.prepare('SELECT id FROM technology_topics WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(409).json({ success: false, error: `Kode topik "${cleanCode}" sudah digunakan` });
    }

    const result = db.prepare(`
      INSERT INTO technology_topics (code, title, category, description)
      VALUES (?, ?, ?, ?)
    `).run(cleanCode, cleanTitle, cleanCat, cleanDesc);

    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
      VALUES ('CREATE_TOPIC', 'TOPIC', ?, 'admin', ?)
    `).run(cleanCode, `Topik [${cleanCode}] ${cleanTitle} ditambahkan ke master`);

    res.status(201).json({
      success: true,
      message: 'Topik teknologi berhasil ditambahkan',
      topic: { id: Number(result.lastInsertRowid), code: cleanCode, title: cleanTitle, category: cleanCat, description: cleanDesc, participant_count: 0 }
    });
  } catch (error) {
    console.error('Create topic error:', error);
    res.status(500).json({ success: false, error: 'Gagal menambahkan topik baru' });
  }
});

router.put('/admin/topics/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const { code, title, category, description } = req.body;

    const existing = db.prepare('SELECT * FROM technology_topics WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Topik tidak ditemukan' });
    }

    const cleanCode = sanitizeText(code || existing.code).toUpperCase();
    const cleanTitle = sanitizeText(title || existing.title);
    const cleanCat = sanitizeText(category || existing.category);
    const cleanDesc = sanitizeText(description !== undefined ? description : existing.description);

    const tx = db.transaction(() => {
      // If code changed, check duplicate
      if (cleanCode !== existing.code) {
        const dup = db.prepare('SELECT id FROM technology_topics WHERE code = ? AND id != ?').get(cleanCode, id);
        if (dup) {
          throw new Error(`Kode "${cleanCode}" sudah dipakai topik lain`);
        }
        // Update participant_topics reference
        db.prepare('UPDATE participant_topics SET topic_code = ? WHERE topic_code = ?').run(cleanCode, existing.code);
      }

      db.prepare(`
        UPDATE technology_topics
        SET code = ?, title = ?, category = ?, description = ?
        WHERE id = ?
      `).run(cleanCode, cleanTitle, cleanCat, cleanDesc, id);

      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
        VALUES ('UPDATE_TOPIC', 'TOPIC', ?, 'admin', ?)
      `).run(cleanCode, `Topik [${cleanCode}] ${cleanTitle} diperbarui`);
    });

    tx();

    res.json({ success: true, message: 'Topik berhasil diperbarui' });
  } catch (error: any) {
    console.error('Update topic error:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal memperbarui topik' });
  }
});

router.delete('/admin/topics/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM technology_topics WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Topik tidak ditemukan' });
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM participant_topics WHERE topic_code = ?').run(existing.code);
      db.prepare('DELETE FROM technology_topics WHERE id = ?').run(id);
      db.prepare(`
        INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
        VALUES ('DELETE_TOPIC', 'TOPIC', ?, 'admin', ?)
      `).run(existing.code, `Topik [${existing.code}] ${existing.title} dihapus dari master`);
    });

    tx();

    res.json({ success: true, message: `Topik [${existing.code}] berhasil dihapus` });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus topik' });
  }
});

// 15. Master Segmentasi Minat CRUD Endpoints
router.get('/admin/segments', (_req: Request, res: Response) => {
  try {
    const segments = db.prepare('SELECT * FROM interest_segments ORDER BY id ASC').all() as any[];

    // For each segment, find matched participants based on topic_codes
    const result = segments.map(seg => {
      const codes = seg.topic_codes ? seg.topic_codes.split(',').map((c: string) => c.trim().toUpperCase()) : [];
      if (codes.length === 0) {
        return {
          ...seg,
          matched_participants_count: 0,
          matched_participants: []
        };
      }

      const placeholders = codes.map(() => '?').join(',');
      const matched = db.prepare(`
        SELECT DISTINCT p.id, p.reg_number, p.full_name, p.institution_name, p.role_position, p.city, p.phone_wa
        FROM participants p
        JOIN participant_topics pt ON pt.participant_id = p.id
        WHERE pt.topic_code IN (${placeholders})
        ORDER BY p.id DESC
      `).all(...codes) as any[];

      return {
        ...seg,
        matched_participants_count: matched.length,
        matched_participants: matched
      };
    });

    res.json({ success: true, segments: result });
  } catch (error) {
    console.error('Error fetching admin segments:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat master segmentasi minat' });
  }
});

router.post('/admin/segments', (req: Request, res: Response): any => {
  try {
    const { name, color = 'sky', topic_codes, description } = req.body;
    if (!name || !topic_codes) {
      return res.status(400).json({ success: false, error: 'Nama Segmentasi dan Minimal 1 Topik wajib diisi' });
    }

    const cleanName = sanitizeText(name);
    const cleanCodes = Array.isArray(topic_codes) 
      ? topic_codes.join(',') 
      : String(topic_codes).toUpperCase().replace(/\s+/g, '');
    const cleanColor = sanitizeText(color || 'sky');
    const cleanDesc = sanitizeText(description || '');

    const result = db.prepare(`
      INSERT INTO interest_segments (name, color, topic_codes, description)
      VALUES (?, ?, ?, ?)
    `).run(cleanName, cleanColor, cleanCodes, cleanDesc);

    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
      VALUES ('CREATE_SEGMENT', 'SEGMENT', ?, 'admin', ?)
    `).run(String(result.lastInsertRowid), `Segmentasi "${cleanName}" (${cleanCodes}) ditambahkan`);

    res.status(201).json({
      success: true,
      message: 'Segmentasi minat berhasil ditambahkan',
      segmentId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error('Create segment error:', error);
    res.status(500).json({ success: false, error: 'Gagal menambahkan segmentasi baru' });
  }
});

router.put('/admin/segments/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const { name, color, topic_codes, description } = req.body;

    const existing = db.prepare('SELECT * FROM interest_segments WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Segmentasi tidak ditemukan' });
    }

    const cleanName = sanitizeText(name || existing.name);
    const cleanCodes = topic_codes !== undefined 
      ? (Array.isArray(topic_codes) ? topic_codes.join(',') : String(topic_codes).toUpperCase().replace(/\s+/g, ''))
      : existing.topic_codes;
    const cleanColor = sanitizeText(color || existing.color);
    const cleanDesc = sanitizeText(description !== undefined ? description : existing.description);

    db.prepare(`
      UPDATE interest_segments
      SET name = ?, color = ?, topic_codes = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(cleanName, cleanColor, cleanCodes, cleanDesc, id);

    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
      VALUES ('UPDATE_SEGMENT', 'SEGMENT', ?, 'admin', ?)
    `).run(String(id), `Segmentasi "${cleanName}" (${cleanCodes}) diperbarui`);

    res.json({ success: true, message: 'Segmentasi minat berhasil diperbarui' });
  } catch (error) {
    console.error('Update segment error:', error);
    res.status(500).json({ success: false, error: 'Gagal memperbarui segmentasi' });
  }
});

router.delete('/admin/segments/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM interest_segments WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Segmentasi tidak ditemukan' });
    }

    db.prepare('DELETE FROM interest_segments WHERE id = ?').run(id);

    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
      VALUES ('DELETE_SEGMENT', 'SEGMENT', ?, 'admin', ?)
    `).run(String(id), `Segmentasi "${existing.name}" dihapus dari master`);

    res.json({ success: true, message: `Segmentasi "${existing.name}" berhasil dihapus` });
  } catch (error) {
    console.error('Delete segment error:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus segmentasi' });
  }
});

router.get('/brand', (_req: Request, res: Response) => {
  res.json({ success: true, ...publicBrand() });
});

router.post('/admin/brand', (req: Request, res: Response): any => {
  try {
    const { kind, data_url } = req.body || {};
    const brand = saveBrand(String(kind || ''), String(data_url || ''));
    db.prepare(`
      INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details)
      VALUES ('UPDATE_BRAND', 'SETTINGS', ?, 'admin', ?)
    `).run(String(kind), kind === 'icon' ? 'Ikon diganti' : 'Gambar diganti');
    res.json({ success: true, ...brand });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Gagal menyimpan gambar.' });
  }
});

router.delete('/admin/brand/:kind', (req: Request, res: Response): any => {
  try {
    const brand = clearBrand(req.params.kind);
    res.json({ success: true, ...brand });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'Gagal menghapus gambar.' });
  }
});

export default router;
