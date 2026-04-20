import { useState, useMemo } from 'react';
import { driversService } from '../services/storage';
import { useTerminal } from '../hooks/useData';
import { TERMINALS } from '../constants';
import { isLicenseExpired, formatDate } from '../utils/helpers';

const EMPTY_FORM = {
  nombre: '', rut: '', licencia: 'A3', vencimiento_licencia: '',
  telefono: '', terminal: '',
};

export default function Drivers() {
  const { terminal } = useTerminal();
  const [filterTerminal, setFilterTerminal] = useState(terminal || '');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM, terminal: terminal || '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [reload, setReload] = useState(0);

  const allDrivers = useMemo(() => driversService.getAll().filter(d => d.active !== false), [reload]);

  const filtered = useMemo(() => {
    return allDrivers.filter(d => {
      if (filterTerminal && d.terminal !== filterTerminal) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [d.nombre, d.rut, d.licencia, d.terminal].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allDrivers, filterTerminal, search]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido';
    if (!form.rut.trim()) e.rut = 'RUT requerido';
    if (!form.licencia) e.licencia = 'Tipo licencia requerido';
    if (!form.terminal) e.terminal = 'Terminal requerida';
    if (!form.vencimiento_licencia) e.vencimiento_licencia = 'Vencimiento de licencia requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editing) {
      driversService.update(editing.id, form);
    } else {
      driversService.save(form);
    }
    setReload(r => r + 1);
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM, terminal: terminal || '' });
    setErrors({});
  };

  const handleEdit = (d) => {
    setForm({ ...d });
    setEditing(d);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = (d) => {
    if (!confirm(`¿Desactivar conductor ${d.nombre}?`)) return;
    driversService.deactivate(d.id);
    setReload(r => r + 1);
  };

  const expiredCount = filtered.filter(d => isLicenseExpired(d.vencimiento_licencia)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Conductores</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ ...EMPTY_FORM, terminal: terminal || '' }); setErrors({}); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
        >
          + Nuevo
        </button>
      </div>

      {expiredCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          <strong>{expiredCount}</strong> conductor(es) con licencia vencida
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-500 px-4 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">{editing ? 'Editar Conductor' : 'Nuevo Conductor'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-white/80 hover:text-white text-xl">×</button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre completo" error={errors.nombre}>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={`input-field ${errors.nombre ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="RUT" error={errors.rut}>
              <input value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" className={`input-field ${errors.rut ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="Tipo Licencia" error={errors.licencia}>
              <select value={form.licencia} onChange={e => set('licencia', e.target.value)} className={`select-field ${errors.licencia ? 'border-red-400' : ''}`}>
                {['A1', 'A2', 'A3', 'A4', 'A5', 'B', 'C', 'D', 'E', 'F'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Vencimiento Licencia" error={errors.vencimiento_licencia}>
              <input type="date" value={form.vencimiento_licencia} onChange={e => set('vencimiento_licencia', e.target.value)} className={`input-field ${errors.vencimiento_licencia ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="Teléfono">
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56912345678" className="input-field" />
            </Field>
            <Field label="Terminal" error={errors.terminal}>
              <select value={form.terminal} onChange={e => set('terminal', e.target.value)} className={`select-field ${errors.terminal ? 'border-red-400' : ''}`}>
                <option value="">Seleccionar...</option>
                {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
          <div className="px-4 pb-4 flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium">
              {editing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={filterTerminal} onChange={e => setFilterTerminal(e.target.value)} className="select-field">
            <option value="">Todas las terminales</option>
            {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, RUT..." className="input-field" />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No se encontraron conductores</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => {
            const expired = isLicenseExpired(d.vencimiento_licencia);
            return (
              <div key={d.id} className={`bg-white rounded-xl border shadow-sm p-4 ${expired ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{d.nombre}</p>
                      {expired && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          Licencia vencida
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5 text-sm text-gray-500">
                      <p>RUT: {d.rut} • Licencia: {d.licencia}</p>
                      <p>Vencimiento: <span className={expired ? 'text-red-600 font-medium' : ''}>{formatDate(d.vencimiento_licencia)}</span></p>
                      {d.telefono && <p>Tel: {d.telefono}</p>}
                      <p className="text-xs text-orange-600">{d.terminal}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button onClick={() => handleEdit(d)} className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium">Editar</button>
                    <button onClick={() => handleDeactivate(d)} className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium">Desactivar</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, error }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
