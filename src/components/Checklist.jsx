import { useMemo } from 'react';
import { buildDefaultChecklist } from '../utils/checklist';
import { documentStatusClass } from '../utils/documentation';

const STATES = [
  { value: 'bueno', label: 'Bueno', color: 'text-emerald-700 bg-emerald-50 border-emerald-400 ring-emerald-300' },
  { value: 'malo', label: 'Malo', color: 'text-red-700 bg-red-50 border-red-400 ring-red-300' },
];

export default function Checklist({ items, onChange, readOnly = false, initialData = {}, itemMeta = {} }) {
  const data = useMemo(() => {
    return { ...buildDefaultChecklist(items), ...initialData };
  }, [items, initialData]);

  const handleChange = (itemId, field, value) => {
    if (readOnly) return;
    const meta = itemMeta[itemId];
    if (field === 'state' && meta?.lockedState && value !== meta.lockedState) return;
    const updated = {
      ...data,
      [itemId]: {
        ...data[itemId],
        [field]: value,
        ...(field === 'state' && value !== 'malo' ? { obs: '' } : {}),
      },
    };
    onChange(updated);
  };

  const allIds = Object.values(items).flatMap(s => s.items.map(i => i.id));
  const countBad = allIds.filter(id => data[id]?.state === 'malo').length;
  const countGood = allIds.filter(id => data[id]?.state === 'bueno').length;

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-emerald-700 font-medium">{countGood} Buenos</span>
          </div>
          {countBad > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span className="text-red-700 font-medium">{countBad} Malos</span>
            </div>
          )}
          <div className="ml-auto text-xs text-gray-400">{allIds.length} ítems</div>
        </div>
      )}

      {Object.entries(items).map(([sectionKey, section]) => (
        <div key={sectionKey} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-slate-700 px-4 py-2.5">
            <h4 className="font-semibold text-white text-xs uppercase tracking-widest">{section.label}</h4>
          </div>
          <div className="divide-y divide-gray-100">
            {section.items.map((item, idx) => {
              const itemData = data[item.id] || { state: 'bueno', obs: '' };
              const isMalo = itemData.state === 'malo';
              const meta = itemMeta[item.id];
              return (
                <div key={item.id} className={`${isMalo ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isMalo && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                      <div className="min-w-0">
                        <span className={`text-sm ${isMalo ? 'text-red-800 font-medium' : 'text-gray-700'}`}>{item.label}</span>
                        {meta?.text && (
                          <span className={`mt-1 inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${documentStatusClass(meta.status)}`}>
                            {meta.status === 'vencido' ? 'VENCIDO - ' : meta.status === 'por_vencer' ? 'ALERTA - ' : meta.status === 'sin_fecha' ? 'SIN FECHA - ' : ''}
                            {meta.text}
                          </span>
                        )}
                      </div>
                    </div>
                    {readOnly ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${isMalo ? 'bg-red-100 text-red-700 border-red-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                        {isMalo ? 'MALO' : 'BUENO'}
                      </span>
                    ) : (
                      <div className="flex gap-1.5 flex-shrink-0">
                        {STATES.map(s => (
                          (() => {
                            const disabled = Boolean(meta?.lockedState && s.value !== meta.lockedState);
                            return (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => handleChange(item.id, 'state', s.value)}
                            disabled={disabled}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                              itemData.state === s.value
                                ? s.color + ' ring-1 ring-offset-1 shadow-sm'
                                : 'text-gray-500 bg-white border-gray-200 hover:border-gray-400 hover:text-gray-700'
                            }`}
                          >
                            {s.label}
                          </button>
                            );
                          })()
                        ))}
                      </div>
                    )}
                  </div>
                  {isMalo && (
                    <div className="px-4 pb-3">
                      {readOnly ? (
                        itemData.obs && (
                          <div className="flex items-start gap-2 bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                            <svg className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <p className="text-xs text-red-800">{itemData.obs}</p>
                          </div>
                        )
                      ) : (
                        <div className="relative">
                          <textarea
                            value={itemData.obs || ''}
                            onChange={e => handleChange(item.id, 'obs', e.target.value)}
                            placeholder="Descripción del problema (obligatorio)"
                            rows={2}
                            className="w-full text-xs border border-red-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none bg-white placeholder-red-300"
                            required
                          />
                          {!itemData.obs?.trim() && (
                            <span className="absolute top-2 right-2 text-red-400">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
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
