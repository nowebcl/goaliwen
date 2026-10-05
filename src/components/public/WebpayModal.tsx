import React, { useState } from 'react';
import { useBooking } from '../../context/BookingContext';
import { calculateNights, formatCLP } from '../../utils/formatters';

export const WebpayModal: React.FC = () => {
  const {
    isWebpayModalOpen,
    setIsWebpayModalOpen,
    selectedCabin,
    checkIn,
    checkOut,
    depositPercentage,
    guestForm,
    processSuccessfulPayment,
  } = useBooking();

  const [isProcessing, setIsProcessing] = useState(false);

  if (!isWebpayModalOpen || !selectedCabin) return null;

  const nights = calculateNights(checkIn, checkOut);
  const totalPrice = nights * selectedCabin.pricePerNight;
  const depositAmount = Math.round(totalPrice * (depositPercentage / 100));

  const handleSimulateSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsWebpayModalOpen(false);
      processSuccessfulPayment();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs text-xs font-sans">
      <div className="bg-white w-full max-w-xs rounded-xl border border-neutral-200 p-5 space-y-4 shadow-lg">
        
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <span className="font-bold text-neutral-900">Webpay Plus</span>
          <span className="text-[11px] font-mono text-neutral-500">Transbank</span>
        </div>

        <div className="space-y-1.5 text-neutral-600">
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
          <div className="flex justify-between pt-1 border-t border-neutral-100 font-bold text-sm text-neutral-900">
            <span>Abono ({depositPercentage}%):</span>
            <span className="font-mono">{formatCLP(depositAmount)}</span>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSimulateSuccess}
            className="w-full py-2 bg-[#1A3826] text-white rounded-lg font-semibold hover:bg-[#234B34] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {isProcessing ? 'Procesando...' : `Confirmar y Pagar ${formatCLP(depositAmount)}`}
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => setIsWebpayModalOpen(false)}
            className="w-full py-1.5 text-neutral-500 hover:text-neutral-900 text-[11px]"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
