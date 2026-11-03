import { Router, Request, Response } from 'express';
import {
  data,
  dateOnly,
  generateNextRegNumber,
  linkTopics,
  mutate,
  nextId,
  pushAudit,
  removeParticipant,
  stamp,
  topicsFor,
} from '../db.ts';
import { normalizeIndonesianPhone, validateEmail, sanitizeText } from '../validation.ts';
import { extractTicketCodes } from '../ticketPage.ts';
import { clearBrand, publicBrand, saveBrand } from '../brand.ts';

const router = Router();

function includesText(value: string, needle: string) {
  return value.toLowerCase().includes(needle.toLowerCase());
}

router.get('/topics', (_req: Request, res: Response) => {
  try {
    const topics = [...data().technology_topics].sort((a, b) => a.code.localeCompare(b.code));
    res.json({ success: true, topics });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data topik teknologi' });
  }
});

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
      honeypot
    } = req.body;

    if (honeypot) {
      return res.status(400).json({ success: false, error: 'Spam detected' });
    }

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

    const phoneCheck = normalizeIndonesianPhone(phone_wa);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, error: phoneCheck.error });
    }

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

    const store = data();
    const existing = store.participants.find((participant) => {
      if (participant.phone_wa !== phoneCheck.normalized && participant.email !== emailCheck.normalized) return false;
      return store.event_registrations.some(
        (registration) => registration.participant_id === participant.id && registration.event_name === 'ESTRADA 2026'
      );
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        reg_number: existing.reg_number,
        error: `Nomor WhatsApp atau Email ini telah terdaftar sebelumnya atas nama "${existing.full_name}" (${existing.institution_name}) dengan No. Registrasi: ${existing.reg_number}.`
      });
    }

    const reg_number = generateNextRegNumber();
    const qr_token = `ESTRADA-2026-${reg_number}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const registeredAt = stamp();
    const selectedCodes = Array.isArray(topics)
      ? topics.filter((code: unknown) => typeof code === 'string' && code.length === 1)
      : [];

    const newParticipantId = mutate((db) => {
      const id = nextId(db.participants);
      db.participants.push({
        id,
        reg_number,
        full_name: sanitizedName,
        role_position,
        institution_name: sanitizedInst,
        phone_wa: phoneCheck.normalized,
        email: emailCheck.normalized,
        city: sanitizedCity,
        pdp_consent: 1,
        created_at: registeredAt,
        updated_at: registeredAt,
      });
      linkTopics(db, id, selectedCodes);
      db.event_registrations.push({
        id: nextId(db.event_registrations),
        participant_id: id,
        event_name: 'ESTRADA 2026',
        status: 'Terdaftar',
        qr_token,
        check_in_time: null,
        badge_printed: 0,
        notes: null,
        created_at: registeredAt,
        updated_at: registeredAt,
      });
      pushAudit(db, 'REGISTER', 'PARTICIPANT', reg_number, 'public_web', JSON.stringify({
        name: sanitizedName,
        institution: sanitizedInst,
        role: role_position,
        topics_count: topics.length
      }));
      return id;
    });

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
        topics: topicsFor(newParticipantId),
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

router.get('/ticket/:query', (req: Request, res: Response): any => {
  try {
    const rawQuery = extractTicketCodes(req.params.query.trim())[0] || req.params.query.trim();
    let phoneNormalized = '';
    if (/^[0-9+]+$/.test(rawQuery.replace(/[\s\-]/g, ''))) {
      const p = normalizeIndonesianPhone(rawQuery);
      if (p.valid) phoneNormalized = p.normalized;
    }

    const store = data();
    const phone = phoneNormalized || rawQuery;
    const registration = store.event_registrations.find((item) => {
      const participant = store.participants.find((row) => row.id === item.participant_id);
      if (!participant) return false;
      return participant.reg_number.toUpperCase() === rawQuery.toUpperCase()
        || participant.phone_wa === phone
        || item.qr_token.toUpperCase() === rawQuery.toUpperCase();
    });
    const participant = registration
      ? store.participants.find((row) => row.id === registration.participant_id)
      : undefined;

    if (!participant || !registration) {
      return res.status(404).json({
        success: false,
        error: 'Data pendaftaran tidak ditemukan. Pastikan Nomor Registrasi atau Nomor WhatsApp sudah benar.'
      });
    }

    res.json({
      success: true,
      participant: {
        id: participant.id,
        reg_number: participant.reg_number,
        full_name: participant.full_name,
        role_position: participant.role_position,
        institution_name: participant.institution_name,
        phone_wa: participant.phone_wa,
        email: participant.email,
        city: participant.city,
        registered_at: participant.created_at,
        registration_id: registration.id,
        status: registration.status,
        qr_token: registration.qr_token,
        check_in_time: registration.check_in_time,
        badge_printed: registration.badge_printed,
        topics: topicsFor(participant.id)
      }
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil data tiket pendaftaran' });
  }
});

router.post('/admin/login', (req: Request, res: Response): any => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi' });
    }

    const user = data().users.find((item) => item.username === username);
    if (!user || user.password_hash !== password) {
      return res.status(401).json({ success: false, error: 'Username atau password admin salah' });
    }

    mutate((db) => {
      pushAudit(db, 'ADMIN_LOGIN', 'SYSTEM', String(user.id), user.username, 'Admin user logged into dashboard');
    });

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

router.get('/admin/stats', (_req: Request, res: Response) => {
  try {
    const store = data();
    const roleMap = new Map<string, number>();
    const cityMap = new Map<string, number>();
    const dayMap = new Map<string, number>();
    for (const participant of store.participants) {
      roleMap.set(participant.role_position, (roleMap.get(participant.role_position) || 0) + 1);
      cityMap.set(participant.city, (cityMap.get(participant.city) || 0) + 1);
      const day = dateOnly(participant.created_at);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }
    const statusMap = new Map<string, number>();
    for (const registration of store.event_registrations) {
      statusMap.set(registration.status, (statusMap.get(registration.status) || 0) + 1);
    }

    const topics = [...store.technology_topics]
      .map((topic) => ({
        code: topic.code,
        title: topic.title,
        category: topic.category,
        participant_count: store.participant_topics.filter((row) => row.topic_code === topic.code).length,
      }))
      .sort((a, b) => b.participant_count - a.participant_count || a.code.localeCompare(b.code));

    res.json({
      success: true,
      stats: {
        total_participants: store.participants.length,
        total_institutions: new Set(store.participants.map((row) => row.institution_name.toLowerCase())).size,
        roles: [...roleMap.entries()].map(([role_position, count]) => ({ role_position, count })),
        statuses: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
        cities: [...cityMap.entries()]
          .map(([city, count]) => ({ city, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        topics,
        daily_registrations: [...dayMap.entries()]
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        recent_audits: [...store.audit_logs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, error: 'Gagal mengambil statistik dashboard' });
  }
});

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

    const store = data();
    const topicMap = new Map(store.technology_topics.map((item) => [item.code, item.title]));
    const rows = store.participants
      .flatMap((participant) => {
        return store.event_registrations
          .filter((registration) => registration.participant_id === participant.id)
          .map((registration) => ({ participant, registration }));
      })
      .filter(({ participant, registration }) => {
        if (search) {
          const matched = [participant.full_name, participant.institution_name, participant.reg_number, participant.phone_wa, participant.email]
            .some((value) => includesText(value, search.trim()));
          if (!matched) return false;
        }
        if (role && role !== 'ALL' && participant.role_position !== role) return false;
        if (city && city !== 'ALL' && participant.city !== city) return false;
        if (status && status !== 'ALL' && registration.status !== status) return false;
        const created = dateOnly(participant.created_at);
        if (date_from && created < date_from) return false;
        if (date_to && created > date_to) return false;
        if (topic && topic !== 'ALL') {
          const codes = store.participant_topics
            .filter((row) => row.participant_id === participant.id)
            .map((row) => row.topic_code);
          if (!codes.includes(topic)) return false;
        }
        return true;
      })
      .sort((a, b) => b.participant.id - a.participant.id)
      .map(({ participant, registration }) => {
        const codes = store.participant_topics
          .filter((row) => row.participant_id === participant.id)
          .map((row) => row.topic_code)
          .sort();
        return {
          id: participant.id,
          reg_number: participant.reg_number,
          full_name: participant.full_name,
          role_position: participant.role_position,
          institution_name: participant.institution_name,
          phone_wa: participant.phone_wa,
          email: participant.email,
          city: participant.city,
          created_at: participant.created_at,
          updated_at: participant.updated_at,
          registration_id: registration.id,
          status: registration.status,
          qr_token: registration.qr_token,
          check_in_time: registration.check_in_time,
          badge_printed: registration.badge_printed,
          notes: registration.notes,
          topic_codes: codes.join(','),
          topics: codes.map((code) => ({ code, title: topicMap.get(code) || code }))
        };
      });

    res.json({
      success: true,
      count: rows.length,
      participants: rows
    });
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat data peserta' });
  }
});

router.get('/admin/participants/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const store = data();
    const participant = store.participants.find((row) => row.id === id);
    const registration = store.event_registrations.find((row) => row.participant_id === id);
    if (!participant || !registration) {
      return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan' });
    }

    const attendanceLogs = store.attendance_records
      .filter((row) => row.registration_id === registration.id)
      .sort((a, b) => b.check_in_timestamp.localeCompare(a.check_in_timestamp));
    const auditTrail = store.audit_logs
      .filter((row) => row.entity_id === participant.reg_number || row.entity_id === String(participant.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 10);

    res.json({
      success: true,
      participant: {
        ...participant,
        registration_id: registration.id,
        status: registration.status,
        qr_token: registration.qr_token,
        check_in_time: registration.check_in_time,
        badge_printed: registration.badge_printed,
        notes: registration.notes,
        topics: topicsFor(participant.id, 'full'),
        attendanceLogs,
        auditTrail
      }
    });
  } catch (error) {
    console.error('Error fetching detail:', error);
    res.status(500).json({ success: false, error: 'Gagal memuat detail peserta' });
  }
});

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
      topics,
      status,
      notes
    } = req.body;

    const existing = data().participants.find((row) => row.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan' });
    }

    const phoneCheck = normalizeIndonesianPhone(phone_wa);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, error: phoneCheck.error });
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, error: emailCheck.error });
    }

    mutate((db) => {
      const participant = db.participants.find((row) => row.id === id);
      if (!participant) return;
      participant.full_name = sanitizeText(full_name);
      participant.role_position = role_position;
      participant.institution_name = sanitizeText(institution_name);
      participant.phone_wa = phoneCheck.normalized;
      participant.email = emailCheck.normalized;
      participant.city = sanitizeText(city);
      participant.updated_at = stamp();

      if (status || notes !== undefined) {
        const registration = db.event_registrations.find((row) => row.participant_id === id);
        if (registration) {
          if (status) {
            const becamePresent = status === 'Hadir' && registration.status !== 'Hadir';
            registration.status = status;
            if (status === 'Hadir' && !registration.check_in_time) {
              registration.check_in_time = new Date().toISOString();
            }
            if (becamePresent) {
              db.attendance_records.push({
                id: nextId(db.attendance_records),
                registration_id: registration.id,
                check_in_timestamp: stamp(),
                check_in_method: 'MANUAL_ADMIN',
                operator_name: 'Admin',
                ip_address: null,
                device_info: null,
              });
            }
          }
          if (notes !== undefined) registration.notes = sanitizeText(notes || '');
          registration.updated_at = stamp();
        }
      }

      if (Array.isArray(topics)) {
        db.participant_topics = db.participant_topics.filter((row) => row.participant_id !== id);
        linkTopics(db, id, topics);
      }
      pushAudit(db, 'UPDATE_PARTICIPANT', 'PARTICIPANT', existing.reg_number, 'admin', JSON.stringify({ full_name, institution_name, status }));
    });

    res.json({ success: true, message: 'Data peserta berhasil diperbarui' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, error: 'Gagal memperbarui data peserta' });
  }
});

router.patch('/admin/participants/:id/status', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const { status, operator_name = 'Admin Staff' } = req.body;

    const validStatuses = ['Terdaftar', 'Terverifikasi', 'Hadir', 'Tidak Hadir', 'Dibatalkan'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Status tidak valid' });
    }

    const store = data();
    const participant = store.participants.find((row) => row.id === id);
    const registration = store.event_registrations.find((row) => row.participant_id === id);
    if (!participant || !registration) {
      return res.status(404).json({ success: false, error: 'Pendaftaran tidak ditemukan' });
    }

    const previous = registration.status;
    mutate((db) => {
      const current = db.event_registrations.find((row) => row.id === registration.id);
      if (!current) return;
      current.status = status;
      if (status === 'Hadir') current.check_in_time = new Date().toISOString();
      current.updated_at = stamp();
      if (status === 'Hadir') {
        db.attendance_records.push({
          id: nextId(db.attendance_records),
          registration_id: current.id,
          check_in_timestamp: stamp(),
          check_in_method: 'MANUAL_ADMIN',
          operator_name,
          ip_address: null,
          device_info: null,
        });
      }
      pushAudit(db, 'STATUS_CHANGE', 'REGISTRATION', participant.reg_number, 'admin', `Status changed from ${previous} to ${status} by ${operator_name}`);
    });

    res.json({
      success: true,
      message: `Status peserta berhasil diubah menjadi: ${status}`
    });
  } catch (error) {
    console.error('Status change error:', error);
    res.status(500).json({ success: false, error: 'Gagal mengubah status peserta' });
  }
});

router.post('/admin/check-in', (req: Request, res: Response): any => {
  try {
    const { code, operator_name = 'Check-in Desk Gate 1' } = req.body;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, error: 'Kode QR atau Nomor Registrasi tidak valid' });
    }

    const cleanCode = code.trim();
    const codes = new Set(extractTicketCodes(cleanCode).map((item) => item.toUpperCase()));
    if (codes.size === 0) {
      return res.status(400).json({ success: false, error: 'Kode QR atau Nomor Registrasi tidak valid' });
    }

    const store = data();
    const registration = store.event_registrations.find((item) => {
      const participant = store.participants.find((row) => row.id === item.participant_id);
      if (!participant) return false;
      return codes.has(item.qr_token.toUpperCase()) || codes.has(participant.reg_number.toUpperCase());
    });
    const participant = registration
      ? store.participants.find((row) => row.id === registration.participant_id)
      : undefined;

    if (!registration || !participant) {
      return res.status(404).json({
        success: false,
        error: `Data registrasi dengan kode "${cleanCode}" tidak ditemukan dalam sistem.`
      });
    }

    const isAlreadyCheckedIn = registration.status === 'Hadir';
    let checkInTime = registration.check_in_time;
    if (!isAlreadyCheckedIn) {
      const checkedAt = new Date().toISOString();
      checkInTime = checkedAt;
      mutate((db) => {
        const current = db.event_registrations.find((row) => row.id === registration.id);
        if (!current) return;
        current.status = 'Hadir';
        current.check_in_time = checkedAt;
        current.updated_at = stamp();
        db.attendance_records.push({
          id: nextId(db.attendance_records),
          registration_id: current.id,
          check_in_timestamp: checkedAt,
          check_in_method: 'QR_SCANNER',
          operator_name,
          ip_address: null,
          device_info: null,
        });
        pushAudit(db, 'CHECK_IN', 'ATTENDANCE', participant.reg_number, 'qr_scanner', `Check-in recorded via QR Scanner by ${operator_name}`);
      });
    }

    res.json({
      success: true,
      already_attended: isAlreadyCheckedIn,
      message: isAlreadyCheckedIn
        ? `PERINGATAN: Peserta ${participant.full_name} telah check-in sebelumnya pada ${registration.check_in_time}`
        : `CHECK-IN BERHASIL: Selamat datang ${participant.full_name}!`,
      participant: {
        reg_number: participant.reg_number,
        full_name: participant.full_name,
        role_position: participant.role_position,
        institution_name: participant.institution_name,
        city: participant.city,
        qr_token: registration.qr_token,
        status: 'Hadir',
        check_in_time: checkInTime
      }
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ success: false, error: 'Gagal memproses check-in' });
  }
});

router.delete('/admin/participants/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const existing = data().participants.find((row) => row.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Peserta tidak ditemukan' });
    }

    mutate((db) => {
      removeParticipant(db, id);
      pushAudit(db, 'DELETE_PARTICIPANT', 'PARTICIPANT', existing.reg_number, 'admin', `Participant ${existing.full_name} (${existing.reg_number}) deleted by admin`);
    });

    res.json({ success: true, message: `Peserta ${existing.full_name} (${existing.reg_number}) berhasil dihapus` });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus data peserta' });
  }
});

router.get('/admin/audit-logs', (_req: Request, res: Response) => {
  try {
    const logs = [...data().audit_logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal memuat log audit' });
  }
});

router.post('/admin/import', (req: Request, res: Response): any => {
  try {
    const { participants: importData = [] } = req.body;
    if (!Array.isArray(importData) || importData.length === 0) {
      return res.status(400).json({ success: false, error: 'Data import tidak boleh kosong' });
    }

    let importedCount = 0;
    const errors: string[] = [];

    mutate((db) => {
      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        if (!item.full_name || !item.institution_name) {
          errors.push(`Baris ${i + 1}: Nama atau Instansi tidak lengkap`);
          continue;
        }

        const phoneCheck = normalizeIndonesianPhone(item.phone_wa || '081234567890');
        const emailCheck = validateEmail(item.email || `peserta${i}@instansi.id`);
        const duplicate = db.participants.find(
          (row) => row.phone_wa === phoneCheck.normalized || row.email === emailCheck.normalized
        );
        if (duplicate) {
          errors.push(`Baris ${i + 1}: ${item.full_name} sudah terdaftar sebelumnya`);
          continue;
        }

        const reg_number = generateNextRegNumber();
        const qr_token = `ESTRADA-2026-${reg_number}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const created = stamp();
        const id = nextId(db.participants);
        db.participants.push({
          id,
          reg_number,
          full_name: sanitizeText(item.full_name),
          role_position: item.role_position || 'Direktur / Wakil Manajemen Rumah Sakit',
          institution_name: sanitizeText(item.institution_name),
          phone_wa: phoneCheck.normalized,
          email: emailCheck.normalized,
          city: sanitizeText(item.city || 'DKI Jakarta'),
          pdp_consent: 1,
          created_at: created,
          updated_at: created,
        });
        db.event_registrations.push({
          id: nextId(db.event_registrations),
          participant_id: id,
          event_name: 'ESTRADA 2026',
          status: item.status || 'Terdaftar',
          qr_token,
          check_in_time: null,
          badge_printed: 0,
          notes: null,
          created_at: created,
          updated_at: created,
        });
        if (Array.isArray(item.topics)) linkTopics(db, id, item.topics);
        importedCount++;
      }
    });

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

