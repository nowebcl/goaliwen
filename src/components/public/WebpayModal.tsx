import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { calculateNights, formatCLP } from '../../utils/formatters';
import { ShieldCheck, Loader2, ExternalLink } from 'lucide-react';

export const WebpayModal: React.FC = () => {
  const {
    isWebpayModalOpen,
    setIsWebpayModalOpen,
    selectedCabin,
    checkIn,
    checkOut,
    depositPercentage,
    guestForm,
    initiateFlowPayment,
    processSuccessfulPayment,
  } = useBooking();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isWebpayModalOpen || !selectedCabin) return null;

  const nights = calculateNights(checkIn, checkOut);
  const totalPrice = nights * selectedCabin.pricePerNight;
  const isTestCabin = selectedCabin.pricePerNight === 350;
  const effectiveDepositPct = isTestCabin ? 100 : depositPercentage;
  const depositAmount = isTestCabin
    ? Math.max(350, totalPrice)
    : Math.round(totalPrice * (effectiveDepositPct / 100));

  const handlePayWithFlow = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    const result = await initiateFlowPayment();

    if (result.success && result.redirectUrl) {
      // Redirect to official Flow Webpay portal in production
      window.location.href = result.redirectUrl;
    } else {
      setIsProcessing(false);
      setErrorMessage(result.error || 'Error al conectar con Flow Webpay');
    }
  };

  const handleSimulateSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsWebpayModalOpen(false);
      processSuccessfulPayment();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs text-xs font-sans">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-neutral-200 p-5 sm:p-6 space-y-4 shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-neutral-900 text-sm">Pago Seguro Flow</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold">
            Producción
          </span>
        </div>

        {/* Resumen */}
        <div className="space-y-2 text-neutral-600 bg-neutral-50/70 p-3.5 rounded-xl border border-neutral-100">
          <div className="flex justify-between">
            <span>Comercio:</span>
            <span className="font-medium text-neutral-900">Refugio Aliwen Spa</span>
          </div>
          <div className="flex justify-between">
            <span>Cabaña:</span>
            <span className="font-medium text-neutral-900">{selectedCabin.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Huésped:</span>
            <span className="font-medium text-neutral-900">{guestForm.fullName || 'Huésped'}</span>
          </div>
          <div className="flex justify-between">
            <span>Estadía:</span>
            <span className="font-medium text-neutral-900">{nights} {nights === 1 ? 'noche' : 'noches'}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-neutral-200/60 font-bold text-sm text-neutral-950">
            <span>Total a pagar ({effectiveDepositPct}%):</span>
            <span className="font-mono text-emerald-800">{formatCLP(depositAmount)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-[11px]">
            {errorMessage}
          </div>
        )}

        {/* Acciones de Pago */}
        <div className="space-y-2 pt-1">
          {/* Botón Principal: Flow Producción */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePayWithFlow}
            className="w-full py-2.5 px-4 bg-[#1A3826] text-white rounded-xl font-semibold hover:bg-[#234B34] transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Conectando con Flow...</span>
              </>
            ) : (
              <>
                <span>Pagar con Webpay ({formatCLP(depositAmount)})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          {/* Botón Secundario: Simulación local rápida */}
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSimulateSuccess}
            className="w-full py-1.5 text-neutral-500 hover:text-neutral-800 text-[11px] font-medium transition-colors cursor-pointer"
          >
            Simular pago exitoso (prueba rápida sin cobro)
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => setIsWebpayModalOpen(false)}
            className="w-full py-1 text-neutral-400 hover:text-neutral-600 text-[11px]"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
