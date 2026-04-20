export const TERMINALS = [
  'US4 COLO COLO',
  'US4 LO BARNECHEA',
  'US4 ESCUELA MILITAR',
  'US6 COLO COLO',
  'US6 LO BARNECHEA',
  'US6 LO ECHEVERS',
  'US6 EL ROBLE',
  'US6 LA REINA',
  'US4 EL SALTO'
];

export const CHECKLIST_ITEMS = {
  documentos: {
    label: 'A. Documentos / Implementos',
    items: [
      { id: 'padron', label: 'Padrón vehicular' },
      { id: 'permiso_circulacion', label: 'Permiso de circulación' },
      { id: 'soap', label: 'SOAP' },
      { id: 'cert_rt', label: 'Cert. RT u homologación' },
      { id: 'cert_gases', label: 'Cert. gases u homologación' },
      { id: 'tag', label: 'TAG' },
      { id: 'tarjeta', label: 'Tarjeta' },
      { id: 'rueda_repuesto', label: 'Rueda de repuesto' },
      { id: 'gata', label: 'Gata y llave de ruedas' },
      { id: 'botiquin', label: 'Botiquín' },
      { id: 'triangulo', label: 'Triángulo' },
      { id: 'extintor', label: 'Extintor' },
    ]
  },
  carroceria: {
    label: 'B. Estado Carrocería',
    items: [
      { id: 'vidrios_front', label: 'Vidrios frontales' },
      { id: 'espejo_retro', label: 'Espejo retrovisor' },
      { id: 'espejo_izq', label: 'Espejo izquierdo' },
      { id: 'luces_front', label: 'Luces frontales' },
      { id: 'direcc_front', label: 'Direccionales frontales' },
      { id: 'carroceria_front', label: 'Carrocería frontal' },
      { id: 'carroceria_izq', label: 'Carrocería parte izquierda' },
      { id: 'vidrios_tras', label: 'Vidrios traseros' },
      { id: 'tercera_luz', label: 'Tercera luz de freno' },
      { id: 'espejo_der', label: 'Espejo derecho' },
      { id: 'luces_tras', label: 'Luces traseras' },
      { id: 'direcc_tras', label: 'Direccionales traseras' },
      { id: 'carroceria_tras', label: 'Carrocería trasera' },
      { id: 'carroceria_der', label: 'Carrocería parte derecha' },
    ]
  },
  otros: {
    label: 'C. Otros',
    items: [
      { id: 'combustible', label: 'Combustible' },
      { id: 'limpieza_int', label: 'Limpieza interior' },
      { id: 'limpieza_ext', label: 'Limpieza exterior' },
      { id: 'neumaticos', label: 'Neumáticos' },
      { id: 'estado_general', label: 'Estado general' },
    ]
  }
};

export const STATUS = {
  PENDING: 'PENDIENTE',
  CLOSED: 'CERRADO',
  LATE: 'TARDÍO',
  WITH_DAMAGE: 'CON DAÑO',
  LATE_WITH_DAMAGE: 'TARDÍO CON DAÑO'
};

export const MAX_USE_HOURS = 3;
export const ADMIN_PIN = '1234';

export const VEHICLE_TYPES = ['Camión', 'SUV', 'Furgón', 'Camioneta', 'Bus'];
export const FUEL_TYPES = ['Bencina', 'Diesel', 'Eléctrico', 'Híbrido'];
