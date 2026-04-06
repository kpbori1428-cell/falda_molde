import React, { useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { PatternLayer } from '../lib/types';

interface SegmentationModalProps {
  segmentLayer: PatternLayer | null | undefined;
  segmentSelections: { mask: boolean[], color: string }[];
  handleSegmentClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  confirmSegmentation: () => void;
  setSegmentLayerId: (id: string | null) => void;
  setSegmentSelections: (selections: { mask: boolean[], color: string }[]) => void;
}

export default function SegmentationModal({
  segmentLayer,
  segmentSelections,
  handleSegmentClick,
  confirmSegmentation,
  setSegmentLayerId,
  setSegmentSelections
}: SegmentationModalProps) {
  const segmentCanvasRef = useRef<HTMLCanvasElement>(null);

  // Draw segmentation preview canvas
  useEffect(() => {
    if (!segmentLayer?.imageObj || !segmentCanvasRef.current) return;
    const canvas = segmentCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const imgW = segmentLayer.imageObj.width;
    const imgH = segmentLayer.imageObj.height;
    canvas.width = imgW;
    canvas.height = imgH;

    ctx.drawImage(segmentLayer.imageObj, 0, 0);

    if (segmentSelections.length > 0) {
      const imageData = ctx.getImageData(0, 0, imgW, imgH);
      for (const sel of segmentSelections) {
        const r = parseInt(sel.color.slice(1, 3), 16);
        const g = parseInt(sel.color.slice(3, 5), 16);
        const b = parseInt(sel.color.slice(5, 7), 16);
        for (let i = 0; i < sel.mask.length; i++) {
          if (sel.mask[i]) {
            const idx = i * 4;
            imageData.data[idx] = Math.round(imageData.data[idx] * 0.4 + r * 0.6);
            imageData.data[idx + 1] = Math.round(imageData.data[idx + 1] * 0.4 + g * 0.6);
            imageData.data[idx + 2] = Math.round(imageData.data[idx + 2] * 0.4 + b * 0.6);
            imageData.data[idx + 3] = Math.max(imageData.data[idx + 3], 180);
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
  }, [segmentLayer, segmentSelections]);

  if (!segmentLayer || !segmentLayer.imageObj) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-w-4xl max-h-full w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Segmentar: {segmentLayer.name}</span>
            <span className="text-xs text-neutral-400">Clic en un elemento para seleccionarlo. Clic de nuevo para deseleccionar.</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">{segmentSelections.length} seleccionado{segmentSelections.length !== 1 ? 's' : ''}</span>
            <button
              onClick={confirmSegmentation}
              disabled={segmentSelections.length === 0}
              className="py-1.5 px-3 bg-green-600 hover:bg-green-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Confirmar
            </button>
            <button
              onClick={() => { setSegmentLayerId(null); setSegmentSelections([]); }}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Canvas */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center" style={{ background: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', backgroundColor: '#111' }}>
          <canvas
            ref={segmentCanvasRef}
            onClick={handleSegmentClick}
            className="max-w-full max-h-full object-contain cursor-crosshair drop-shadow-2xl"
            style={{ imageRendering: 'auto' }}
          />
        </div>
      </div>
    </div>
  );
}
