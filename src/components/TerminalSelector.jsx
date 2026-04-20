import { TERMINALS } from '../constants';

export default function TerminalSelector({ value, onChange, required = false, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Terminal
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
        required={required}
      >
        <option value="">Seleccionar terminal...</option>
        {TERMINALS.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
