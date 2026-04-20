import { useState, useMemo } from 'react';
import { vehiclesService, damagesService } from '../services/storage';
import { useTerminal } from '../hooks/useData';
import { TERMINALS, VEHICLE_TYPES, FUEL_TYPES } from '../constants';
import Badge from '../components/Badge';

const EMPTY_FORM = {
  ppu: '', marca: '', modelo: '', anio: '', tipo: 'Furgón',
  combustible: 'Diesel', color: '', km: '', terminal: '', status: 'disponible',
};

export default function Vehicles() {
  const { terminal } = useTerminal();
  const [filterTerminal, setFilterTerminal] = useState(terminal || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM, terminal: terminal || '' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [reload, setReload] = useState(0);

  const allVehicles = useMemo(() => vehiclesService.getAll(), [reload]);

  const filtered = useMemo(() => {
    return allVehicles.filter(v => {
      if (filterTerminal && v.terminal !== filterTerminal) return false;
      if (filterStatus && v.status !== filterStatus) return false;
      if (v.active === false) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = [v.ppu, v.marca, v.modelo, v.terminal, v.tipo].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allVehicles, filterTerminal, filterStatus, search]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.ppu.trim()) e.ppu = 'PPU requerida';
    if (!form.marca.trim()) e.marca = 'Marca requerida';
    if (!form.modelo.trim()) e.modelo = 'Modelo requerido';
    if (!form.anio) e.anio = 'Año requerido';
    if (!form.terminal) e.terminal = 'Terminal requerida';
    if (!form.km && form.km !== 0) e.km = 'Kilometraje requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editing) {
      vehiclesService.update(editing.id, form);
    } else {
      vehiclesService.save(form);
    }
    setReload(r => r + 1);
    setShowForm(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM, terminal: terminal || '' });
    setErrors({});
  };

  const handleEdit = (v) => {
    setForm({ ...v });
    setEditing(v);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeactivate = (v) => {
    if (!confirm(`¿Desactivar vehículo ${v.ppu}?`)) return;
    vehiclesService.deactivate(v.id);
    setReload(r => r + 1);
  };

  const getDamageCount = (vehicleId) => {
    return damagesService.getByVehicle(vehicleId).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Vehículos</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setForm({ ...EMPTY_FORM, terminal: terminal || '' }); setErrors({}); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600"
        >
          <span>+</span> Nuevo vehículo
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-orange-500 px-4 py-3 flex justify-between items-center">
            <h3 className="text-white font-semibold text-sm">{editing ? 'Editar Vehículo' : 'Nuevo Vehículo'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-white/80 hover:text-white text-xl leading-none">×</button>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="PPU" error={errors.ppu}>
              <input value={form.ppu} onChange={e => set('ppu', e.target.value.toUpperCase())} placeholder="AAAA-00" className={`input-field ${errors.ppu ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="Terminal" error={errors.terminal}>
              <select value={form.terminal} onChange={e => set('terminal', e.target.value)} className={`select-field ${errors.terminal ? 'border-red-400' : ''}`}>
                <option value="">Seleccionar...</option>
                {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Marca" error={errors.marca}>
              <input value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Mercedes-Benz" className={`input-field ${errors.marca ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="Modelo" error={errors.modelo}>
              <input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Sprinter" className={`input-field ${errors.modelo ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="Año" error={errors.anio}>
              <input type="number" value={form.anio} onChange={e => set('anio', e.target.value)} placeholder="2023" min="1990" max="2030" className={`input-field ${errors.anio ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="KM Actual" error={errors.km}>
              <input type="number" value={form.km} onChange={e => set('km', e.target.value)} placeholder="0" min="0" className={`input-field ${errors.km ? 'border-red-400' : ''}`} />
            </Field>
            <Field label="Tipo">
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className="select-field">
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Combustible">
              <select value={form.combustible} onChange={e => set('combustible', e.target.value)} className="select-field">
                {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Color">
              <input value={form.color} onChange={e => set('color', e.target.value)} placeholder="Blanco" className="input-field" />
            </Field>
            <Field label="Estado">
              <select value={form.status} onChange={e => set('status', e.target.value)} className="select-field">
                <option value="disponible">Disponible</option>
                <option value="en_uso">En Uso</option>
                <option value="mantenimiento">Mantenimiento</option>
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={filterTerminal} onChange={e => setFilterTerminal(e.target.value)} className="select-field">
            <option value="">Todas las terminales</option>
            {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-field">
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="en_uso">En Uso</option>
            <option value="mantenimiento">Mantenimiento</option>
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar PPU, marca..." className="input-field" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Disponibles', count: filtered.filter(v => v.status === 'disponible').length, color: 'text-green-600 bg-green-50' },
          { label: 'En Uso', count: filtered.filter(v => v.status === 'en_uso').length, color: 'text-blue-600 bg-blue-50' },
          { label: 'Mantenimiento', count: filtered.filter(v => v.status === 'mantenimiento').length, color: 'text-gray-600 bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-400">No se encontraron vehículos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => {
            const dmg = getDamageCount(v.id);
            return (
              <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className={`h-2 ${v.status === 'disponible' ? 'bg-green-500' : v.status === 'en_uso' ? 'bg-blue-500' : 'bg-gray-400'}`} />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg text-gray-900">{v.ppu}</p>
                      <p className="text-sm text-gray-600">{v.marca} {v.modelo}</p>
                    </div>
                    <Badge status={v.status} />
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>{v.tipo} • {v.combustible} • {v.anio}</p>
                    <p>Color: {v.color || '—'}</p>
                    <p>KM: {v.km?.toLocaleString() || '—'}</p>
                    <p className="text-xs text-orange-600 truncate">{v.terminal}</p>
                    {dmg > 0 && (
                      <p className="text-red-600 font-medium">{dmg} daño(s) activo(s)</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleEdit(v)} className="flex-1 py-1.5 text-xs bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 font-medium">Editar</button>
                    <button onClick={() => handleDeactivate(v)} className="flex-1 py-1.5 text-xs bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium">Desactivar</button>
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
      <label className="label-field">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
