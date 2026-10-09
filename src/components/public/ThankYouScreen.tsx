import React, { useEffect, useRef, useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { formatCLP, formatDateCL } from '../../utils/formatters';
import {
  downloadVoucherPDF,
  CONTACT_WHATSAPP,
  CONTACT_WHATSAPP_INT,
  CONTACT_EMAIL,
} from '../../utils/pdfGenerator';
import { Download, MessageCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import type { Reservation } from '../../types';

export const ThankYouScreen: React.FC = () => {
  const { completedReservation, setCompletedReservation, resetBookingDraft, navigateTo } = useBooking();
  const [downloadTriggered, setDownloadTriggered] = useState(false);
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(completedReservation);
  const [loadingReservation, setLoadingReservation] = useState(false);
  const autoDownloadedRef = useRef(false);

  // If completedReservation is not in state, look for code in URL or localStorage
  useEffect(() => {
    if (completedReservation) {
      setActiveReservation(completedReservation);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || params.get('order');

    if (code) {
      setLoadingReservation(true);
      fetch(`/api/reservations/by-code/${encodeURIComponent(code)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data: Reservation) => {
          setActiveReservation(data);
          setCompletedReservation(data);
        })
        .catch((err) => {
          console.warn('[ThankYouScreen] Could not load reservation from server:', err);
          // Fallback to localStorage recent reservation
          try {
            const cached = localStorage.getItem('aliwen_last_confirmed_reservation');
            if (cached) {
              const parsed = JSON.parse(cached);
              setActiveReservation(parsed);
              setCompletedReservation(parsed);
            }
          } catch {}
        })
        .finally(() => setLoadingReservation(false));
    } else {
      try {
        const cached = localStorage.getItem('aliwen_last_confirmed_reservation');
        if (cached) {
          const parsed = JSON.parse(cached);
          setActiveReservation(parsed);
        }
      } catch {}
    }
  }, [completedReservation, setCompletedReservation]);

  // Save to recent cache whenever activeReservation updates
  useEffect(() => {
    if (activeReservation) {
      try {
        localStorage.setItem('aliwen_last_confirmed_reservation', JSON.stringify(activeReservation));
      } catch {}
    }
  }, [activeReservation]);

  // Automatic PDF download on mount when activeReservation is ready
  useEffect(() => {
    if (!activeReservation || autoDownloadedRef.current) return;
    autoDownloadedRef.current = true;

    // Small delay to allow page render
    const timer = setTimeout(() => {
      downloadVoucherPDF(activeReservation);
      setDownloadTriggered(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [activeReservation]);

  const handleManualDownload = () => {
    if (!activeReservation) return;
    downloadVoucherPDF(activeReservation);
    setDownloadTriggered(true);
  };

  const handleBackHome = () => {
    setCompletedReservation(null);
    resetBookingDraft();
    navigateTo('booking');
  };

  const cleanPhoneForWa = '56994597751';
  const waCode = activeReservation?.code ? `(Código #${activeReservation.code})` : '';
  const waUrl = `https://wa.me/${cleanPhoneForWa}?text=${encodeURIComponent(
    `Hola, acabo de realizar mi agendamiento ${waCode}. Quisiera coordinar detalles para mi ingreso al refugio.`
  )}`;

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between p-4 sm:p-8 font-sans selection:bg-[#EBF2ED] selection:text-[#1A3826]">
      <main className="w-full max-w-xl mx-auto my-auto py-8 sm:py-12 space-y-8">
        
        {/* Encabezado ultra limpio sin logos */}
        <div className="space-y-3 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-neutral-950">
            Muchas gracias por tu agendamiento.
          </h1>
          <p className="text-base sm:text-lg text-neutral-600 font-normal">
            Nos vamos a comunicar contigo vía WhatsApp.
          </p>
          <div className="pt-1">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-[#EBF2ED] hover:text-[#1A3826] text-neutral-900 rounded-full font-mono text-base sm:text-lg font-medium transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <span>{CONTACT_WHATSAPP}</span>
            </a>
          </div>
        </div>

        {/* Notificación de descarga automática de PDF */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl flex items-center justify-between text-xs text-neutral-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {downloadTriggered
                ? 'Tu comprobante en PDF se ha descargado automáticamente.'
                : 'Generando y descargando comprobante PDF oficial...'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleManualDownload}
            disabled={!activeReservation}
            className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:text-emerald-700 underline cursor-pointer ml-3 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar de nuevo</span>
          </button>
        </div>

        {/* Resumen del agendamiento */}
        {loadingReservation ? (
          <div className="p-8 text-center text-xs text-neutral-400 font-mono">
            Cargando información del agendamiento...
          </div>
        ) : activeReservation ? (
          <div className="border border-neutral-200 rounded-2xl p-5 sm:p-6 space-y-4 text-xs bg-white shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <span className="text-neutral-500 font-mono">Código de Agendamiento</span>
              <span className="font-mono font-bold text-sm sm:text-base text-neutral-900">
                #{activeReservation.code}
              </span>
            </div>

            <div className="space-y-2 text-neutral-600">
              <div className="flex justify-between">
                <span>Cabaña:</span>
                <span className="font-medium text-neutral-900">{activeReservation.cabinName}</span>
              </div>
              <div className="flex justify-between">
                <span>Entrada (Check-in):</span>
                <span className="font-medium text-neutral-900">
                  {formatDateCL(activeReservation.checkIn)} (15:00 hrs)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Salida (Check-out):</span>
                <span className="font-medium text-neutral-900">
                  {formatDateCL(activeReservation.checkOut)} (12:00 hrs)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Duración:</span>
                <span className="font-medium text-neutral-900">
                  {activeReservation.nightsCount} {activeReservation.nightsCount === 1 ? 'noche' : 'noches'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Huésped:</span>
                <span className="font-medium text-neutral-900">{activeReservation.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span>Teléfono:</span>
                <span className="font-medium text-neutral-900">{activeReservation.guestPhone}</span>
              </div>
              {activeReservation.guestEmail && (
                <div className="flex justify-between">
                  <span>Correo:</span>
                  <span className="font-medium text-neutral-900">{activeReservation.guestEmail}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-neutral-600">
              <div className="flex justify-between">
                <span>Total de la estadía:</span>
                <span className="font-medium text-neutral-900">{formatCLP(activeReservation.totalPrice)}</span>
              </div>
              <div className="flex justify-between font-semibold text-neutral-900">
                <span>Abono pagado ({activeReservation.depositPercentage}%):</span>
                <span className="font-mono">{formatCLP(activeReservation.depositAmount)}</span>
              </div>
              {activeReservation.pendingBalance > 0 && (
                <div className="flex justify-between text-neutral-500">
                  <span>Saldo a pagar en check-in:</span>
                  <span className="font-mono font-medium text-neutral-800">
                    {formatCLP(activeReservation.pendingBalance)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Información para el posterior ingreso */}
        <div className="border border-neutral-200/80 rounded-xl p-4 sm:p-5 space-y-2 text-xs bg-neutral-50/60">
          <p className="font-semibold text-neutral-900">
            Coordinación de ingreso al refugio:
          </p>
          <p className="text-neutral-600 leading-relaxed">
            Para coordinar con anticipación tu horario estimado de llegada, entrega de llaves, encendido de tinaja a leña o cualquier consulta para tu posterior ingreso, comunícate directamente a nuestro WhatsApp oficial{' '}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-950 underline"
            >
              {CONTACT_WHATSAPP_INT}
            </a>{' '}
            o al correo{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-neutral-950 underline"
            >
              {CONTACT_EMAIL}
            </a>.
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-medium text-center text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Contactar vía WhatsApp ({CONTACT_WHATSAPP})</span>
          </a>

          <button
            type="button"
            onClick={handleManualDownload}
            disabled={!activeReservation}
            className="flex-1 py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium text-center text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Comprobante PDF</span>
          </button>
        </div>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={handleBackHome}
            className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-900 text-xs font-medium cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la página principal</span>
          </button>
        </div>

      </main>

      {/* Pie minimalista */}
      <footer className="text-center text-[11px] text-neutral-400 py-4">
        Refugio Aliwen Spa · {CONTACT_EMAIL} · {CONTACT_WHATSAPP_INT}
      </footer>
    </div>
  );
};
