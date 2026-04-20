import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTerminal } from '../hooks/useData';
import { TERMINALS } from '../constants';
import { recordsService, vehiclesService, driversService } from '../services/storage';
import { isLicenseExpired } from '../utils/helpers';

/* ── Icons ── */
function PlusIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
}
function CheckCircleIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ClipboardIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
}
function ChartBarIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function TruckIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1 1h8l1-1zM13 6h3l3 5v4h-6V6z" /></svg>;
}
function PersonIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function FileDocIcon() {
  return <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
}
function ArrowRightIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}
function ShieldIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
function WarningIcon() {
  return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}
function RadioIcon({ active }) {
  return active
    ? <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
    : <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="9" strokeWidth="2"/></svg>;
}

const PRIMARY_ACTIONS = [
  {
    path: '/nueva-entrega',
    label: 'Nueva Entrega',
    desc: 'Registrar salida de vehículo',
    icon: PlusIcon,
    bg: 'from-orange-500 to-orange-600',
    accent: '#f97316',
    primary: true,
  },
  {
    path: '/cerrar-recepcion',
    label: 'Cerrar Recepción',
    desc: 'Registrar devolución de vehículo',
    icon: CheckCircleIcon,
    bg: 'from-emerald-500 to-emerald-600',
    accent: '#10b981',
    primary: true,
    badge: true,
  },
];

const SECONDARY_ACTIONS = [
  { path: '/registros',     label: 'Historial',      desc: 'Registros de movimientos', icon: ClipboardIcon },
  { path: '/dashboard',     label: 'Dashboard',      desc: 'Métricas y estadísticas',  icon: ChartBarIcon },
  { path: '/vehiculos',     label: 'Vehículos',      desc: 'Gestión de flota',          icon: TruckIcon },
  { path: '/conductores',   label: 'Conductores',    desc: 'Personal habilitado',       icon: PersonIcon },
  { path: '/documentacion', label: 'Documentación',  desc: 'Control de vencimientos',   icon: FileDocIcon },
];

export default function Home() {
  const { terminal, setTerminal } = useTerminal();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!terminal) return null;
    const records  = recordsService.getAll().filter(r => r.active !== false && r.terminal === terminal);
    const vehicles = vehiclesService.getByTerminal(terminal);
    const drivers  = driversService.getByTerminal(terminal);
    return {
      pending:   records.filter(r => r.status === 'PENDIENTE').length,
      available: vehicles.filter(v => v.status === 'disponible').length,
      inUse:     vehicles.filter(v => v.status === 'en_uso').length,
      expLicense: drivers.filter(d => isLicenseExpired(d.vencimiento_licencia)).length,
    };
  }, [terminal]);

  /* ── Terminal selector ── */
  if (!terminal) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-slide-up">

          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-5 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
              <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1 1h8l1-1zM13 6h3l3 5v4h-6V6z" />
              </svg>
            </div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">CHECK-POOL</h1>
            <p className="text-slate-500 mt-2 text-base font-medium">Sistema de Gestión de Pool Vehicular</p>
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <ShieldIcon />
              <span className="text-xs text-slate-400 font-medium">Selecciona tu terminal para continuar</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200/60 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-base">Seleccionar Terminal</h2>
                <p className="text-slate-400 text-xs">El sistema filtrará vehículos y conductores según la terminal</p>
              </div>
            </div>

            <div className="p-5">
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {TERMINALS.map(t => (
                  <button
                    key={t}
                    onClick={() => setTerminal(t)}
                    className={`w-full flex items-center gap-3 text-left px-4 py-3.5 rounded-xl border transition-all ${
                      terminal === t
                        ? 'border-orange-400 bg-orange-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40 hover:shadow-sm'
                    }`}
                  >
                    <RadioIcon active={terminal === t} />
                    <span className={`font-semibold text-sm ${terminal === t ? 'text-orange-700' : 'text-slate-700'}`}>{t}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5 font-medium">v1.0.0 — CHECK-POOL Gestión Vehicular</p>
        </div>
      </div>
    );
  }

  /* ── Main menu ── */
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Bienvenido</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
            <span className="text-sm font-semibold text-slate-500">{terminal}</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className="font-semibold">{new Date().toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>
      </div>

      {/* KPI strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes',   val: stats.pending,   color: stats.pending > 0 ? 'bg-amber-500' : 'bg-slate-200', text: stats.pending > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-500 bg-slate-50 border-slate-200' },
            { label: 'En Uso',       val: stats.inUse,     color: 'bg-blue-500', text: stats.inUse > 0 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-500 bg-slate-50 border-slate-200' },
            { label: 'Disponibles',  val: stats.available, color: 'bg-emerald-500', text: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
            { label: 'Lic. Vencidas',val: stats.expLicense,color: stats.expLicense > 0 ? 'bg-red-500' : 'bg-slate-200', text: stats.expLicense > 0 ? 'text-red-700 bg-red-50 border-red-200' : 'text-slate-500 bg-slate-50 border-slate-200' },
          ].map(({ label, val, text }) => (
            <div key={label} className={`rounded-xl p-3.5 border ${text} flex flex-col gap-1`}>
              <span className="text-2xl font-extrabold leading-none">{val}</span>
              <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Alerts */}
      {stats && stats.pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <WarningIcon />
          <p className="text-sm text-amber-800 font-semibold">
            {stats.pending} vehículo{stats.pending > 1 ? 's' : ''} pendiente{stats.pending > 1 ? 's' : ''} de recepción
          </p>
          <button onClick={() => navigate('/cerrar-recepcion')} className="ml-auto text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            Cerrar <ArrowRightIcon />
          </button>
        </div>
      )}
      {stats && stats.expLicense > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-sm text-red-700 font-semibold">{stats.expLicense} conductor(es) con licencia vencida</p>
          <button onClick={() => navigate('/conductores')} className="ml-auto text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            Ver <ArrowRightIcon />
          </button>
        </div>
      )}

      {/* Primary actions */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Acciones principales</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PRIMARY_ACTIONS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="group relative overflow-hidden rounded-2xl text-left transition-all hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] shadow-sm"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.bg}`} />
                {/* Decorative circle */}
                <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
                <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full bg-white/10" />

                <div className="relative p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
                    <Icon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-extrabold text-base leading-tight">{item.label}</p>
                    <p className="text-white/75 text-xs mt-0.5 font-medium">{item.desc}</p>
                  </div>
                  {item.badge && stats?.pending > 0 && (
                    <span className="bg-white text-orange-600 text-xs font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                      {stats.pending}
                    </span>
                  )}
                  <div className="text-white/60 group-hover:text-white transition-colors">
                    <ArrowRightIcon />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary actions */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Módulos del sistema</p>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {SECONDARY_ACTIONS.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600 transition-colors">
                  <Icon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                <span className="text-slate-300 group-hover:text-slate-500 transition-colors">
                  <ArrowRightIcon />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