router.get('/admin/topics', (_req: Request, res: Response) => {
  try {
    const store = data();
    const topics = [...store.technology_topics]
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((topic) => ({
        ...topic,
        participant_count: store.participant_topics.filter((row) => row.topic_code === topic.code).length,
      }));
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

    if (data().technology_topics.some((topic) => topic.code === cleanCode)) {
      return res.status(409).json({ success: false, error: `Kode topik "${cleanCode}" sudah digunakan` });
    }

    const topic = mutate((db) => {
      const created = {
        id: nextId(db.technology_topics),
        code: cleanCode,
        title: cleanTitle,
        category: cleanCat,
        description: cleanDesc,
      };
      db.technology_topics.push(created);
      pushAudit(db, 'CREATE_TOPIC', 'TOPIC', cleanCode, 'admin', `Topik [${cleanCode}] ${cleanTitle} ditambahkan ke master`);
      return created;
    });

    res.status(201).json({
      success: true,
      message: 'Topik teknologi berhasil ditambahkan',
      topic: { ...topic, participant_count: 0 }
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
    const existing = data().technology_topics.find((topic) => topic.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Topik tidak ditemukan' });
    }

    const cleanCode = sanitizeText(code || existing.code).toUpperCase();
    const cleanTitle = sanitizeText(title || existing.title);
    const cleanCat = sanitizeText(category || existing.category);
    const cleanDesc = sanitizeText(description !== undefined ? description : existing.description || '');

    mutate((db) => {
      if (cleanCode !== existing.code && db.technology_topics.some((topic) => topic.code === cleanCode && topic.id !== id)) {
        throw new Error(`Kode "${cleanCode}" sudah dipakai topik lain`);
      }
      if (cleanCode !== existing.code) {
        for (const link of db.participant_topics) {
          if (link.topic_code === existing.code) link.topic_code = cleanCode;
        }
      }
      const topic = db.technology_topics.find((item) => item.id === id);
      if (!topic) return;
      topic.code = cleanCode;
      topic.title = cleanTitle;
      topic.category = cleanCat;
      topic.description = cleanDesc;
      pushAudit(db, 'UPDATE_TOPIC', 'TOPIC', cleanCode, 'admin', `Topik [${cleanCode}] ${cleanTitle} diperbarui`);
    });

    res.json({ success: true, message: 'Topik berhasil diperbarui' });
  } catch (error: any) {
    console.error('Update topic error:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal memperbarui topik' });
  }
});

router.delete('/admin/topics/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const existing = data().technology_topics.find((topic) => topic.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Topik tidak ditemukan' });
    }

    mutate((db) => {
      db.participant_topics = db.participant_topics.filter((row) => row.topic_code !== existing.code);
      db.technology_topics = db.technology_topics.filter((topic) => topic.id !== id);
      pushAudit(db, 'DELETE_TOPIC', 'TOPIC', existing.code, 'admin', `Topik [${existing.code}] ${existing.title} dihapus dari master`);
    });

    res.json({ success: true, message: `Topik [${existing.code}] berhasil dihapus` });
  } catch (error) {
    console.error('Delete topic error:', error);
    res.status(500).json({ success: false, error: 'Gagal menghapus topik' });
  }
});

