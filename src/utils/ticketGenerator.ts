import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Participant } from '../types.ts';

export function ticketPageUrl(participant: Pick<Participant, 'qr_token' | 'reg_number'>): string {
  const token = participant.qr_token || participant.reg_number;
  const path = `/tiket/${encodeURIComponent(token)}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return origin ? `${origin}${path}` : path;
}

export function ticketQrPayload(participant: Pick<Participant, 'qr_token' | 'reg_number'>): string {
  return ticketPageUrl(participant);
}

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 480,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    return '';
  }
}

export async function downloadPdfTicket(participant: Participant) {
  const pageUrl = ticketPageUrl(participant);
  const qrDataUrl = await generateQRCodeDataUrl(pageUrl);
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background bar (Deep Navy)
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Accent line (Medical Cyan)
  doc.setFillColor(14, 165, 233); // #0ea5e9
  doc.rect(0, 42, pageWidth, 2.5, 'F');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('ESTRADA 2026', pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 242, 254);
  doc.text('HEALTHCARE TECHNOLOGY & INNOVATION SUMMIT', pageWidth / 2, 23, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(186, 230, 253);
  doc.text('OFFICIAL VISITOR E-TICKET & ACCESS PASS', pageWidth / 2, 30, { align: 'center' });

  // Registration Badge Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 52, pageWidth - 30, 22, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('NOMOR REGISTRASI RESMI', pageWidth / 2, 60, { align: 'center' });

  doc.setFont('courier', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(participant.reg_number, pageWidth / 2, 68, { align: 'center' });

  // QR Code in the middle
  if (qrDataUrl) {
    const qrSize = 52;
    const qrX = (pageWidth - qrSize) / 2;
    doc.addImage(qrDataUrl, 'PNG', qrX, 78, qrSize, qrSize);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(14, 116, 144);
  const urlLines = doc.splitTextToSize(pageUrl, pageWidth - 16);
  doc.text(urlLines, pageWidth / 2, 134, { align: 'center' });

  const startY = 136 + urlLines.length * 3.4;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, startY, pageWidth - 30, 50, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(14, 165, 233);
  doc.text('DATA PESERTA ACARA', 20, startY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Nama Lengkap', 20, startY + 16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${participant.full_name}`, 55, startY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Jabatan / Posisi', 20, startY + 23);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${participant.role_position}`, 55, startY + 23);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Instansi / Rumah Sakit', 20, startY + 30);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${participant.institution_name}`, 55, startY + 30);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Kota Domisili', 20, startY + 37);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`: ${participant.city}`, 55, startY + 37);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Status Registrasi', 20, startY + 44);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(`: ${participant.status || 'Terdaftar'}`, 55, startY + 44);

  // Event Schedule & Venue Footer
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  const footerY = startY + 58;
  doc.text('JADWAL & LOKASI KEGIATAN:', 15, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Grand Ballroom, Jakarta Convention Center (JCC) Senayan, Jakarta', 15, footerY + 5);
  doc.text('Pukul 08.30 - 16.30 WIB | Registrasi Ulang & Check-in dibuka mulai pukul 07.45 WIB', 15, footerY + 9);

  doc.save(`ESTRADA-E-Ticket-${participant.reg_number}.pdf`);
}

export function generateCalendarIcs(participant: Participant) {
  const title = 'ESTRADA 2026 - Healthcare Technology & Innovation Summit';
  const description = `E-Ticket Resmi: ${participant.reg_number}\\nNama: ${participant.full_name}\\nInstansi: ${participant.institution_name}\\nTiket: ${ticketPageUrl(participant)}\\nHarap tunjukkan QR Pass Anda saat check-in di venue.`;
  const location = 'Grand Ballroom, Jakarta Convention Center (JCC), Senayan, DKI Jakarta';
  const startTime = '20261115T013000Z'; // 08:30 WIB
  const endTime = '20261115T093000Z';   // 16:30 WIB

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ESTRADA//Healthcare Tech Summit//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ESTRADA-Event-${participant.reg_number}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
