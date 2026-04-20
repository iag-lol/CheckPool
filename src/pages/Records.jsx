import { useState, useMemo } from 'react';
import { recordsService, vehiclesService, driversService } from '../services/storage';
import { useTerminal } from '../hooks/useData';
import { formatDate, formatDuration, calcTimeUse } from '../utils/helpers';
import Badge from '../components/Badge';
import RecordModal from '../components/RecordModal';
import PDFExport from '../components/PDFExport';
import { TERMINALS } from '../constants';

export default function Records() {
  const { terminal } = useTerminal();
  const [filterTerminal, setFilterTerminal] = useState(terminal || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [reload, setReload] = useState(0);

  const allRecords = useMemo(() => recordsService.getAll(), [reload]);

  const filtered = useMemo(() => {
    return allRecords.filter(r => {
      if (filterTerminal && r.terminal !== filterTerminal) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterDateFrom && r.fecha < filterDateFrom) return false;
      if (filterDateTo && r.fecha > filterDateTo) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        const v = vehiclesService.getById(r.vehicleId);
        const d = driversService.getById(r.driverId);
        const haystack = [r.folio, v?.ppu, v?.marca, v?.modelo, d?.nombre, d?.rut, r.terminal, r.status].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allRecords, filterTerminal, filterStatus, filterSearch, filterDateFrom, filterDateTo]);

  const handleDeactivate = (record) => {
    if (!confirm(`¿Desactivar registro ${record.folio}?`)) return;
    recordsService.deactivate(record.id);
    setReload(r => r + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Registros</h2>
        <span className="text-sm text-gray-500">{filtered.length} resultado(s)</span>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="label-field">Terminal</label>
            <select value={filterTerminal} onChange={e => setFilterTerminal(e.target.value)} className="select-field">
              <option value="">Todas</option>
              {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Estado</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-field">
              <option value="">Todos</option>
              {['PENDIENTE', 'CERRADO', 'TARDÍO', 'CON DAÑO', 'TARDÍO CON DAÑO'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-field">Buscar</label>
            <input
              type="text"
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              placeholder="Folio, PPU, conductor..."
              className="input-field"
            />
          </div>
          <div>
            <label className="label-field">Fecha desde</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-field">Fecha hasta</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="input-field" />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilterTerminal(terminal || ''); setFilterStatus(''); setFilterSearch(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="w-full py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Table / Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No se encontraron registros</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Folio</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Terminal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Vehículo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Conductor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tiempo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(record => {
                    const v = vehiclesService.getById(record.vehicleId);
                    const d = driversService.getById(record.driverId);
                    const recp = record.receptionData || {};
                    const del = record.deliveryData || {};
                    const timeUse = del.hora_retiro && recp.hora_devolucion
                      ? calcTimeUse(del.hora_retiro, recp.hora_devolucion) : null;

                    return (
                      <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-orange-600">{record.folio}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{record.terminal}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{v?.ppu || '—'}</div>
                          <div className="text-xs text-gray-400">{v?.marca} {v?.modelo}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{d?.nombre || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(record.fecha)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {timeUse ? formatDuration(timeUse.hours, timeUse.minutes) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge status={record.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelected(record)}
                              className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                            >
                              Ver
                            </button>
                            <PDFExport record={record} />
                            <button
                              onClick={() => handleDeactivate(record)}
                              className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
                            >
                              Desactivar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(record => {
              const v = vehiclesService.getById(record.vehicleId);
              const d = driversService.getById(record.driverId);
              return (
                <div key={record.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-orange-600">{record.folio}</span>
                      <span className="text-xs text-gray-400 ml-2">{formatDate(record.fecha)}</span>
                    </div>
                    <Badge status={record.status} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{v?.ppu} — {v?.marca} {v?.modelo}</p>
                  <p className="text-xs text-gray-500">{d?.nombre}</p>
                  <p className="text-xs text-gray-400 mt-1">{record.terminal}</p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setSelected(record)} className="flex-1 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Ver</button>
                    <PDFExport record={record} />
                    <button onClick={() => handleDeactivate(record)} className="flex-1 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100">Desactivar</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {selected && <RecordModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
