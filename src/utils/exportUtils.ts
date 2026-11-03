import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Participant } from '../types.ts';
import { formatRegisteredAt } from './datetime.ts';

export function exportParticipantsToExcel(participants: Participant[], filename = 'ESTRADA_Daftar_Peserta_2026.xlsx') {
  const data = participants.map((p, idx) => ({
    'No': idx + 1,
    'No. Registrasi': p.reg_number,
    'Nama Lengkap': p.full_name,
    'Jabatan / Posisi': p.role_position,
    'Rumah Sakit / Instansi': p.institution_name,
    'WhatsApp': p.phone_wa,
    'Email': p.email,
    'Kota': p.city,
    'Status Registrasi': p.status,
    'Waktu Check-in': p.check_in_time || '-',
    'Topik Teknologi': p.topics?.map(t => `[${t.code}] ${t.title}`).join('; ') || '-',
    'Waktu Registrasi': formatRegisteredAt(p.created_at)
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Peserta Estrada');
  XLSX.writeFile(workbook, filename);
}

export function exportParticipantsToCsv(participants: Participant[], filename = 'ESTRADA_Daftar_Peserta_2026.csv') {
  const headers = [
    'No',
    'No. Registrasi',
    'Nama Lengkap',
    'Jabatan',
    'Instansi / RS',
    'WhatsApp',
    'Email',
    'Kota',
    'Status',
    'Check-in Time',
    'Topik Dipilih',
    'Waktu Registrasi'
  ];

  const escapeCsv = (str: any) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = participants.map((p, idx) => [
    idx + 1,
    p.reg_number,
    p.full_name,
    p.role_position,
    p.institution_name,
    p.phone_wa,
    p.email,
    p.city,
    p.status,
    p.check_in_time || '',
    p.topics?.map(t => `${t.code}`).join('|') || '',
    formatRegisteredAt(p.created_at)
  ].map(escapeCsv).join(','));

  const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportParticipantsToPdfReport(participants: Participant[], filterSummary = 'Semua Kategori') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42); // Navy
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setFillColor(14, 165, 233); // Cyan line
  doc.rect(0, 28, pageWidth, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text('ESTRADA 2026 — LAPORAN REKAPITULASI PESERTA', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(224, 242, 254);
  doc.text(`Healthcare Technology & Innovation Summit | Filter: ${filterSummary} | Total: ${participants.length} Peserta`, 14, 20);

  // Table setup
  doc.setFontSize(8);
  let y = 38;
  const colX = [14, 24, 52, 95, 145, 185, 215, 245, 275];

  // Table Headers
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text('No', colX[0], y);
  doc.text('No. Reg', colX[1], y);
  doc.text('Nama Peserta', colX[2], y);
  doc.text('Instansi / Rumah Sakit', colX[3], y);
  doc.text('Jabatan', colX[4], y);
  doc.text('Kota', colX[5], y);
  doc.text('WhatsApp', colX[6], y);
  doc.text('Status', colX[7], y);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 3, pageWidth - 14, y + 3);

  y += 9;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  for (let i = 0; i < participants.length; i++) {
    if (y > 185) {
      doc.addPage();
      y = 20;
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.text('No', colX[0], y);
      doc.text('No. Reg', colX[1], y);
      doc.text('Nama Peserta', colX[2], y);
      doc.text('Instansi / Rumah Sakit', colX[3], y);
      doc.text('Jabatan', colX[4], y);
      doc.text('Kota', colX[5], y);
      doc.text('WhatsApp', colX[6], y);
      doc.text('Status', colX[7], y);
      y += 9;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
    }

    const p = participants[i];
    doc.text(String(i + 1), colX[0], y);
    doc.text(p.reg_number, colX[1], y);
    doc.text(doc.splitTextToSize(p.full_name, 40)[0] || '', colX[2], y);
    doc.text(doc.splitTextToSize(p.institution_name, 48)[0] || '', colX[3], y);
    doc.text(doc.splitTextToSize(p.role_position, 38)[0] || '', colX[4], y);
    doc.text(p.city, colX[5], y);
    doc.text(p.phone_wa, colX[6], y);
    doc.text(p.status, colX[7], y);

    doc.line(14, y + 3, pageWidth - 14, y + 3);
    y += 7.5;
  }

  doc.save(`ESTRADA_Rekap_Peserta_${new Date().toISOString().slice(0, 10)}.pdf`);
}
