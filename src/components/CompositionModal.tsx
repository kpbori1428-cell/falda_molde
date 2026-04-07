import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Plus, Trash2, Layers, Move, Scissors, Droplet, Zap, ZoomIn, ZoomOut, Maximize, Lock, Unlock, Copy, ArrowUp, ArrowDown, RefreshCcw, ImagePlus } from 'lucide-react';
import { PatternLayer, createDefaultLayer, PlacementType } from '../lib/types';
import { ControlInput, CollapsibleSection } from './UI';
import SegmentationModal from './SegmentationModal';
import RemoveBgModal from './RemoveBgModal';
import { useImageEditor } from '../hooks/useImageEditor';
import { useAutoIntegration } from '../hooks/useAutoIntegration';
import { drawSingleLayer } from '../lib/canvasUtils';

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

  const updateLayer = (id: string, updates: Partial<PatternLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const {
    segmentLayer, segmentSelections, startSegmenting, handleSegmentClick,
    confirmSegmentation, setSegmentLayerId, setSegmentSelections,
    removeBgLayer, startRemovingBg, confirmRemoveBg, setRemoveBgLayerId
  } = useImageEditor(layers, setLayers);

  const { autoIntegrate } = useAutoIntegration({
    layers,
    updateLayer,
    renderPattern: (canvas, dpi, excludeId) => {
        const ctx = canvas.getContext('2d')!;
        ctx.clearRect(0,0, canvas.width, canvas.height);
        // Background for integration: combined other layers
        for (let i = layers.length - 1; i >= 0; i--) {
            const l = layers[i];
            if (l.id === excludeId || !l.visible || !l.imageObj) continue;
            // Simplified draw for sampling
            ctx.drawImage(l.imageObj, 0, 0, canvas.width, canvas.height);
        }
    }
  });

  const duplicateLayer = (id: string) => {
    const source = layers.find(l => l.id === id);
    if (!source) return;
    const newId = `copy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newLayer = { ...source, id: newId, name: `${source.name} (copia)` };
    const idx = layers.findIndex(l => l.id === id);
    const newLayers = [...layers];
    newLayers.splice(idx, 0, newLayer);
    setLayers(newLayers);
    setSelectedLayerId(newId);
  };

  const moveLayerUp = (index: number) => {
    if (index === 0) return;
    const newLayers = [...layers];
    const item = newLayers.splice(index, 1)[0];
    newLayers.splice(index - 1, 0, item);
    setLayers(newLayers);
  };

  const moveLayerDown = (index: number) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    const item = newLayers.splice(index, 1)[0];
    newLayers.splice(index + 1, 0, item);
    setLayers(newLayers);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const activeLayer = layers.find(l => l.id === selectedLayerId);

  // Render logic for the internal canvas using the shared drawSingleLayer
  const renderComposition = useCallback(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const pxPerCm = 20;
    const dpi = pxPerCm * 2.54;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Internal workspace dummy radii for placement context within composition
    const innerRadiusCm = 20;
    const outerRadiusCm = 40;

    // Draw from bottom to top
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || !layer.imageObj) continue;
      drawSingleLayer(ctx, layer, dpi, canvas.width, canvas.height, innerRadiusCm, outerRadiusCm);
    }
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
    // 1. Calculate bounding box of all layers to determine optimal canvas size
    // We use a high reference DPI (300) for the internal flattening
    const TARGET_DPI = 300;
    const pxPerCm = TARGET_DPI / 2.54;

    let minX = -10, minY = -10, maxX = 10, maxY = 10; // Default small area

    layers.forEach(l => {
        if (!l.visible || !l.imageObj) return;
        const w = Number(l.imageWidthCm) || 8;
        const h = (l.imageObj.height / l.imageObj.width) * w;

        // Very rough estimate of extent based on placement
        // For 'manual', it's easy. For others, they might spread around radii.
        if (l.placementType === 'manual') {
            minX = Math.min(minX, l.posX - w/2);
            maxX = Math.max(maxX, l.posX + w/2);
            minY = Math.min(minY, l.posY - h/2);
            maxY = Math.max(maxY, l.posY + h/2);
        } else {
            // Patterns can span large areas, use a safe default or calculate based on rings/offset
            const offset = Number(l.offsetCm) || 0;
            const rings = Number(l.rings) || 1;
            const ringSpacing = Number(l.ringSpacingCm) || 5;
            const maxRadius = 40 + offset + (rings * ringSpacing); // 40 is dummy outer radius
            minX = Math.min(minX, -maxRadius);
            maxX = Math.max(maxX, maxRadius);
            minY = Math.min(minY, -maxRadius);
            maxY = Math.max(maxY, maxRadius);
        }
    });

    // Add padding
    minX -= 2; minY -= 2; maxX += 2; maxY += 2;

    const canvasW = Math.ceil((maxX - minX) * pxPerCm);
    const canvasH = Math.ceil((maxY - minY) * pxPerCm);

    // Limit size to avoid crashes but stay high-res (e.g. max 8k)
    const finalW = Math.min(8192, canvasW);
    const finalH = Math.min(8192, canvasH);

    const canvas = document.createElement('canvas');
    canvas.width = finalW;
    canvas.height = finalH;
    const ctx = canvas.getContext('2d')!;

    // We need to draw the layers offset so they fit in our calculated bounding box
    // But drawSingleLayer expects center-based coordinates (cx, cy)
    // So we translate the whole context so that the "center" (0,0 in project space)
    // maps to the correct place in our cropped canvas.
    const centerX = -minX * pxPerCm;
    const centerY = -minY * pxPerCm;

    // Use dummy radii that match what we used for estimation
    const innerRadiusCm = 20;
    const outerRadiusCm = 40;

    // To use drawSingleLayer with offset, we temporarily wrap it
    ctx.save();
    // drawSingleLayer uses width/2 and height/2 as center.
    // We want the project (0,0) to be at (centerX, centerY).
    // So we need to translate such that width/2 + translation = centerX.
    ctx.translate(centerX - finalW/2, centerY - finalH/2);

    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.visible || !layer.imageObj) continue;
        drawSingleLayer(ctx, layer, TARGET_DPI, finalW, finalH, innerRadiusCm, outerRadiusCm);
    }
    ctx.restore();

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
        <div className="w-full md:w-80 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
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
                        <div className="flex flex-col">
                            <button onClick={(e) => { e.stopPropagation(); moveLayerUp(i); }} disabled={i === 0} className="p-0.5 text-neutral-500 hover:text-white disabled:opacity-20"><ArrowUp size={10}/></button>
                            <button onClick={(e) => { e.stopPropagation(); moveLayerDown(i); }} disabled={i === layers.length - 1} className="p-0.5 text-neutral-500 hover:text-white disabled:opacity-20"><ArrowDown size={10}/></button>
                        </div>
                        <button onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`¿Eliminar "${l.name}"?`)) {
                                setLayers(layers.filter(x => x.id !== l.id));
                            }
                        }} className="p-1 text-neutral-600 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                ))}

                {activeLayer && (
                    <div className="mt-4 border-t border-neutral-800 pt-4 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase">Propiedades</span>
                            <div className="flex gap-1">
                                <button onClick={() => updateLayer(activeLayer.id, { flipHorizontal: !activeLayer.flipHorizontal })} className={`p-1 rounded ${activeLayer.flipHorizontal ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-500 hover:text-white'}`} title="Espejo Horizontal">
                                    <RefreshCcw size={12}/>
                                </button>
                                <button onClick={() => updateLayer(activeLayer.id, { flipVertical: !activeLayer.flipVertical })} className={`p-1 rounded ${activeLayer.flipVertical ? 'bg-blue-500/20 text-blue-400' : 'text-neutral-500 hover:text-white'}`} title="Espejo Vertical">
                                    <RefreshCcw size={12} className="rotate-90"/>
                                </button>
                                <button onClick={() => updateLayer(activeLayer.id, { locked: !activeLayer.locked })} className="p-1 text-neutral-400">
                                    {activeLayer.locked ? <Lock size={12} className="text-amber-500"/> : <Unlock size={12}/>}
                                </button>
                            </div>
                        </div>

                        <CollapsibleSection title="Edición" icon={<Scissors size={10}/>} defaultOpen={true}>
                            <div className="grid grid-cols-2 gap-1 mt-1">
                                <button onClick={() => startSegmenting(activeLayer.id)} className="py-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-white text-[9px] font-bold rounded flex items-center justify-center gap-1"><Scissors size={8} /> Segmentar</button>
                                <button onClick={() => startRemovingBg(activeLayer.id)} className="py-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-white text-[9px] font-bold rounded flex items-center justify-center gap-1"><Droplet size={8} /> Quitar Fondo</button>
                                <button onClick={() => duplicateLayer(activeLayer.id)} className="py-1 px-2 bg-neutral-800 hover:bg-neutral-700 text-white text-[9px] font-bold rounded flex items-center justify-center gap-1"><Copy size={8} /> Duplicar</button>
                            </div>
                            <button onClick={() => autoIntegrate(activeLayer.id)} className="w-full mt-1 py-1 px-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-colors"><Zap size={8} /> Integración Automática</button>
                        </CollapsibleSection>

                        <CollapsibleSection title="Distribución" icon={<Layers size={10}/>} defaultOpen={true}>
                            <div className="flex flex-col gap-2 bg-neutral-900/50 p-2 rounded mt-1">
                                <select value={activeLayer.placementType} onChange={(e) => updateLayer(activeLayer.id, { placementType: e.target.value as PlacementType })} className="w-full bg-neutral-950 border border-neutral-800 text-white text-[10px] rounded px-2 py-1">
                                    <option value="fill">Llenar toda la falda</option>
                                    <option value="waist">Desde Cintura</option>
                                    <option value="hem">Desde Ruedo</option>
                                    <option value="radial">Radial</option>
                                    <option value="arc">Arco</option>
                                    <option value="manual">Manual</option>
                                </select>

                                {activeLayer.placementType === 'manual' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-1">
                                            <ControlInput label="Pos X" value={activeLayer.posX} setValue={(v:number) => updateLayer(activeLayer.id, { posX: v })} min={-100} max={100} unit="cm" />
                                            <ControlInput label="Pos Y" value={activeLayer.posY} setValue={(v:number) => updateLayer(activeLayer.id, { posY: v })} min={-100} max={100} unit="cm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <ControlInput label="Escala" value={activeLayer.manualScale} setValue={(v:number) => updateLayer(activeLayer.id, { manualScale: v })} min={0.01} max={10} step={0.01} unit="x" />
                                            <ControlInput label="Rotar" value={activeLayer.manualRotation} setValue={(v:number) => updateLayer(activeLayer.id, { manualRotation: v })} min={-360} max={360} unit="°" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <ControlInput label="Offset" value={activeLayer.offsetCm} setValue={(v:number) => updateLayer(activeLayer.id, { offsetCm: v })} min={-20} max={100} unit="cm" />
                                        {activeLayer.placementType === 'arc' && (
                                            <ControlInput label="Curvatura" value={activeLayer.arcCurvature} setValue={(v:number) => updateLayer(activeLayer.id, { arcCurvature: v })} min={-200} max={200} unit="%" />
                                        )}
                                        <div className="grid grid-cols-2 gap-1">
                                            <ControlInput label="Rings" value={activeLayer.rings} setValue={(v:number) => updateLayer(activeLayer.id, { rings: v })} min={1} max={50} />
                                            <ControlInput label="Ring Spacing" value={activeLayer.ringSpacingCm} setValue={(v:number) => updateLayer(activeLayer.id, { ringSpacingCm: v })} min={1} max={50} unit="cm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <ControlInput label="Spacing" value={activeLayer.spacingCm} setValue={(v:number) => updateLayer(activeLayer.id, { spacingCm: v })} min={1} max={50} unit="cm" />
                                            <ControlInput label="Count" value={activeLayer.repetitionCount} setValue={(v:number) => updateLayer(activeLayer.id, { repetitionCount: v })} min={1} max={100} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Transformación" icon={<Move size={10}/>} defaultOpen={false}>
                            <div className="flex flex-col gap-2 mt-1">
                                <ControlInput label="Opacidad" value={activeLayer.opacity} setValue={(v:number) => updateLayer(activeLayer.id, { opacity: v })} min={0} max={100} unit="%" />
                                <ControlInput label="Ancho" value={activeLayer.imageWidthCm} setValue={(v:number) => updateLayer(activeLayer.id, { imageWidthCm: v })} min={1} max={50} unit="cm" />
                                <ControlInput label="Rotación Global" value={activeLayer.rotationOffset} setValue={(v:number) => updateLayer(activeLayer.id, { rotationOffset: v })} min={0} max={360} unit="°" />
                            </div>
                        </CollapsibleSection>

                        <label className="w-full py-1.5 border border-dashed border-neutral-700 rounded flex items-center justify-center gap-2 cursor-pointer hover:bg-neutral-800 transition-colors">
                            <ImagePlus size={10}/>
                            <span className="text-[10px] font-bold">Cambiar Imagen</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (re) => {
                                        const img = new Image();
                                        img.onload = () => updateLayer(activeLayer.id, { imageSrc: re.target?.result as string, imageObj: img });
                                        img.src = re.target?.result as string;
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }} />
                        </label>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-neutral-800">
                <button
                    onClick={handleFinalConfirm}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center justify-center gap-2"
                >
                    <Check size={14}/> Finalizar Composición
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

        {segmentLayer && (
            <SegmentationModal
                segmentLayer={segmentLayer}
                segmentSelections={segmentSelections}
                handleSegmentClick={handleSegmentClick}
                confirmSegmentation={confirmSegmentation}
                setSegmentLayerId={setSegmentLayerId}
                setSegmentSelections={setSegmentSelections}
            />
        )}

        {removeBgLayer && (
            <RemoveBgModal
                layer={removeBgLayer}
                onConfirm={confirmRemoveBg}
                onClose={() => setRemoveBgLayerId(null)}
            />
        )}
    </div>
  );
}
