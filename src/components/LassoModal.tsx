import React, { useRef, useEffect, useState, useCallback } from 'react';
import { X, Check, MousePointer2 } from 'lucide-react';
import { PatternLayer } from '../lib/types';

interface LassoModalProps {
  layer: PatternLayer;
  onConfirm: (points: { x: number, y: number }[]) => void;
  onClose: () => void;
}

export default function LassoModal({ layer, onConfirm, onClose }: LassoModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [points, setPoints] = useState<{ x: number, y: number }[]>([]);
  const [isClosing, setIsClosing] = useState(false);

  const draw = useCallback(() => {
    if (!layer.imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(layer.imageObj, 0, 0);

    if (points.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      if (isClosing) ctx.closePath();
      ctx.stroke();
      if (isClosing) ctx.fill();

      // Draw points
      ctx.fillStyle = '#fff';
      for (const p of points) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
  }, [layer.imageObj, points, isClosing]);

  useEffect(() => {
    if (layer.imageObj && canvasRef.current) {
        canvasRef.current.width = layer.imageObj.width;
        canvasRef.current.height = layer.imageObj.height;
    }
    draw();
  }, [layer.imageObj, points, isClosing, draw]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!layer.imageObj || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const sx = layer.imageObj.width / rect.width;
    const sy = layer.imageObj.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;

    // If clicking near first point, close loop
    if (points.length > 2) {
        const dx = x - points[0].x;
        const dy = y - points[0].y;
        if (Math.sqrt(dx*dx + dy*dy) < 15 * sx) {
            setIsClosing(true);
            return;
        }
    }

    setPoints([...points, { x, y }]);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-w-4xl max-h-full w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Recorte Manual: {layer.name}</span>
            <span className="text-xs text-neutral-400">Dibuja un polígono. Haz clic en el primer punto para cerrar el lazo.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
                onClick={() => onConfirm(points)}
                disabled={points.length < 3}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Extraer Selección
            </button>
            <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center" style={{ background: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', backgroundColor: '#111' }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="max-w-full max-h-full object-contain cursor-crosshair drop-shadow-2xl"
              style={{ imageRendering: 'auto' }}
            />
        </div>
      </div>
    </div>
  );
}
