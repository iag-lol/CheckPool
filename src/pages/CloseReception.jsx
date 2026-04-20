import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTerminal } from '../hooks/useData';
import { recordsService, vehiclesService, driversService, supervisorsService, damagesService } from '../services/storage';
import { CHECKLIST_ITEMS } from '../constants';
import { nowTimeStr, calcTimeUse, calcDelay, formatDuration, formatDate, formatDateTime, isValidTime24 } from '../utils/helpers';
import { buildDefaultChecklist, buildChecklistFromActiveTickets, getBadChecklistEntries } from '../utils/checklist';
import Checklist from '../components/Checklist';
import SignaturePad from '../components/SignaturePad';
import PhotoUpload from '../components/PhotoUpload';
import DamageForm from '../components/DamageForm';
import Badge from '../components/Badge';
import PDFExport from '../components/PDFExport';
import TimeInput from '../components/TimeInput';

const REQUIRED_PHOTOS = [
  { key: 'frontal', label: 'Frontal' },
  { key: 'lateral_izq', label: 'Lateral Izq.' },
  { key: 'trasera', label: 'Trasera' },
  { key: 'lateral_der', label: 'Lateral Der.' },
];

function ElapsedBadge({ horaRetiro }) {
  const elapsed = horaRetiro ? calcTimeUse(horaRetiro, nowTimeStr()) : null;
  if (!elapsed) return null;
  const isLate = elapsed.total_minutes > 180;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${isLate ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
      {isLate && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>}
      {formatDuration(elapsed.hours, elapsed.minutes)}
      {isLate ? ' — TARDÍO' : ''}
    </span>
  );
}