router.get('/admin/segments', (_req: Request, res: Response) => {
  try {
    const store = data();
    const segments = [...store.interest_segments]
      .sort((a, b) => a.id - b.id)
      .map((segment) => {
        const codes = segment.topic_codes
          ? segment.topic_codes.split(',').map((code) => code.trim().toUpperCase()).filter(Boolean)
          : [];
        if (codes.length === 0) {
          return { ...segment, matched_participants_count: 0, matched_participants: [] };
        }
        const matchedIds = new Set(
          store.participant_topics
            .filter((row) => codes.includes(row.topic_code.toUpperCase()))
            .map((row) => row.participant_id)
        );
        const matched = store.participants
          .filter((participant) => matchedIds.has(participant.id))
          .sort((a, b) => b.id - a.id)
          .map((participant) => ({
            id: participant.id,
            reg_number: participant.reg_number,
            full_name: participant.full_name,
            institution_name: participant.institution_name,
            role_position: participant.role_position,
            city: participant.city,
            phone_wa: participant.phone_wa,
          }));
        return {
          ...segment,
          matched_participants_count: matched.length,
          matched_participants: matched,
        };
      });

    res.json({ success: true, segments });
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

    const segmentId = mutate((db) => {
      const created = stamp();
      const id = nextId(db.interest_segments);
      db.interest_segments.push({
        id,
        name: cleanName,
        color: cleanColor,
        topic_codes: cleanCodes,
        description: cleanDesc,
        created_at: created,
        updated_at: created,
      });
      pushAudit(db, 'CREATE_SEGMENT', 'SEGMENT', String(id), 'admin', `Segmentasi "${cleanName}" (${cleanCodes}) ditambahkan`);
      return id;
    });

    res.status(201).json({
      success: true,
      message: 'Segmentasi minat berhasil ditambahkan',
      segmentId
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
    const existing = data().interest_segments.find((segment) => segment.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Segmentasi tidak ditemukan' });
    }

    const cleanName = sanitizeText(name || existing.name);
    const cleanCodes = topic_codes !== undefined
      ? (Array.isArray(topic_codes) ? topic_codes.join(',') : String(topic_codes).toUpperCase().replace(/\s+/g, ''))
      : existing.topic_codes;
    const cleanColor = sanitizeText(color || existing.color);
    const cleanDesc = sanitizeText(description !== undefined ? description : existing.description || '');

    mutate((db) => {
      const segment = db.interest_segments.find((item) => item.id === id);
      if (!segment) return;
      segment.name = cleanName;
      segment.color = cleanColor;
      segment.topic_codes = cleanCodes;
      segment.description = cleanDesc;
      segment.updated_at = stamp();
      pushAudit(db, 'UPDATE_SEGMENT', 'SEGMENT', String(id), 'admin', `Segmentasi "${cleanName}" (${cleanCodes}) diperbarui`);
    });

    res.json({ success: true, message: 'Segmentasi minat berhasil diperbarui' });
  } catch (error) {
    console.error('Update segment error:', error);
    res.status(500).json({ success: false, error: 'Gagal memperbarui segmentasi' });
  }
});

router.delete('/admin/segments/:id', (req: Request, res: Response): any => {
  try {
    const id = Number(req.params.id);
    const existing = data().interest_segments.find((segment) => segment.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Segmentasi tidak ditemukan' });
    }

    mutate((db) => {
      db.interest_segments = db.interest_segments.filter((segment) => segment.id !== id);
      pushAudit(db, 'DELETE_SEGMENT', 'SEGMENT', String(id), 'admin', `Segmentasi "${existing.name}" dihapus dari master`);
    });

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
    mutate((db) => {
      pushAudit(db, 'UPDATE_BRAND', 'SETTINGS', String(kind), 'admin', kind === 'icon' ? 'Ikon diganti' : 'Gambar diganti');
    });
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
