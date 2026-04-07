import React from 'react';
import { Upload, Download, Plus, Trash2, Layers, Settings, Image as ImageIcon, Loader2, Eye, EyeOff, ArrowUp, ArrowDown, FileImage, Scissors, Move, ImagePlus, Copy, Droplet, ChevronDown, ChevronRight, FolderPlus, Group, ArrowLeft, ArrowRight, Lock, Unlock, Zap } from 'lucide-react';
import { PatternLayer, PlacementType } from '../lib/types';
import { CollapsibleSection, ControlInput } from './UI';

interface SidebarProps {
  waistCircumferenceCm: number | '';
  setWaistCircumferenceCm: (value: number | '') => void;
  skirtLengthCm: number | '';
  setSkirtLengthCm: (value: number | '') => void;
  hemCircumferenceCm: number;
  showFabricLimits: boolean;
  setShowFabricLimits: (value: boolean) => void;
  fabricWidthCm: number | '';
  setFabricWidthCm: (value: number | '') => void;
  layers: PatternLayer[];
  addLayer: () => void;
  addGroup: () => void;
  groupSelectedLayers: () => void;
  selectedLayerIds: string[];
  handleLayerClick: (id: string, ctrlKey: boolean, shiftKey: boolean) => void;
  activeLayerId: string | null;
  updateLayer: (id: string, updates: Partial<PatternLayer>) => void;
  moveLayerUp: (index: number) => void;
  moveLayerDown: (index: number) => void;
  moveLayersToGroup: (ids: string[], targetGroupId: string | null) => void;
  ungroup: (groupId: string) => void;
  duplicateLayer: (id: string) => void;
  deleteLayer: (id: string) => void;
  activeLayer: PatternLayer | undefined;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, layerId: string) => void;
  handleWorkImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  startSegmenting: (layerId: string) => void;
  startRemovingBg: (layerId: string) => void;
  bgColor: string;
  setBgColor: (color: string) => void;
  dpi: number | '';
  setDpi: (value: number | '') => void;
  downloadImage: () => void;
  isDownloading: boolean;
  isExportingPsd: boolean;
  exportForPhotoshop: () => void;
  autoIntegrate: (layerId: string) => void;
}

