import { useRef, useState } from 'react';
import { compressImage } from '../utils/helpers';

export default function PhotoUpload({ label, required = false, multiple = false, onPhotos, initialPhotos = [] }) {
  const inputRef = useRef(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [loading, setLoading] = useState(false);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)));
      const newPhotos = multiple ? [...photos, ...compressed] : compressed;
      setPhotos(newPhotos);
      onPhotos(newPhotos);
    } catch (err) {
      console.error('Error compressing images:', err);
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    onPhotos(updated);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-orange-500">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm text-gray-600">Procesando...</span>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-1 text-sm text-gray-600">Toca para tomar foto o seleccionar archivo</p>
            <p className="text-xs text-gray-400">JPG, PNG – máx. 1200px</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {photos.map((photo, idx) => (
            <div key={idx} className="relative group">
              <img
                src={photo}
                alt={`foto ${idx + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              <span className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>
      )}

      {required && photos.length === 0 && (
        <p className="text-xs text-gray-400">Se requiere al menos una foto</p>
      )}
    </div>
  );
}
