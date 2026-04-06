import React, { useRef, useState, useEffect } from 'react';
import { Eye, EyeOff, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface CanvasAreaProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
  containerSize: { width: number; height: number; S: number; };
  pan: { x: number; y: number; };
  scale: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  previewCanvasWidth: number;
  previewCanvasHeight: number;
  bgColor: string;
  miniCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  miniCanvasSize: number;
  handleMiniPointerDown: (e: React.PointerEvent) => void;
  handleMiniPointerMove: (e: React.PointerEvent) => void;
  handleMiniPointerUp: (e: React.PointerEvent) => void;
  boxLeft: number;
  boxTop: number;
  boxW: number;
  boxH: number;
  zoomInView: () => void;
  resetView: () => void;
  zoomOutView: () => void;
}

export default function CanvasArea({
  containerRef, isDragging, handlePointerDown, handlePointerMove, handlePointerUp,
  containerSize, pan, scale, canvasRef, previewCanvasWidth, previewCanvasHeight, bgColor,
  miniCanvasRef, miniCanvasSize, handleMiniPointerDown, handleMiniPointerMove, handleMiniPointerUp,
  boxLeft, boxTop, boxW, boxH, zoomInView, resetView, zoomOutView
}: CanvasAreaProps) {
  const [showNavigator, setShowNavigator] = useState(true);

  return (
    <div className="flex-1 bg-neutral-950 relative overflow-hidden flex items-center justify-center p-8">
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      {/* Top Right UI Overlay */}
      <div className="absolute top-4 right-4 flex items-start gap-3 z-20">
        
        {/* Minimap / Navigator */}
        {showNavigator && (
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-2 shadow-xl flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">Navegador</span>
            </div>
            <div 
              className="relative bg-neutral-950 rounded border border-neutral-800 overflow-hidden cursor-crosshair touch-none"
              style={{ width: 160, height: 160 }}
              onPointerDown={handleMiniPointerDown}
              onPointerMove={handleMiniPointerMove}
              onPointerUp={handleMiniPointerUp}
              onPointerCancel={handleMiniPointerUp}
            >
              <canvas 
                ref={miniCanvasRef} 
                width={miniCanvasSize}
                height={miniCanvasSize}
                className="w-full h-full object-contain pointer-events-none"
                style={{ 
                  backgroundColor: bgColor === 'transparent' ? 'rgba(23, 23, 23, 0.5)' : bgColor,
                  backgroundImage: bgColor === 'transparent' ? 'linear-gradient(45deg, #262626 25%, transparent 25%), linear-gradient(-45deg, #262626 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #262626 75%), linear-gradient(-45deg, transparent 75%, #262626 75%)' : 'none',
                  backgroundSize: '8px 8px',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                }}
              />
              <div 
                className="absolute border border-red-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                style={{
                  left: `${boxLeft}px`,
                  top: `${boxTop}px`,
                  width: `${boxW}px`,
                  height: `${boxH}px`,
                }}
              />
            </div>
          </div>
        )}

        {/* Viewport Controls */}
        <div className="flex flex-col gap-2">
          <button onClick={() => setShowNavigator(!showNavigator)} className="w-10 h-10 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors shadow-lg group" title="Ocultar/Mostrar Navegador">
            {showNavigator ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={zoomInView} className="w-10 h-10 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors shadow-lg group" title="Acercar">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={resetView} className="w-10 h-10 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors shadow-lg group" title="Restaurar Visión">
            <Maximize className="w-5 h-5" />
          </button>
          <button onClick={zoomOutView} className="w-10 h-10 bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg flex items-center justify-center transition-colors shadow-lg group" title="Alejar">
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center overflow-hidden touch-none z-10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div 
          className="relative shadow-2xl ring-1 ring-white/10 origin-center" 
          style={{ 
            width: `${containerSize.S}px`, 
            height: `${containerSize.S}px`, 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s cubic-bezier(0.2, 0, 0, 1)'
          }}
        >
           <canvas
              ref={canvasRef}
              width={previewCanvasWidth}
              height={previewCanvasHeight}
              className="w-full h-full pointer-events-none relative"
              style={{ 
                backgroundColor: bgColor === 'transparent' ? 'rgba(23, 23, 23, 0.5)' : bgColor,
                backgroundImage: bgColor === 'transparent' ? 'linear-gradient(45deg, #262626 25%, transparent 25%), linear-gradient(-45deg, #262626 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #262626 75%), linear-gradient(-45deg, transparent 75%, #262626 75%)' : 'none',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                aspectRatio: `${previewCanvasWidth} / ${previewCanvasHeight}`
              }}
            />
        </div>
      </div>
    </div>
  );
}
