import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTerminal } from '../hooks/useData';
import { vehiclesService, driversService, supervisorsService, recordsService, damagesService, docsService } from '../services/storage';
import { CHECKLIST_ITEMS } from '../constants';
import { generateFolio, todayStr, isLicenseExpired, formatDate, formatDateTime, isValidTime24 } from '../utils/helpers';
import { buildDefaultChecklist, buildChecklistFromActiveTickets, getBadChecklistEntries } from '../utils/checklist';
import { buildDocumentChecklistInfo } from '../utils/documentation';
import Checklist from '../components/Checklist';
import SignaturePad from '../components/SignaturePad';
import PhotoUpload from '../components/PhotoUpload';
import TerminalSelector from '../components/TerminalSelector';
import TimeInput from '../components/TimeInput';

const REQUIRED_PHOTOS = [
  { key: 'frontal', label: 'Foto Frontal' },
  { key: 'lateral_izq', label: 'Foto Lateral Izquierdo' },
  { key: 'trasera', label: 'Foto Trasera' },
  { key: 'lateral_der', label: 'Foto Lateral Derecho' },
];

export default function NewDelivery() {
  const { terminal, setTerminal } = useTerminal();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    terminal: terminal || '',
    vehicleId: '',
    driverId: '',
    supervisorId: '',
    fecha: todayStr(),
    hora_solicitud: '',
    hora_retiro: '',
    km_salida: '',
    motivo: '',
    destino: '',
  });
  const [checklist, setChecklist] = useState({});
  const [photos, setPhotos] = useState({ frontal: [], lateral_izq: [], trasera: [], lateral_der: [] });
  const [firmaSupervisor, setFirmaSupervisor] = useState(null);
  const [firmaConductor, setFirmaConductor] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedFolio, setSavedFolio] = useState('');

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [activeDamages, setActiveDamages] = useState([]);
  const [documentMeta, setDocumentMeta] = useState({});

  useEffect(() => {
    if (form.terminal) {
      setVehicles(vehiclesService.getAvailableByTerminal(form.terminal));
      setDrivers(driversService.getByTerminal(form.terminal));
      setSupervisors(supervisorsService.getByTerminal(form.terminal));
    }
  }, [form.terminal]);

  useEffect(() => {
    if (form.vehicleId) {
      const tickets = damagesService.getByVehicle(form.vehicleId);
      const docs = docsService.getByVehicle(form.vehicleId);
      const docInfo = buildDocumentChecklistInfo(docs);
      setActiveDamages(tickets);
      setDocumentMeta(docInfo.itemMeta);
      setChecklist({
        ...buildDefaultChecklist(CHECKLIST_ITEMS),
        ...buildChecklistFromActiveTickets(CHECKLIST_ITEMS, tickets),
        ...docInfo.checklistPatch,
      });
    } else {
      setActiveDamages([]);
      setDocumentMeta({});
      setChecklist({});
    }
  }, [form.vehicleId]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.terminal) e.terminal = 'Selecciona terminal';
    if (!form.vehicleId) e.vehicleId = 'Selecciona vehículo';
    if (!form.driverId) e.driverId = 'Selecciona conductor';
    if (!form.supervisorId) e.supervisorId = 'Selecciona supervisor';
    if (!form.fecha) e.fecha = 'Ingresa fecha';
    if (!form.hora_solicitud) e.hora_solicitud = 'Ingresa hora de solicitud';
    else if (!isValidTime24(form.hora_solicitud)) e.hora_solicitud = 'Usa formato 24 hrs HH:MM';
    if (!form.hora_retiro) e.hora_retiro = 'Ingresa hora de retiro';
    else if (!isValidTime24(form.hora_retiro)) e.hora_retiro = 'Usa formato 24 hrs HH:MM';
    if (!form.km_salida) e.km_salida = 'Ingresa kilometraje de salida';
    if (!form.motivo.trim()) e.motivo = 'Ingresa motivo de uso';
    if (!form.destino.trim()) e.destino = 'Ingresa destino / recorrido';

    // Checklist validation
    const allItemIds = Object.values(CHECKLIST_ITEMS).flatMap(s => s.items.map(i => i.id));
    const incomplete = allItemIds.filter(id => !checklist[id]?.state);
    if (incomplete.length > 0) e.checklist = `Faltan ${incomplete.length} item(s) por evaluar en el checklist`;

    // Bad items need observation
    const badNoObs = allItemIds.filter(id => checklist[id]?.state === 'malo' && !checklist[id]?.obs?.trim());
    if (badNoObs.length > 0) e.checklist_obs = `${badNoObs.length} item(s) con estado Malo necesitan observación`;

    // Photos
    REQUIRED_PHOTOS.forEach(p => {
      if (!photos[p.key] || photos[p.key].length === 0) {
        e[`photo_${p.key}`] = `Se requiere ${p.label}`;
      }
    });

    if (!firmaSupervisor) e.firmaSupervisor = 'Firma del supervisor requerida';
    if (!firmaConductor) e.firmaConductor = 'Firma del conductor requerida';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      // Scroll to first error
      const el = document.querySelector('[data-error="true"]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(true);
    try {
      const allRecords = recordsService.getAll();
      const folio = generateFolio(allRecords);

      // Build fotos object
      const fotosObj = {};
      REQUIRED_PHOTOS.forEach(p => { fotosObj[p.key] = photos[p.key]?.[0] || null; });

      const record = {
        folio,
        terminal: form.terminal,
        vehicleId: form.vehicleId,
        driverId: form.driverId,
        supervisorId: form.supervisorId,
        fecha: form.fecha,
        status: 'PENDIENTE',
        deliveryData: {
          hora_solicitud: form.hora_solicitud,
          hora_retiro: form.hora_retiro,
          km_salida: form.km_salida,
          motivo: form.motivo,
          destino: form.destino,
          checklist,
          fotos: fotosObj,
          firma_supervisor: firmaSupervisor,
          firma_conductor: firmaConductor,
        },
        receptionData: {},
        damages: [],
      };

      const savedRecord = recordsService.save(record);
      const followUpTickets = getBadChecklistEntries(checklist, CHECKLIST_ITEMS).map(entry =>
        damagesService.upsertChecklistTicket({
          vehicleId: form.vehicleId,
          recordId: savedRecord.id,
          terminal: form.terminal,
          entry,
          stage: 'entrega',
        })
      );
      damagesService.resolveChecklistTickets({
        vehicleId: form.vehicleId,
        recordId: savedRecord.id,
        terminal: form.terminal,
        checklist,
        stage: 'entrega',
      });
      if (followUpTickets.length > 0) {
        recordsService.update(savedRecord.id, { damages: followUpTickets });
      }

      // Mark vehicle as in use
      vehiclesService.update(form.vehicleId, { status: 'en_uso' });

      setSavedFolio(folio);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === form.vehicleId);
  const selectedDriver = drivers.find(d => d.id === form.driverId);

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Entrega registrada</h2>
        <p className="text-gray-500 mb-1">Folio: <strong className="text-orange-600">{savedFolio}</strong></p>
        <p className="text-sm text-gray-400 mb-6">El vehículo fue marcado como "En Uso"</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/cerrar-recepcion')}
            className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600"
          >
            Ir a Recepciones
          </button>
          <button
            onClick={() => { setSuccess(false); setForm({ terminal: form.terminal, vehicleId: '', driverId: '', supervisorId: '', fecha: todayStr(), hora_solicitud: '', hora_retiro: '', km_salida: '', motivo: '', destino: '' }); setChecklist({}); setPhotos({ frontal: [], lateral_izq: [], trasera: [], lateral_der: [] }); setFirmaSupervisor(null); setFirmaConductor(null); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            Nueva Entrega
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-gray-900">Nueva Entrega</h2>
      </div>

      {/* Section 1: Datos básicos */}
      <Section title="1. Datos de la Entrega">
        <div data-error={!!errors.terminal}>
          <TerminalSelector
            value={form.terminal}
            onChange={v => { set('terminal', v); setTerminal(v); set('vehicleId', ''); set('driverId', ''); set('supervisorId', ''); }}
            required
          />
          {errors.terminal && <ErrorMsg>{errors.terminal}</ErrorMsg>}
        </div>

        <div data-error={!!errors.vehicleId}>
          <label className="label-field">Vehículo <span className="text-red-500">*</span></label>
          <select
            value={form.vehicleId}
            onChange={e => set('vehicleId', e.target.value)}
            className={`select-field ${errors.vehicleId ? 'border-red-400' : ''}`}
            disabled={!form.terminal}
          >
            <option value="">Seleccionar vehículo...</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.ppu} — {v.marca} {v.modelo} ({v.terminal})
              </option>
            ))}
          </select>
          {errors.vehicleId && <ErrorMsg>{errors.vehicleId}</ErrorMsg>}
          {form.terminal && vehicles.length === 0 && (
            <p className="text-xs text-yellow-600 mt-1">No hay vehículos disponibles en esta terminal</p>
          )}
        </div>

        <div data-error={!!errors.driverId}>
          <label className="label-field">Conductor <span className="text-red-500">*</span></label>
          <select
            value={form.driverId}
            onChange={e => set('driverId', e.target.value)}
            className={`select-field ${errors.driverId ? 'border-red-400' : ''}`}
            disabled={!form.terminal}
          >
            <option value="">Seleccionar conductor...</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>
                {d.nombre} — {d.rut} (Lic. {d.licencia})
                {isLicenseExpired(d.vencimiento_licencia) ? ' ⚠️ LICENCIA VENCIDA' : ''}
              </option>
            ))}
          </select>
          {errors.driverId && <ErrorMsg>{errors.driverId}</ErrorMsg>}
          {selectedDriver && isLicenseExpired(selectedDriver.vencimiento_licencia) && (
            <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              ⚠️ Licencia vencida el {formatDate(selectedDriver.vencimiento_licencia)}
            </div>
          )}
        </div>

        <div data-error={!!errors.supervisorId}>
          <label className="label-field">Supervisor <span className="text-red-500">*</span></label>
          <select
            value={form.supervisorId}
            onChange={e => set('supervisorId', e.target.value)}
            className={`select-field ${errors.supervisorId ? 'border-red-400' : ''}`}
            disabled={!form.terminal}
          >
            <option value="">Seleccionar supervisor...</option>
            {supervisors.map(s => (
              <option key={s.id} value={s.id}>{s.nombre} — {s.cargo}</option>
            ))}
          </select>
          {errors.supervisorId && <ErrorMsg>{errors.supervisorId}</ErrorMsg>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div data-error={!!errors.fecha}>
            <label className="label-field">Fecha <span className="text-red-500">*</span></label>
            <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={`input-field ${errors.fecha ? 'border-red-400' : ''}`} />
            {errors.fecha && <ErrorMsg>{errors.fecha}</ErrorMsg>}
          </div>
          <div data-error={!!errors.hora_solicitud}>
            <label className="label-field">Hora Solicitud <span className="text-red-500">*</span></label>
            <TimeInput value={form.hora_solicitud} onChange={value => set('hora_solicitud', value)} className={`input-field font-mono ${errors.hora_solicitud ? 'border-red-400' : ''}`} />
            {errors.hora_solicitud && <ErrorMsg>{errors.hora_solicitud}</ErrorMsg>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div data-error={!!errors.hora_retiro}>
            <label className="label-field">Hora Retiro <span className="text-red-500">*</span></label>
            <TimeInput value={form.hora_retiro} onChange={value => set('hora_retiro', value)} className={`input-field font-mono ${errors.hora_retiro ? 'border-red-400' : ''}`} />
            {errors.hora_retiro && <ErrorMsg>{errors.hora_retiro}</ErrorMsg>}
          </div>
          <div data-error={!!errors.km_salida}>
            <label className="label-field">KM Salida <span className="text-red-500">*</span></label>
            <input type="number" value={form.km_salida} onChange={e => set('km_salida', e.target.value)} placeholder={selectedVehicle?.km || '0'} className={`input-field ${errors.km_salida ? 'border-red-400' : ''}`} min="0" />
            {errors.km_salida && <ErrorMsg>{errors.km_salida}</ErrorMsg>}
          </div>
        </div>

        <div data-error={!!errors.motivo}>
          <label className="label-field">Motivo de Uso <span className="text-red-500">*</span></label>
          <input type="text" value={form.motivo} onChange={e => set('motivo', e.target.value)} placeholder="Ej: Entrega de paquetes ruta norte" className={`input-field ${errors.motivo ? 'border-red-400' : ''}`} />
          {errors.motivo && <ErrorMsg>{errors.motivo}</ErrorMsg>}
        </div>

        <div data-error={!!errors.destino}>
          <label className="label-field">Destino / Recorrido <span className="text-red-500">*</span></label>
          <textarea value={form.destino} onChange={e => set('destino', e.target.value)} rows={2} placeholder="Describe el recorrido o destino" className={`input-field resize-none ${errors.destino ? 'border-red-400' : ''}`} />
          {errors.destino && <ErrorMsg>{errors.destino}</ErrorMsg>}
        </div>
      </Section>

      {/* Active damages warning */}
      {activeDamages.length > 0 && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <strong className="text-orange-700 text-sm">Tickets activos de seguimiento ({activeDamages.length})</strong>
          </div>
          <div className="space-y-2">
            {activeDamages.map((d, i) => (
              <div key={d.id || i} className="rounded-lg border border-orange-200 bg-white/70 px-3 py-2 text-xs text-orange-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-orange-900">{d.ticket || `Ticket ${i + 1}`}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    d.severidad === 'grave' ? 'bg-red-200 text-red-800' :
                    d.severidad === 'moderado' ? 'bg-orange-200 text-orange-800' :
                    'bg-yellow-200 text-yellow-800'
                  }`}>{d.severidad}</span>
                  <span className="text-orange-600">
                    Registrado: {formatDateTime(d.createdAt || d.lastObservedAt)}
                  </span>
                  {d.lastObservedAt && d.lastObservedAt !== d.createdAt && (
                    <span className="text-orange-600">Última actualización: {formatDateTime(d.lastObservedAt)}</span>
                  )}
                </div>
                <p className="mt-1 font-medium">{d.zona}: {d.descripcion}</p>
                {d.fotos?.length > 0 && (
                  <div className="mt-2 flex gap-1">
                    {d.fotos.slice(0, 4).map((foto, idx) => (
                      <img key={idx} src={foto} alt="" className="h-12 w-12 rounded object-cover border border-orange-200" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Checklist */}
      <Section title="2. Checklist de Entrega">
        {errors.checklist && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{errors.checklist}</div>}
        {errors.checklist_obs && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{errors.checklist_obs}</div>}
        <Checklist items={CHECKLIST_ITEMS} onChange={setChecklist} initialData={checklist} itemMeta={documentMeta} />
      </Section>

      {/* Section 3: Photos */}
      <Section title="3. Fotos del Vehículo">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REQUIRED_PHOTOS.map(p => (
            <div key={p.key} data-error={!!errors[`photo_${p.key}`]}>
              <PhotoUpload
                label={p.label}
                required
                onPhotos={files => setPhotos(prev => ({ ...prev, [p.key]: files }))}
                initialPhotos={photos[p.key]}
              />
              {errors[`photo_${p.key}`] && <ErrorMsg>{errors[`photo_${p.key}`]}</ErrorMsg>}
            </div>
          ))}
        </div>
      </Section>

      {/* Section 4: Signatures */}
      <Section title="4. Firmas">
        <div data-error={!!errors.firmaSupervisor}>
          <SignaturePad label="Firma Supervisor (Quien Entrega)" required onSave={setFirmaSupervisor} />
          {errors.firmaSupervisor && <ErrorMsg>{errors.firmaSupervisor}</ErrorMsg>}
        </div>
        <div data-error={!!errors.firmaConductor}>
          <SignaturePad label="Firma Conductor (Quien Recibe)" required onSave={setFirmaConductor} />
          {errors.firmaConductor && <ErrorMsg>{errors.firmaConductor}</ErrorMsg>}
        </div>
      </Section>

      {/* Save */}
      <div className="pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-lg"
        >
          {saving ? 'Guardando...' : 'Registrar Entrega'}
        </button>
        {Object.keys(errors).length > 0 && (
          <p className="text-xs text-red-500 text-center mt-2">Revisa los errores indicados arriba</p>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-orange-500 px-4 py-3">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4 space-y-4">
        {children}
      </div>
    </div>
  );
}

function ErrorMsg({ children }) {
  return <p className="text-xs text-red-500 mt-1">{children}</p>;
}
