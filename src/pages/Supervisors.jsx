import { useState, useMemo } from 'react';
import { supervisorsService } from '../services/storage';
import { useTerminal } from '../hooks/useData';
import { TERMINALS } from '../constants';

const EMPTY_FORM = { nombre: '', rut: '', cargo: '', telefono: '', terminal: '' };

export default function Supervisors() {
  const { terminal } = useTerminal();
  const [filterTerminal, setFilterTerminal] = useState(terminal || '');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM, terminal: terminal || '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [reload, setReload] = useState(0);

  const allSupervisors = useMemo(() => supervisorsService.getAll().filter(s => s.active !== false), [reload]);

  const filtered = useMemo(() => {
    return allSupervisors.filter(s => {
      if (filterTerminal && s.terminal !== filterTerminal) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [s.nombre, s.rut, s.cargo, s.terminal].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allSupervisors, filterTerminal, search]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Nombre requerido';
    if (!form.rut.trim()) e.rut = 'RUT requerido';
    if (!form.terminal) e.terminal = 'Terminal requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editing) {
      supervisorsService.update(editing.id, form);
    } else {
      supervisorsService.save(form);
    }
    setReload(r => r + 1);
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM, terminal: terminal || '' });
    setErrors({});
  };

  const handleEdit = (s) => {
    setForm({ ...s });
    setEditing(s);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = (s) => {
    if (!confirm(`¿Desactivar supervisor ${s.nombre}?`)) return;
    supervisorsService.deactivate(s.id);
    setReload(r => r + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Supervisores</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ ...EMPTY_FORM, terminal: terminal || '' }); setErrors({}); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
        >
          + Nuevo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-500 px-4 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">{editing ? 'Editar Supervisor' : 'Nuevo Supervisor'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-white/80 hover:text-white text-xl">×</button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Nombre completo</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={`input-field ${errors.nombre ? 'border-red-400' : ''}`} />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <label className="label-field">RUT</label>
              <input value={form.rut} onChange={e => set('rut', e.target.value)} placeholder="12.345.678-9" className={`input-field ${errors.rut ? 'border-red-400' : ''}`} />
              {errors.rut && <p className="text-xs text-red-500 mt-1">{errors.rut}</p>}
            </div>
            <div>
              <label className="label-field">Cargo</label>
              <input value={form.cargo} onChange={e => set('cargo', e.target.value)} placeholder="Supervisor de Flota" className="input-field" />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+56912345678" className="input-field" />
            </div>
            <div className="sm:col-span-2">
              <label className="label-field">Terminal</label>
              <select value={form.terminal} onChange={e => set('terminal', e.target.value)} className={`select-field ${errors.terminal ? 'border-red-400' : ''}`}>
                <option value="">Seleccionar...</option>
                {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.terminal && <p className="text-xs text-red-500 mt-1">{errors.terminal}</p>}
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

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={filterTerminal} onChange={e => setFilterTerminal(e.target.value)} className="select-field">
            <option value="">Todas las terminales</option>
            {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, cargo..." className="input-field" />
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No se encontraron supervisores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.nombre}</p>
                  <p className="text-sm text-gray-500">RUT: {s.rut}</p>
                  {s.cargo && <p className="text-sm text-gray-500">{s.cargo}</p>}
                  {s.telefono && <p className="text-xs text-gray-400">{s.telefono}</p>}
                  <p className="text-xs text-orange-600 mt-1">{s.terminal}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button onClick={() => handleEdit(s)} className="px-3 py-1.5 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium whitespace-nowrap">Editar</button>
                  <button onClick={() => handleDeactivate(s)} className="px-3 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium whitespace-nowrap">Desactivar</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
