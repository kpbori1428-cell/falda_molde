import React, { useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import SegmentationModal from './components/SegmentationModal';
import RemoveBgModal from './components/RemoveBgModal';
import CompositionModal from './components/CompositionModal';
import LassoModal from './components/LassoModal';
import { useLayers } from './hooks/useLayers';
import { useViewport } from './hooks/useViewport';
import { useImageEditor } from './hooks/useImageEditor';
import { useSkirtSettings } from './hooks/useSkirtSettings';
import { useExporter } from './hooks/useExporter';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';
import { useAutoIntegration } from './hooks/useAutoIntegration';
import { drawGuides, drawSingleLayer } from './lib/canvasUtils';

export default function App() {
  const {
    layers, setLayers, selectedLayerIds, setSelectedLayerIds, handleLayerClick, activeLayerId, activeLayer,
    addLayer, addGroup, groupSelectedLayers, updateLayer, moveLayersToGroup, ungroup,
    deleteLayer, duplicateLayer, moveLayerUp, moveLayerDown, handleImageUpload, handleWorkImageUpload,
    convertToSmartObject
  } = useLayers();
  
  const {
    containerRef, miniCanvasRef, canvasRef, scale, pan, isDragging, containerSize,
    handleMiniPointerDown, handleMiniPointerMove, handleMiniPointerUp,
    handlePointerDown, handlePointerMove, handlePointerUp, resetView, zoomInView, zoomOutView,
    boxW, boxH, boxLeft, boxTop
  } = useViewport();

  // Preview resolution
  const PREVIEW_DPI = 40;

  const {
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    isDraggingLayer
  } = useCanvasInteraction({
    layers,
    updateLayer,
    selectedLayerIds,
    handleLayerClick,
    scale,
    pan,
    containerSize,
    previewDpi: PREVIEW_DPI
  });

  const {
    segmentLayer, segmentSelections, startSegmenting, handleSegmentClick,
    confirmSegmentation, setSegmentLayerId, setSegmentSelections,
    removeBgLayer, startRemovingBg, confirmRemoveBg, setRemoveBgLayerId,
    lassoLayer, startLasso, confirmLasso, setLassoLayerId
  } = useImageEditor(layers, setLayers);

  const {
    waistCircumferenceCm, setWaistCircumferenceCm, skirtLengthCm, setSkirtLengthCm,
    fabricWidthCm, setFabricWidthCm, showFabricLimits, setShowFabricLimits,
    dpi, setDpi, bgColor, setBgColor,
    innerRadiusCm, outerRadiusCm, hemCircumferenceCm, canvasSizeCm, safeFabricWidth
  } = useSkirtSettings();

  const previewPxPerCm = PREVIEW_DPI / 2.54;
  const previewCanvasWidth = Math.round(canvasSizeCm * previewPxPerCm);
  const previewCanvasHeight = Math.round(canvasSizeCm * previewPxPerCm);

  const renderPattern = useCallback((canvas: HTMLCanvasElement, targetDpi: number, excludeLayerId?: string) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawGuides(ctx, targetDpi, canvas.width, canvas.height, innerRadiusCm, outerRadiusCm, showFabricLimits, safeFabricWidth);

    const isLayerVisible = (layer: any): boolean => {
      if (excludeLayerId && layer.id === excludeLayerId) return false;
      if (!layer.visible) return false;
      let current = layer;
      while (current.parentId) {
        const parent = layers.find(l => l.id === current.parentId);
        if (!parent) break;
        if (!parent.visible) return false;
        current = parent;
      }
      return true;
    };

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.type === 'layer' && isLayerVisible(layer)) {
        drawSingleLayer(ctx, layer, targetDpi, canvas.width, canvas.height, innerRadiusCm, outerRadiusCm);
      }
    }
  }, [layers, bgColor, innerRadiusCm, outerRadiusCm, showFabricLimits, safeFabricWidth]);
  
  const { isDownloading, isExportingPsd, downloadImage, exportForPhotoshop } = useExporter({
    dpi, canvasSizeCm, bgColor, layers, renderPattern, innerRadiusCm, outerRadiusCm, showFabricLimits, safeFabricWidth
  });

  const { autoIntegrate } = useAutoIntegration({ layers, updateLayer, renderPattern });

  const [smartObjectEditorOpen, setSmartObjectEditorOpen] = React.useState(false);
  const [smartObjectLayers, setSmartObjectLayers] = React.useState<any[]>([]);

  const MINI_DPI = 5;
  const miniCanvasSize = Math.round(canvasSizeCm * (MINI_DPI / 2.54));

  useEffect(() => {
    if (canvasRef.current) {
      renderPattern(canvasRef.current, PREVIEW_DPI);
    }
    if (miniCanvasRef.current) {
      renderPattern(miniCanvasRef.current, MINI_DPI);
    }
  }, [renderPattern, previewCanvasWidth, previewCanvasHeight, miniCanvasSize]);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row font-sans text-white">
      <Sidebar
        waistCircumferenceCm={waistCircumferenceCm}
        setWaistCircumferenceCm={setWaistCircumferenceCm}
        skirtLengthCm={skirtLengthCm}
        setSkirtLengthCm={setSkirtLengthCm}
        hemCircumferenceCm={hemCircumferenceCm}
        showFabricLimits={showFabricLimits}
        setShowFabricLimits={setShowFabricLimits}
        fabricWidthCm={fabricWidthCm}
        setFabricWidthCm={setFabricWidthCm}
        layers={layers}
        addLayer={addLayer}
        addGroup={addGroup}
        groupSelectedLayers={groupSelectedLayers}
        selectedLayerIds={selectedLayerIds}
        handleLayerClick={handleLayerClick}
        activeLayerId={activeLayerId}
        updateLayer={updateLayer}
        moveLayerUp={moveLayerUp}
        moveLayerDown={moveLayerDown}
        moveLayersToGroup={moveLayersToGroup}
        ungroup={ungroup}
        duplicateLayer={duplicateLayer}
        deleteLayer={deleteLayer}
        activeLayer={activeLayer}
        handleImageUpload={handleImageUpload}
        handleWorkImageUpload={handleWorkImageUpload}
        startSegmenting={startSegmenting}
        startRemovingBg={startRemovingBg}
        startLasso={startLasso}
        bgColor={bgColor}
        setBgColor={setBgColor}
        dpi={dpi}
        setDpi={setDpi}
        downloadImage={downloadImage}
        isDownloading={isDownloading}
        isExportingPsd={isExportingPsd}
        exportForPhotoshop={exportForPhotoshop}
        autoIntegrate={autoIntegrate}
        openSmartObjectEditor={(ids) => {
            const selected = layers.filter(l => ids.includes(l.id));
            setSmartObjectLayers(selected);
            setSmartObjectEditorOpen(true);
        }}
      />

      <CanvasArea
        containerRef={containerRef}
        isDragging={isDragging || isDraggingLayer}
        handlePointerDown={(e) => {
            handleCanvasPointerDown(e);
            if (!e.defaultPrevented) handlePointerDown(e);
        }}
        handlePointerMove={(e) => {
            handleCanvasPointerMove(e);
            handlePointerMove(e);
        }}
        handlePointerUp={(e) => {
            handleCanvasPointerUp();
            handlePointerUp(e);
        }}
        containerSize={containerSize}
        pan={pan}
        scale={scale}
        canvasRef={canvasRef}
        previewCanvasWidth={previewCanvasWidth}
        previewCanvasHeight={previewCanvasHeight}
        bgColor={bgColor}
        miniCanvasRef={miniCanvasRef}
        miniCanvasSize={miniCanvasSize}
        handleMiniPointerDown={handleMiniPointerDown}
        handleMiniPointerMove={handleMiniPointerMove}
        handleMiniPointerUp={handleMiniPointerUp}
        boxLeft={boxLeft}
        boxTop={boxTop}
        boxW={boxW}
        boxH={boxH}
        zoomInView={zoomInView}
        resetView={resetView}
        zoomOutView={zoomOutView}
      />
      
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

      {smartObjectEditorOpen && (
        <CompositionModal
          initialLayers={smartObjectLayers}
          onClose={() => setSmartObjectEditorOpen(false)}
          onConfirm={(src, img, subLayers) => {
            convertToSmartObject(smartObjectLayers.map(l => l.id), src, img, subLayers);
            setSmartObjectEditorOpen(false);
          }}
        />
      )}

      {lassoLayer && (
        <LassoModal
          layer={lassoLayer}
          onConfirm={confirmLasso}
          onClose={() => setLassoLayerId(null)}
        />
      )}
    </div>
  );
}
