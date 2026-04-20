import { useMemo, useState } from 'react';
import Badge from './Badge';
import { formatDateTime, formatDate, formatDuration, calcTimeUse, calcDelay } from '../utils/helpers';
import { vehiclesService, driversService, supervisorsService } from '../services/storage';
import { CHECKLIST_ITEMS } from '../constants';

function SectionTitle({ children }) {
  return (
    <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wide border-b border-orange-200 pb-1 mb-3">
      {children}
    </h3>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-1 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 font-medium min-w-[140px]">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value || '—'}</span>
    </div>
  );
}

function ChecklistView({ data, items }) {
  if (!data) return <p className="text-sm text-gray-400 italic">Sin datos de checklist</p>;
  return (
    <div className="space-y-4">
      {Object.entries(items).map(([sectionKey, section]) => (
        <div key={sectionKey}>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{section.label}</h4>
          <div className="space-y-1">
            {section.items.map(item => {
              const itemData = data[item.id] || {};
              const stateColors = {
                bueno: 'text-green-700 bg-green-50',
                malo: 'text-red-700 bg-red-50',
                no_aplica: 'text-gray-500 bg-gray-50',
              };
              const stateLabels = { bueno: 'Bueno', malo: 'Malo', no_aplica: 'N/A' };
              return (
                <div key={item.id} className={`flex flex-col p-2 rounded ${stateColors[itemData.state] || 'bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs">{item.label}</span>
                    <span className="text-xs font-semibold">{stateLabels[itemData.state] || '—'}</span>
                  </div>
                  {itemData.state === 'malo' && itemData.obs && (
                    <p className="text-xs text-red-600 mt-0.5 italic">{itemData.obs}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RecordModal({ record, onClose }) {
  const [tab, setTab] = useState('general');

  const vehicle = useMemo(() => {
    return record ? vehiclesService.getById(record.vehicleId) : null;
  }, [record]);
  const driver = useMemo(() => {
    return record ? driversService.getById(record.driverId) : null;
  }, [record]);
  const supervisor = useMemo(() => {
    return record ? supervisorsService.getById(record.supervisorId) : null;
  }, [record]);

  if (!record) return null;

  const delivery = record.deliveryData || {};
  const reception = record.receptionData || {};
  const timeUse = (delivery.hora_retiro && reception.hora_devolucion)
    ? calcTimeUse(delivery.hora_retiro, reception.hora_devolucion)
    : null;
  const delay = (delivery.hora_retiro && reception.hora_devolucion)
    ? calcDelay(delivery.hora_retiro, reception.hora_devolucion)
    : null;
  const distance = delivery.km_salida && reception.km_retorno
    ? Math.max(0, parseInt(reception.km_retorno) - parseInt(delivery.km_salida))
    : null;

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'checklist', label: 'Checklist' },
    { id: 'fotos', label: 'Fotos' },
    { id: 'firmas', label: 'Firmas' },
    { id: 'danos', label: 'Daños' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-gray-900">{record.folio}</h2>
              <Badge status={record.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{record.terminal} • {formatDate(record.fecha)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none p-1"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'general' && (
            <div className="space-y-4">
              <div>
                <SectionTitle>Datos Generales</SectionTitle>
                <InfoRow label="Folio" value={record.folio} />
                <InfoRow label="Terminal" value={record.terminal} />
                <InfoRow label="Fecha" value={formatDate(record.fecha)} />
                <InfoRow label="Estado" value={<Badge status={record.status} />} />
              </div>
              <div>
                <SectionTitle>Vehículo</SectionTitle>
                <InfoRow label="PPU" value={vehicle?.ppu} />
                <InfoRow label="Marca / Modelo" value={vehicle ? `${vehicle.marca} ${vehicle.modelo}` : '—'} />
                <InfoRow label="Año" value={vehicle?.anio} />
                <InfoRow label="Tipo" value={vehicle?.tipo} />
              </div>
              <div>
                <SectionTitle>Conductor</SectionTitle>
                <InfoRow label="Nombre" value={driver?.nombre} />
                <InfoRow label="RUT" value={driver?.rut} />
                <InfoRow label="Licencia" value={driver?.licencia} />
              </div>
              <div>
                <SectionTitle>Supervisor</SectionTitle>
                <InfoRow label="Nombre" value={supervisor?.nombre} />
                <InfoRow label="Cargo" value={supervisor?.cargo} />
              </div>
              <div>
                <SectionTitle>Entrega</SectionTitle>
                <InfoRow label="Hora solicitud" value={delivery.hora_solicitud} />
                <InfoRow label="Hora retiro" value={delivery.hora_retiro} />
                <InfoRow label="KM Salida" value={delivery.km_salida} />
                <InfoRow label="Motivo uso" value={delivery.motivo} />
                <InfoRow label="Destino / recorrido" value={delivery.destino} />
              </div>
              {reception.hora_devolucion && (
                <div>
                  <SectionTitle>Recepción</SectionTitle>
                  <InfoRow label="Hora devolución" value={reception.hora_devolucion} />
                  <InfoRow label="KM Retorno" value={reception.km_retorno} />
                  {timeUse && <InfoRow label="Tiempo uso" value={formatDuration(timeUse.hours, timeUse.minutes)} />}
                  {distance !== null && <InfoRow label="Distancia recorrida" value={`${distance} km`} />}
                  {delay && (
                    <InfoRow
                      label="Atraso"
                      value={delay.isLate
                        ? <span className="text-red-600 font-semibold">Sí — {formatDuration(delay.delayHours, delay.delayMins)}</span>
                        : <span className="text-green-600">No</span>}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'checklist' && (
            <div className="space-y-6">
              <div>
                <SectionTitle>Checklist Entrega</SectionTitle>
                <ChecklistView data={delivery.checklist} items={CHECKLIST_ITEMS} />
              </div>
              {reception.checklist && (
                <div>
                  <SectionTitle>Checklist Recepción</SectionTitle>
                  <ChecklistView data={reception.checklist} items={CHECKLIST_ITEMS} />
                </div>
              )}
            </div>
          )}

          {tab === 'fotos' && (
            <div className="space-y-6">
              {delivery.fotos && Object.keys(delivery.fotos).length > 0 && (
                <div>
                  <SectionTitle>Fotos Entrega</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(delivery.fotos).map(([key, url]) => url && (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</p>
                        <img src={url} alt={key} className="w-full h-36 object-cover rounded-lg border border-gray-200" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {reception.fotos && Object.keys(reception.fotos).length > 0 && (
                <div>
                  <SectionTitle>Fotos Recepción</SectionTitle>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(reception.fotos).map(([key, url]) => url && (
                      <div key={key} className="space-y-1">
                        <p className="text-xs text-gray-500 capitalize">{key.replace('_', ' ')}</p>
                        <img src={url} alt={key} className="w-full h-36 object-cover rounded-lg border border-gray-200" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(!delivery.fotos || Object.keys(delivery.fotos).length === 0) &&
               (!reception.fotos || Object.keys(reception.fotos).length === 0) && (
                <p className="text-sm text-gray-400 italic text-center py-8">Sin fotos disponibles</p>
              )}
            </div>
          )}

          {tab === 'firmas' && (
            <div className="space-y-4">
              {delivery.firma_supervisor && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Firma Supervisor (Entrega)</p>
                  <img src={delivery.firma_supervisor} alt="firma supervisor" className="border border-gray-200 rounded-lg max-h-32 bg-white" />
                </div>
              )}
              {delivery.firma_conductor && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Firma Conductor (Entrega)</p>
                  <img src={delivery.firma_conductor} alt="firma conductor" className="border border-gray-200 rounded-lg max-h-32 bg-white" />
                </div>
              )}
              {reception.firma_receptor && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Firma Receptor (Recepción)</p>
                  <img src={reception.firma_receptor} alt="firma receptor" className="border border-gray-200 rounded-lg max-h-32 bg-white" />
                </div>
              )}
              {reception.firma_conductor && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Firma Conductor (Recepción)</p>
                  <img src={reception.firma_conductor} alt="firma conductor recepcion" className="border border-gray-200 rounded-lg max-h-32 bg-white" />
                </div>
              )}
              {!delivery.firma_supervisor && !delivery.firma_conductor && !reception.firma_receptor && !reception.firma_conductor && (
                <p className="text-sm text-gray-400 italic text-center py-8">Sin firmas disponibles</p>
              )}
            </div>
          )}

          {tab === 'danos' && (
            <div className="space-y-3">
              {(record.damages && record.damages.length > 0) ? (
                record.damages.map((d, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white text-red-700 border border-red-200 font-bold">
                        {d.ticket || `Ticket ${idx + 1}`}
                      </span>
                      <span className="font-semibold text-sm">{d.zona}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        d.severidad === 'grave' ? 'bg-red-200 text-red-800' :
                        d.severidad === 'moderado' ? 'bg-orange-200 text-orange-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {d.severidad}
                      </span>
                    </div>
                    <p className="text-xs text-red-600 mb-1">
                      Registrado: {formatDateTime(d.createdAt || d.lastObservedAt)}
                      {d.lastObservedAt && d.lastObservedAt !== d.createdAt ? ` · Última actualización: ${formatDateTime(d.lastObservedAt)}` : ''}
                    </p>
                    <p className="text-sm text-gray-700 mb-2">{d.descripcion}</p>
                    {d.fotos && d.fotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-1">
                        {d.fotos.map((f, i) => (
                          <img key={i} src={f} alt="" className="w-full h-20 object-cover rounded" />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic text-center py-8">Sin daños registrados</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
