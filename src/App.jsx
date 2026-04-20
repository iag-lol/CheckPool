import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { initializeAppData } from './services/storage';
import Layout from './components/Layout';
import Home from './pages/Home';
import NewDelivery from './pages/NewDelivery';
import CloseReception from './pages/CloseReception';
import Records from './pages/Records';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Supervisors from './pages/Supervisors';
import Documentation from './pages/Documentation';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [boot, setBoot] = useState({ loading: true, error: null });
  const routerBasename = import.meta.env.BASE_URL === '/'
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, '');

  useEffect(() => {
    let cancelled = false;
    initializeAppData()
      .then(result => {
        if (!cancelled) setBoot({ loading: false, error: null, mode: result.mode });
      })
      .catch(error => {
        console.error(error);
        if (!cancelled) setBoot({ loading: false, error });
      });
    return () => { cancelled = true; };
  }, []);

  if (boot.loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 py-5 text-center">
          <div className="h-8 w-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Conectando datos...</p>
        </div>
      </div>
    );
  }

  if (boot.error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg bg-white border border-red-200 rounded-2xl shadow-sm p-6">
          <h1 className="text-lg font-bold text-red-700 mb-2">No se pudo conectar a Supabase</h1>
          <p className="text-sm text-slate-600">
            Revisa `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y que el SQL del proyecto esté ejecutado.
          </p>
          <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-red-50 p-3 text-xs text-red-700">
            {boot.error.message}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter basename={routerBasename}>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/nueva-entrega" element={<Layout><NewDelivery /></Layout>} />
        <Route path="/cerrar-recepcion" element={<Layout><CloseReception /></Layout>} />
        <Route path="/registros" element={<Layout><Records /></Layout>} />
        <Route path="/vehiculos" element={<Layout><Vehicles /></Layout>} />
        <Route path="/conductores" element={<Layout><Drivers /></Layout>} />
        <Route path="/supervisores" element={<Layout><Supervisors /></Layout>} />
        <Route path="/documentacion" element={<Layout><Documentation /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}
