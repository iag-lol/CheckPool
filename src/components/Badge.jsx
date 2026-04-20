export default function Badge({ status, size = 'sm' }) {
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-sm font-semibold' : 'px-2 py-0.5 text-xs font-medium';

  const colorMap = {
    PENDIENTE: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    CERRADO: 'bg-green-100 text-green-800 border border-green-300',
    'TARDÍO': 'bg-red-100 text-red-800 border border-red-300',
    'CON DAÑO': 'bg-orange-100 text-orange-800 border border-orange-300',
    'TARDÍO CON DAÑO': 'bg-red-200 text-red-900 border border-red-400',
    disponible: 'bg-green-100 text-green-800 border border-green-300',
    en_uso: 'bg-blue-100 text-blue-800 border border-blue-300',
    mantenimiento: 'bg-gray-100 text-gray-800 border border-gray-300',
    activo: 'bg-green-100 text-green-800 border border-green-300',
    inactivo: 'bg-gray-100 text-gray-600 border border-gray-300',
    vencido: 'bg-red-100 text-red-800 border border-red-300',
  };

  const labelMap = {
    PENDIENTE: 'PENDIENTE',
    CERRADO: 'CERRADO',
    'TARDÍO': 'TARDÍO',
    'CON DAÑO': 'CON DAÑO',
    'TARDÍO CON DAÑO': 'TARDÍO CON DAÑO',
    disponible: 'DISPONIBLE',
    en_uso: 'EN USO',
    mantenimiento: 'MANTENIMIENTO',
    activo: 'ACTIVO',
    inactivo: 'INACTIVO',
    vencido: 'VENCIDO',
  };

  const cls = colorMap[status] || 'bg-gray-100 text-gray-700 border border-gray-300';
  const label = labelMap[status] || status;

  return (
    <span className={`inline-flex items-center rounded-full ${sizeClasses} ${cls} whitespace-nowrap`}>
      {label}
    </span>
  );
}
