import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';
import { formatCLP, formatDateShort, calculateNights, addDays } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, Check, Plus, Minus } from 'lucide-react';
import { ThankYouScreen } from './ThankYouScreen';

export const BookingScreen: React.FC = () => {
  const {
    cabins,
    selectedCabin,
    selectCabin,
    checkIn,
    checkOut,
    setDates,
    guestForm,
    setGuestForm,
    depositPercentage,
    setDepositPercentage,
    setIsWebpayModalOpen,
    isDateOccupied,
    isRangeAvailable,
    completedReservation,
    navigateTo,
  } = useBooking();

  // Calendar month state
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [todayStr] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const monthYearLabel = useMemo(() => {
    const month = currentMonthDate.toLocaleDateString('es-CL', { month: 'long' });
    const year = currentMonthDate.getFullYear();
    return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`;
  }, [currentMonthDate]);

  const calendarDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isPast: boolean;
      isOccupied: boolean;
    }> = [];

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({
        dateStr: '',
        dayNumber: 0,
        isCurrentMonth: false,
        isPast: false,
        isOccupied: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const monthFormatted = String(month + 1).padStart(2, '0');
      const dayFormatted = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
      const isPast = dateStr < todayStr;
      const isOccupied = selectedCabin ? isDateOccupied(selectedCabin.id, dateStr) : false;

      days.push({
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isPast,
        isOccupied,
      });
    }

    return days;
  }, [currentMonthDate, selectedCabin, isDateOccupied, todayStr]);

  // Dynamic multi-day cumulative click logic
  const handleDateClick = (dateStr: string, isPast: boolean, isOccupied: boolean) => {
    if (!dateStr || isPast || isOccupied) return;
    setErrorMessage(null);

    // 1. If no check-in is set yet: start 1 night stay
    if (!checkIn) {
      const nextDay = addDays(dateStr, 1);
      if (selectedCabin && isRangeAvailable(selectedCabin.id, dateStr, nextDay)) {
        setDates(dateStr, nextDay);
      } else {
        setDates(dateStr, '');
      }
      return;
    }

    // 2. If check-in is set but no check-out
    if (checkIn && !checkOut) {
      if (dateStr <= checkIn) {
        const nextDay = addDays(dateStr, 1);
        setDates(dateStr, selectedCabin && isRangeAvailable(selectedCabin.id, dateStr, nextDay) ? nextDay : '');
        return;
      }
      if (selectedCabin && !isRangeAvailable(selectedCabin.id, checkIn, dateStr)) {
        setErrorMessage('Hay fechas bloqueadas u ocupadas en ese tramo');
        return;
      }
      setDates(checkIn, dateStr);
      return;
    }

    // 3. If both check-in AND check-out are already set: allow expanding and summing days
    if (checkIn && checkOut) {
      // If user clicked exactly check-in: reset selection
      if (dateStr === checkIn) {
        setDates('', '');
        return;
      }

      // If clicked date is at or after checkOut: extend stay to add more days!
      if (dateStr >= checkOut) {
        const targetEnd = dateStr === checkOut ? addDays(dateStr, 1) : dateStr;
        if (selectedCabin && !isRangeAvailable(selectedCabin.id, checkIn, targetEnd)) {
          setErrorMessage('Hay fechas bloqueadas u ocupadas en ese tramo');
          return;
        }
        setDates(checkIn, targetEnd);
        return;
      }

      // If clicked date is before checkIn: extend backwards if available
      if (dateStr < checkIn) {
        if (selectedCabin && isRangeAvailable(selectedCabin.id, dateStr, checkOut)) {
          setDates(dateStr, checkOut);
        } else {
          // If not available backwards, start fresh at clicked date
          const nextDay = addDays(dateStr, 1);
          setDates(dateStr, selectedCabin && isRangeAvailable(selectedCabin.id, dateStr, nextDay) ? nextDay : '');
        }
        return;
      }

      // If clicked date is inside the range (between checkIn and checkOut): trim checkout to that date
      if (dateStr > checkIn && dateStr < checkOut) {
        setDates(checkIn, dateStr);
        return;
      }
    }
  };

  const nights = calculateNights(checkIn, checkOut);
  const isTestCabin = selectedCabin?.pricePerNight === 350;
  const effectiveDepositPct = isTestCabin ? 100 : depositPercentage;
  const totalPrice = selectedCabin ? nights * selectedCabin.pricePerNight : 0;
  const depositAmount = isTestCabin
    ? Math.max(350, totalPrice)
    : Math.round(totalPrice * (effectiveDepositPct / 100));
  const pendingBalance = Math.max(0, totalPrice - depositAmount);

  // Add 1 more night button
  const handleAddNight = () => {
    if (!checkIn) {
      setDates(todayStr, addDays(todayStr, 1));
      return;
    }
    const currentEnd = checkOut || addDays(checkIn, 1);
    const nextEnd = addDays(currentEnd, 1);
    if (selectedCabin && !isRangeAvailable(selectedCabin.id, checkIn, nextEnd)) {
      setErrorMessage('La siguiente fecha está ocupada o bloqueada');
      return;
    }
    setDates(checkIn, nextEnd);
    setErrorMessage(null);
  };

  // Remove 1 night button
  const handleRemoveNight = () => {
    if (!checkIn || !checkOut || nights <= 1) return;
    const prevEnd = addDays(checkOut, -1);
    setDates(checkIn, prevEnd);
    setErrorMessage(null);
  };

  const handleOpenPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCabin) {
      setErrorMessage('Selecciona una cabaña');
      return;
    }
    if (!checkIn || !checkOut || nights <= 0) {
      setErrorMessage('Selecciona las fechas de estadía');
      return;
    }
    if (!guestForm.fullName.trim()) {
      setErrorMessage('Ingresa nombre');
      return;
    }
    if (!guestForm.phone.trim()) {
      setErrorMessage('Ingresa teléfono');
      return;
    }
    if (!guestForm.email.trim() || !guestForm.email.includes('@')) {
      setErrorMessage('Ingresa un correo válido');
      return;
    }

    setIsWebpayModalOpen(true);
  };

  // Reusable Green Logo
  const renderGreenLogo = (customHeight = 'h-8 sm:h-9 lg:h-11', customWidth = 'w-32 sm:w-36 lg:w-44') => (
    <div
      style={{
        WebkitMaskImage: "url('/Recurso-11-scaled.webp')",
        maskImage: "url('/Recurso-11-scaled.webp')",
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center center',
        maskPosition: 'center center',
        backgroundColor: '#1A3826',
      }}
      className={`${customHeight} ${customWidth} select-none transition-all`}
      title="Aliwen Refugio"
    />
  );

  // If completed reservation, render clean Thank You screen without logos
  if (completedReservation) {
    return <ThankYouScreen />;
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-[#FAFAF8] text-neutral-900 flex flex-col justify-center p-3 sm:p-5 lg:p-6">
      
      {/* Logo Verde centrado en medio y más arriba en PC */}
      <div className="flex justify-center mb-6 sm:mb-8 lg:mb-10 shrink-0">
        {renderGreenLogo('h-8 sm:h-9 lg:h-11', 'w-32 sm:w-36 lg:w-44')}
      </div>

      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        
        {/* Columna 1: Tipos de Cabaña (3 cols) */}
        <div className="lg:col-span-3 space-y-2">
          {cabins.map((cabin) => {
            const isSelected = selectedCabin?.id === cabin.id;
            return (
              <button
                key={cabin.id}
                type="button"
                onClick={() => selectCabin(cabin)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-[#1A3826] bg-[#1A3826] text-white shadow-xs'
                    : 'border-neutral-200/90 hover:border-neutral-300 bg-white text-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">{cabin.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#F0A71D]" />}
                </div>
                <div className={`text-[11px] mt-1 flex items-center justify-between ${isSelected ? 'text-[#E2ECE5]' : 'text-neutral-500'}`}>
                  <span>{cabin.capacity} pers.</span>
                  <span className={`font-mono font-medium ${isSelected ? 'text-[#F0A71D]' : 'text-neutral-800'}`}>
                    {formatCLP(cabin.pricePerNight)}/n
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Columna 2: Calendario (5 cols) */}
        <div className="lg:col-span-5 border border-neutral-200/90 bg-white rounded-xl p-3.5 sm:p-4 space-y-2.5 shadow-xs">
          {/* Header Mes */}
          <div className="flex items-center justify-between text-xs font-semibold text-[#1A3826]">
            <span className="capitalize">{monthYearLabel}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Días semana */}
          <div className="grid grid-cols-7 text-center text-[10px] text-neutral-400 font-medium pb-1 border-b border-neutral-100">
            <span>Lu</span>
            <span>Ma</span>
            <span>Mi</span>
            <span>Ju</span>
            <span>Vi</span>
            <span>Sá</span>
            <span>Do</span>
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day.dateStr) {
                return <div key={`empty-${idx}`} className="h-7 sm:h-8" />;
              }

              const isCheckIn = day.dateStr === checkIn;
              const isCheckOut = day.dateStr === checkOut;
              const isInRange = checkIn && checkOut && day.dateStr > checkIn && day.dateStr < checkOut;
              const isDisabled = day.isPast || day.isOccupied;

              let style = 'hover:bg-neutral-100 text-neutral-800 cursor-pointer';

              if (isDisabled) {
                style = 'text-neutral-300 line-through cursor-not-allowed';
              } else if (isCheckIn || isCheckOut) {
                style = 'bg-[#1A3826] text-white font-bold rounded-lg shadow-xs';
              } else if (isInRange) {
                style = 'bg-[#EBF2ED] text-[#1A3826] font-semibold';
              }

              return (
                <button
                  key={day.dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleDateClick(day.dateStr, day.isPast, day.isOccupied)}
                  className={`h-7 sm:h-8 w-full flex items-center justify-center text-xs rounded transition-colors ${style}`}
                  title={
                    isDisabled
                      ? 'No disponible'
                      : isCheckIn
                      ? 'Entrada (Check-in)'
                      : isCheckOut
                      ? 'Salida (Check-out)'
                      : `Seleccionar ${day.dateStr}`
                  }
                >
                  {day.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Fechas elegidas con controles de sumar/restar noches */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span>
                {checkIn ? formatDateShort(checkIn) : 'Entrada'} — {checkOut ? formatDateShort(checkOut) : 'Salida'}
              </span>
              {checkIn && (
                <button
                  type="button"
                  onClick={() => setDates('', '')}
                  className="text-[10px] text-neutral-400 hover:text-neutral-700 ml-1 underline cursor-pointer"
                  title="Reiniciar selección de fechas"
                >
                  Limpiar
                </button>
              )}
            </div>

            {nights > 0 && (
              <div className="flex items-center gap-1.5 bg-[#EBF2ED] text-[#1A3826] px-1.5 py-0.5 rounded font-mono font-semibold">
                <button
                  type="button"
                  onClick={handleRemoveNight}
                  disabled={nights <= 1}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#D6E5DB] disabled:opacity-30 cursor-pointer"
                  title="Restar 1 noche"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span>{nights} {nights === 1 ? 'noche' : 'noches'}</span>
                <button
                  type="button"
                  onClick={handleAddNight}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#D6E5DB] cursor-pointer"
                  title="Sumar 1 noche"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Columna 3: Agendar & Pago (4 cols) */}
        <form onSubmit={handleOpenPayment} className="lg:col-span-4 border border-neutral-200/90 bg-white rounded-xl p-3.5 sm:p-4 space-y-3 text-xs shadow-xs">
          
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Nombre y Apellido"
              value={guestForm.fullName}
              onChange={(e) => setGuestForm({ fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-[#1A3826] focus:ring-1 focus:ring-[#1A3826] outline-none transition-all placeholder:text-neutral-400 bg-white"
            />
            <input
              type="tel"
              placeholder="Teléfono (+56 9...)"
              value={guestForm.phone}
              onChange={(e) => setGuestForm({ phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-[#1A3826] focus:ring-1 focus:ring-[#1A3826] outline-none transition-all placeholder:text-neutral-400 bg-white"
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={guestForm.email}
              onChange={(e) => setGuestForm({ email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 focus:border-[#1A3826] focus:ring-1 focus:ring-[#1A3826] outline-none transition-all placeholder:text-neutral-400 bg-white"
            />
          </div>

          {/* Selector de abono */}
          {isTestCabin ? (
            <div className="pt-0.5">
              <div className="py-2 px-3 bg-[#EBF2ED] text-[#1A3826] rounded-lg text-center font-medium text-[11px] border border-[#C5DBCB]">
                Tarifa de prueba Flow Producción: 100% ({formatCLP(350)})
              </div>
            </div>
          ) : (
            <div className="pt-0.5">
              <div className="grid grid-cols-3 gap-1.5">
                {([30, 50, 100] as const).map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDepositPercentage(pct)}
                    className={`py-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                      depositPercentage === pct
                        ? 'border-[#1A3826] bg-[#1A3826] text-white font-semibold shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resumen numérico */}
          <div className="pt-2 border-t border-neutral-100 space-y-1 text-neutral-500 font-mono text-[11px]">
            <div className="flex justify-between">
              <span>Total ({nights}n):</span>
              <span className="text-neutral-900">{formatCLP(totalPrice)}</span>
            </div>
            <div className="flex justify-between text-[#1A3826] font-semibold">
              <span>Abonar ({effectiveDepositPct}%):</span>
              <span>{formatCLP(depositAmount)}</span>
            </div>
            {pendingBalance > 0 && (
              <div className="flex justify-between text-[10px]">
                <span>Saldo en check-in:</span>
                <span>{formatCLP(pendingBalance)}</span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-2 text-rose-700 bg-rose-50 rounded-lg text-[11px]">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-[#1A3826] text-white rounded-lg font-semibold hover:bg-[#234B34] transition-colors cursor-pointer text-xs shadow-xs"
          >
            Pagar con Flow Webpay {depositAmount > 0 ? `(${formatCLP(depositAmount)})` : ''}
          </button>
        </form>

      </div>

      {/* Acceso discreto a Administración al pie */}
      <div className="max-w-5xl w-full mx-auto mt-3 flex justify-end shrink-0">
        <button
          type="button"
          onClick={() => navigateTo('admin')}
          className="text-[10px] text-neutral-400 hover:text-[#1A3826] transition-colors font-mono cursor-pointer"
        >
          administración →
        </button>
      </div>

    </div>
  );
};
