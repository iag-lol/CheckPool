import { generateDamageTicket, generateId } from '../utils/helpers';
import { isSupabaseConfigured, supabase } from './supabase';

// Storage keys
const KEYS = {
  vehicles: 'cp_vehicles',
  drivers: 'cp_drivers',
  supervisors: 'cp_supervisors',
  records: 'cp_records',
  damages: 'cp_damages',
  docs: 'cp_docs',
};

const TABLES = {
  [KEYS.vehicles]: 'vehicles',
  [KEYS.drivers]: 'drivers',
  [KEYS.supervisors]: 'supervisors',
  [KEYS.records]: 'records',
  [KEYS.damages]: 'damages',
  [KEYS.docs]: 'vehicle_docs',
};

const cache = {
  [KEYS.vehicles]: [],
  [KEYS.drivers]: [],
  [KEYS.supervisors]: [],
  [KEYS.records]: [],
  [KEYS.damages]: [],
  [KEYS.docs]: [],
};

const camelToSnake = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  vehicleId: 'vehicle_id',
  driverId: 'driver_id',
  supervisorId: 'supervisor_id',
  recordId: 'record_id',
  deliveryData: 'delivery_data',
  receptionData: 'reception_data',
  checklistItemId: 'checklist_item_id',
  checklistSection: 'checklist_section',
  checklistSectionLabel: 'checklist_section_label',
  lastStage: 'last_stage',
  lastRecordId: 'last_record_id',
  lastObservedAt: 'last_observed_at',
  resolvedAt: 'resolved_at',
};

const snakeToCamel = Object.entries(camelToSnake).reduce((acc, [camel, snake]) => {
  acc[snake] = camel;
  return acc;
}, {});

const nullableDateFields = new Set([
  'fecha',
  'vencimiento_licencia',
  'padron_vencimiento',
  'permiso_circulacion_vencimiento',
  'soap_vencimiento',
  'cert_rt_vencimiento',
  'cert_gases_vencimiento',
  'revision_tecnica',
]);

const nullableNumberFields = new Set(['anio', 'km']);

function rowToApp(row) {
  if (!row) return row;
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [snakeToCamel[key] || key, value])
  );
}

function appToRow(item) {
  const row = {};
  Object.entries(item || {}).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === '' && nullableDateFields.has(key)) {
      row[camelToSnake[key] || key] = null;
      return;
    }
    if (value === '' && nullableNumberFields.has(key)) {
      row[camelToSnake[key] || key] = null;
      return;
    }
    row[camelToSnake[key] || key] = value;
  });
  return row;
}

// ----- Generic CRUD -----

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function hydrateLocalCache() {
  Object.values(KEYS).forEach(key => {
    cache[key] = readLocal(key);
  });
}

function getAll(key) {
  return cache[key] || [];
}

function saveAll(key, data) {
  cache[key] = Array.isArray(data) ? data : [];
  localStorage.setItem(key, JSON.stringify(cache[key]));
}

async function persistUpsert(key, item) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from(TABLES[key])
    .upsert(appToRow(item), { onConflict: 'id' });
  if (error) {
    console.error(`Supabase upsert failed for ${TABLES[key]}:`, error);
    throw error;
  }
}

async function persistDelete(key, id) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from(TABLES[key]).delete().eq('id', id);
  if (error) {
    console.error(`Supabase delete failed for ${TABLES[key]}:`, error);
    throw error;
  }
}

function queuePersist(promise) {
  promise.catch(() => {
    // The UI is optimistic. Errors are logged in persist helpers.
  });
}

function getById(key, id) {
  return getAll(key).find(item => item.id === id) || null;
}

function save(key, item) {
  const all = getAll(key);
  const now = new Date().toISOString();
  const newItem = { ...item, id: item.id || generateId(), createdAt: now, updatedAt: now, active: true };
  all.push(newItem);
  saveAll(key, all);
  queuePersist(persistUpsert(key, newItem));
  return newItem;
}

