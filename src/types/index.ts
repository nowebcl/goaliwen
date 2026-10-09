export interface Cabin {
  id: string;
  name: string;
  subtitle: string;
  capacity: number;
  pricePerNight: number;
  description: string;
  features: string[];
  images: string[];
  popular?: boolean;
  tinajaIncluded: boolean;
  squareMeters: number;
  bedConfig: string;
}

export type PaymentDepositPercentage = 30 | 50 | 100;

export type ReservationStatus = 'confirmada' | 'en_proceso' | 'completada' | 'liberada' | 'cancelada';

export interface Reservation {
  id: string;
  code: string;
  cabinId: string;
  cabinName: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestNotes?: string;
  guestsCount: number;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nightsCount: number;
  pricePerNight: number;
  totalPrice: number;
  depositPercentage: PaymentDepositPercentage;
  depositAmount: number;
  pendingBalance: number;
  status: ReservationStatus;
  createdAt: string;
  paymentMethod: 'webpay_plus';
  transactionId: string;
}

export interface BlockedDateRange {
  id: string;
  cabinId: string;
  cabinName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: string; // e.g. "Mantenimiento Tinaja", "Reserva Externa Booking", etc.
  createdAt: string;
}

export interface GuestFormState {
  fullName: string;
  phone: string;
  email: string;
  guestsCount: number;
  notes: string;
  depositPercentage: PaymentDepositPercentage;
}
