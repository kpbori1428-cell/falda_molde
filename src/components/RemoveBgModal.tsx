import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Droplet } from 'lucide-react';
import { PatternLayer } from '../lib/types';
import { removeColor, getColorFromClick } from '../lib/imageUtils';
import { ControlInput } from './UI';

interface RemoveBgModalProps {
  layer: PatternLayer;
  onConfirm: (newImageSrc: string) => void;
  onClose: () => void;
}

export default function RemoveBgModal({ layer, onConfirm, onClose }: RemoveBgModalProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [targetColor, setTargetColor] = useState({ r: 0, g: 0, b: 0 });
  const [tolerance, setTolerance] = useState(20);

  const updatePreview = useCallback(() => {
    if (!layer.imageObj || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = layer.imageObj;
    canvas.width = img.width;
    canvas.height = img.height;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const newImageData = removeColor(imageData, targetColor, tolerance);
    ctx.putImageData(newImageData, 0, 0);
  }, [layer.imageObj, targetColor, tolerance]);

  useEffect(() => {
    updatePreview();
  }, [updatePreview]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!layer.imageObj) return;
    const color = getColorFromClick(e, layer.imageObj);
    setTargetColor(color);
  };

  const handleConfirm = () => {
    if (!previewCanvasRef.current) return;
    const dataUrl = previewCanvasRef.current.toDataURL('image/png');
    onConfirm(dataUrl);
  };
  
  const targetCssColor = `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col max-w-4xl max-h-full w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 shrink-0">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Quitar Fondo: {layer.name}</span>
            <span className="text-xs text-neutral-400">Clic en la imagen para seleccionar un color de fondo.</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleConfirm} className="py-1.5 px-3 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
              <Check className="w-3.5 h-3.5" /> Confirmar
            </button>
            <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Controls */}
          <div className="w-full md:w-56 p-4 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col gap-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md border border-neutral-700 shrink-0" style={{ backgroundColor: targetCssColor }}></div>
                <div className="flex flex-col">
                    <span className="text-xs text-neutral-400">Color Seleccionado</span>
                    <span className="text-sm font-mono">{targetCssColor}</span>
                </div>
             </div>
             <ControlInput
                label="Tolerancia"
                value={tolerance}
                setValue={setTolerance}
                min={0} max={150} step={1}
             />
             <div className="text-[11px] text-neutral-500 leading-relaxed">
                <Droplet className="w-3 h-3 inline-block -mt-0.5 mr-1" />
                Haz clic en la imagen para elegir el color a eliminar. Ajusta la "Tolerancia" para incluir colores similares.
             </div>
          </div>
          {/* Canvas */}
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center" style={{ background: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', backgroundColor: '#111' }}>
            <canvas
              ref={previewCanvasRef}
              onClick={handleCanvasClick}
              className="max-w-full max-h-full object-contain cursor-crosshair drop-shadow-2xl"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