export default function CloseReception() {
  const { terminal } = useTerminal();
  const navigate = useNavigate();

  const [pending, setPending] = useState([]);
  const [closedToday, setClosedToday] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState(null);
  const [supervisor, setSupervisor] = useState(null);

  const [form, setForm] = useState({ hora_devolucion: '', km_retorno: '' });
  const [checklist, setChecklist] = useState({});
  const [photos, setPhotos] = useState({ frontal: [], lateral_izq: [], trasera: [], lateral_der: [] });
  const [firmaReceptor, setFirmaReceptor] = useState(null);
  const [firmaConductor, setFirmaConductor] = useState(null);
  const [damages, setDamages] = useState([]);
  const [activeDamages, setActiveDamages] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'closed'

  const loadRecords = useCallback(() => {
    const t = terminal || sessionStorage.getItem('cp_terminal');
    if (t) {
      setPending(recordsService.getPendingByTerminal(t));
      const all = recordsService.getByTerminal ? recordsService.getByTerminal(t) : recordsService.getAll().filter(r => r.terminal === t && r.active !== false);
      const today = new Date().toISOString().slice(0, 10);
      setClosedToday(all.filter(r => r.status !== 'PENDIENTE' && r.fecha === today).slice(0, 20));
    } else {
      setPending(recordsService.getPending());
      setClosedToday([]);
    }
  }, [terminal]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const selectRecord = (record) => {
    setSelectedRecord(record);
    setVehicle(vehiclesService.getById(record.vehicleId));
    setDriver(driversService.getById(record.driverId));
    setSupervisor(supervisorsService.getById(record.supervisorId));
    const tickets = damagesService.getByVehicle(record.vehicleId);
    setForm({ hora_devolucion: '', km_retorno: '' });
    setChecklist({
      ...buildDefaultChecklist(CHECKLIST_ITEMS),
      ...buildChecklistFromActiveTickets(CHECKLIST_ITEMS, tickets),
    });
    setActiveDamages(tickets);
    setPhotos({ frontal: [], lateral_izq: [], trasera: [], lateral_der: [] });
    setFirmaReceptor(null);
    setFirmaConductor(null);
    setDamages([]);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const getTimeInfo = () => {
    if (!selectedRecord || !form.hora_devolucion) return null;
    if (!isValidTime24(form.hora_devolucion)) return null;
    const retiro = selectedRecord.deliveryData?.hora_retiro;
    if (!retiro) return null;
    return {
      timeUse: calcTimeUse(retiro, form.hora_devolucion),
      delay: calcDelay(retiro, form.hora_devolucion),
    };
  };

  const validate = () => {
    const e = {};
    if (!form.hora_devolucion) e.hora_devolucion = 'Ingresa hora de devolución';
    else if (!isValidTime24(form.hora_devolucion)) e.hora_devolucion = 'Usa formato 24 hrs HH:MM';
    if (!form.km_retorno) e.km_retorno = 'Ingresa kilometraje de retorno';
    else if (parseInt(form.km_retorno) <= parseInt(selectedRecord?.deliveryData?.km_salida || 0)) {
      e.km_retorno = `KM retorno debe ser mayor a ${selectedRecord?.deliveryData?.km_salida}`;
    }

    const allIds = Object.values(CHECKLIST_ITEMS).flatMap(s => s.items.map(i => i.id));
    const incomplete = allIds.filter(id => !checklist[id]?.state);
    if (incomplete.length > 0) e.checklist = `Faltan ${incomplete.length} ítem(s) en checklist`;

    const badNoObs = allIds.filter(id => checklist[id]?.state === 'malo' && !checklist[id]?.obs?.trim());
    if (badNoObs.length > 0) e.checklist_obs = `${badNoObs.length} ítem(s) con estado Malo sin observación`;

    REQUIRED_PHOTOS.forEach(p => {
      if (!photos[p.key] || photos[p.key].length === 0) e[`photo_${p.key}`] = `Foto ${p.label} requerida`;
    });

    if (!firmaReceptor) e.firmaReceptor = 'Firma del receptor requerida';
    if (!firmaConductor) e.firmaConductor = 'Firma del conductor requerida';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!selectedRecord || !validate()) return;
    setSaving(true);
    try {
      const timeInfo = getTimeInfo();
      const delay = timeInfo?.delay;
      const distance = parseInt(form.km_retorno) - parseInt(selectedRecord.deliveryData?.km_salida || 0);

      const checklistTickets = getBadChecklistEntries(checklist, CHECKLIST_ITEMS).map(entry =>
        damagesService.upsertChecklistTicket({
          vehicleId: selectedRecord.vehicleId,
          recordId: selectedRecord.id,
          terminal: selectedRecord.terminal,
          entry,
          stage: 'recepcion',
        })
      );
      const manualDamages = damages.map(d => damagesService.save({
        ...d,
        vehicleId: selectedRecord.vehicleId,
        recordId: selectedRecord.id,
        terminal: selectedRecord.terminal,
        source: 'manual',
        stage: 'recepcion',
        lastObservedAt: new Date().toISOString(),
      }));
      damagesService.resolveChecklistTickets({
        vehicleId: selectedRecord.vehicleId,
        recordId: selectedRecord.id,
        terminal: selectedRecord.terminal,
        checklist,
        stage: 'recepcion',
      });
      const savedDamages = [...checklistTickets, ...manualDamages];
      const hasDamage = savedDamages.length > 0;
      const isLate = delay?.isLate;
      let newStatus = 'CERRADO';
      if (isLate && hasDamage) newStatus = 'TARDÍO CON DAÑO';
      else if (isLate) newStatus = 'TARDÍO';
      else if (hasDamage) newStatus = 'CON DAÑO';

      const fotosObj = {};
      REQUIRED_PHOTOS.forEach(p => { fotosObj[p.key] = photos[p.key]?.[0] || null; });

      recordsService.update(selectedRecord.id, {
        status: newStatus,
        damages: savedDamages,
        receptionData: {
          hora_devolucion: form.hora_devolucion,
          km_retorno: form.km_retorno,
          checklist,
          fotos: fotosObj,
          firma_receptor: firmaReceptor,
          firma_conductor: firmaConductor,
          tiempo_uso_minutos: timeInfo?.timeUse?.total_minutes,
          atraso: isLate,
          minutos_atraso: delay?.delayMinutes,
          distancia: distance,
        },
      });

      vehiclesService.update(selectedRecord.vehicleId, { status: 'disponible' });

      setSuccess({ folio: selectedRecord.folio, status: newStatus, isLate, hasDamage, distance, delay });
      loadRecords();
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const timeInfo = getTimeInfo();
  const errorCount = Object.keys(errors).length;

  // ── Success screen ──
  if (success) {
    return (
      <div className="max-w-md mx-auto py-12 animate-slide-up">
        <div className="card p-8 text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 ${success.isLate ? 'bg-red-100' : 'bg-emerald-100'}`}>
            {success.isLate
              ? <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              : <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            }
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-1">Recepción cerrada</h2>
          <p className="text-slate-500 text-sm mb-4">El registro ha sido actualizado correctamente</p>

          <div className="bg-slate-50 rounded-xl p-4 mb-5 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold uppercase">Folio</span>
              <span className="font-bold text-orange-600">{success.folio}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold uppercase">Estado</span>
              <Badge status={success.status} />
            </div>
            {success.distance > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold uppercase">Distancia</span>
                <span className="font-semibold text-slate-700">{success.distance} km</span>
              </div>
            )}
            {success.isLate && success.delay && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold uppercase">Atraso</span>
                <span className="font-semibold text-red-600">{formatDuration(success.delay.delayHours, success.delay.delayMins)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/registros')} className="btn-primary flex-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /></svg>
              Ver Registros
            </button>
            <button onClick={() => { setSuccess(null); setSelectedRecord(null); }} className="btn-secondary flex-1">
              Nueva
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Selected record form ──
  if (selectedRecord) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedRecord(null)} className="btn-icon">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 className="page-title text-xl">Cerrar Recepción</h2>
            <p className="text-xs text-slate-500 mt-0.5">Folio <span className="font-bold text-orange-600">{selectedRecord.folio}</span></p>
          </div>
        </div>

        {/* Delivery summary - pre-filled data from registration */}
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span className="text-white font-semibold text-sm">Datos de Entrega Registrada</span>
            </div>
            <button onClick={() => setSelectedRecord(null)} className="text-xs text-slate-400 hover:text-slate-200 underline">
              Cambiar registro
            </button>
          </div>
          <div className="p-0">
            <table className="data-table">
              <tbody>
                <tr>
                  <td className="font-semibold text-slate-500 text-xs uppercase w-32 bg-slate-50">Vehículo</td>
                  <td className="font-bold text-slate-800">{vehicle?.ppu} — {vehicle?.marca} {vehicle?.modelo} {vehicle?.anio}</td>
                  <td className="font-semibold text-slate-500 text-xs uppercase w-32 bg-slate-50">Estado</td>
                  <td><Badge status={selectedRecord.status} /></td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-500 text-xs uppercase bg-slate-50">Conductor</td>
                  <td className="font-medium text-slate-700">{driver?.nombre}</td>
                  <td className="font-semibold text-slate-500 text-xs uppercase bg-slate-50">Supervisor</td>
                  <td className="font-medium text-slate-700">{supervisor?.nombre}</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-500 text-xs uppercase bg-slate-50">H. Solicitud</td>
                  <td className="font-mono font-semibold text-slate-700">{selectedRecord.deliveryData?.hora_solicitud || '—'}</td>
                  <td className="font-semibold text-slate-500 text-xs uppercase bg-slate-50">H. Retiro</td>
                  <td className="font-mono font-semibold text-slate-700">{selectedRecord.deliveryData?.hora_retiro || '—'}</td>
                </tr>
                <tr>
                  <td className="font-semibold text-slate-500 text-xs uppercase bg-slate-50">KM Salida</td>
                  <td className="font-mono font-semibold text-slate-700">{selectedRecord.deliveryData?.km_salida ? `${parseInt(selectedRecord.deliveryData.km_salida).toLocaleString()} km` : '—'}</td>
                  <td className="font-semibold text-slate-500 text-xs uppercase bg-slate-50">Motivo</td>
                  <td className="text-slate-600 text-sm">{selectedRecord.deliveryData?.motivo || '—'}</td>
                </tr>
                {selectedRecord.deliveryData?.destino && (
                  <tr>
                    <td className="font-semibold text-slate-500 text-xs uppercase bg-slate-50">Destino</td>
                    <td colSpan={3} className="text-slate-600">{selectedRecord.deliveryData.destino}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Live time counter */}
          {timeInfo && (
            <div className={`px-5 py-3 flex items-center gap-3 border-t ${timeInfo.delay.isLate ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <svg className={`w-4 h-4 flex-shrink-0 ${timeInfo.delay.isLate ? 'text-red-500' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <span className={`text-sm font-bold ${timeInfo.delay.isLate ? 'text-red-700' : 'text-emerald-700'}`}>
                  Tiempo de uso: {formatDuration(timeInfo.timeUse.hours, timeInfo.timeUse.minutes)}
                </span>
                {timeInfo.delay.isLate && (
                  <span className="ml-3 text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                    TARDÍO +{formatDuration(timeInfo.delay.delayHours, timeInfo.delay.delayMins)}
                  </span>
                )}
              </div>
              {form.km_retorno && parseInt(form.km_retorno) > parseInt(selectedRecord.deliveryData?.km_salida || 0) && (
                <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                  {(parseInt(form.km_retorno) - parseInt(selectedRecord.deliveryData.km_salida)).toLocaleString()} km recorridos
                </span>
              )}
            </div>
          )}
        </div>

        {activeDamages.length > 0 && (
          <div className="alert-warning block">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <strong className="text-orange-800 text-sm">Tickets activos de seguimiento ({activeDamages.length})</strong>
            </div>
            <div className="space-y-2">
              {activeDamages.map((d, i) => (
                <div key={d.id || i} className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs text-orange-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-orange-900">{d.ticket || `Ticket ${i + 1}`}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      d.severidad === 'grave' ? 'bg-red-200 text-red-800' :
                      d.severidad === 'moderado' ? 'bg-orange-200 text-orange-800' :
                      'bg-yellow-200 text-yellow-800'
                    }`}>{d.severidad}</span>
                    <span>Registrado: {formatDateTime(d.createdAt || d.lastObservedAt)}</span>
                    {d.lastObservedAt && d.lastObservedAt !== d.createdAt && (
                      <span>Última actualización: {formatDateTime(d.lastObservedAt)}</span>
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

        {/* Step 1: Return data */}
        <div className="form-step">
          <div className="form-step-header">
            <span className="form-step-num">1</span>
            <span className="form-step-title">Datos de Devolución</span>
          </div>
          <div className="form-step-body">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Hora Devolución <span className="text-red-500">*</span></label>
                <TimeInput value={form.hora_devolucion} onChange={value => set('hora_devolucion', value)}
                  className={`input-field font-mono ${errors.hora_devolucion ? 'error' : ''}`} />
                {errors.hora_devolucion && <p className="text-xs text-red-500 mt-1">{errors.hora_devolucion}</p>}
              </div>
              <div>
                <label className="label-field">
                  KM Retorno <span className="text-red-500">*</span>
                  {selectedRecord.deliveryData?.km_salida && (
                    <span className="text-slate-400 normal-case font-normal ml-1">(salida: {parseInt(selectedRecord.deliveryData.km_salida).toLocaleString()})</span>
                  )}
                </label>
                <input type="number" value={form.km_retorno} onChange={e => set('km_retorno', e.target.value)}
                  placeholder={selectedRecord.deliveryData?.km_salida || ''}
                  className={`input-field font-mono ${errors.km_retorno ? 'error' : ''}`}
                  min={selectedRecord.deliveryData?.km_salida || 0} />
                {errors.km_retorno && <p className="text-xs text-red-500 mt-1">{errors.km_retorno}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Checklist */}
        <div className="form-step">
          <div className="form-step-header">
            <span className="form-step-num">2</span>
            <span className="form-step-title">Checklist de Recepción</span>
          </div>
          <div className="form-step-body">
            {errors.checklist && <div className="alert-danger text-sm text-red-700">{errors.checklist}</div>}
            {errors.checklist_obs && <div className="alert-danger text-sm text-red-700">{errors.checklist_obs}</div>}
            <Checklist items={CHECKLIST_ITEMS} onChange={setChecklist} initialData={checklist} />
          </div>
        </div>

        {/* Step 3: Photos */}
        <div className="form-step">
          <div className="form-step-header">
            <span className="form-step-num">3</span>
            <span className="form-step-title">Fotografías de Recepción (4 obligatorias)</span>
          </div>
          <div className="form-step-body">
            <div className="grid grid-cols-2 gap-4">
              {REQUIRED_PHOTOS.map(p => (
                <div key={p.key}>
                  <PhotoUpload label={p.label} required
                    onPhotos={files => setPhotos(prev => ({ ...prev, [p.key]: files }))}
                    initialPhotos={photos[p.key]} />
                  {errors[`photo_${p.key}`] && <p className="text-xs text-red-500 mt-1">{errors[`photo_${p.key}`]}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 4: Damages */}
        <div className="form-step">
          <div className="form-step-header">
            <span className="form-step-num">4</span>
            <span className="form-step-title">Registro de Daños</span>
            <span className="ml-auto text-xs text-slate-400 font-normal">Opcional</span>
          </div>
          <div className="form-step-body">
            <DamageForm onDamage={setDamages} recordId={selectedRecord.id} />
          </div>
        </div>

        {/* Step 5: Signatures */}
        <div className="form-step">
          <div className="form-step-header">
            <span className="form-step-num">5</span>
            <span className="form-step-title">Firmas</span>
          </div>
          <div className="form-step-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <SignaturePad
                  label={`Firma Supervisor — ${supervisor?.nombre || 'Quien Recibe'}`}
                  required
                  onSave={setFirmaReceptor} />
                {errors.firmaReceptor && <p className="text-xs text-red-500 mt-1">{errors.firmaReceptor}</p>}
              </div>
              <div>
                <SignaturePad
                  label={`Firma Conductor — ${driver?.nombre || 'Quien Entrega'}`}
                  required
                  onSave={setFirmaConductor} />
                {errors.firmaConductor && <p className="text-xs text-red-500 mt-1">{errors.firmaConductor}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="pb-8 space-y-3">
          {errorCount > 0 && (
            <div className="alert-danger">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
              <p className="text-sm text-red-700">{errorCount} error(es) pendiente(s) — revisa los campos marcados</p>
            </div>
          )}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-base hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
            {saving
              ? <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Cerrando recepción...</>
              : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Cerrar Recepción</>
            }
          </button>
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Cerrar Recepción</h2>
          <p className="page-subtitle">{terminal || 'Todos los terminales'}</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn-ghost">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Volver
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-200 rounded-xl w-fit">
        <button onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Pendientes {pending.length > 0 && <span className="ml-1.5 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pending.length}</span>}
        </button>
        <button onClick={() => setActiveTab('closed')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'closed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          Cerrados hoy {closedToday.length > 0 && <span className="ml-1.5 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">{closedToday.length}</span>}
        </button>
      </div>

      {activeTab === 'pending' && (
        <>
          {pending.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <p className="font-bold text-slate-600 text-lg">No hay entregas pendientes</p>
              <p className="text-slate-400 text-sm mt-1">{terminal ? `en ${terminal}` : 'en ningún terminal'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Cards for mobile */}
              <div className="grid gap-3 sm:hidden">
                {pending.map(record => <PendingCard key={record.id} record={record} onSelect={selectRecord} />)}
              </div>

              {/* Table for desktop */}
              <div className="card overflow-hidden hidden sm:block">
                <div className="card-header">
                  <h3 className="font-bold text-slate-700 text-sm">Entregas Pendientes de Recepción</h3>
                  <span className="text-xs text-slate-400">{pending.length} registro(s)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Folio</th>
                        <th>Vehículo</th>
                        <th>Conductor</th>
                        <th>Retiro</th>
                        <th>KM Salida</th>
                        <th>Tiempo</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.map(record => {
                        const v = vehiclesService.getById(record.vehicleId);
                        const d = driversService.getById(record.driverId);
                        return (
                          <tr key={record.id} className="cursor-pointer" onClick={() => selectRecord(record)}>
                            <td><span className="font-bold text-orange-600">{record.folio}</span></td>
                            <td>
                              <div className="font-semibold text-slate-800">{v?.ppu}</div>
                              <div className="text-xs text-slate-400">{v?.marca} {v?.modelo}</div>
                            </td>
                            <td className="font-medium">{d?.nombre}</td>
                            <td className="font-mono text-slate-600">{record.deliveryData?.hora_retiro || '—'}</td>
                            <td className="font-mono">{record.deliveryData?.km_salida ? parseInt(record.deliveryData.km_salida).toLocaleString() : '—'}</td>
                            <td><ElapsedBadge horaRetiro={record.deliveryData?.hora_retiro} /></td>
                            <td>
                              <button className="btn-primary py-1.5 px-3 text-xs">Cerrar</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'closed' && (
        <>
          {closedToday.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-slate-500 font-medium">No hay registros cerrados hoy</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="card-header">
                <h3 className="font-bold text-slate-700 text-sm">Recepciones Cerradas Hoy</h3>
                <span className="text-xs text-slate-400">{closedToday.length} registro(s)</span>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-slate-100">
                {closedToday.map(record => {
                  const v = vehiclesService.getById(record.vehicleId);
                  const d = driversService.getById(record.driverId);
                  return (
                    <div key={record.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-slate-600 text-sm">{record.folio}</span>
                          <Badge status={record.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{v?.ppu} — {v?.marca} {v?.modelo}</p>
                        <p className="text-xs text-slate-400">{d?.nombre} • Devol: {record.receptionData?.hora_devolucion || '—'}</p>
                        {record.receptionData?.distancia > 0 && <p className="text-xs text-blue-600">{record.receptionData.distancia} km recorridos</p>}
                      </div>
                      <PDFExport record={record} buttonClass="btn-ghost text-xs px-2 py-1.5" />
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Folio</th>
                      <th>Vehículo</th>
                      <th>Conductor</th>
                      <th>H. Retiro</th>
                      <th>H. Devol.</th>
                      <th>Distancia</th>
                      <th>Estado</th>
                      <th>Atraso</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedToday.map(record => {
                      const v = vehiclesService.getById(record.vehicleId);
                      const d = driversService.getById(record.driverId);
                      return (
                        <tr key={record.id}>
                          <td><span className="font-bold text-slate-600">{record.folio}</span></td>
                          <td>
                            <div className="font-semibold">{v?.ppu}</div>
                            <div className="text-xs text-slate-400">{v?.marca} {v?.modelo}</div>
                          </td>
                          <td>{d?.nombre}</td>
                          <td className="font-mono">{record.deliveryData?.hora_retiro || '—'}</td>
                          <td className="font-mono">{record.receptionData?.hora_devolucion || '—'}</td>
                          <td>{record.receptionData?.distancia ? `${record.receptionData.distancia} km` : '—'}</td>
                          <td><Badge status={record.status} /></td>
                          <td>{record.receptionData?.atraso
                            ? <span className="text-xs text-red-600 font-semibold">{formatDuration(Math.floor(record.receptionData.minutos_atraso / 60), record.receptionData.minutos_atraso % 60)}</span>
                            : <span className="text-xs text-emerald-600 font-semibold">—</span>}</td>
                          <td><PDFExport record={record} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Mobile pending card ──
function PendingCard({ record, onSelect }) {
  const v = vehiclesService.getById(record.vehicleId);
  const d = driversService.getById(record.driverId);
  const s = supervisorsService.getById(record.supervisorId);
  const elapsed = record.deliveryData?.hora_retiro ? calcTimeUse(record.deliveryData.hora_retiro, nowTimeStr()) : null;
  const isLate = elapsed ? elapsed.total_minutes > 180 : false;

  return (
    <div onClick={() => onSelect(record)}
      className={`card p-4 cursor-pointer hover:shadow-md transition-all border-l-4 ${isLate ? 'border-l-red-500' : 'border-l-orange-500'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-extrabold text-orange-600 text-sm">{record.folio}</span>
            <Badge status={record.status} size="sm" />
            {isLate && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">TARDÍO</span>}
          </div>
          <p className="font-bold text-slate-800 text-sm">{v?.ppu} — {v?.marca} {v?.modelo}</p>
          <p className="text-xs text-slate-500 mt-0.5">{d?.nombre}</p>
          {s && <p className="text-xs text-slate-400">Sup: {s.nombre}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-slate-400">{formatDate(record.fecha)}</span>
            <span className="text-xs text-slate-500 font-mono">Retiro: <strong>{record.deliveryData?.hora_retiro || '—'}</strong></span>
            {record.deliveryData?.km_salida && <span className="text-xs text-slate-400 font-mono">{parseInt(record.deliveryData.km_salida).toLocaleString()} km</span>}
          </div>
          {elapsed && (
            <div className="mt-2">
              <ElapsedBadge horaRetiro={record.deliveryData?.hora_retiro} />
            </div>
          )}
        </div>
        <svg className="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}