export default function Sidebar({
  waistCircumferenceCm, setWaistCircumferenceCm, skirtLengthCm, setSkirtLengthCm, hemCircumferenceCm,
  showFabricLimits, setShowFabricLimits, fabricWidthCm, setFabricWidthCm, layers, addLayer, addGroup, groupSelectedLayers,
  selectedLayerIds, handleLayerClick, activeLayerId, updateLayer, moveLayerUp, moveLayerDown, moveLayersToGroup, ungroup, duplicateLayer, deleteLayer,
  activeLayer, handleImageUpload, handleWorkImageUpload, startSegmenting, startRemovingBg, bgColor, setBgColor, dpi, setDpi, downloadImage,
  isDownloading, isExportingPsd, exportForPhotoshop, autoIntegrate
}: SidebarProps) {
  const getLayerDepth = (layer: PatternLayer): number => {
    let depth = 0;
    let current = layer;
    while (current.parentId) {
      const parent = layers.find(l => l.id === current.parentId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  };

  const isLayerVisibleInTree = (layer: PatternLayer): boolean => {
    let current = layer;
    while (current.parentId) {
      const parent = layers.find(l => l.id === current.parentId);
      if (!parent || !parent.isExpanded) return false;
      current = parent;
    }
    return true;
  };

  return (
    <div className="w-full md:w-96 bg-neutral-900 border-r border-neutral-800 flex flex-col h-screen shrink-0 shadow-sm z-10">
      
      <div className="p-5 border-b border-neutral-800 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-white mb-1">Skirt Pattern Studio</h1>
        <p className="text-xs text-neutral-400">Composición multicapa para faldas circulares.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-2 divide-y divide-neutral-800">
        
        {/* Global Skirt Settings */}
        <CollapsibleSection title="Falda" icon={<Settings size={14} />} defaultOpen={false}>
          <div className="flex flex-col gap-3 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
            <ControlInput label="Contorno de cintura" value={waistCircumferenceCm} setValue={setWaistCircumferenceCm} min={30} max={150} unit="cm" accentColor="accent-blue-500" />
            <ControlInput label="Largo de falda" value={skirtLengthCm} setValue={setSkirtLengthCm} min={10} max={120} unit="cm" accentColor="accent-blue-500" />
            
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-neutral-800">
              <span className="text-xs text-neutral-400">Bajo de falda (Hem):</span>
              <span className="text-xs font-mono font-medium text-blue-400">{Math.round(hemCircumferenceCm)} cm</span>
            </div>

            <div className="mt-2 pt-3 border-t border-neutral-800 flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <input type="checkbox" checked={showFabricLimits} onChange={(e) => setShowFabricLimits(e.target.checked)} className="peer appearance-none w-4 h-4 border border-neutral-600 rounded bg-neutral-900 checked:bg-red-500 checked:border-red-500 transition-colors" />
                  <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Mostrar Límites de Tela</span>
              </label>
              {showFabricLimits && (
                <ControlInput label="Ancho de la Tela" value={fabricWidthCm} setValue={setFabricWidthCm} min={50} max={300} unit="cm" accentColor="accent-red-500" />
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* Layers Manager */}
        <CollapsibleSection 
          title="Capas" 
          icon={<Layers size={14} />} 
          defaultOpen={true}
          action={
            <div className="flex gap-1">
              <button
                onClick={addLayer}
                className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-neutral-700"
                title="Nueva Capa"
              >
                <Plus size={10} /> Capa
              </button>
              <button
                onClick={addGroup}
                className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-neutral-700"
                title="Nuevo Grupo"
              >
                <FolderPlus size={10} /> Grupo
              </button>
              <button
                onClick={groupSelectedLayers}
                disabled={selectedLayerIds.length === 0}
                className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors border border-neutral-700 disabled:opacity-30"
                title="Agrupar Selección"
              >
                <Group size={10} /> Agrupar
              </button>
              <label className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer shadow-sm">
                <ImagePlus size={10} /> Trabajo
                <input type="file" className="hidden" accept="image/png, image/jpeg, .psd" onChange={handleWorkImageUpload} />
              </label>
            </div>
          }
        >
          <div className="flex flex-col gap-1">
            {layers.map((layer, index) => {
              if (!isLayerVisibleInTree(layer)) return null;
              const depth = getLayerDepth(layer);
              const isSelected = selectedLayerIds.includes(layer.id);
              const isActive = activeLayerId === layer.id;

              return (
                <div
                  key={layer.id}
                  onClick={(e) => handleLayerClick(layer.id, e.ctrlKey || e.metaKey, e.shiftKey)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-600'} ${!layer.visible ? 'opacity-50' : ''}`}
                  style={{ marginLeft: `${depth * 12}px` }}
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                      className="p-1 text-neutral-400 hover:text-white transition-colors shrink-0"
                      title={layer.visible ? "Ocultar" : "Mostrar"}
                    >
                      {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {layer.placementType === 'manual' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                        className={`p-1 transition-colors shrink-0 ${layer.locked ? 'text-amber-500' : 'text-neutral-500 hover:text-white'}`}
                        title={layer.locked ? "Desbloquear posición" : "Bloquear posición"}
                      >
                        {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    )}

                    {layer.type === 'group' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { isExpanded: !layer.isExpanded }); }}
                        className="p-0.5 text-neutral-500 hover:text-white shrink-0"
                      >
                        {layer.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    )}

                    <div className="w-7 h-7 bg-neutral-900 rounded flex items-center justify-center border border-neutral-800 overflow-hidden shrink-0">
                      {layer.type === 'group' ? (
                        <Layers size={12} className="text-blue-500" />
                      ) : layer.imageSrc ? (
                        <img src={layer.imageSrc} alt="thumbnail" className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <ImageIcon size={12} className="text-neutral-600" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <input
                        type="text"
                        value={layer.name}
                        onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-medium text-neutral-200 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1 truncate"
                      />
                      {layer.type === 'layer' && (
                        <span className="text-[8px] text-neutral-500 uppercase tracking-wider truncate">{layer.placementType}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0 ml-2">
                    <div className="flex flex-col">
                      <button onClick={(e) => { e.stopPropagation(); moveLayerUp(index); }} disabled={index === 0} className="p-0.5 text-neutral-500 hover:text-white disabled:opacity-20"><ArrowUp size={10}/></button>
                      <button onClick={(e) => { e.stopPropagation(); moveLayerDown(index); }} disabled={index === layers.length - 1} className="p-0.5 text-neutral-500 hover:text-white disabled:opacity-20"><ArrowDown size={10}/></button>
                    </div>

                    <div className="flex flex-col">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveLayersToGroup([layer.id], null); }}
                        disabled={!layer.parentId}
                        className="p-0.5 text-neutral-500 hover:text-white disabled:opacity-20"
                        title="Extraer de grupo"
                      >
                        <ArrowLeft size={10}/>
                      </button>
                      {index > 0 && layers[index-1].type === 'group' && (
                         <button
                          onClick={(e) => { e.stopPropagation(); moveLayersToGroup([layer.id], layers[index-1].id); }}
                          disabled={layer.parentId === layers[index-1].id}
                          className="p-0.5 text-neutral-500 hover:text-white disabled:opacity-20"
                          title="Mover a grupo superior"
                        >
                          <ArrowRight size={10}/>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                      className="p-1 text-neutral-500 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                      title="Duplicar"
                    >
                      <Copy size={12} />
                    </button>

                    {layer.type === 'group' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); ungroup(layer.id); }}
                        className="p-1 text-neutral-500 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors"
                        title="Desagrupar"
                      >
                        <Layers size={12} />
                      </button>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                      className="p-1 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            {layers.length === 0 && (
              <div className="text-center p-4 text-sm text-neutral-500 border border-dashed border-neutral-800 rounded-lg">
                No hay capas. Agrega una para comenzar.
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Active Layer Settings */}
        {activeLayer && (
          <>
            {/* Image Section */}
            <CollapsibleSection title="Imagen" icon={<ImagePlus size={14} />} defaultOpen={true} accentColor="text-blue-400">
              <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-neutral-700 rounded-xl cursor-pointer bg-neutral-950 hover:bg-neutral-800 hover:border-blue-500 transition-all group">
                <div className="flex items-center justify-center gap-3">
                  {activeLayer.imageSrc ? (
                    <img src={activeLayer.imageSrc} alt="Preview" className="h-16 object-contain drop-shadow-md" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                      <Upload className="w-5 h-5 text-neutral-500 group-hover:text-blue-400" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-300 font-medium">{activeLayer.imageSrc ? 'Cambiar Imagen' : 'Subir PNG/PSD'}</span>
                    <span className="text-xs text-neutral-500">{activeLayer.type === 'group' ? 'Solo para capas individuales' : 'Extrae todas las capas'}</span>
                  </div>
                </div>
                {activeLayer.type === 'layer' && (
                  <input type="file" className="hidden" accept="image/png, image/jpeg, .psd, application/x-photoshop, image/vnd.adobe.photoshop" onChange={(e) => handleImageUpload(e, activeLayer.id)} />
                )}
              </label>
            </CollapsibleSection>
            
            {/* Editing Section */}
            {activeLayer.type === 'layer' && activeLayer.imageSrc && (
              <CollapsibleSection title="Edición de Imagen" icon={<Scissors size={14} />} defaultOpen={true} accentColor="text-amber-400">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => startSegmenting(activeLayer.id)}
                    className="w-full py-2 px-3 bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Segmentar
                  </button>
                  <button
                    onClick={() => startRemovingBg(activeLayer.id)}
                    className="w-full py-2 px-3 bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Droplet className="w-3.5 h-3.5" />
                    Quitar Fondo
                  </button>
                </div>
                <div className="mt-2">
                  <button
                    onClick={() => autoIntegrate(activeLayer.id)}
                    className="w-full py-2 px-3 bg-blue-600/20 text-blue-300 hover:text-white hover:bg-blue-600 border border-blue-500/30 hover:border-blue-500 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all group"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-400 group-hover:text-white" />
                    Integración Automática (Pro)
                  </button>
                  <p className="text-[9px] text-neutral-500 mt-1.5 px-1 leading-tight">
                    Muestrea el fondo, ajusta el punto negro y aplica sangrado de bordes (Light Wrap).
                  </p>
                </div>
              </CollapsibleSection>
            )}

            {/* Placement Section */}
            <CollapsibleSection title="Distribución" icon={<Layers size={14} />} defaultOpen={true} accentColor="text-blue-400">
              <div className="flex flex-col gap-3 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-neutral-400">Tipo de distribución</label>
                  <select
                    value={activeLayer.placementType}
                    onChange={(e) => updateLayer(activeLayer.id, { placementType: e.target.value as PlacementType })}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="fill">Llenar toda la falda</option>
                    <option value="waist">Contorno desde la Cintura</option>
                    <option value="hem">Contorno desde el Ruedo</option>
                    <option value="radial">Radial (Rayos desde el centro)</option>
                    <option value="arc">Arco (Curvar sobre circunferencia)</option>
                    <option value="manual">Manual (Capa de Trabajo)</option>
                  </select>
                </div>

                {activeLayer.placementType === 'manual' && (
                  <div className="flex flex-col gap-3 pt-3 border-t border-neutral-800/50">
                    <div className="grid grid-cols-2 gap-3">
                      <ControlInput label="Posición X" value={activeLayer.posX} setValue={(v: number) => updateLayer(activeLayer.id, { posX: v })} min={-200} max={200} unit="cm" />
                      <ControlInput label="Posición Y" value={activeLayer.posY} setValue={(v: number) => updateLayer(activeLayer.id, { posY: v })} min={-200} max={200} unit="cm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ControlInput label="Escala Manual" value={activeLayer.manualScale} setValue={(v: number) => updateLayer(activeLayer.id, { manualScale: v })} min={0.01} max={10} step={0.01} unit="x" />
                      <ControlInput label="Rotación Manual" value={activeLayer.manualRotation} setValue={(v: number) => updateLayer(activeLayer.id, { manualRotation: v })} min={-360} max={360} unit="°" />
                    </div>
                  </div>
                )}

                {(activeLayer.placementType === 'waist' || activeLayer.placementType === 'hem' || activeLayer.placementType === 'radial' || activeLayer.placementType === 'arc') && (
                  <ControlInput
                    label={`Distancia desde ${
                      activeLayer.placementType === 'hem' ? 'Ruedo' :
                      activeLayer.placementType === 'arc' && activeLayer.arcOrigin === 'hem' ? 'Ruedo' :
                      'Cintura'
                    }`}
                    value={activeLayer.offsetCm}
                    setValue={(v: number) => updateLayer(activeLayer.id, { offsetCm: v })}
                    min={-20} max={100} step={0.5} unit="cm"
                  />
                )}
                
                {activeLayer.placementType === 'arc' && (
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-neutral-800/50">
                    <label className="text-xs font-medium text-neutral-400">Origen del Arco</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => updateLayer(activeLayer.id, { arcOrigin: 'waist' })}
                        className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${activeLayer.arcOrigin === 'waist' ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                      >
                        Desde Cintura
                      </button>
                      <button 
                        onClick={() => updateLayer(activeLayer.id, { arcOrigin: 'hem' })}
                        className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${activeLayer.arcOrigin === 'hem' ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                      >
                        Desde Ruedo
                      </button>
                    </div>
                    <ControlInput
                      label="Curvatura del Arco"
                      value={activeLayer.arcCurvature}
                      setValue={(v: number) => updateLayer(activeLayer.id, { arcCurvature: v })}
                      min={-200} max={200} step={1} unit="%"
                    />
                  </div>
                )}

                {activeLayer.placementType === 'radial' ? (
                  <>
                    <ControlInput 
                      label="Cantidad de Rayos" 
                      value={activeLayer.raysCount} 
                      setValue={(v: number) => updateLayer(activeLayer.id, { raysCount: v })} 
                      min={1} max={60} 
                    />
                    <ControlInput 
                      label="Figuras por Rayo" 
                      value={activeLayer.rings} 
                      setValue={(v: number) => updateLayer(activeLayer.id, { rings: v })} 
                      min={1} max={50} 
                    />
                  </>
                ) : (
                  <ControlInput 
                    label={activeLayer.placementType === 'fill' ? "Cantidad de líneas (Rings)" : "Repetir contorno (Líneas)"} 
                    value={activeLayer.rings} 
                    setValue={(v: number) => updateLayer(activeLayer.id, { rings: v })} 
                    min={1} max={20} 
                  />
                )}

                {Number(activeLayer.rings) > 1 && (activeLayer.placementType === 'waist' || activeLayer.placementType === 'hem' || activeLayer.placementType === 'arc') && (
                  <ControlInput 
                    label="Separación entre líneas" 
                    value={activeLayer.ringSpacingCm} 
                    setValue={(v: number) => updateLayer(activeLayer.id, { ringSpacingCm: v })} 
                    min={1} max={50} step={0.5} unit="cm" 
                  />
                )}

                <div className="flex flex-col gap-1.5 pt-3 border-t border-neutral-800/50">
                  <label className="text-xs font-medium text-neutral-400">Modo de Repetición</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => updateLayer(activeLayer.id, { repetitionMode: 'spacing' })}
                      className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${activeLayer.repetitionMode === 'spacing' ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                    >
                      Por Separación
                    </button>
                    <button 
                      onClick={() => updateLayer(activeLayer.id, { repetitionMode: 'count' })}
                      className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${activeLayer.repetitionMode === 'count' ? 'bg-blue-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700'}`}
                    >
                      Por Cantidad
                    </button>
                  </div>
                </div>

                {activeLayer.repetitionMode === 'spacing' ? (
                  <ControlInput label={activeLayer.placementType === 'radial' ? "Separación en el rayo" : "Separación entre figuras"} value={activeLayer.spacingCm} setValue={(v: number) => updateLayer(activeLayer.id, { spacingCm: v })} min={1} max={50} step={0.5} unit="cm" />
                ) : (
                  <ControlInput label={activeLayer.placementType === 'radial' ? "Figuras por rayo" : "Cantidad de figuras"} value={activeLayer.repetitionCount} setValue={(v: number) => updateLayer(activeLayer.id, { repetitionCount: v })} min={1} max={100} />
                )}
              </div>
            </CollapsibleSection>

            {/* Transform Section */}
            <CollapsibleSection title="Transformación de Figura" icon={<Move size={14} />} defaultOpen={false} accentColor="text-blue-400">
              <div className="flex flex-col gap-3 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
                <ControlInput label="Opacidad" value={activeLayer.opacity} setValue={(v: number) => updateLayer(activeLayer.id, { opacity: v })} min={0} max={100} unit="%" accentColor="accent-blue-400" />
                <ControlInput label="Ancho de la figura" value={activeLayer.imageWidthCm} setValue={(v: number) => updateLayer(activeLayer.id, { imageWidthCm: v })} min={1} max={50} step={0.5} unit="cm" />
                <ControlInput label="Rotación Global" value={activeLayer.rotationOffset} setValue={(v: number) => updateLayer(activeLayer.id, { rotationOffset: v })} min={0} max={360} unit="°" />
                <ControlInput label="Desfase Angular (Inicio)" value={activeLayer.angularOffset} setValue={(v: number) => updateLayer(activeLayer.id, { angularOffset: v })} min={0} max={360} unit="°" />

                <div className="flex flex-col gap-2 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-4 h-4">
                      <input type="checkbox" checked={activeLayer.flipVertical} onChange={(e) => updateLayer(activeLayer.id, { flipVertical: e.target.checked })} className="peer appearance-none w-4 h-4 border border-neutral-600 rounded bg-neutral-900 checked:bg-blue-500 checked:border-blue-500 transition-colors" />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Invertir verticalmente</span>
                  </label>
                </div>
              </div>
            </CollapsibleSection>

            {/* Variation Section */}
            {activeLayer.placementType !== 'manual' && (
            <CollapsibleSection title="Variaciones de Repetición" icon={<Copy size={14} />} defaultOpen={false} accentColor="text-blue-400">
              <div className="flex flex-col gap-3 bg-neutral-950/50 p-4 rounded-xl border border-neutral-800">
                <ControlInput label="Rotación Alterna" value={activeLayer.alternateRotation} setValue={(v: number) => updateLayer(activeLayer.id, { alternateRotation: v })} min={0} max={360} unit="°" />

                <div className="flex flex-col gap-2 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-4 h-4">
                      <input type="checkbox" checked={activeLayer.mirrorAlternate} onChange={(e) => updateLayer(activeLayer.id, { mirrorAlternate: e.target.checked })} className="peer appearance-none w-4 h-4 border border-neutral-600 rounded bg-neutral-900 checked:bg-blue-500 checked:border-blue-500 transition-colors" />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Espejar figuras alternas</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-4 h-4">
                      <input type="checkbox" checked={activeLayer.faceOutward} onChange={(e) => updateLayer(activeLayer.id, { faceOutward: e.target.checked })} className="peer appearance-none w-4 h-4 border border-neutral-600 rounded bg-neutral-900 checked:bg-blue-500 checked:border-blue-500 transition-colors" />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">Orientar hacia afuera (Curva)</span>
                  </label>
                </div>
              </div>
            </CollapsibleSection>
            )}
          </>
        )}
      </div>

      {/* Export Actions (Sticky Bottom) */}
      <div className="p-5 border-t border-neutral-800 bg-neutral-900 shrink-0 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Fondo de Exportación</label>
          <div className="flex gap-2">
            {([
              { id: 'transparent', color: 'transparent' },
              { id: 'white', color: '#ffffff' },
              { id: 'black', color: '#000000' },
              { id: 'gray', color: '#374151' },
              { id: 'yellow', color: '#fef08a' },
              { id: 'blue', color: '#bfdbfe' },
              { id: 'pink', color: '#fbcfe8' },
            ]).map(bg => (
              <button
                key={bg.id}
                onClick={() => setBgColor(bg.color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${bgColor === bg.color ? 'border-white scale-110' : 'border-neutral-700 shadow-sm'}`}
                style={{ 
                  backgroundColor: bg.color === 'transparent' ? '#171717' : bg.color, 
                  backgroundImage: bg.color === 'transparent' ? 'linear-gradient(45deg, #262626 25%, transparent 25%), linear-gradient(-45deg, #262626 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #262626 75%), linear-gradient(-45deg, transparent 75%, #262626 75%)' : 'none', 
                  backgroundSize: '8px 8px', 
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px' 
                }}
                title={bg.id}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5 w-24 shrink-0">
            <label className="text-xs font-medium text-neutral-400">DPI Final</label>
            <input 
              type="number" 
              min="72" max="600" 
              value={dpi} 
              onChange={(e) => setDpi(e.target.value === '' ? '' : Number(e.target.value))} 
              onBlur={() => {
                if (dpi === '' || Number(dpi) < 72) setDpi(72);
                if (Number(dpi) > 600) setDpi(600);
              }}
              className="w-full px-2 py-1.5 border border-neutral-700 bg-neutral-950 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500" 
            />
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <button
              onClick={downloadImage}
              disabled={layers.every(l => !l.imageSrc) || isDownloading || isExportingPsd}
              className="w-full py-2 px-3 bg-neutral-800 text-white hover:bg-neutral-700 disabled:bg-neutral-900 disabled:text-neutral-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-neutral-700"
            >
              {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PNG Combinado
            </button>
            <button
              onClick={exportForPhotoshop}
              disabled={layers.every(l => !l.imageSrc) || isDownloading || isExportingPsd}
              className="w-full py-2 px-3 bg-blue-600 text-white hover:bg-blue-500 disabled:bg-neutral-800 disabled:text-neutral-500 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-blue-900/20"
            >
              {isExportingPsd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileImage className="w-3.5 h-3.5" />}
              Exportar PSD (Capas)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
