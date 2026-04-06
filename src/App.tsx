import React, { useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import CanvasArea from './components/CanvasArea';
import SegmentationModal from './components/SegmentationModal';
import RemoveBgModal from './components/RemoveBgModal';
import { useLayers } from './hooks/useLayers';
import { useViewport } from './hooks/useViewport';
import { useImageEditor } from './hooks/useImageEditor';
import { useSkirtSettings } from './hooks/useSkirtSettings';
import { useExporter } from './hooks/useExporter';
import { drawGuides, drawSingleLayer } from './lib/canvasUtils';

export default function App() {
  const {
    layers, setLayers, activeLayerId, setActiveLayerId, activeLayer, addLayer, updateLayer,
    deleteLayer, duplicateLayer, moveLayerUp, moveLayerDown, handleImageUpload
  } = useLayers();
  
  const {
    containerRef, miniCanvasRef, canvasRef, scale, pan, isDragging, containerSize,
    handleMiniPointerDown, handleMiniPointerMove, handleMiniPointerUp,
    handlePointerDown, handlePointerMove, handlePointerUp, resetView, zoomInView, zoomOutView,
    boxW, boxH, boxLeft, boxTop
  } = useViewport();

  const {
    segmentLayer, segmentSelections, startSegmenting, handleSegmentClick,
    confirmSegmentation, setSegmentLayerId, setSegmentSelections,
    removeBgLayer, startRemovingBg, confirmRemoveBg, setRemoveBgLayerId
  } = useImageEditor(layers, setLayers);

  const {
    waistCircumferenceCm, setWaistCircumferenceCm, skirtLengthCm, setSkirtLengthCm,
    fabricWidthCm, setFabricWidthCm, showFabricLimits, setShowFabricLimits,
    dpi, setDpi, bgColor, setBgColor,
    innerRadiusCm, outerRadiusCm, hemCircumferenceCm, canvasSizeCm, safeFabricWidth
  } = useSkirtSettings();

  // Preview resolution
  const PREVIEW_DPI = 40;
  const previewPxPerCm = PREVIEW_DPI / 2.54;
  const previewCanvasWidth = Math.round(canvasSizeCm * previewPxPerCm);
  const previewCanvasHeight = Math.round(canvasSizeCm * previewPxPerCm);

  const renderPattern = useCallback((canvas: HTMLCanvasElement, targetDpi: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawGuides(ctx, targetDpi, canvas.width, canvas.height, innerRadiusCm, outerRadiusCm, showFabricLimits, safeFabricWidth);

    for (let i = layers.length - 1; i >= 0; i--) {
      drawSingleLayer(ctx, layers[i], targetDpi, canvas.width, canvas.height, innerRadiusCm, outerRadiusCm);
    }
  }, [layers, bgColor, innerRadiusCm, outerRadiusCm, showFabricLimits, safeFabricWidth]);
  
  const { isDownloading, isExportingPsd, downloadImage, exportForPhotoshop } = useExporter({
    dpi, canvasSizeCm, bgColor, layers, renderPattern, innerRadiusCm, outerRadiusCm, showFabricLimits, safeFabricWidth
  });

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
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
        updateLayer={updateLayer}
        moveLayerUp={moveLayerUp}
        moveLayerDown={moveLayerDown}
        duplicateLayer={duplicateLayer}
        deleteLayer={deleteLayer}
        activeLayer={activeLayer}
        handleImageUpload={handleImageUpload}
        startSegmenting={startSegmenting}
        startRemovingBg={startRemovingBg}
        bgColor={bgColor}
        setBgColor={setBgColor}
        dpi={dpi}
        setDpi={setDpi}
        downloadImage={downloadImage}
        isDownloading={isDownloading}
        isExportingPsd={isExportingPsd}
        exportForPhotoshop={exportForPhotoshop}
      />

      <CanvasArea
        containerRef={containerRef}
        isDragging={isDragging}
        handlePointerDown={handlePointerDown}
        handlePointerMove={handlePointerMove}
        handlePointerUp={handlePointerUp}
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
    </div>
  );
}
