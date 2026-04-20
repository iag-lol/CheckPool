import { useState, useMemo } from 'react';
import { docsService, vehiclesService } from '../services/storage';
import { useTerminal } from '../hooks/useData';
import { TERMINALS } from '../constants';
import { isDocExpired, formatDate } from '../utils/helpers';
import { getExpirationInfo } from '../utils/documentation';

const EMPTY_FORM = {
  vehicleId: '', padron_vencimiento: '', permiso_circulacion_vencimiento: '',
  soap_vencimiento: '', cert_rt_vencimiento: '', cert_gases_vencimiento: '',
  tag_numero: '', revision_tecnica: '', observaciones: '',
};

export default function Documentation() {
  const { terminal } = useTerminal();
  const [filterTerminal, setFilterTerminal] = useState(terminal || '');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [reload, setReload] = useState(0);

  const allDocs = useMemo(() => docsService.getAll().filter(d => d.active !== false), [reload]);
  const vehicles = useMemo(() => vehiclesService.getAll().filter(v => v.active !== false), [reload]);
  const vehiclesById = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const activeVehicleIds = useMemo(() => new Set(vehicles.map(v => v.id)), [vehicles]);

  const filtered = useMemo(() => {
    return allDocs.filter(d => {
      if (!activeVehicleIds.has(d.vehicleId)) return false;
      if (!filterTerminal) return true;
      const v = vehiclesById.get(d.vehicleId);
      return v?.terminal === filterTerminal;
    });
  }, [allDocs, activeVehicleIds, filterTerminal, vehiclesById]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.vehicleId) e.vehicleId = 'Selecciona vehículo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editing) {
      docsService.update(editing.id, form);
    } else {
      // Check if docs exist for this vehicle
      const existing = docsService.getByVehicle(form.vehicleId);
      if (existing) {
        docsService.update(existing.id, form);
      } else {
        docsService.save(form);
      }
    }
    setReload(r => r + 1);
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
  };

  const handleEdit = (d) => {
    setForm({ ...d });
    setEditing(d);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = (d) => {
    const v = vehiclesService.getById(d.vehicleId);
    if (!confirm(`¿Eliminar documentación del vehículo ${v?.ppu}?`)) return;
    docsService.deactivate(d.id);
    setReload(r => r + 1);
  };

  const getExpirationStatus = (dateStr) => {
    return getExpirationInfo(dateStr).status;
  };

  const dateClass = (dateStr) => {
    const s = getExpirationStatus(dateStr);
    if (s === 'vencido') return 'text-red-600 font-semibold';
    if (s === 'por_vencer') return 'text-orange-500 font-semibold';
    if (s === 'sin_fecha') return 'text-red-500 font-semibold';
    return 'text-gray-600';
  };

  const availableVehicles = useMemo(() => {
    const scopeTerminal = filterTerminal || terminal || '';
    const scopedVehicles = scopeTerminal ? vehicles.filter(v => v.terminal === scopeTerminal) : vehicles;
    if (editing) return scopedVehicles;
    const withDocs = new Set(allDocs.map(d => d.vehicleId));
    return scopedVehicles.filter(v => !withDocs.has(v.id));
  }, [vehicles, allDocs, editing, filterTerminal, terminal]);

  const expiredDocs = filtered.filter(d => {
    if (!activeVehicleIds.has(d.vehicleId)) return false;
    const fields = ['padron_vencimiento', 'permiso_circulacion_vencimiento', 'soap_vencimiento', 'cert_rt_vencimiento', 'cert_gases_vencimiento', 'revision_tecnica'];
    return fields.some(f => isDocExpired(d[f]));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Documentación Vehicular</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ ...EMPTY_FORM }); setErrors({}); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
        >
          + Agregar
        </button>
      </div>

      {expiredDocs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-sm text-red-700 font-medium">
            {expiredDocs.length} vehículo(s) con documentos vencidos
          </p>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-500 px-4 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">{editing ? 'Editar Documentación' : 'Nueva Documentación'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-white/80 hover:text-white text-xl">×</button>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="label-field">Vehículo *</label>
              <select value={form.vehicleId} onChange={e => set('vehicleId', e.target.value)} className={`select-field ${errors.vehicleId ? 'border-red-400' : ''}`}>
                <option value="">Seleccionar vehículo...</option>
                {(editing ? vehicles : availableVehicles).map(v => (
                  <option key={v.id} value={v.id}>{v.ppu} — {v.marca} {v.modelo} ({v.terminal})</option>
                ))}
              </select>
              {errors.vehicleId && <p className="text-xs text-red-500 mt-1">{errors.vehicleId}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'padron_vencimiento', label: 'Vencimiento Padrón' },
                { key: 'permiso_circulacion_vencimiento', label: 'Permiso Circulación Venc.' },
                { key: 'soap_vencimiento', label: 'Vencimiento SOAP' },
                { key: 'cert_rt_vencimiento', label: 'Cert. RT Vencimiento' },
                { key: 'cert_gases_vencimiento', label: 'Cert. Gases Vencimiento' },
                { key: 'revision_tecnica', label: 'Revisión Técnica Venc.' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label-field">{label}</label>
                  <input type="date" value={form[key] || ''} onChange={e => set(key, e.target.value)} className="input-field" />
                </div>
              ))}
              <div>
                <label className="label-field">N° TAG</label>
                <input value={form.tag_numero || ''} onChange={e => set('tag_numero', e.target.value)} className="input-field" />
              </div>
            </div>

            <div>
              <label className="label-field">Observaciones</label>
              <textarea value={form.observaciones || ''} onChange={e => set('observaciones', e.target.value)} rows={2} className="input-field resize-none" />
            </div>
          </div>
          <div className="px-4 pb-4 flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">
              {editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <select value={filterTerminal} onChange={e => setFilterTerminal(e.target.value)} className="select-field max-w-xs">
          <option value="">Todas las terminales</option>
          {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No hay documentación registrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const v = vehiclesById.get(d.vehicleId);
            if (!v) return null;
            const docFields = [
              { key: 'padron_vencimiento', label: 'Padrón' },
              { key: 'permiso_circulacion_vencimiento', label: 'Perm. Circ.' },
              { key: 'soap_vencimiento', label: 'SOAP' },
              { key: 'cert_rt_vencimiento', label: 'Cert. RT' },
              { key: 'cert_gases_vencimiento', label: 'Cert. Gases' },
              { key: 'revision_tecnica', label: 'Rev. Técnica' },
            ];
            const hasExpired = docFields.some(f => isDocExpired(d[f.key]));

            return (
              <div key={d.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${hasExpired ? 'border-red-200' : 'border-gray-200'}`}>
                <div className={`px-4 py-2 flex justify-between items-center ${hasExpired ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div>
                    <span className="font-bold text-gray-900">{v?.ppu}</span>
                    <span className="text-sm text-gray-500 ml-2">{v?.marca} {v?.modelo}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(d)} className="px-2 py-1 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100">Editar</button>
                    <button onClick={() => handleDeactivate(d)} className="px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100">Eliminar</button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {docFields.map(({ key, label }) => {
                      const info = getExpirationInfo(d[key]);
                      return (
                      <div key={key} className="text-xs">
                        <span className="text-gray-400">{label}: </span>
                        <span className={dateClass(d[key])}>
                          {d[key] ? formatDate(d[key]) : 'Sin fecha'}
                        </span>
                        {info.status === 'vencido' && <span className="ml-1 text-red-600 font-bold">VENCIDO</span>}
                        {info.status === 'por_vencer' && (
                          <span className="ml-1 text-orange-600 font-bold">
                            {info.daysRemaining === 0 ? 'VENCE HOY' : `${info.daysRemaining}D`}
                          </span>
                        )}
                      </div>
                      );
                    })}
                  </div>
                  {d.tag_numero && <p className="text-xs text-gray-500 mt-2">TAG: {d.tag_numero}</p>}
                  {d.observaciones && <p className="text-xs text-gray-500 mt-1">{d.observaciones}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