function update(key, id, updates) {
  const all = getAll(key);
  const idx = all.findIndex(item => item.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  saveAll(key, all);
  queuePersist(persistUpsert(key, updated));
  return updated;
}

function deactivate(key, id) {
  return update(key, id, { active: false });
}

function remove(key, id) {
  const all = getAll(key).filter(item => item.id !== id);
  saveAll(key, all);
  queuePersist(persistDelete(key, id));
}

async function fetchAllFromSupabase() {
  const entries = await Promise.all(Object.values(KEYS).map(async key => {
    const { data, error } = await supabase
      .from(TABLES[key])
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return [key, (data || []).map(rowToApp)];
  }));
  return Object.fromEntries(entries);
}

export async function initializeAppData() {
  hydrateLocalCache();

  if (!isSupabaseConfigured || !supabase) {
    return { mode: 'local' };
  }

  const remoteSnapshot = await fetchAllFromSupabase();
  Object.entries(remoteSnapshot).forEach(([key, data]) => saveAll(key, data));
  return { mode: 'supabase' };
}

// ----- Vehicles -----
export const vehiclesService = {
  getAll: () => getAll(KEYS.vehicles),
  getActive: () => getAll(KEYS.vehicles).filter(v => v.active !== false),
  getById: id => getById(KEYS.vehicles, id),
  save: v => save(KEYS.vehicles, v),
  update: (id, u) => update(KEYS.vehicles, id, u),
  deactivate: id => deactivate(KEYS.vehicles, id),
  remove: id => remove(KEYS.vehicles, id),
  getByTerminal: terminal => getAll(KEYS.vehicles).filter(v => v.active !== false && v.terminal === terminal),
  getAvailableByTerminal: terminal =>
    getAll(KEYS.vehicles).filter(v => v.active !== false && v.terminal === terminal && v.status === 'disponible'),
};

// ----- Drivers -----
export const driversService = {
  getAll: () => getAll(KEYS.drivers),
  getActive: () => getAll(KEYS.drivers).filter(d => d.active !== false),
  getById: id => getById(KEYS.drivers, id),
  save: d => save(KEYS.drivers, d),
  update: (id, u) => update(KEYS.drivers, id, u),
  deactivate: id => deactivate(KEYS.drivers, id),
  remove: id => remove(KEYS.drivers, id),
  getByTerminal: terminal => getAll(KEYS.drivers).filter(d => d.active !== false && d.terminal === terminal),
};

// ----- Supervisors -----
export const supervisorsService = {
  getAll: () => getAll(KEYS.supervisors),
  getActive: () => getAll(KEYS.supervisors).filter(s => s.active !== false),
  getById: id => getById(KEYS.supervisors, id),
  save: s => save(KEYS.supervisors, s),
  update: (id, u) => update(KEYS.supervisors, id, u),
  deactivate: id => deactivate(KEYS.supervisors, id),
  remove: id => remove(KEYS.supervisors, id),
  getByTerminal: terminal => getAll(KEYS.supervisors).filter(s => s.active !== false && s.terminal === terminal),
};

// ----- Records -----
export const recordsService = {
  getAll: () => getAll(KEYS.records),
  getById: id => getById(KEYS.records, id),
  save: r => save(KEYS.records, r),
  update: (id, u) => update(KEYS.records, id, u),
  deactivate: id => deactivate(KEYS.records, id),
  remove: id => remove(KEYS.records, id),
  getByTerminal: terminal => getAll(KEYS.records).filter(r => r.terminal === terminal),
  getPending: () => getAll(KEYS.records).filter(r => r.status === 'PENDIENTE' && r.active !== false),
  getPendingByTerminal: terminal =>
    getAll(KEYS.records).filter(r => r.terminal === terminal && r.status === 'PENDIENTE' && r.active !== false),
};

// ----- Damages -----
export const damagesService = {
  getAll: () => getAll(KEYS.damages),
  getActive: () => getAll(KEYS.damages)
    .filter(d => d.active !== false && d.resolved !== true)
    .sort((a, b) => new Date(b.lastObservedAt || b.updatedAt || b.createdAt || 0) - new Date(a.lastObservedAt || a.updatedAt || a.createdAt || 0)),
  getById: id => getById(KEYS.damages, id),
  save: d => {
    const all = getAll(KEYS.damages);
    const now = new Date().toISOString();
    return save(KEYS.damages, {
      ticket: d.ticket || generateDamageTicket(all),
      resolved: d.resolved ?? false,
      source: d.source || 'manual',
      lastObservedAt: d.lastObservedAt || now,
      history: d.history || [{
        recordId: d.recordId,
        stage: d.stage || 'recepcion',
        description: d.descripcion || d.description || '',
        observedAt: d.lastObservedAt || now,
      }],
      ...d,
    });
  },
  update: (id, u) => update(KEYS.damages, id, u),
  deactivate: id => deactivate(KEYS.damages, id),
  getByVehicle: vehicleId =>
    getAll(KEYS.damages)
      .filter(d => d.vehicleId === vehicleId && d.active !== false && d.resolved !== true)
      .sort((a, b) => new Date(b.lastObservedAt || b.updatedAt || b.createdAt || 0) - new Date(a.lastObservedAt || a.updatedAt || a.createdAt || 0)),
  upsertChecklistTicket: ({ vehicleId, recordId, terminal, entry, stage }) => {
    const all = getAll(KEYS.damages);
    const now = new Date().toISOString();
    const existing = all.find(d =>
      d.vehicleId === vehicleId &&
      d.checklistItemId === entry.itemId &&
      d.source === 'checklist' &&
      d.active !== false &&
      d.resolved !== true
    );
    const historyEntry = {
      recordId,
      stage,
      description: entry.description,
      observedAt: now,
    };

    if (existing) {
      return update(KEYS.damages, existing.id, {
        terminal,
        recordId,
        checklistSection: entry.sectionKey,
        checklistSectionLabel: entry.sectionLabel,
        zona: entry.itemLabel,
        descripcion: entry.description,
        severidad: existing.severidad || (entry.sectionKey === 'carroceria' ? 'moderado' : 'leve'),
        lastStage: stage,
        lastRecordId: recordId,
        lastObservedAt: now,
        history: [...(existing.history || []), historyEntry],
      });
    }

    return save(KEYS.damages, {
      ticket: generateDamageTicket(all),
      vehicleId,
      recordId,
      terminal,
      source: 'checklist',
      checklistItemId: entry.itemId,
      checklistSection: entry.sectionKey,
      checklistSectionLabel: entry.sectionLabel,
      zona: entry.itemLabel,
      descripcion: entry.description,
      severidad: entry.sectionKey === 'carroceria' ? 'moderado' : 'leve',
      fotos: [],
      resolved: false,
      lastStage: stage,
      lastRecordId: recordId,
      lastObservedAt: now,
      history: [historyEntry],
    });
  },
  resolveChecklistTickets: ({ vehicleId, recordId, terminal, checklist, stage }) => {
    const all = getAll(KEYS.damages);
    const now = new Date().toISOString();
    return all
      .filter(d =>
        d.vehicleId === vehicleId &&
        d.source === 'checklist' &&
        d.checklistItemId &&
        d.active !== false &&
        d.resolved !== true &&
        checklist?.[d.checklistItemId]?.state === 'bueno'
      )
      .map(d => update(KEYS.damages, d.id, {
        terminal,
        recordId,
        resolved: true,
        resolvedAt: now,
        lastStage: stage,
        lastRecordId: recordId,
        lastObservedAt: now,
        history: [
          ...(d.history || []),
          {
            recordId,
            stage,
            description: 'Marcado como Bueno en checklist.',
            observedAt: now,
          },
        ],
      }));
  },
};

// ----- Docs -----
export const docsService = {
  getAll: () => getAll(KEYS.docs),
  getByVehicle: vehicleId => getAll(KEYS.docs).find(d => d.vehicleId === vehicleId && d.active !== false),
  save: d => save(KEYS.docs, d),
  update: (id, u) => update(KEYS.docs, id, u),
  deactivate: id => deactivate(KEYS.docs, id),
};
