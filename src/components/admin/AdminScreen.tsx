import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Trash2,
  Search,
  LogOut,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Volume2,
  VolumeX,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { useBooking } from '../../context/BookingContext';
import { formatCLP, formatDateShort } from '../../utils/formatters';
import type { Reservation, ReservationStatus } from '../../types';
import { downloadVoucherPDF } from '../../utils/pdfGenerator';
import { AdminCalendar } from './AdminCalendar';

// Synthesize pleasant luxury notification chime using native Web Audio API
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Note 1 (D5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    gain1.gain.setValueAtTime(0.35, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.65);

    // Note 2 (A5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.16);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.16);
    osc2.stop(ctx.currentTime + 0.9);
  } catch (err) {
    console.warn('[Audio] Could not play audio chime:', err);
  }
}

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
    refreshReservations,
  } = useBooking();

  // Authentication State
  const [email, setEmail] = useState('contacto@refugioaliwenspa.cl');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Active View Tab for mobile & desktop
  const [activeTab, setActiveTab] = useState<'reservas' | 'calendario' | 'bloqueos'>('reservas');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'bloqueadas' | 'liberadas' | 'canceladas'>('all');
  const [cabinFilter, setCabinFilter] = useState<string>('all');

  // Notifications & Sound State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });
  const [liveAlert, setLiveAlert] = useState<Reservation | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  // Date blocking form
  const [blockCabinId, setBlockCabinId] = useState(cabins[0]?.id || '');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('Mantenimiento tinaja');
  const [blockSuccessMsg, setBlockSuccessMsg] = useState(false);

  // Confirmation modal state for deletion
  const [deletingReservation, setDeletingReservation] = useState<Reservation | null>(null);

  // Initialize known reservation IDs
  useEffect(() => {
    if (reservations.length > 0 && knownIdsRef.current.size === 0) {
      reservations.forEach((r) => knownIdsRef.current.add(r.id));
    }
  }, [reservations]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Tu navegador no soporta notificaciones de sistema.');
      return;
    }
    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        playChime();
        new Notification('🔔 Refugio Aliwén Spa', {
          body: 'Notificaciones en tiempo real activadas con éxito.',
          icon: '/Recurso-11-scaled.webp',
        });
      }
    } catch (e) {
      console.warn('Error requesting notification permission:', e);
    }
  };

  // Real-time polling loop (every 6 seconds)
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/reservations');
        if (!res.ok) return;
        const currentList: Reservation[] = await res.json();
        if (!Array.isArray(currentList)) return;

        // Check for new reservations
        for (const item of currentList) {
          if (item.id && !knownIdsRef.current.has(item.id)) {
            // New reservation detected!
            knownIdsRef.current.add(item.id);
            setLiveAlert(item);

            // Play audio
            if (soundEnabled) {
              playChime();
            }

            // Trigger system push notification (Desktop / Mobile)
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`🛎️ ¡Nueva Reserva! ${item.cabinName}`, {
                  body: `${item.guestName} reservó #${item.code} por ${formatCLP(item.depositAmount)}.`,
                  icon: '/Recurso-11-scaled.webp',
                  badge: '/Recurso-11-scaled.webp',
                });
              } catch {}
            }

            // Vibrate mobile device if supported
            if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
              navigator.vibrate([200, 100, 200, 100, 300]);
            }

            // Refresh context
            await refreshReservations();
            break;
          }
        }
      } catch (err) {
        // Silent fail on network glitches
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isAdminAuthenticated, soundEnabled, refreshReservations]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshReservations();
    setTimeout(() => setIsRefreshing(false), 500);
  };

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
    setBlockReason('Mantenimiento tinaja');
    setBlockSuccessMsg(true);
    setTimeout(() => setBlockSuccessMsg(false), 3000);
  };

  // Toggle reservation date blocking (liberar / bloquear)
  const handleToggleBlockDates = async (res: Reservation) => {
    const isCurrentlyBlocked = res.status === 'confirmada' || res.status === 'en_proceso';
    if (isCurrentlyBlocked) {
      // Liberate dates: mark as 'liberada'
      await updateReservationStatus(res.id, 'liberada');
    } else {
      // Re-block dates: mark as 'confirmada'
      await updateReservationStatus(res.id, 'confirmada');
    }
  };

  // WhatsApp quick launcher
  const openWhatsApp = (phone: string, guestName: string, code: string, cabinName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const targetPhone = cleanPhone.startsWith('56') ? cleanPhone : `56${cleanPhone}`;
    const text = encodeURIComponent(
      `Hola ${guestName}, te contactamos desde Refugio Aliwén Spa respecto a tu reserva #${code} en ${cabinName}. ¿Cómo podemos ayudarte con tu llegada?`
    );
    window.open(`https://wa.me/${targetPhone}?text=${text}`, '_blank');
  };

  // Filtered reservations calculation
  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      // Cabin filter
      if (cabinFilter !== 'all' && res.cabinId !== cabinFilter) return false;

      // Status filter
      if (statusFilter === 'bloqueadas') {
        if (res.status !== 'confirmada' && res.status !== 'en_proceso') return false;
      } else if (statusFilter === 'liberadas') {
        if (res.status !== 'liberada' && res.status !== 'completada') return false;
      } else if (statusFilter === 'canceladas') {
        if (res.status !== 'cancelada') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesCode = (res.code || '').toLowerCase().includes(q);
        const matchesGuest = (res.guestName || '').toLowerCase().includes(q);
        const matchesPhone = (res.guestPhone || '').toLowerCase().includes(q);
        const matchesCabin = (res.cabinName || '').toLowerCase().includes(q);
        const matchesEmail = (res.guestEmail || '').toLowerCase().includes(q);
        if (!matchesCode && !matchesGuest && !matchesPhone && !matchesCabin && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [reservations, cabinFilter, statusFilter, searchQuery]);

  // KPIs
  const totalCollected = useMemo(() => {
    return reservations
      .filter((r) => r.status !== 'cancelada')
      .reduce((acc, curr) => acc + (Number(curr.depositAmount) || 0), 0);
  }, [reservations]);

  const totalPending = useMemo(() => {
    return reservations
      .filter((r) => r.status !== 'cancelada')
      .reduce((acc, curr) => acc + (Number(curr.pendingBalance) || 0), 0);
  }, [reservations]);

  const activeCount = useMemo(() => {
    return reservations.filter((r) => r.status === 'confirmada' || r.status === 'en_proceso').length;
  }, [reservations]);

  // Login view
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FCFCFA] text-neutral-900 font-sans">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm border border-neutral-200 bg-white p-6 sm:p-7 rounded-2xl space-y-4 text-xs shadow-sm"
        >
          <div className="flex flex-col items-center pb-2 text-center">
            <img
              src="/Recurso-11-scaled.webp"
              alt="Refugio Aliwen"
              className="h-11 w-auto object-contain select-none mb-2"
            />
            <h1 className="text-base font-bold text-[#1A3826]">Panel de Administración</h1>
            <p className="text-[11px] text-neutral-500 mt-0.5">Control de Reservas, Pagos Webpay y Fechas</p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-neutral-600 font-medium">Correo o Usuario</label>
            <input
              type="text"
              placeholder="contacto@refugioaliwenspa.cl"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setAuthError(false);
              }}
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl outline-none focus:border-[#1A3826] transition-colors bg-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-neutral-600 font-medium">Contraseña Maestra</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setAuthError(false);
              }}
              className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl outline-none focus:border-[#1A3826] transition-colors bg-white text-xs"
            />
          </div>

          {authError && (
            <p className="text-rose-600 text-[11px] bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center font-medium">
              Credenciales incorrectas. Verifica tu contraseña.
            </p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 bg-[#1A3826] text-white rounded-xl font-semibold hover:bg-[#234B34] transition-all disabled:opacity-60 cursor-pointer shadow-sm text-xs"
          >
            {isLoggingIn ? 'Verificando...' : 'Iniciar Sesión'}
          </button>

          <button
            type="button"
            onClick={() => navigateTo('booking')}
            className="w-full py-1 text-neutral-400 hover:text-neutral-700 text-center text-[11px] cursor-pointer"
          >
            ← Volver a la plataforma de reservas
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-neutral-900 text-xs font-sans pb-16">
      
      {/* Real-time New Reservation Live Toast */}
      {liveAlert && (
        <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 bg-[#1A3826] text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 flex items-start justify-between gap-3 animate-bounce">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <div className="font-bold text-[13px] text-white flex items-center gap-2">
                ¡Nueva Reserva en Vivo!
                <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded">#{liveAlert.code}</span>
              </div>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                <b>{liveAlert.guestName}</b> • {liveAlert.cabinName}
              </p>
              <p className="text-[11px] text-emerald-200 font-mono mt-0.5">
                Abono Webpay: <b>{formatCLP(liveAlert.depositAmount)}</b>
              </p>
            </div>
          </div>
          <button
            onClick={() => setLiveAlert(null)}
            className="text-white/60 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">

        {/* Top Header Bar */}
        <header className="bg-white border border-neutral-200/90 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/Recurso-11-scaled.webp"
                alt="Refugio Aliwen Spa"
                className="h-8 sm:h-9 w-auto object-contain select-none"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base text-[#1A3826] tracking-tight">Refugio Aliwén</span>
                  <span className="bg-[#1A3826]/10 text-[#1A3826] font-semibold text-[10px] px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 hidden sm:block">Control de Reservas, Fechas y Webpay</p>
              </div>
            </div>

            {/* Mobile Actions Menu */}
            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl border text-neutral-600 ${
                  soundEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-neutral-100 border-neutral-200 text-neutral-400'
                }`}
                title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={logoutAdmin}
                className="p-2 rounded-xl border border-neutral-200 text-neutral-600 hover:text-rose-600"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Desktop Notification & Session Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {/* Notification Permission Button */}
            {notificationPermission !== 'granted' ? (
              <button
                type="button"
                onClick={requestNotificationPermission}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium hover:bg-amber-100 transition-colors cursor-pointer text-[11px]"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                <span>Activar Alertas Celular/PC</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Alertas en Vivo Activas</span>
              </div>
            )}

            {/* Sound Toggle (Desktop) */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playChime();
              }}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-colors cursor-pointer text-[11px] font-medium ${
                soundEnabled
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-400'
              }`}
              title="Sonido de campana para nuevas reservas"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-700" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Sonido On' : 'Silencio'}</span>
            </button>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium transition-colors cursor-pointer text-[11px]"
              title="Sincronizar reservas con la base de datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1A3826]' : 'text-neutral-500'}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            {/* Public App Link */}
            <button
              type="button"
              onClick={() => navigateTo('booking')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 font-medium transition-colors cursor-pointer text-[11px]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              <span>Ver Web</span>
            </button>

            {/* Logout (Desktop) */}
            <button
              type="button"
              onClick={logoutAdmin}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-neutral-200 text-neutral-600 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* KPI Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-[11px] font-medium">Reservas Activas</span>
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">{activeCount}</span>
              <span className="text-[11px] text-emerald-700 font-medium">fechas bloqueadas</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Total históricas: {reservations.length}</p>
          </div>

          <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-[11px] font-medium">Abonado Flow Webpay</span>
              <span className="w-6 h-6 rounded-lg bg-[#1A3826]/10 text-[#1A3826] flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-neutral-900">{formatCLP(totalCollected)}</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">Fondos pagados en pasarela segura</p>
          </div>

          <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-[11px] font-medium">Saldo Pendiente al Ingreso</span>
              <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold font-mono text-neutral-900">{formatCLP(totalPending)}</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1">A cobrar al check-in del huésped</p>
          </div>
        </section>

        {/* Navigation Tabs (Mobile-Friendly Segmented Controller) */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/60 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('reservas')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeTab === 'reservas'
                ? 'bg-white text-[#1A3826] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Reservas</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'reservas' ? 'bg-[#1A3826] text-white' : 'bg-neutral-300 text-neutral-700'
              }`}
            >
              {reservations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('calendario')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeTab === 'calendario'
                ? 'bg-white text-[#1A3826] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bloqueos')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeTab === 'bloqueos'
                ? 'bg-white text-[#1A3826] shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Bloquear Fechas</span>
            {blockedDates.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: RESERVAS (CARDS INTUITIVAS OPTIMIZADAS PARA MÓVIL Y ESCRITORIO)      */}
        {/* ========================================================================= */}
        {activeTab === 'reservas' && (
          <div className="space-y-3.5">
            
            {/* Search and Filters Bar */}
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por código (#ALW-...), nombre, teléfono o cabaña..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 border border-neutral-200 rounded-xl outline-none focus:border-[#1A3826] text-xs bg-neutral-50/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Cabin Filter */}
                <select
                  value={cabinFilter}
                  onChange={(e) => setCabinFilter(e.target.value)}
                  className="px-3 py-2.5 border border-neutral-200 rounded-xl outline-none bg-white text-xs text-neutral-700"
                >
                  <option value="all">Todas las cabañas</option>
                  {cabins.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-neutral-400 text-[10px] font-medium mr-1 uppercase">Estado:</span>
                
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === 'all'
                      ? 'bg-[#1A3826] text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  Todas ({reservations.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('bloqueadas')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === 'bloqueadas'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Activas (Bloqueadas) ({activeCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('liberadas')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    statusFilter === 'liberadas'
                      ? 'bg-blue-700 text-white'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  <Unlock className="w-3 h-3" />
                  <span>Liberadas / Check-out</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('canceladas')}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    statusFilter === 'canceladas'
                      ? 'bg-rose-700 text-white'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  Canceladas
                </button>
              </div>
            </div>

            {/* Reservations Cards List */}
            {filteredReservations.length === 0 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-neutral-700 text-sm">No se encontraron reservas</h3>
                <p className="text-neutral-400 text-[11px]">
                  Prueba cambiando los filtros de búsqueda o el estado seleccionado.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredReservations.map((res) => {
                  const isDatesBlocked = res.status === 'confirmada' || res.status === 'en_proceso';
                  const isLiberada = res.status === 'liberada' || res.status === 'completada';

                  return (
                    <article
                      key={res.id}
                      className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3.5 ${
                        isDatesBlocked
                          ? 'border-emerald-200/90 ring-1 ring-emerald-500/10'
                          : isLiberada
                          ? 'border-neutral-200 opacity-90'
                          : 'border-rose-200/80'
                      }`}
                    >
                      {/* Top Row: Code, Cabin & Status Pill */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-[#1A3826] bg-[#1A3826]/10 px-2.5 py-1 rounded-lg">
                            #{res.code}
                          </span>
                          <span className="font-bold text-neutral-900 text-sm">{res.cabinName}</span>
                          <span className="text-neutral-400 text-xs">•</span>
                          <span className="text-neutral-500 text-[11px]">{res.guestsCount} personas</span>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          {res.status === 'confirmada' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                              Confirmada · Fechas Bloqueadas 🔒
                            </span>
                          )}

                          {res.status === 'en_proceso' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                              En Estadía · Fechas Bloqueadas 🔒
                            </span>
                          )}

                          {res.status === 'liberada' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <Unlock className="w-3 h-3 text-blue-600" />
                              Check-out · Fechas Liberadas 🔓
                            </span>
                          )}

                          {res.status === 'completada' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                              <Check className="w-3 h-3 text-teal-600" />
                              Completada · Fechas Liberadas 🔓
                            </span>
                          )}

                          {res.status === 'cancelada' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                              <X className="w-3 h-3 text-rose-600" />
                              Reserva Cancelada
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        
                        {/* Guest Info */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                            Huésped Registrado
                          </span>
                          <div className="font-semibold text-neutral-900 text-sm">{res.guestName}</div>
                          <div className="text-[11px] text-neutral-600 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-neutral-400" />
                            <span>{res.guestPhone || 'Sin teléfono'}</span>
                          </div>
                          {res.guestEmail && (
                            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 truncate">
                              <Mail className="w-3 h-3 text-neutral-400 shrink-0" />
                              <span className="truncate">{res.guestEmail}</span>
                            </div>
                          )}
                        </div>

                        {/* Dates & Stay */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                            Fechas de Estadía
                          </span>
                          <div className="font-semibold text-neutral-900 text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#1A3826]" />
                            <span>
                              {formatDateShort(res.checkIn)} ➔ {formatDateShort(res.checkOut)}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-600">
                            <b>{res.nightsCount} noche{res.nightsCount > 1 ? 's' : ''}</b> (Check-in 15:00 / Check-out 12:00)
                          </div>
                          <div className="text-[10px] text-neutral-400">
                            Registrado: {formatDateShort(res.createdAt?.split('T')[0] || '')}
                          </div>
                        </div>

                        {/* Financials & Payment Breakdown */}
                        <div className="space-y-1 sm:text-right">
                          <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold block">
                            Valores y Pasarela
                          </span>
                          <div className="font-mono font-bold text-neutral-900 text-sm">
                            Total: {formatCLP(res.totalPrice)}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-mono font-medium">
                            Abono: {formatCLP(res.depositAmount)} ({res.depositPercentage}%)
                          </div>
                          <div className="text-[11px] text-amber-800 font-mono font-medium">
                            Saldo en Check-in: {formatCLP(res.pendingBalance)}
                          </div>
                          {res.transactionId && (
                            <div className="text-[10px] text-neutral-400 font-mono">
                              Tx: {res.transactionId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Buttons Bar (High touch targets for mobile) */}
                      <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
                        
                        {/* Primary Liberation/Block Button */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {isDatesBlocked ? (
                            <button
                              type="button"
                              onClick={() => handleToggleBlockDates(res)}
                              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="El huésped se retira. Libera las fechas del calendario inmediatamente."
                            >
                              <Unlock className="w-3.5 h-3.5 text-blue-700" />
                              <span>Liberar Fechas (Check-out)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleToggleBlockDates(res)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="Vuelve a bloquear las fechas en el calendario para esta reserva."
                            >
                              <Lock className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Bloquear Fechas</span>
                            </button>
                          )}

                          {/* WhatsApp Button */}
                          <button
                            type="button"
                            onClick={() => openWhatsApp(res.guestPhone, res.guestName, res.code, res.cabinName)}
                            className="px-3 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                            <span>WhatsApp</span>
                          </button>

                          {/* Download Voucher PDF */}
                          <button
                            type="button"
                            onClick={() => downloadVoucherPDF(res)}
                            className="px-3 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Descargar comprobante en PDF oficial"
                          >
                            <FileText className="w-3.5 h-3.5 text-neutral-500" />
                            <span>Voucher PDF</span>
                          </button>
                        </div>

                        {/* Status selector & Delete */}
                        <div className="flex items-center gap-2">
                          <select
                            value={res.status}
                            onChange={(e) => updateReservationStatus(res.id, e.target.value as ReservationStatus)}
                            className="px-2.5 py-1.5 border border-neutral-200 rounded-xl bg-white text-xs text-neutral-800 outline-none cursor-pointer"
                          >
                            <option value="confirmada">Confirmada (Bloquea)</option>
                            <option value="en_proceso">En estadía (Bloquea)</option>
                            <option value="liberada">Liberada (Libera)</option>
                            <option value="completada">Completada (Libera)</option>
                            <option value="cancelada">Cancelada (Libera)</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setDeletingReservation(res)}
                            className="p-2 rounded-xl border border-neutral-200 text-neutral-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar reserva"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CALENDARIO MAESTRO DE OCUPACIÓN                                    */}
        {/* ========================================================================= */}
        {activeTab === 'calendario' && (
          <div className="space-y-4">
            <AdminCalendar
              cabins={cabins}
              reservations={reservations}
              blockedDates={blockedDates}
              onQuickBlockDate={(dateStr, cabinId) => {
                setBlockCabinId(cabinId);
                setBlockStart(dateStr);
                setBlockEnd(dateStr);
                setActiveTab('bloqueos');
              }}
              onRemoveBlock={removeBlockedDate}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BLOQUEO MANUAL DE FECHAS (MANTENIMIENTO / RESERVAS EXTERNAS)        */}
        {/* ========================================================================= */}
        {activeTab === 'bloqueos' && (
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#1A3826]" />
                Bloqueo Manual de Fechas
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Bloquea días específicos para una cabaña por mantenimiento de tinaja, reparaciones o reservas telefónicas directas.
              </p>
            </div>

            {blockSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Fechas bloqueadas con éxito en el calendario y base de datos.</span>
              </div>
            )}

            <form onSubmit={handleAddBlock} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600 font-medium">Cabaña</label>
                <select
                  value={blockCabinId}
                  onChange={(e) => setBlockCabinId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl outline-none bg-white text-xs"
                >
                  {cabins.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600 font-medium">Fecha Inicio</label>
                <input
                  type="date"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl outline-none bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600 font-medium">Fecha Término</label>
                <input
                  type="date"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl outline-none bg-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-neutral-600 font-medium">Motivo</label>
                <input
                  type="text"
                  placeholder="Ej: Mantenimiento tinaja"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl outline-none bg-white text-xs placeholder:text-neutral-400"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1A3826] text-white rounded-xl font-semibold hover:bg-[#234B34] transition-colors cursor-pointer text-xs"
                >
                  Bloquear Fechas
                </button>
              </div>
            </form>

            {/* Active blocks list */}
            <div className="pt-4 border-t border-neutral-100 space-y-2">
              <span className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider block">
                Bloqueos Activos ({blockedDates.length})
              </span>

              {blockedDates.length === 0 ? (
                <p className="text-neutral-400 text-xs italic">No hay bloqueos manuales activos en este momento.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {blockedDates.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-neutral-900 block">{b.cabinName}</span>
                        <span className="text-neutral-600 text-[11px]">
                          {formatDateShort(b.startDate)} al {formatDateShort(b.endDate)}
                        </span>
                        <span className="text-neutral-400 text-[10px] block">Motivo: {b.reason}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeBlockedDate(b.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-neutral-200 hover:border-rose-300 hover:text-rose-600 text-neutral-600 font-medium transition-colors text-[11px] cursor-pointer"
                      >
                        Liberar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Delete Confirmation Modal */}
      {deletingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-200 text-xs">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-neutral-900 text-sm">¿Eliminar Reserva #{deletingReservation.code}?</h3>
              <p className="text-neutral-500 text-[11px]">
                Esta acción eliminará la reserva de <b>{deletingReservation.guestName}</b> ({deletingReservation.cabinName}) tanto de la base de datos como del calendario.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingReservation(null)}
                className="py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deletingReservation.id;
                  setDeletingReservation(null);
                  await deleteReservation(id);
                }}
                className="py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 cursor-pointer"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
