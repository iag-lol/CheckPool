import { useMemo, useState } from 'react';
import { vehiclesService, driversService, recordsService, damagesService, docsService } from '../services/storage';
import { useTerminal } from '../hooks/useData';
import { TERMINALS } from '../constants';
import { isLicenseExpired, isDocExpired, formatDate } from '../utils/helpers';
import { DOCUMENT_CHECKLIST_FIELDS, getExpirationInfo } from '../utils/documentation';
import Badge from '../components/Badge';

const DOC_DATE_KEYS = DOCUMENT_CHECKLIST_FIELDS.flatMap(f => f.dateKeys ?? []);

// ─── SVG Icons (Heroicons outline) ───────────────────────────────────────────
const IconAlertTriangle = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
const IconDocument = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);
const IconClock = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconCalendar = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);
const IconWrench = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
  </svg>
);
const IconCheckCircle = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconTruck = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
  </svg>
);
const IconExclamationCircle = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
  </svg>
);
const IconShield = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);
const IconBolt = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);
const IconIdentification = ({ className = 'w-4 h-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
  </svg>
);
const IconCheckBadge = ({ className = 'w-10 h-10' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);

// ─── Ring Gauge (SVG) ─────────────────────────────────────────────────────────
function RingGauge({ pct, color, size = 72 }) {
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(Math.max(pct, 0), 1) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth="7" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Ring with centred percentage label ──────────────────────────────────────
function RingWithLabel({ pct, color, textClass }) {
  return (
    <div className="relative flex-shrink-0">
      <RingGauge pct={pct} color={color} size={76} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-extrabold ${textClass}`}>
          {Math.round(pct * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Mini Progress Bar ────────────────────────────────────────────────────────
function MiniBar({ value, max, color = '#f97316' }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

// ─── Alert Strip ─────────────────────────────────────────────────────────────
function AlertStrip({ type, icon, message }) {
  const s = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning:  'bg-amber-50 border-amber-200 text-amber-800',
    info:     'bg-sky-50 border-sky-200 text-sky-800',
  };
  return (
    <div className={`flex items-center gap-2.5 border rounded-xl px-4 py-3 ${s[type] || s.warning}`}>
      <span className="flex-shrink-0">{icon}</span>
      <span className="text-xs font-semibold leading-snug">{message}</span>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, accent = 'bg-orange-500' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
      <div className={`w-8 h-8 ${accent} rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold leading-none text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-1 font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, sub, badge }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {badge != null && badge > 0 && (
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">{badge}</span>
      )}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { terminal } = useTerminal();
  const [filterTerminal, setFilterTerminal] = useState(terminal || '');

  // Stable base data — read once per mount, not on every render
  const allVehicles = useMemo(() => vehiclesService.getAll().filter(v => v.active !== false), []);
  const allDrivers  = useMemo(() => driversService.getAll().filter(d => d.active !== false), []);
  const allRecords  = useMemo(() => recordsService.getAll().filter(r => r.active !== false), []);
  const allDamages  = useMemo(() => damagesService.getAll().filter(d => d.active !== false), []);
  const allDocs     = useMemo(() => docsService.getAll().filter(d => d.active !== false), []);

  // O(1) lookups used in list renders — avoids N+1 localStorage reads
  const vehicleById = useMemo(() => Object.fromEntries(allVehicles.map(v => [v.id, v])), [allVehicles]);
  const driverById  = useMemo(() => Object.fromEntries(allDrivers.map(d => [d.id, d])),  [allDrivers]);

  const filteredVehicles = useMemo(
    () => filterTerminal ? allVehicles.filter(v => v.terminal === filterTerminal) : allVehicles,
    [filterTerminal, allVehicles],
  );
  const filteredDrivers = useMemo(
    () => filterTerminal ? allDrivers.filter(d => d.terminal === filterTerminal) : allDrivers,
    [filterTerminal, allDrivers],
  );
  const filteredRecords = useMemo(
    () => filterTerminal ? allRecords.filter(r => r.terminal === filterTerminal) : allRecords,
    [filterTerminal, allRecords],
  );

  const stats = useMemo(() => {
    const pending    = filteredRecords.filter(r => r.status === 'PENDIENTE');
    const closed     = filteredRecords.filter(r => r.status !== 'PENDIENTE');
    const late       = filteredRecords.filter(r => r.status === 'TARDÍO' || r.status === 'TARDÍO CON DAÑO');
    const withDamage = filteredRecords.filter(r => r.status === 'CON DAÑO' || r.status === 'TARDÍO CON DAÑO');
    const available  = filteredVehicles.filter(v => v.status === 'disponible');
    const inUse      = filteredVehicles.filter(v => v.status === 'en_uso');
    const maint      = filteredVehicles.filter(v => v.status === 'mantenimiento');

    const vehicleIds    = new Set(filteredVehicles.map(v => v.id));
    const activeDamages = allDamages.filter(d => vehicleIds.has(d.vehicleId) && !d.resolved);

    const expiredLicenseList = filteredDrivers.filter(d => isLicenseExpired(d.vencimiento_licencia));
    const soonLicenseList    = filteredDrivers.filter(d => {
      if (!d.vencimiento_licencia || isLicenseExpired(d.vencimiento_licencia)) return false;
      return getExpirationInfo(d.vencimiento_licencia, 30).status === 'por_vencer';
    });

    const expiredDocVehicles = allDocs.filter(d => {
      if (!vehicleIds.has(d.vehicleId)) return false;
      return DOC_DATE_KEYS.some(f => isDocExpired(d[f]));
    });

    const total          = filteredVehicles.length;
    const utilizationPct = total > 0 ? inUse.length / total : 0;
    const onTimePct      = closed.length > 0 ? (closed.length - late.length) / closed.length : 1;
    const damageRate     = closed.length > 0 ? withDamage.length / closed.length : 0;

    return {
      pending: pending.length, closed: closed.length,
      late: late.length, withDamage: withDamage.length,
      available: available.length, inUse: inUse.length,
      maintenance: maint.length, totalVehicles: total,
      totalDrivers: filteredDrivers.length,
      totalRecords: filteredRecords.length,
      activeDamages: activeDamages.length,
      recentDamagesList: activeDamages.slice(0, 8),
      expiredLicenses: expiredLicenseList.length,
      soonLicenses: soonLicenseList.length,
      expiredDocs: expiredDocVehicles.length,
      pendingList: pending,
      utilizationPct, onTimePct, damageRate,
    };
  }, [filteredVehicles, filteredDrivers, filteredRecords, allDamages, allDocs]);

  const last7 = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const recs = filteredRecords.filter(r => r.fecha === dateStr);
      days.push({
        dateStr,
        label:   d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }),
        total:   recs.length,
        onTime:  recs.filter(r => r.status === 'CERRADO').length,
        late:    recs.filter(r => r.status === 'TARDÍO' || r.status === 'TARDÍO CON DAÑO').length,
        pending: recs.filter(r => r.status === 'PENDIENTE').length,
      });
    }
    return days;
  }, [filteredRecords]);

  const maxDay = Math.max(...last7.map(d => d.total), 1);

  const terminalSummary = useMemo(() => {
    return TERMINALS.map(t => {
      const tvs  = allVehicles.filter(v => v.terminal === t);
      const recs = allRecords.filter(r => r.terminal === t);
      const inU   = tvs.filter(v => v.status === 'en_uso').length;
      const avail = tvs.filter(v => v.status === 'disponible').length;
      const maint = tvs.filter(v => v.status === 'mantenimiento').length;
      const pend  = recs.filter(r => r.status === 'PENDIENTE').length;
      const lateR = recs.filter(r => r.status === 'TARDÍO' || r.status === 'TARDÍO CON DAÑO').length;
      return {
        terminal: t, total: tvs.length,
        available: avail, inUse: inU, maintenance: maint,
        pending: pend, late: lateR, totalRecords: recs.length,
        utilization: tvs.length > 0 ? inU / tvs.length : 0,
      };
    }).filter(t => t.total > 0 || t.totalRecords > 0);
  }, [allVehicles, allRecords]);

  const dateLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const hasAlerts = stats.expiredLicenses > 0 || stats.expiredDocs > 0
                 || stats.late > 0 || stats.maintenance > 0 || stats.soonLicenses > 0;

  const onTimeColor     = stats.onTimePct >= 0.9 ? '#10b981' : stats.onTimePct >= 0.7 ? '#f59e0b' : '#ef4444';
  const onTimeTextClass = stats.onTimePct >= 0.9 ? 'text-emerald-600' : stats.onTimePct >= 0.7 ? 'text-amber-500' : 'text-red-500';
  const damageColor     = stats.damageRate > 0.2 ? '#ef4444' : stats.damageRate > 0.1 ? '#f59e0b' : '#10b981';
  const damageTextClass = stats.damageRate > 0.2 ? 'text-red-500' : stats.damageRate > 0.1 ? 'text-amber-500' : 'text-emerald-600';

  return (
    <div className="space-y-5 pb-10">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Panel de Control</h2>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <select
          value={filterTerminal}
          onChange={e => setFilterTerminal(e.target.value)}
          className="self-start sm:self-auto text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-400 bg-white shadow-sm font-semibold text-gray-700 min-w-[210px] cursor-pointer"
        >
          <option value="">Todas las terminales</option>
          {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {hasAlerts && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {stats.expiredLicenses > 0 && (
            <AlertStrip type="critical"
              icon={<IconIdentification className="w-4 h-4 text-red-600" />}
              message={`${stats.expiredLicenses} licencia${stats.expiredLicenses > 1 ? 's' : ''} vencida${stats.expiredLicenses > 1 ? 's' : ''} — acción requerida`}
            />
          )}
          {stats.expiredDocs > 0 && (
            <AlertStrip type="critical"
              icon={<IconDocument className="w-4 h-4 text-red-600" />}
              message={`${stats.expiredDocs} vehículo${stats.expiredDocs > 1 ? 's' : ''} con documentación vencida`}
            />
          )}
          {stats.late > 0 && (
            <AlertStrip type="warning"
              icon={<IconClock className="w-4 h-4 text-amber-600" />}
              message={`${stats.late} entrega${stats.late > 1 ? 's' : ''} fuera de plazo`}
            />
          )}
          {stats.soonLicenses > 0 && (
            <AlertStrip type="info"
              icon={<IconCalendar className="w-4 h-4 text-sky-600" />}
              message={`${stats.soonLicenses} licencia${stats.soonLicenses > 1 ? 's' : ''} vencen en 30 días`}
            />
          )}
          {stats.maintenance > 0 && (
            <AlertStrip type="info"
              icon={<IconWrench className="w-4 h-4 text-sky-600" />}
              message={`${stats.maintenance} vehículo${stats.maintenance > 1 ? 's' : ''} en mantenimiento`}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Utilización de Flota</p>
          <div className="flex items-center gap-4">
            <RingWithLabel pct={stats.utilizationPct} color="#f97316" textClass="text-orange-500" />
            <div className="flex-1 space-y-2 min-w-0">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">En uso</span>
                  <span className="font-bold text-orange-500">{stats.inUse}</span>
                </div>
                <MiniBar value={stats.inUse} max={stats.totalVehicles} color="#f97316" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Disponibles</span>
                  <span className="font-bold text-emerald-600">{stats.available}</span>
                </div>
                <MiniBar value={stats.available} max={stats.totalVehicles} color="#10b981" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Mantenimiento</span>
                  <span className="font-bold text-gray-500">{stats.maintenance}</span>
                </div>
                <MiniBar value={stats.maintenance} max={stats.totalVehicles} color="#9ca3af" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Tasa de Puntualidad</p>
          <div className="flex items-center gap-4">
            <RingWithLabel pct={stats.onTimePct} color={onTimeColor} textClass={onTimeTextClass} />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500">A tiempo</span>
                <span className="font-bold text-emerald-600">{stats.closed - stats.late}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500">Tardíos</span>
                <span className={`font-bold ${stats.late > 0 ? 'text-red-500' : 'text-gray-400'}`}>{stats.late}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500">Pendientes</span>
                <span className="font-bold text-amber-500">{stats.pending}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-gray-500">Total registros</span>
                <span className="font-bold text-gray-800">{stats.totalRecords}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Índice de Daños</p>
          <div className="flex items-center gap-4">
            <RingWithLabel pct={stats.damageRate} color={damageColor} textClass={damageTextClass} />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500">Con daño</span>
                <span className={`font-bold ${stats.withDamage > 0 ? 'text-red-500' : 'text-gray-400'}`}>{stats.withDamage}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500">Tickets activos</span>
                <span className={`font-bold ${stats.activeDamages > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{stats.activeDamages}</span>
              </div>
              <div className="flex justify-between text-xs py-1 border-b border-gray-50">
                <span className="text-gray-500">Conductores</span>
                <span className="font-bold text-gray-700">{stats.totalDrivers}</span>
              </div>
              <div className="flex justify-between text-xs py-1">
                <span className="text-gray-500">Lic. vencidas</span>
                <span className={`font-bold ${stats.expiredLicenses > 0 ? 'text-red-500' : 'text-gray-400'}`}>{stats.expiredLicenses}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Pendientes"    value={stats.pending}
          icon={<IconClock className="w-4 h-4" />}
          accent={stats.pending > 0 ? 'bg-amber-500' : 'bg-gray-300'} />
        <KpiCard label="Cerrados"      value={stats.closed}
          icon={<IconCheckCircle className="w-4 h-4" />}
          accent="bg-emerald-500" />
        <KpiCard label="Tardíos"       value={stats.late}
          icon={<IconAlertTriangle className="w-4 h-4" />}
          accent={stats.late > 0 ? 'bg-red-500' : 'bg-gray-300'} />
        <KpiCard label="Con Daño"      value={stats.withDamage}
          icon={<IconBolt className="w-4 h-4" />}
          accent={stats.withDamage > 0 ? 'bg-orange-500' : 'bg-gray-300'} />
        <KpiCard label="Disponibles"   value={stats.available}
          icon={<IconTruck className="w-4 h-4" />}
          accent="bg-sky-500" />
        <KpiCard label="Daños Activos" value={stats.activeDamages}
          icon={<IconExclamationCircle className="w-4 h-4" />}
          accent={stats.activeDamages > 0 ? 'bg-red-600' : 'bg-gray-300'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Actividad — Últimos 7 días</h3>
              <p className="text-xs text-gray-400 mt-0.5">Registros por día de entrega</p>
            </div>
            <div className="flex gap-3 text-xs text-gray-400 flex-shrink-0">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" />A tiempo</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Tardío</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" />Pendiente</span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-36">
            {last7.map(day => {
              const BAR_H  = 112;
              const totalH = (day.total / maxDay) * BAR_H;
              const lateH   = day.total > 0 ? (day.late    / day.total) * totalH : 0;
              const onTimeH = day.total > 0 ? (day.onTime  / day.total) * totalH : 0;
              const pendH   = day.total > 0 ? (day.pending / day.total) * totalH : 0;
              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  {day.total > 0 && <span className="text-xs font-bold text-gray-600">{day.total}</span>}
                  <div className="w-full flex flex-col justify-end" style={{ height: `${BAR_H}px` }}>
                    {day.total > 0 ? (
                      <div className="w-full overflow-hidden rounded-t-lg" style={{ height: `${totalH}px` }}>
                        {lateH   > 0 && <div className="w-full bg-red-400"    style={{ height: `${lateH}px` }} />}
                        {onTimeH > 0 && <div className="w-full bg-orange-400" style={{ height: `${onTimeH}px` }} />}
                        {pendH   > 0 && <div className="w-full bg-amber-300"  style={{ height: `${pendH}px` }} />}
                      </div>
                    ) : (
                      <div className="w-full bg-gray-100 rounded h-1" />
                    )}
                  </div>
                  <span className="text-xs text-gray-400 capitalize truncate w-full text-center leading-tight">{day.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Cumplimiento Operacional</h3>
            <p className="text-xs text-gray-400 mt-0.5">Estado de documentación y licencias</p>
          </div>
          <div className="space-y-3 flex-1">
            {[
              { label: 'Licencias vigentes', ok: stats.totalDrivers - stats.expiredLicenses, total: stats.totalDrivers, warn: stats.expiredLicenses, color: stats.expiredLicenses > 0 ? '#ef4444' : '#10b981' },
              { label: 'Documentos al día',  ok: stats.totalVehicles - stats.expiredDocs,   total: stats.totalVehicles, warn: stats.expiredDocs,   color: stats.expiredDocs > 0 ? '#ef4444' : '#10b981' },
              { label: 'Flota disponible',   ok: stats.available, total: stats.totalVehicles, warn: stats.inUse, color: '#f97316' },
            ].map(({ label, ok, total, warn, color }) => {
              const pct = total > 0 ? (ok / total) * 100 : 100;
              return (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-800">{ok}/{total}</span>
                      {warn > 0 && <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">-{warn}</span>}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900">{stats.totalVehicles}</p>
              <p className="text-xs text-gray-400">Vehículos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-extrabold text-gray-900">{stats.totalDrivers}</p>
              <p className="text-xs text-gray-400">Conductores</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-extrabold ${stats.activeDamages > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                {stats.activeDamages}
              </p>
              <p className="text-xs text-gray-400">Daños activos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-900">Resumen por Terminal</h3>
          <p className="text-xs text-gray-400 mt-0.5">Operatividad y movimientos por sede</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Terminal</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Flota</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Disponible</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden sm:table-cell">En Uso</th>
                <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden lg:table-cell w-36">Utilización</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Pendientes</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide hidden md:table-cell">Tardíos</th>
                <th className="text-center px-3 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">Movimientos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {terminalSummary.map(t => {
                const utilizColor = t.utilization > 0.8 ? '#ef4444' : t.utilization > 0.5 ? '#f97316' : '#10b981';
                return (
                  <tr key={t.terminal} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-gray-800 text-sm">{t.terminal}</span>
                      {t.maintenance > 0 && <span className="ml-2 text-xs text-gray-400 hidden sm:inline">({t.maintenance} mant.)</span>}
                    </td>
                    <td className="px-3 py-3.5 text-center"><span className="text-sm font-bold text-gray-700">{t.total}</span></td>
                    <td className="px-3 py-3.5 text-center hidden sm:table-cell">
                      <span className={`text-sm font-bold ${t.available > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{t.available}</span>
                    </td>
                    <td className="px-3 py-3.5 text-center hidden sm:table-cell">
                      <span className={`text-sm font-bold ${t.inUse > 0 ? 'text-orange-500' : 'text-gray-300'}`}>{t.inUse}</span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1"><MiniBar value={t.inUse} max={t.total} color={utilizColor} /></div>
                        <span className="text-xs font-semibold text-gray-500 w-8 text-right">{Math.round(t.utilization * 100)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      {t.pending > 0
                        ? <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{t.pending}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-center hidden md:table-cell">
                      {t.late > 0
                        ? <span className="bg-red-100 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full">{t.late}</span>
                        : <span className="text-gray-300 text-sm">—</span>}
                    </td>
                    <td className="px-3 py-3.5 text-center"><span className="text-sm font-bold text-gray-700">{t.totalRecords}</span></td>
                  </tr>
                );
              })}
              {terminalSummary.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">Sin datos para mostrar</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-50">
            <SectionHeader
              title="Entregas Pendientes"
              sub={`${stats.pending} registro${stats.pending !== 1 ? 's' : ''} activo${stats.pending !== 1 ? 's' : ''} en flota`}
              badge={stats.pending}
            />
          </div>
          <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: '320px' }}>
            {stats.pendingList.slice(0, 10).map(r => {
              const v = vehicleById[r.vehicleId];
              const d = driverById[r.driverId];
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-orange-500 text-sm">{r.folio}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full max-w-[130px] truncate">{r.terminal}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{v?.ppu || '—'} · {d?.nombre || '—'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-3">
                    <span className="text-xs text-gray-400">{formatDate(r.fecha)}</span>
                    <Badge status={r.status} />
                  </div>
                </div>
              );
            })}
            {stats.pendingList.length === 0 && (
              <div className="py-10 text-center text-gray-400">
                <IconCheckBadge className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">Sin entregas pendientes</p>
                <p className="text-xs mt-1">Toda la flota está en orden</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-50">
            <SectionHeader
              title="Tickets de Daño Activos"
              sub={`${stats.activeDamages} ticket${stats.activeDamages !== 1 ? 's' : ''} sin resolver`}
              badge={stats.activeDamages}
            />
          </div>
          <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: '320px' }}>
            {stats.recentDamagesList.map(dmg => {
              const v = vehicleById[dmg.vehicleId];
              const sevConf = {
                grave:    { cls: 'bg-red-100 text-red-700',     label: 'Grave' },
                moderado: { cls: 'bg-amber-100 text-amber-700', label: 'Moderado' },
                leve:     { cls: 'bg-yellow-100 text-yellow-700', label: 'Leve' },
              };
              const sev = sevConf[dmg.severidad] || sevConf.leve;
              return (
                <div key={dmg.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-700 text-sm">{dmg.ticket}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sev.cls}`}>{sev.label}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{v?.ppu || '—'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{dmg.zona || dmg.descripcion || 'Sin descripción'}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-3">{formatDate(dmg.lastObservedAt || dmg.createdAt)}</span>
                </div>
              );
            })}
            {stats.activeDamages === 0 && (
              <div className="py-10 text-center text-gray-400">
                <IconShield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-semibold text-gray-500">Sin daños activos</p>
                <p className="text-xs mt-1">La flota se encuentra en buen estado</p>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
