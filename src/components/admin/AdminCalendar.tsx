import React, { useState, useMemo } from 'react';
import type { Cabin, Reservation, BlockedDateRange } from '../../types';
import { ChevronLeft, ChevronRight, Lock, CheckCircle2, Calendar as CalendarIcon } from 'lucide-react';
import { formatDateCL, formatDateShort, formatCLP } from '../../utils/formatters';

interface AdminCalendarProps {
  cabins: Cabin[];
  reservations: Reservation[];
  blockedDates: BlockedDateRange[];
  onQuickBlockDate?: (dateStr: string, cabinId: string) => void;
  onRemoveBlock?: (blockId: string) => void;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

const getTodayString = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const AdminCalendar: React.FC<AdminCalendarProps> = ({
  cabins,
  reservations,
  blockedDates,
  onQuickBlockDate,
  onRemoveBlock,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedCabinFilter, setSelectedCabinFilter] = useState<string>('all');
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDayDate(todayStr);
  };

  // Build calendar matrix
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Monday is index 0
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      reservations: Reservation[];
      blocks: BlockedDateRange[];
    }[] = [];

    // Empty lead cells
    for (let i = 0; i < startOffset; i++) {
      days.push({
        dateStr: '',
        dayNumber: 0,
        isCurrentMonth: false,
        reservations: [],
        blocks: [],
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const target = new Date(dateStr + 'T00:00:00');

      // Find matching reservations
      const matchingReservations = reservations.filter((r) => {
        if (r.status === 'cancelada') return false;
        if (selectedCabinFilter !== 'all' && r.cabinId !== selectedCabinFilter) return false;
        const start = new Date(r.checkIn + 'T00:00:00');
        const end = new Date(r.checkOut + 'T00:00:00');
        return target >= start && target < end;
      });

      // Find matching blocks
      const matchingBlocks = blockedDates.filter((b) => {
        if (selectedCabinFilter !== 'all' && b.cabinId !== selectedCabinFilter) return false;
        const start = new Date(b.startDate + 'T00:00:00');
        const end = new Date(b.endDate + 'T00:00:00');
        return target >= start && target <= end;
      });

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        reservations: matchingReservations,
        blocks: matchingBlocks,
      });
    }

    return days;
  }, [year, month, reservations, blockedDates, selectedCabinFilter]);

  // Selected day details
  const selectedDayInfo = useMemo(() => {
    if (!selectedDayDate) return null;
    const day = calendarDays.find((d) => d.dateStr === selectedDayDate);
    return day || null;
  }, [selectedDayDate, calendarDays]);

  const [todayStr] = useState<string>(getTodayString);

  return (
    <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden text-xs">
      
      {/* Header bar */}
      <div className="p-3 sm:p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#1A3826]" />
          <span className="font-semibold text-neutral-900 text-xs">Calendario de Ocupación</span>
        </div>

        {/* Cabin Filter */}
        <div className="flex items-center gap-2">
          <label className="text-neutral-500 text-[11px]">Cabaña:</label>
          <select
            value={selectedCabinFilter}
            onChange={(e) => setSelectedCabinFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-[11px] outline-none focus:border-[#1A3826]"
          >
            <option value="all">Todas las cabañas</option>
            {cabins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Month Navigation & Legend */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="font-semibold text-neutral-800 font-mono text-xs min-w-[130px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleGoToday}
            className="ml-2 text-[10px] font-mono text-neutral-500 hover:text-[#1A3826] underline cursor-pointer"
          >
            Hoy
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] font-medium text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#1A3826]/15 border border-[#1A3826]/40"></span>
            <span>Reservado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-neutral-200 border border-neutral-300"></span>
            <span>Bloqueado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-white border border-neutral-200"></span>
            <span>Disponible</span>
          </div>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-neutral-100 bg-neutral-50/70 text-center text-[10px] font-semibold text-neutral-500 py-1.5">
        {WEEK_DAYS.map((wd) => (
          <div key={wd}>{wd}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-[1px] bg-neutral-100 p-[1px]">
        {calendarDays.map((day, idx) => {
          if (!day.isCurrentMonth) {
            return (
              <div
                key={`empty-${idx}`}
                className="bg-neutral-50/40 min-h-[52px] sm:min-h-[64px]"
              />
            );
          }

          const isToday = day.dateStr === todayStr;
          const isSelected = day.dateStr === selectedDayDate;
          const hasReservations = day.reservations.length > 0;
          const hasBlocks = day.blocks.length > 0;

          let cellStyle = 'bg-white hover:bg-neutral-50 text-neutral-700';

          if (hasReservations) {
            cellStyle = 'bg-emerald-50/80 hover:bg-emerald-100/70 text-[#1A3826] border-emerald-200 font-medium';
          } else if (hasBlocks) {
            cellStyle = 'bg-neutral-100/90 hover:bg-neutral-200/60 text-neutral-600 border-neutral-300';
          }

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDayDate(day.dateStr)}
              className={`min-h-[52px] sm:min-h-[64px] p-1.5 flex flex-col justify-between text-left transition-colors cursor-pointer relative ${cellStyle} ${
                isSelected ? 'ring-2 ring-[#1A3826] z-10' : ''
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-[11px] font-mono leading-none ${
                    isToday
                      ? 'w-5 h-5 flex items-center justify-center rounded-full bg-[#1A3826] text-white font-bold'
                      : ''
                  }`}
                >
                  {day.dayNumber}
                </span>

                {hasReservations && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A3826]" title="Reserva activa" />
                )}
                {!hasReservations && hasBlocks && (
                  <Lock className="w-2.5 h-2.5 text-neutral-400" />
                )}
              </div>

              {/* Badges preview */}
              <div className="space-y-0.5 mt-1 overflow-hidden">
                {day.reservations.slice(0, 1).map((r) => (
                  <div
                    key={r.id}
                    className="text-[9px] truncate px-1 py-0.2 rounded bg-[#1A3826]/10 text-[#1A3826] font-medium leading-tight"
                    title={`${r.guestName} (${r.cabinName})`}
                  >
                    {r.cabinName.replace('Cabaña ', '')}
                  </div>
                ))}

                {day.blocks.slice(0, 1).map((b) => (
                  <div
                    key={b.id}
                    className="text-[9px] truncate px-1 py-0.2 rounded bg-neutral-200 text-neutral-700 font-medium leading-tight"
                    title={`Bloqueo: ${b.reason} (${b.cabinName})`}
                  >
                    🔒 {b.reason || 'Bloqueo'}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Inspector Drawer */}
      {selectedDayInfo && (
        <div className="p-3 sm:p-4 bg-neutral-50/80 border-t border-neutral-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 text-xs">
                Detalle del día: {formatDateCL(selectedDayInfo.dateStr)}
              </span>
              <span className="font-mono text-[10px] text-neutral-400">({selectedDayInfo.dateStr})</span>
            </div>
            
            <button
              type="button"
              onClick={() => setSelectedDayDate(null)}
              className="text-neutral-400 hover:text-neutral-700 text-[11px]"
            >
              Cerrar detalle ✕
            </button>
          </div>

          {selectedDayInfo.reservations.length === 0 && selectedDayInfo.blocks.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-neutral-200 text-neutral-600 text-[11px]">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>No hay reservas ni bloqueos en esta fecha. La fecha está disponible.</span>
              </div>
              {onQuickBlockDate && (
                <button
                  type="button"
                  onClick={() =>
                    onQuickBlockDate(
                      selectedDayInfo.dateStr,
                      selectedCabinFilter !== 'all' ? selectedCabinFilter : cabins[0]?.id || ''
                    )
                  }
                  className="px-2.5 py-1 bg-[#1A3826] text-white rounded text-[10px] font-medium hover:bg-[#234B34] transition-colors whitespace-nowrap"
                >
                  Bloquear esta fecha
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Show matching reservations */}
              {selectedDayInfo.reservations.map((res) => (
                <div
                  key={res.id}
                  className="p-2.5 bg-white rounded-lg border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#1A3826]">#{res.code}</span>
                      <span className="font-semibold text-neutral-900">{res.cabinName}</span>
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-medium uppercase">
                        {res.status}
                      </span>
                    </div>
                    <div className="text-neutral-600">
                      Huésped: <strong>{res.guestName}</strong> ({res.guestPhone}) • {formatDateShort(res.checkIn)} a {formatDateShort(res.checkOut)} ({res.nightsCount} noches)
                    </div>
                  </div>
                  <div className="font-mono text-neutral-700 text-right sm:shrink-0">
                    Abono: {formatCLP(res.depositAmount)} | Saldo: {formatCLP(res.pendingBalance)}
                  </div>
                </div>
              ))}

              {/* Show matching blocks */}
              {selectedDayInfo.blocks.map((block) => (
                <div
                  key={block.id}
                  className="p-2.5 bg-white rounded-lg border border-neutral-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-neutral-500" />
                      <span className="font-semibold text-neutral-900">{block.cabinName}</span>
                      <span className="text-neutral-500">Motivo: {block.reason}</span>
                    </div>
                    <div className="text-neutral-500 text-[10px]">
                      Desde {formatDateShort(block.startDate)} hasta {formatDateShort(block.endDate)}
                    </div>
                  </div>
                  {onRemoveBlock && (
                    <button
                      type="button"
                      onClick={() => onRemoveBlock(block.id)}
                      className="text-neutral-500 hover:text-rose-600 underline text-[11px] sm:shrink-0 cursor-pointer"
                    >
                      Liberar fecha
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
