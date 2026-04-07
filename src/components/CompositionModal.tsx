import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Plus, Trash2, Layers, Move, Scissors, Droplet, Zap, ZoomIn, ZoomOut, Maximize, Lock, Unlock, Copy } from 'lucide-react';
import { PatternLayer, createDefaultLayer } from '../lib/types';
import { ControlInput } from './UI';

interface CompositionModalProps {
  initialLayers: PatternLayer[];
  onConfirm: (mergedImageSrc: string, mergedImageObj: HTMLImageElement, subLayers: PatternLayer[]) => void;
  onClose: () => void;
}

export default function CompositionModal({
  initialLayers,
  onConfirm,
  onClose
}: CompositionModalProps) {
  // Deep clone initial layers and ensure they have no parentId within this isolated workspace
  const [layers, setLayers] = useState<PatternLayer[]>(
    initialLayers.map(l => ({ ...l, parentId: null }))
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    layers.length > 0 ? layers[0].id : null
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activeLayer = layers.find(l => l.id === selectedLayerId);

  // Render logic for the internal canvas
  const renderComposition = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw from bottom to top
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || !layer.imageObj) continue;

      const imgW = layer.imageObj.width;
      const imgH = layer.imageObj.height;

      // For the composition tool, we treat everything as manual placement relative to center
      const pxPerCm = 20; // Internal constant for this workspace
      const renderW = (Number(layer.imageWidthCm) || 8) * (layer.manualScale || 1) * pxPerCm;
      const renderH = (imgH / imgW) * renderW;

      ctx.globalAlpha = layer.opacity / 100;
      ctx.save();
      ctx.translate(canvas.width / 2 + layer.posX * pxPerCm, canvas.height / 2 + layer.posY * pxPerCm);
      ctx.rotate((layer.manualRotation || 0) * Math.PI / 180);
      ctx.scale(layer.flipVertical ? -1 : 1, 1);
      ctx.drawImage(layer.imageObj, -renderW / 2, -renderH / 2, renderW, renderH);
      ctx.restore();
    }
    ctx.globalAlpha = 1.0;
  }, [layers]);

  useEffect(() => {
    renderComposition();
  }, [renderComposition]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - pan.x) / scale;
    const y = (e.clientY - rect.top - pan.y) / scale;

    // Check if clicked on a layer (top-down)
    const pxPerCm = 20;
    const canvasCenterX = rect.width / (2 * scale);
    const canvasCenterY = rect.height / (2 * scale);

    let foundId: string | null = null;
    for (const layer of layers) {
        if (!layer.imageObj || layer.locked) continue;
        const imgW = layer.imageObj.width;
        const imgH = layer.imageObj.height;
        const renderW = (Number(layer.imageWidthCm) || 8) * (layer.manualScale || 1) * pxPerCm;
        const renderH = (imgH / imgW) * renderW;

        const lx = canvasCenterX + layer.posX * pxPerCm;
        const ly = canvasCenterY + layer.posY * pxPerCm;

        if (x >= lx - renderW/2 && x <= lx + renderW/2 && y >= ly - renderH/2 && y <= ly + renderH/2) {
            foundId = layer.id;
            break;
        }
    }

    if (foundId) {
        setSelectedLayerId(foundId);
        setIsDraggingLayer(true);
        setDragStart({ x, y });
    } else {
        setIsDraggingView(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingView) {
        setPan({
            x: pan.x + (e.clientX - dragStart.x),
            y: pan.y + (e.clientY - dragStart.y)
        });
        setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDraggingLayer && activeLayer) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left - pan.x) / scale;
        const y = (e.clientY - rect.top - pan.y) / scale;
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        const pxPerCm = 20;
        setLayers(layers.map(l => l.id === selectedLayerId ? {
            ...l,
            posX: l.posX + dx / pxPerCm,
            posY: l.posY + dy / pxPerCm
        } : l));
        setDragStart({ x, y });
    }
  };

  const handlePointerUp = () => {
    setIsDraggingView(false);
    setIsDraggingLayer(false);
  };

  const handleFinalConfirm = () => {
    const canvas = document.createElement('canvas');
    // Calculate bounding box of all layers
    const pxPerCm = 40; // Higher res for the final smart object
    canvas.width = 1000;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d')!;

    // Draw everything to the final high-res canvas
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible || !layer.imageObj) continue;
        const imgW = layer.imageObj.width;
        const imgH = layer.imageObj.height;
        const renderW = (Number(layer.imageWidthCm) || 8) * (layer.manualScale || 1) * pxPerCm;
        const renderH = (imgH / imgW) * renderW;
        ctx.globalAlpha = layer.opacity / 100;
        ctx.save();
        ctx.translate(canvas.width / 2 + layer.posX * pxPerCm, canvas.height / 2 + layer.posY * pxPerCm);
        ctx.rotate((layer.manualRotation || 0) * Math.PI / 180);
        ctx.scale(layer.flipVertical ? -1 : 1, 1);
        ctx.drawImage(layer.imageObj, -renderW / 2, -renderH / 2, renderW, renderH);
        ctx.restore();
    }

    const src = canvas.toDataURL('image/png');
    const img = new Image();
    img.onload = () => {
        onConfirm(src, img, layers);
    };
    img.src = src;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar Mini */}
        <div className="w-full md:w-72 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <span className="font-bold text-white text-sm">Smart Object Editor</span>
                <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded"><X size={16}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                <div className="flex gap-2 mb-2">
                    <button
                        onClick={() => {
                            const nl = createDefaultLayer(layers.length + 1);
                            setLayers([nl, ...layers]);
                            setSelectedLayerId(nl.id);
                        }}
                        className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs rounded border border-neutral-700 flex items-center justify-center gap-1"
                    >
                        <Plus size={12}/> Capa
                    </button>
                </div>

                {layers.map((l, i) => (
                    <div
                        key={l.id}
                        onClick={() => setSelectedLayerId(l.id)}
                        className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${selectedLayerId === l.id ? 'border-blue-500 bg-blue-500/10' : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'}`}
                    >
                        <div className="w-6 h-6 bg-neutral-900 rounded border border-neutral-800 shrink-0 overflow-hidden">
                            {l.imageSrc && <img src={l.imageSrc} className="w-full h-full object-contain" />}
                        </div>
                        <span className="text-[10px] truncate flex-1">{l.name}</span>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            setLayers(layers.filter(x => x.id !== l.id));
                        }} className="p-1 text-neutral-600 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                ))}
            </div>

            {activeLayer && (
                <div className="p-4 border-t border-neutral-800 bg-neutral-950 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Propiedades</span>
                        <button onClick={() => setLayers(layers.map(l => l.id === selectedLayerId ? {...l, locked: !l.locked} : l))} className="text-neutral-400">
                            {activeLayer.locked ? <Lock size={12} className="text-amber-500"/> : <Unlock size={12}/>}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <ControlInput label="Pos X" value={activeLayer.posX} setValue={(v:number) => setLayers(layers.map(l => l.id === selectedLayerId ? {...l, posX: v} : l))} min={-50} max={50} unit="cm" />
                        <ControlInput label="Pos Y" value={activeLayer.posY} setValue={(v:number) => setLayers(layers.map(l => l.id === selectedLayerId ? {...l, posY: v} : l))} min={-50} max={50} unit="cm" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <ControlInput label="Escala" value={activeLayer.manualScale} setValue={(v:number) => setLayers(layers.map(l => l.id === selectedLayerId ? {...l, manualScale: v} : l))} min={0.1} max={5} step={0.1} unit="x" />
                        <ControlInput label="Rotar" value={activeLayer.manualRotation} setValue={(v:number) => setLayers(layers.map(l => l.id === selectedLayerId ? {...l, manualRotation: v} : l))} min={-360} max={360} unit="°" />
                    </div>
                    <ControlInput label="Opacidad" value={activeLayer.opacity} setValue={(v:number) => setLayers(layers.map(l => l.id === selectedLayerId ? {...l, opacity: v} : l))} min={0} max={100} unit="%" />

                    <label className="w-full py-2 border border-dashed border-neutral-700 rounded flex items-center justify-center gap-2 cursor-pointer hover:bg-neutral-800 transition-colors">
                        <Layers size={12}/>
                        <span className="text-[10px] font-bold">Cambiar Imagen</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (re) => {
                                    const img = new Image();
                                    img.onload = () => setLayers(layers.map(l => l.id === selectedLayerId ? {...l, imageSrc: re.target?.result as string, imageObj: img} : l));
                                    img.src = re.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                            }
                        }} />
                    </label>
                </div>
            )}

            <div className="p-4 border-t border-neutral-800">
                <button
                    onClick={handleFinalConfirm}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center justify-center gap-2"
                >
                    <Check size={14}/> Aplicar Cambios
                </button>
            </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative bg-[#0a0a0a] overflow-hidden" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
            <div className="absolute inset-0 flex items-center justify-center" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
                <div className="relative shadow-2xl">
                    {/* Checkerboard bg */}
                    <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px', backgroundColor: '#080808' }}></div>
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={800}
                        className="relative z-10 block"
                    />
                </div>
            </div>

            {/* Floating Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900/80 backdrop-blur border border-neutral-700 p-2 rounded-full shadow-xl">
                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="p-2 hover:bg-neutral-800 rounded-full"><ZoomOut size={16}/></button>
                <span className="text-xs font-mono w-12 text-center text-neutral-400">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(5, s + 0.1))} className="p-2 hover:bg-neutral-800 rounded-full"><ZoomIn size={16}/></button>
                <div className="w-px h-4 bg-neutral-700 mx-1"></div>
                <button onClick={() => { setScale(1); setPan({x:0, y:0}); }} className="p-2 hover:bg-neutral-800 rounded-full"><Maximize size={16}/></button>
            </div>
        </div>
    </div>
  );
}
