import { formatDate } from './helpers';

const DAY_MS = 1000 * 60 * 60 * 24;

export const DOCUMENT_CHECKLIST_FIELDS = [
  { itemId: 'padron', label: 'Padrón vehicular', dateKeys: ['padron_vencimiento'] },
  { itemId: 'permiso_circulacion', label: 'Permiso de circulación', dateKeys: ['permiso_circulacion_vencimiento'] },
  { itemId: 'soap', label: 'SOAP', dateKeys: ['soap_vencimiento'] },
  { itemId: 'cert_rt', label: 'Cert. RT u homologación', dateKeys: ['cert_rt_vencimiento', 'revision_tecnica'] },
  { itemId: 'cert_gases', label: 'Cert. gases u homologación', dateKeys: ['cert_gases_vencimiento'] },
  { itemId: 'tag', label: 'TAG', valueKey: 'tag_numero' },
];

function localToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getExpirationInfo(dateStr, alertDays = 7) {
  const exp = parseDate(dateStr);
  if (!exp) {
    return { status: 'sin_fecha', daysRemaining: null, date: null, dateStr: '' };
  }

  const diffDays = Math.ceil((exp.getTime() - localToday().getTime()) / DAY_MS);
  if (diffDays < 0) {
    return { status: 'vencido', daysRemaining: diffDays, date: exp, dateStr };
  }
  if (diffDays <= alertDays) {
    return { status: 'por_vencer', daysRemaining: diffDays, date: exp, dateStr };
  }
  return { status: 'vigente', daysRemaining: diffDays, date: exp, dateStr };
}

function pickWorstDateInfo(docs, dateKeys) {
  const values = dateKeys.map(key => docs?.[key]).filter(Boolean);
  if (values.length === 0) return getExpirationInfo('');

  const infos = values.map(value => getExpirationInfo(value));
  return infos.find(info => info.status === 'vencido') ||
    infos.find(info => info.status === 'por_vencer') ||
    infos[0];
}

function documentStatusText(info) {
  if (info.status === 'vencido') return `Vencido ${formatDate(info.dateStr)}`;
  if (info.status === 'por_vencer') {
    if (info.daysRemaining === 0) return `Vence hoy ${formatDate(info.dateStr)}`;
    if (info.daysRemaining === 1) return `Vence mañana ${formatDate(info.dateStr)}`;
    return `Vence en ${info.daysRemaining} días ${formatDate(info.dateStr)}`;
  }
  if (info.status === 'vigente') return `Vence ${formatDate(info.dateStr)}`;
  return 'Sin fecha registrada';
}

export function buildDocumentChecklistInfo(docs) {
  const itemMeta = {};
  const checklistPatch = {};

  DOCUMENT_CHECKLIST_FIELDS.forEach(field => {
    if (field.valueKey) {
      const rawValue = docs?.[field.valueKey];
      const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
      const hasValue = Boolean(value);
      itemMeta[field.itemId] = {
        status: hasValue ? 'vigente' : 'sin_fecha',
        text: hasValue ? `${field.label}: ${value}` : `${field.label}: sin registro`,
        lockedState: hasValue ? undefined : 'malo',
      };
      checklistPatch[field.itemId] = hasValue
        ? { state: 'bueno', obs: '' }
        : { state: 'malo', obs: `${field.label} sin registro en documentación vehicular.` };
      return;
    }

    const info = docs ? pickWorstDateInfo(docs, field.dateKeys) : getExpirationInfo('');
    const missingDocs = !docs;
    const status = missingDocs ? 'sin_fecha' : info.status;
    const text = missingDocs ? 'Sin documentación registrada' : documentStatusText(info);
    const isBad = status === 'vencido' || status === 'sin_fecha';

    itemMeta[field.itemId] = {
      status,
      text,
      expiresAt: info.dateStr,
      daysRemaining: info.daysRemaining,
      lockedState: isBad ? 'malo' : undefined,
    };

    if (status === 'vencido') {
      checklistPatch[field.itemId] = {
        state: 'malo',
        obs: `${field.label} vencido el ${formatDate(info.dateStr)}.`,
      };
    } else if (status === 'sin_fecha') {
      checklistPatch[field.itemId] = {
        state: 'malo',
        obs: missingDocs
          ? `${field.label} sin documentación registrada para el vehículo.`
          : `${field.label} sin fecha de vencimiento registrada.`,
      };
    } else {
      checklistPatch[field.itemId] = { state: 'bueno', obs: '' };
    }
  });

  return { itemMeta, checklistPatch };
}

export function documentStatusClass(status) {
  if (status === 'vencido') return 'text-red-700 bg-red-50 border-red-200';
  if (status === 'por_vencer') return 'text-amber-700 bg-amber-50 border-amber-200';
  if (status === 'sin_fecha') return 'text-red-700 bg-red-50 border-red-200';
  return 'text-slate-600 bg-slate-50 border-slate-200';
}
