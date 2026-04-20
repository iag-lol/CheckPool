import { useRef, useState, useEffect, useCallback } from 'react';

export default function SignaturePad({ onSave, label = 'Firma', required = false, initialValue = null }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [saved, setSaved] = useState(!!initialValue);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialValue) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = initialValue;
    }
  }, [initialValue]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    setIsDrawing(true);
    setSaved(false);
    lastPos.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastPos.current = pos;
    setHasSig(true);
  }, [isDrawing]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    setSaved(false);
    onSave(null);
  };

  const saveSig = () => {
    if (!hasSig) return;
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL('image/png');
    onSave(dataURL);
    setSaved(true);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {saved && hasSig && (
          <span className="ml-2 text-green-600 text-xs font-normal">(guardada)</span>
        )}
      </label>
      <div className={`border-2 rounded-lg overflow-hidden ${saved && hasSig ? 'border-green-400' : 'border-gray-300'}`}>
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          className="signature-canvas w-full bg-white touch-none"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{ cursor: 'crosshair', display: 'block' }}
        />
      </div>
      <p className="text-xs text-gray-500">Firme dentro del recuadro usando el mouse o dedo</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clearCanvas}
          className="flex-1 py-2 px-3 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Limpiar
        </button>
        <button
          type="button"
          onClick={saveSig}
          disabled={!hasSig}
          className="flex-1 py-2 px-3 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Guardar firma
        </button>
      </div>
    </div>
  );
}
