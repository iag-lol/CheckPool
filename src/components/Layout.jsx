import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTerminal } from '../hooks/useData';

const NAV_GROUPS = [
  {
    label: 'Operaciones',
    items: [
      { path: '/', label: 'Inicio', exact: true, icon: HomeIcon },
      { path: '/nueva-entrega', label: 'Nueva Entrega', icon: TruckIcon },
      { path: '/cerrar-recepcion', label: 'Cerrar Recepción', icon: CheckCircleIcon },
      { path: '/dashboard', label: 'Dashboard', icon: ChartIcon },
    ],
  },
  {
    label: 'Registros',
    items: [
      { path: '/registros', label: 'Historial', icon: DocumentsIcon },
    ],
  },
  {
    label: 'Maestros',
    items: [
      { path: '/vehiculos', label: 'Vehículos', icon: CarIcon },
      { path: '/conductores', label: 'Conductores', icon: PersonIcon },
      { path: '/supervisores', label: 'Supervisores', icon: BadgeIcon },
      { path: '/documentacion', label: 'Documentación', icon: FileIcon },
    ],
  },
];

// ── Icons ──
function HomeIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function TruckIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1 1h8l1-1zM13 6h3l3 5v4h-6V6z" /></svg>;
}
function CheckCircleIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function DocumentsIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
}
function ChartIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function CarIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 17a2 2 0 11-4 0 2 2 0 014 0zm12 0a2 2 0 11-4 0 2 2 0 014 0zM6 9l2-4h8l2 4M4 11h16v6H4z" /></svg>;
}
function PersonIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
}
function BadgeIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" /></svg>;
}
function FileIcon({ size = 18 }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
}
function MenuIcon() {
  return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>;
}
function ChevronRight() {
  return <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>;
}

// All flat nav for mobile bottom bar (just top items)
const MOBILE_NAV = [
  { path: '/', label: 'Inicio', icon: HomeIcon, exact: true },
  { path: '/nueva-entrega', label: 'Entrega', icon: TruckIcon },
  { path: '/cerrar-recepcion', label: 'Recepción', icon: CheckCircleIcon },
  { path: '/registros', label: 'Historial', icon: DocumentsIcon },
  { path: '/dashboard', label: 'Dashboard', icon: ChartIcon },
];

function getPageTitle(location) {
  const all = NAV_GROUPS.flatMap(g => g.items);
  return all.find(n => n.exact ? location.pathname === n.path : location.pathname.startsWith(n.path))?.label || 'CHECK-POOL';
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { terminal, clearTerminal } = useTerminal();
  const navigate = useNavigate();
  const location = useLocation();

  const handleChangeTerminal = () => {
    clearTerminal();
    navigate('/');
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col transform transition-transform duration-250 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/60">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l1 1h8l1-1zM13 6h3l3 5v4h-6V6z" />
            </svg>
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-none">CHECK-POOL</h1>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Gestión de Flota Vehicular</p>
          </div>
        </div>

        {/* Terminal badge */}
        {terminal ? (
          <div className="mx-4 mt-4 rounded-xl overflow-hidden border border-orange-500/25"
            style={{ background: 'rgba(249,115,22,0.12)' }}>
            <div className="px-3.5 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                  <span className="text-[10px] text-orange-300 font-semibold uppercase tracking-widest">Terminal activa</span>
                </div>
                <button onClick={handleChangeTerminal} className="text-[10px] text-orange-400 hover:text-orange-200 underline transition-colors">
                  Cambiar
                </button>
              </div>
              <p className="text-orange-100 text-sm font-bold mt-1 truncate">{terminal}</p>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-4 px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
            <p className="text-amber-300 text-xs font-medium">Sin terminal seleccionada</p>
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 py-4 overflow-y-auto space-y-1 px-2">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path);
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                      isActive
                        ? 'bg-orange-500/20 text-orange-300 nav-active'
                        : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                    }`}
                  >
                    <span className={isActive ? 'text-orange-400' : ''}><Icon size={17} /></span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight />}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-xs text-slate-500 font-medium">v1.0.0 — Operativo</p>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">

        {/* Top bar */}
        <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all lg:hidden"
          >
            <MenuIcon />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="hidden sm:block text-slate-400 text-xs font-medium">CHECK-POOL</span>
            <span className="hidden sm:block text-slate-300 text-xs">/</span>
            <span className="font-bold text-slate-800 text-sm sm:text-base truncate">
              {getPageTitle(location)}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {terminal && (
              <span className="hidden sm:inline-flex items-center gap-1.5 border border-orange-200 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                {terminal}
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 animate-fade-in">
          {children}
        </main>

        {/* ── Mobile bottom nav ── */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg pb-safe">
          <div className="flex items-center">
            {MOBILE_NAV.map(item => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.path
                : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-all ${
                    isActive ? 'text-orange-500' : 'text-slate-400'
                  }`}
                >
                  <Icon size={20} />
                  <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-orange-500' : 'text-slate-400'}`}>{item.label}</span>
                  {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-orange-500 rounded-t-full" />}
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
