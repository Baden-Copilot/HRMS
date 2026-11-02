/**
 * Validation & Normalization helpers for ESTRADA Event Registration System
 */

export function normalizeIndonesianPhone(phone: string): { valid: boolean; normalized: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, normalized: '', error: 'Nomor WhatsApp wajib diisi' };
  }

  // Remove whitespace, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Handle leading '+62', '62', '0'
  if (cleaned.startsWith('+62')) {
    cleaned = '+62' + cleaned.slice(3).replace(/^0+/, '');
  } else if (cleaned.startsWith('62')) {
    cleaned = '+62' + cleaned.slice(2).replace(/^0+/, '');
  } else if (cleaned.startsWith('0')) {
    cleaned = '+62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '+62' + cleaned;
  } else {
    return {
      valid: false,
      normalized: '',
      error: 'Format nomor WhatsApp tidak valid. Gunakan format Indonesia (contoh: 08123456789 atau +628123456789)'
    };
  }

  // Indonesian mobile numbers usually start with +628 and have 10-15 digits
  const regex = /^\+628[1-9][0-9]{7,11}$/;
  if (!regex.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Nomor WhatsApp tidak valid. Pastikan nomor seluler aktif dengan 10-14 digit angka (contoh: 0812xxxxxxx)'
    };
  }

  return { valid: true, normalized: cleaned };
}

export function validateEmail(email: string): { valid: boolean; normalized: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, normalized: '', error: 'Alamat email wajib diisi' };
  }

  const normalized = email.trim().toLowerCase();
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!regex.test(normalized)) {
    return { valid: false, normalized, error: 'Format email tidak valid (contoh: nama@instansi.co.id)' };
  }

  return { valid: true, normalized };
}

export function sanitizeText(text: string): string {
  if (!text) return '';
  return text.trim().replace(/[<>]/g, '');
}
