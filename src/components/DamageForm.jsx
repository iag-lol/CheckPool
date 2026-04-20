import { useState } from 'react';
import PhotoUpload from './PhotoUpload';
import { generateId } from '../utils/helpers';

const DAMAGE_ZONES = [
  'Frontal', 'Lateral Izquierdo', 'Lateral Derecho', 'Trasero',
  'Techo', 'Paragolpes', 'Espejo', 'Vidrio', 'Interior', 'Mecánico', 'Otro'
];

const SEVERITY = [
  { value: 'leve', label: 'Leve', color: 'text-yellow-700 bg-yellow-50 border-yellow-300' },
  { value: 'moderado', label: 'Moderado', color: 'text-orange-700 bg-orange-50 border-orange-300' },
  { value: 'grave', label: 'Grave', color: 'text-red-700 bg-red-50 border-red-300' },
];

export default function DamageForm({ onDamage, recordId }) {
  const [enabled, setEnabled] = useState(false);
  const [damages, setDamages] = useState([]);
  const [current, setCurrent] = useState({ zona: '', severidad: '', descripcion: '', fotos: [] });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!current.zona) e.zona = 'Selecciona zona afectada';
    if (!current.severidad) e.severidad = 'Selecciona severidad';
    if (!current.descripcion.trim()) e.descripcion = 'Descripción requerida';
    if (current.fotos.length === 0) e.fotos = 'Se requiere al menos una foto del daño';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addDamage = () => {
    if (!validate()) return;
    const newDamage = { ...current, id: generateId(), recordId };
    const updated = [...damages, newDamage];
    setDamages(updated);
    setCurrent({ zona: '', severidad: '', descripcion: '', fotos: [] });
    setErrors({});
    onDamage(updated);
  };

  const removeDamage = (id) => {
    const updated = damages.filter(d => d.id !== id);
    setDamages(updated);
    onDamage(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-orange-500' : 'bg-gray-300'}`}
            onClick={() => {
              setEnabled(!enabled);
              if (enabled) { setDamages([]); onDamage([]); }
            }}
          >
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm font-medium text-gray-700">Registrar daño(s)</span>
        </label>
      </div>

      {enabled && (
        <div className="border border-orange-200 rounded-xl p-4 bg-orange-50 space-y-4">
          {/* Existing damages */}
          {damages.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Daños registrados ({damages.length})</h4>
              {damages.map(d => (
                <div key={d.id} className="flex items-start justify-between bg-white p-3 rounded-lg border border-red-200">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-800">{d.zona}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        SEVERITY.find(s => s.value === d.severidad)?.color || ''
                      }`}>
                        {SEVERITY.find(s => s.value === d.severidad)?.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{d.descripcion}</p>
                    {d.fotos.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {d.fotos.slice(0, 3).map((f, i) => (
                          <img key={i} src={f} alt="" className="w-10 h-10 object-cover rounded" />
                        ))}
                        {d.fotos.length > 3 && (
                          <span className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                            +{d.fotos.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDamage(d.id)}
                    className="text-red-400 hover:text-red-600 ml-2 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New damage form */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">Agregar daño</h4>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zona afectada *</label>
              <select
                value={current.zona}
                onChange={e => setCurrent({ ...current, zona: e.target.value })}
                className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.zona ? 'border-red-400' : 'border-gray-300'}`}
              >
                <option value="">Seleccionar zona...</option>
                {DAMAGE_ZONES.map(z => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
              {errors.zona && <p className="text-xs text-red-500 mt-1">{errors.zona}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Severidad *</label>
              <div className="flex gap-2">
                {SEVERITY.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setCurrent({ ...current, severidad: s.value })}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                      current.severidad === s.value ? s.color + ' ring-1 ring-offset-1 ring-current' : 'bg-white border-gray-300 text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {errors.severidad && <p className="text-xs text-red-500 mt-1">{errors.severidad}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del daño *</label>
              <textarea
                value={current.descripcion}
                onChange={e => setCurrent({ ...current, descripcion: e.target.value })}
                rows={2}
                placeholder="Describe el daño en detalle..."
                className={`w-full border rounded-lg px-3 py-2 text-sm resize-none ${errors.descripcion ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion}</p>}
            </div>

            <div>
              <PhotoUpload
                label="Fotos del daño"
                required
                multiple
                initialPhotos={current.fotos}
                onPhotos={fotos => setCurrent({ ...current, fotos })}
              />
              {errors.fotos && <p className="text-xs text-red-500 mt-1">{errors.fotos}</p>}
            </div>

            <button
              type="button"
              onClick={addDamage}
              className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              + Agregar este daño
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
