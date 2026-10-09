import { jsPDF } from 'jspdf';
import type { Reservation } from '../types';
import { formatCLP, formatDateCL } from './formatters';

export const CONTACT_WHATSAPP = '9 9459 7751';
export const CONTACT_WHATSAPP_INT = '+56 9 9459 7751';
export const CONTACT_EMAIL = 'contacto@refugioaliwenspa.cl';

/**
 * Builds and downloads a professional, high-conversion PDF voucher
 * containing all booking details, contact information, and check-in instructions.
 */
export function generateVoucherPDF(reservation: Reservation): jsPDF {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // 1. Header Banner
  doc.setFillColor(26, 56, 38); // Forest Green #1A3826
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REFUGIO ALIWEN SPA', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('COMPROBANTE OFICIAL DE AGENDAMIENTO', margin, 19);

  const formattedDate = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  doc.text(`Emitido: ${formattedDate}`, pageWidth - margin, 19, { align: 'right' });

  // 2. Booking Code & Status Card
  let y = 35;
  doc.setFillColor(243, 247, 244);
  doc.setDrawColor(190, 215, 198);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setTextColor(26, 56, 38);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`CÓDIGO DE AGENDAMIENTO: #${reservation.code}`, margin + 6, y + 11.5);

  const statusLabel = reservation.status === 'confirmada' ? 'CONFIRMADO / PAGADO' : 'AGENDADO';
  doc.setTextColor(16, 120, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, pageWidth - margin - 6, y + 11.5, { align: 'right' });

  // 3. Two Columns: Guest Data & Stay Data
  y = 59;
  const colWidth = (contentWidth - 6) / 2;

  // Col 1: Guest Data
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(228, 232, 230);
  doc.roundedRect(margin, y, colWidth, 42, 2, 2, 'FD');

  doc.setTextColor(26, 56, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DEL HUÉSPED', margin + 5, y + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 95, 92);
  doc.text('Nombre:', margin + 5, y + 16);
  doc.setTextColor(25, 30, 28);
  doc.setFont('helvetica', 'bold');
  doc.text(reservation.guestName || 'Huésped', margin + 25, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 95, 92);
  doc.text('Teléfono:', margin + 5, y + 23);
  doc.setTextColor(25, 30, 28);
  doc.text(reservation.guestPhone || '+56 9 ...', margin + 25, y + 23);

  doc.setTextColor(90, 95, 92);
  doc.text('Correo:', margin + 5, y + 30);
  doc.setTextColor(25, 30, 28);
  doc.text(reservation.guestEmail || '-', margin + 25, y + 30);

  doc.setTextColor(90, 95, 92);
  doc.text('Huéspedes:', margin + 5, y + 37);
  doc.setTextColor(25, 30, 28);
  doc.text(`${reservation.guestsCount || 2} personas`, margin + 25, y + 37);

  // Col 2: Stay Data
  const col2X = margin + colWidth + 6;
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(col2X, y, colWidth, 42, 2, 2, 'FD');

  doc.setTextColor(26, 56, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALLE DE LA ESTADÍA', col2X + 5, y + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 95, 92);
  doc.text('Cabaña:', col2X + 5, y + 16);
  doc.setTextColor(25, 30, 28);
  doc.setFont('helvetica', 'bold');
  doc.text(reservation.cabinName || 'Cabaña', col2X + 25, y + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 95, 92);
  doc.text('Check-in:', col2X + 5, y + 23);
  doc.setTextColor(25, 30, 28);
  doc.text(`${formatDateCL(reservation.checkIn)} (15:00 hrs)`, col2X + 25, y + 23);

  doc.setTextColor(90, 95, 92);
  doc.text('Check-out:', col2X + 5, y + 30);
  doc.setTextColor(25, 30, 28);
  doc.text(`${formatDateCL(reservation.checkOut)} (12:00 hrs)`, col2X + 25, y + 30);

  doc.setTextColor(90, 95, 92);
  doc.text('Duración:', col2X + 5, y + 37);
  doc.setTextColor(25, 30, 28);
  doc.text(`${reservation.nightsCount} ${reservation.nightsCount === 1 ? 'noche' : 'noches'}`, col2X + 25, y + 37);

  // 4. Financial Summary Card
  y = 107;
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(220, 230, 225);
  doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'FD');

  doc.setTextColor(26, 56, 38);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE PAGO', margin + 5, y + 8);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 95, 92);
  doc.text('Total Estadía:', margin + 5, y + 16);
  doc.setTextColor(25, 30, 28);
  doc.text(formatCLP(reservation.totalPrice), margin + 48, y + 16);

  doc.setTextColor(90, 95, 92);
  doc.text(`Abono Pagado (${reservation.depositPercentage}%):`, margin + 5, y + 22);
  doc.setTextColor(26, 56, 38);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCLP(reservation.depositAmount), margin + 48, y + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 95, 92);
  doc.text('Saldo al Check-in:', margin + 5, y + 28);
  doc.setTextColor(25, 30, 28);
  doc.text(formatCLP(reservation.pendingBalance), margin + 48, y + 28);

  // Col 2 of Financials: Payment Gateway info
  doc.setTextColor(90, 95, 92);
  doc.text('Medio de Pago:', margin + 95, y + 16);
  doc.setTextColor(25, 30, 28);
  doc.text('Flow / Webpay Plus (Producción)', margin + 125, y + 16);

  doc.setTextColor(90, 95, 92);
  doc.text('Transacción:', margin + 95, y + 22);
  doc.setTextColor(25, 30, 28);
  doc.text(reservation.transactionId || `TBK-${reservation.code}`, margin + 125, y + 22);

  doc.setTextColor(90, 95, 92);
  doc.text('Tinaja a leña:', margin + 95, y + 28);
  doc.setTextColor(16, 120, 60);
  doc.setFont('helvetica', 'bold');
  doc.text('Incluida en tu reserva', margin + 125, y + 28);

  // 5. MANDATORY CONTACT & CHECK-IN COORDINATION (HIGHLIGHTED BOX)
  y = 150;
  doc.setFillColor(235, 242, 237); // Soft sage green
  doc.setDrawColor(26, 56, 38);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, contentWidth, 58, 3, 3, 'FD');

  doc.setTextColor(26, 56, 38);
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN IMPORTANTE PARA TU INGRESO AL REFUGIO', margin + 6, y + 9);

  // WhatsApp
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 70, 45);
  doc.text('WhatsApp de contacto:', margin + 6, y + 18);
  doc.setTextColor(15, 100, 50);
  doc.text(`${CONTACT_WHATSAPP_INT}  (${CONTACT_WHATSAPP})`, margin + 48, y + 18);

  // Email
  doc.setTextColor(30, 70, 45);
  doc.text('Correo electrónico:', margin + 6, y + 25);
  doc.setTextColor(25, 30, 28);
  doc.text(CONTACT_EMAIL, margin + 48, y + 25);

  // Explanatory Coordination Text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(40, 50, 45);
  const instructions =
    'Nos comunicaremos contigo vía WhatsApp al número registrado para coordinar tu llegada. Para coordinar previamente tu horario estimado de ingreso, entrega de llaves, encendido de tinaja a leña o cualquier requerimiento especial para tu posterior ingreso al refugio o agendamiento, comunícate directamente a nuestro WhatsApp oficial: +56 9 9459 7751 o al correo contacto@refugioaliwenspa.cl indicando tu código de reserva.';
  doc.text(instructions, margin + 6, y + 33, { maxWidth: contentWidth - 12 });

  // 6. Security & Policy Note
  y = 215;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setTextColor(80, 85, 82);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Políticas y Recomendaciones:', margin + 5, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    '• Check-in: 15:00 hrs | Check-out: 12:00 hrs.\n• El saldo pendiente (si aplica) se abona al momento de tu llegada.\n• Conserva este comprobante digital o impreso para presentarlo al ingresar.',
    margin + 5,
    y + 11
  );

  // 7. Footer
  doc.setTextColor(140, 145, 142);
  doc.setFontSize(8);
  doc.text(
    'Refugio Aliwen Spa — Naturaleza, desconexión y bienestar.',
    pageWidth / 2,
    282,
    { align: 'center' }
  );

  return doc;
}

/**
 * Generates and triggers automatic download of the PDF in the user's browser.
 */
export function downloadVoucherPDF(reservation: Reservation): void {
  try {
    const doc = generateVoucherPDF(reservation);
    const filename = `Comprobante_Agendamiento_${reservation.code || 'Aliwen'}.pdf`;
    doc.save(filename);
    console.log(`[PDF] Voucher downloaded: ${filename}`);
  } catch (err) {
    console.error('[PDF] Error generating or downloading PDF:', err);
  }
}
