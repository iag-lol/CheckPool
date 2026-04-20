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

async function syncAllToSupabase() {
  if (!isSupabaseConfigured || !supabase) return;
  for (const key of Object.values(KEYS)) {
    const rows = getAll(key).map(appToRow);
    if (rows.length === 0) continue;
    const { error } = await supabase
      .from(TABLES[key])
      .upsert(rows, { onConflict: 'id' });
    if (error) throw error;
  }
}

export async function initializeAppData() {
  hydrateLocalCache();

  if (!isSupabaseConfigured || !supabase) {
    initializeSeedData();
    return { mode: 'local' };
  }

  const localSnapshot = Object.fromEntries(Object.values(KEYS).map(key => [key, getAll(key)]));
  const localHasData = Object.values(localSnapshot).some(items => items.length > 0);
  const remoteSnapshot = await fetchAllFromSupabase();
  const remoteHasData = Object.values(remoteSnapshot).some(items => items.length > 0);

  if (remoteHasData) {
    Object.entries(remoteSnapshot).forEach(([key, data]) => saveAll(key, data));
    return { mode: 'supabase' };
  }

  if (localHasData) {
    Object.entries(localSnapshot).forEach(([key, data]) => saveAll(key, data));
    await syncAllToSupabase();
    return { mode: 'supabase-migrated-local' };
  }

  initializeSeedData();
  await syncAllToSupabase();
  return { mode: 'supabase-seeded' };
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

// ----- Seed Data -----
export function initializeSeedData() {
  const existing = getAll(KEYS.vehicles);
  if (existing.length > 0) return; // Already initialized

  const now = new Date().toISOString();
  const mkId = () => generateId();

  // Vehicles
  const vehicles = [
    // US4 COLO COLO
    { id: mkId(), ppu: 'BBCD-12', marca: 'Mercedes-Benz', modelo: 'Sprinter', anio: 2022, tipo: 'Furgón', combustible: 'Diesel', terminal: 'US4 COLO COLO', status: 'disponible', color: 'Blanco', km: 45000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'RSTV-34', marca: 'Ford', modelo: 'Transit', anio: 2021, tipo: 'Furgón', combustible: 'Diesel', terminal: 'US4 COLO COLO', status: 'disponible', color: 'Blanco', km: 62000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'FGHJ-56', marca: 'Toyota', modelo: 'Hilux', anio: 2023, tipo: 'Camioneta', combustible: 'Diesel', terminal: 'US4 COLO COLO', status: 'disponible', color: 'Gris', km: 18000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'KLMN-78', marca: 'Volkswagen', modelo: 'Crafter', anio: 2020, tipo: 'Furgón', combustible: 'Diesel', terminal: 'US4 COLO COLO', status: 'disponible', color: 'Blanco', km: 88000, active: true, createdAt: now, updatedAt: now },

    // US6 LO BARNECHEA
    { id: mkId(), ppu: 'ABCE-22', marca: 'Renault', modelo: 'Master', anio: 2022, tipo: 'Furgón', combustible: 'Diesel', terminal: 'US6 LO BARNECHEA', status: 'disponible', color: 'Blanco', km: 33000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'PQRS-44', marca: 'Fiat', modelo: 'Ducato', anio: 2021, tipo: 'Furgón', combustible: 'Diesel', terminal: 'US6 LO BARNECHEA', status: 'disponible', color: 'Blanco', km: 51000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'TUVW-66', marca: 'Nissan', modelo: 'Navara', anio: 2023, tipo: 'Camioneta', combustible: 'Diesel', terminal: 'US6 LO BARNECHEA', status: 'disponible', color: 'Plateado', km: 12000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'WXYZ-88', marca: 'Mitsubishi', modelo: 'L200', anio: 2022, tipo: 'Camioneta', combustible: 'Diesel', terminal: 'US6 LO BARNECHEA', status: 'disponible', color: 'Negro', km: 27000, active: true, createdAt: now, updatedAt: now },

    // US4 EL SALTO
    { id: mkId(), ppu: 'BCDF-11', marca: 'Iveco', modelo: 'Daily', anio: 2021, tipo: 'Furgón', combustible: 'Diesel', terminal: 'US4 EL SALTO', status: 'disponible', color: 'Blanco', km: 74000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'EFGH-33', marca: 'Ford', modelo: 'Ranger', anio: 2023, tipo: 'Camioneta', combustible: 'Diesel', terminal: 'US4 EL SALTO', status: 'disponible', color: 'Azul', km: 9000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'IJKL-55', marca: 'Toyota', modelo: 'Land Cruiser', anio: 2022, tipo: 'SUV', combustible: 'Diesel', terminal: 'US4 EL SALTO', status: 'disponible', color: 'Blanco', km: 41000, active: true, createdAt: now, updatedAt: now },
    { id: mkId(), ppu: 'MNOP-77', marca: 'Hyundai', modelo: 'H350', anio: 2020, tipo: 'Furgón', combustible: 'Diesel', terminal: 'US4 EL SALTO', status: 'disponible', color: 'Blanco', km: 96000, active: true, createdAt: now, updatedAt: now },
  ];
  saveAll(KEYS.vehicles, vehicles);

  // Drivers
  const drivers = [
    // US4 COLO COLO
    { id: mkId(), nombre: 'Carlos Muñoz', rut: '12.345.678-9', licencia: 'A1', vencimiento_licencia: '2026-12-31', telefono: '+56912345678', terminal: 'US4 COLO COLO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Patricia Rojas', rut: '13.456.789-0', licencia: 'A3', vencimiento_licencia: '2025-06-30', telefono: '+56923456789', terminal: 'US4 COLO COLO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Rodrigo Soto', rut: '14.567.890-1', licencia: 'B', vencimiento_licencia: '2027-03-31', telefono: '+56934567890', terminal: 'US4 COLO COLO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Andrea Torres', rut: '15.678.901-2', licencia: 'A3', vencimiento_licencia: '2026-09-15', telefono: '+56945678901', terminal: 'US4 COLO COLO', active: true, createdAt: now, updatedAt: now },

    // US6 LO BARNECHEA
    { id: mkId(), nombre: 'Miguel Fuentes', rut: '16.789.012-3', licencia: 'A1', vencimiento_licencia: '2026-08-20', telefono: '+56956789012', terminal: 'US6 LO BARNECHEA', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Isabel Vera', rut: '17.890.123-4', licencia: 'A3', vencimiento_licencia: '2025-11-30', telefono: '+56967890123', terminal: 'US6 LO BARNECHEA', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Juan Paredes', rut: '18.901.234-5', licencia: 'B', vencimiento_licencia: '2027-01-15', telefono: '+56978901234', terminal: 'US6 LO BARNECHEA', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Marcela Cárdenas', rut: '19.012.345-6', licencia: 'A3', vencimiento_licencia: '2026-04-30', telefono: '+56989012345', terminal: 'US6 LO BARNECHEA', active: true, createdAt: now, updatedAt: now },

    // US4 EL SALTO
    { id: mkId(), nombre: 'Diego Ramírez', rut: '20.123.456-7', licencia: 'A1', vencimiento_licencia: '2026-07-31', telefono: '+56990123456', terminal: 'US4 EL SALTO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Catalina Morales', rut: '21.234.567-8', licencia: 'A3', vencimiento_licencia: '2025-10-31', telefono: '+56901234567', terminal: 'US4 EL SALTO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Sebastián Lagos', rut: '22.345.678-9', licencia: 'B', vencimiento_licencia: '2027-06-30', telefono: '+56912345679', terminal: 'US4 EL SALTO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Valentina Cruz', rut: '23.456.789-0', licencia: 'A3', vencimiento_licencia: '2026-02-28', telefono: '+56923456780', terminal: 'US4 EL SALTO', active: true, createdAt: now, updatedAt: now },
  ];
  saveAll(KEYS.drivers, drivers);

  // Supervisors
  const supervisors = [
    // US4 COLO COLO
    { id: mkId(), nombre: 'Luis Hernández', rut: '10.111.222-3', cargo: 'Supervisor Operaciones', telefono: '+56911111111', terminal: 'US4 COLO COLO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Carmen Díaz', rut: '11.222.333-4', cargo: 'Supervisora de Flota', telefono: '+56922222222', terminal: 'US4 COLO COLO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Marco Jiménez', rut: '12.333.444-5', cargo: 'Jefe de Patio', telefono: '+56933333333', terminal: 'US4 COLO COLO', active: true, createdAt: now, updatedAt: now },

    // US6 LO BARNECHEA
    { id: mkId(), nombre: 'Sandra Méndez', rut: '13.444.555-6', cargo: 'Supervisora de Flota', telefono: '+56944444444', terminal: 'US6 LO BARNECHEA', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Roberto Contreras', rut: '14.555.666-7', cargo: 'Jefe de Patio', telefono: '+56955555555', terminal: 'US6 LO BARNECHEA', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Mónica Vargas', rut: '15.666.777-8', cargo: 'Supervisor Operaciones', telefono: '+56966666666', terminal: 'US6 LO BARNECHEA', active: true, createdAt: now, updatedAt: now },

    // US4 EL SALTO
    { id: mkId(), nombre: 'Pablo Espinoza', rut: '16.777.888-9', cargo: 'Jefe de Patio', telefono: '+56977777777', terminal: 'US4 EL SALTO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Alejandra Reyes', rut: '17.888.999-0', cargo: 'Supervisora de Flota', telefono: '+56988888888', terminal: 'US4 EL SALTO', active: true, createdAt: now, updatedAt: now },
    { id: mkId(), nombre: 'Gonzalo Ortiz', rut: '18.999.000-1', cargo: 'Supervisor Operaciones', telefono: '+56999999999', terminal: 'US4 EL SALTO', active: true, createdAt: now, updatedAt: now },
  ];
  saveAll(KEYS.supervisors, supervisors);
}
