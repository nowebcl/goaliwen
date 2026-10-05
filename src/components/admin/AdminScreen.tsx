import React, { useState, useMemo } from 'react';
import { useBooking } from '../../context/BookingContext';
import { formatCLP, formatDateShort } from '../../utils/formatters';
import type { ReservationStatus } from '../../types';
import { AdminCalendar } from './AdminCalendar';

export const AdminScreen: React.FC = () => {
  const {
    isAdminAuthenticated,
    loginAdmin,
    logoutAdmin,
    reservations,
    blockedDates,
    cabins,
    navigateTo,
    updateReservationStatus,
    deleteReservation,
    addBlockedDate,
    removeBlockedDate,
  } = useBooking();

  const [email, setEmail] = useState('contacto@refugioaliwenspa.cl');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Availability form state
  const [blockCabinId, setBlockCabinId] = useState(cabins[0]?.id || '');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(false);
    try {
      const ok = await loginAdmin(email, password);
      if (!ok) {
        setAuthError(true);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockCabinId || !blockStart || !blockEnd) return;
    const cabin = cabins.find((c) => c.id === blockCabinId);
    await addBlockedDate({
      cabinId: blockCabinId,
      cabinName: cabin?.name || 'Cabaña',
      startDate: blockStart,
      endDate: blockEnd,
      reason: blockReason || 'Mantenimiento',
    });
    setBlockStart('');
    setBlockEnd('');
    setBlockReason('');
  };

  const totalCollected = useMemo(() => {
    return reservations
      .filter((r) => r.status !== 'cancelada')
      .reduce((acc, curr) => acc + curr.depositAmount, 0);
  }, [reservations]);

  const totalPending = useMemo(() => {
    return reservations
      .filter((r) => r.status !== 'cancelada')
      .reduce((acc, curr) => acc + curr.pendingBalance, 0);
  }, [reservations]);

  // If not logged in
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFCFA] text-neutral-900 font-sans">
        <form onSubmit={handleLogin} className="w-full max-w-sm border border-neutral-200 bg-white p-6 rounded-2xl space-y-3.5 text-xs shadow-sm">
          <div className="flex flex-col items-center pb-2">
            <img
              src="/Recurso-11-scaled.webp"
              alt="Aliwen Refugio"
              className="h-9 w-auto object-contain select-none mb-1"
            />
            <span className="font-semibold text-neutral-600 text-[11px] tracking-wide uppercase">Panel de Administración</span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-neutral-500 font-medium">Usuario / Correo</label>
            <input
              type="text"
              placeholder="contacto@refugioaliwenspa.cl"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setAuthError(false);
              }}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg outline-none focus:border-[#1A3826] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-neutral-500 font-medium">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setAuthError(false);
              }}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg outline-none focus:border-[#1A3826] transition-colors"
            />
          </div>

          {authError && (
            <p className="text-rose-600 text-[11px] bg-rose-50 border border-rose-100 p-2 rounded-lg text-center">
              Credenciales incorrectas. Verifica tu usuario y contraseña.
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-2.5 bg-[#1A3826] text-white rounded-lg font-medium hover:bg-[#234B34] transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
          >
            {isLoggingIn ? 'Iniciando sesión...' : 'Entrar al Administrador'}
          </button>

          <button
            type="button"
            onClick={() => navigateTo('booking')}
            className="w-full py-1 text-neutral-400 hover:text-neutral-700 text-center text-[11px] cursor-pointer"
          >
            ← Volver a reservas
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] text-neutral-900 p-4 sm:p-8 text-xs font-sans space-y-6 max-w-5xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-200 gap-2">
        <div className="flex items-center gap-3">
          <img
            src="/Recurso-11-scaled.webp"
            alt="Aliwen"
            className="h-6 w-auto object-contain select-none"
          />
          <span className="font-bold text-sm text-[#1A3826]">Administración</span>
          <span className="text-neutral-400">|</span>
          <button
            type="button"
            onClick={() => navigateTo('booking')}
            className="text-neutral-500 hover:text-[#1A3826] underline cursor-pointer"
          >
            Ir a reservas
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={logoutAdmin}
            className="text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* KPI Numbers */}
      <div className="grid grid-cols-3 gap-3 border border-neutral-200 p-3 rounded-xl font-mono text-[11px]">
        <div>
          <span className="text-neutral-400 block text-[10px]">Reservas activas:</span>
          <span className="font-bold text-sm text-neutral-900">
            {reservations.filter((r) => r.status !== 'cancelada').length}
          </span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[10px]">Abonado Webpay:</span>
          <span className="font-bold text-sm text-neutral-900">{formatCLP(totalCollected)}</span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[10px]">Saldo por cobrar:</span>
          <span className="font-bold text-sm text-neutral-900">{formatCLP(totalPending)}</span>
        </div>
      </div>

      {/* Calendario de Ocupación y Bloqueos */}
      <AdminCalendar
        cabins={cabins}
        reservations={reservations}
        blockedDates={blockedDates}
        onQuickBlockDate={(dateStr, cabinId) => {
          setBlockCabinId(cabinId);
          setBlockStart(dateStr);
          setBlockEnd(dateStr);
          const el = document.getElementById('manual-block-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onRemoveBlock={removeBlockedDate}
      />

      {/* Reservas Table */}
      <div className="border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 font-semibold text-neutral-700">
          Reservas registradas ({reservations.length})
        </div>

        <div className="divide-y divide-neutral-100 overflow-x-auto">
          {reservations.map((res) => (
            <div key={res.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">#{res.code}</span>
                  <span className="font-semibold text-neutral-900">{res.cabinName}</span>
                </div>
                <div className="text-neutral-500 text-[11px]">
                  {formatDateShort(res.checkIn)} — {formatDateShort(res.checkOut)} ({res.nightsCount}n) • {res.guestName} ({res.guestPhone})
                </div>
                <div className="font-mono text-[11px] text-neutral-600">
                  Total: {formatCLP(res.totalPrice)} | Abono: {formatCLP(res.depositAmount)} ({res.depositPercentage}%) | Saldo: {formatCLP(res.pendingBalance)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={res.status}
                  onChange={(e) => updateReservationStatus(res.id, e.target.value as ReservationStatus)}
                  className="px-2 py-1 rounded border border-neutral-200 bg-white text-[11px] outline-none"
                >
                  <option value="confirmada">Confirmada</option>
                  <option value="en_proceso">En estadía</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>

                <button
                  type="button"
                  onClick={() => deleteReservation(res.id)}
                  className="px-2 py-1 rounded border border-neutral-200 text-neutral-400 hover:text-rose-600 text-[11px]"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bloqueo de Fechas */}
      <div id="manual-block-section" className="border border-neutral-200 rounded-xl p-4 space-y-3">
        <span className="font-semibold block text-neutral-800">Bloquear fechas manualmente</span>
        
        <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
          <select
            value={blockCabinId}
            onChange={(e) => setBlockCabinId(e.target.value)}
            className="px-2 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white"
          >
            {cabins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={blockStart}
            onChange={(e) => setBlockStart(e.target.value)}
            className="px-2 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white"
          />

          <input
            type="date"
            value={blockEnd}
            onChange={(e) => setBlockEnd(e.target.value)}
            className="px-2 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white"
          />

          <input
            type="text"
            placeholder="Motivo (ej: Mantenimiento)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="px-2 py-1.5 border border-neutral-200 rounded-lg outline-none bg-white placeholder:text-neutral-400"
          />

          <button
            type="submit"
            className="py-1.5 bg-[#1A3826] text-white rounded-lg font-medium hover:bg-[#234B34] transition-colors"
          >
            Bloquear
          </button>
        </form>

        {blockedDates.length > 0 && (
          <div className="pt-2 border-t border-neutral-100 space-y-1">
            <span className="text-[11px] text-neutral-400 block font-medium">Bloqueos activos:</span>
            {blockedDates.map((b) => (
              <div key={b.id} className="flex items-center justify-between text-[11px] text-neutral-600 py-1">
                <span>
                  {b.cabinName}: {formatDateShort(b.startDate)} — {formatDateShort(b.endDate)} ({b.reason})
                </span>
                <button
                  type="button"
                  onClick={() => removeBlockedDate(b.id)}
                  className="text-neutral-400 hover:text-rose-600 underline"
                >
                  Liberar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
