// Utilities for currency, date handling, and WhatsApp links

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateCL(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
  });
}

export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function addDays(dateString: string, days: number): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}


export function generateBookingCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomCode = '';
  for (let i = 0; i < 5; i++) {
    randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ALW-${randomCode}`;
}

export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function createWhatsAppUrl(phone: string, text: string): string {
  let cleanPhone = phone.replace(/[^\d]/g, '');
  // If user entered Chilean number without country code, add 56
  if (cleanPhone.startsWith('9') && cleanPhone.length === 9) {
    cleanPhone = '56' + cleanPhone;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function buildConfirmationMessage(reservation: {
  code: string;
  guestName: string;
  cabinName: string;
  checkIn: string;
  checkOut: string;
  nightsCount: number;
  depositAmount: number;
  pendingBalance: number;
}): string {
  return `¡Hola ${reservation.guestName}! 👋 Te contactamos desde Refugio Aliwen Spa sobre tu reserva *#${reservation.code}*.

🌲 *Cabaña:* ${reservation.cabinName}
📅 *Check-in:* ${formatDateCL(reservation.checkIn)} (15:00 hrs)
📅 *Check-out:* ${formatDateCL(reservation.checkOut)} (12:00 hrs)
🌙 *Noches:* ${reservation.nightsCount}

💰 *Abono confirmado:* ${formatCLP(reservation.depositAmount)}
💳 *Saldo pendiente al llegar:* ${formatCLP(reservation.pendingBalance)}

¿Tienes alguna duda sobre tu llegada o solicitud especial para tu estancia? Estamos felices de atenderte. 🌿`;
}
