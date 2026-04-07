import { useCallback } from 'react';
import { PatternLayer } from '../lib/types';
import { analyzeBackground, adjustBlackPoint, applyLightWrap } from '../lib/imageProcessing';

interface IntegrationParams {
  layers: PatternLayer[];
  updateLayer: (id: string, updates: Partial<PatternLayer>) => void;
  renderPattern: (canvas: HTMLCanvasElement, targetDpi: number) => void;
}

export function useAutoIntegration({ layers, updateLayer, renderPattern }: IntegrationParams) {

  const autoIntegrate = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.imageObj || layer.type !== 'layer') return;

    // 1. Create a background snapshot excluding the target layer
    const tempCanvas = document.createElement('canvas');
    const layerIdx = layers.findIndex(l => l.id === layerId);

    // We need the background specifically where the layer is positioned.
    // For pattern layers this is complex, let's focus on 'manual' layers first as they are the primary 'flor' target.
    if (layer.placementType !== 'manual') {
        alert("La integración automática actualmente solo está optimizada para Capas de Trabajo (Manuales).");
        return;
    }

    // Capture the full canvas at PREVIEW_DPI to analyze the background
    // To get ONLY the background, we temporarily hide the target layer
    const originalVisible = layer.visible;
    updateLayer(layerId, { visible: false });

    // Wait for the next frame/render to ensure the canvas is updated if it were using a real DOM canvas
    // But since renderPattern is a pure function taking a canvas, we can just call it.
    const PREVIEW_DPI = 40;
    const canvasSize = 2000; // Large enough for analysis
    tempCanvas.width = canvasSize;
    tempCanvas.height = canvasSize;

    renderPattern(tempCanvas, PREVIEW_DPI);
    const bgCtx = tempCanvas.getContext('2d')!;

    // Restore visibility
    updateLayer(layerId, { visible: originalVisible });

    // 2. Sample the specific area behind the layer
    // Map manual coordinates to pixel coordinates on tempCanvas
    const pxPerCm = PREVIEW_DPI / 2.54;
    const cx = tempCanvas.width / 2;
    const cy = tempCanvas.height / 2;

    const imgW = layer.imageObj.width;
    const imgH = layer.imageObj.height;
    const renderW = (Number(layer.imageWidthCm) || 8) * (layer.manualScale || 1) * pxPerCm;
    const renderH = (imgH / imgW) * renderW;

    const layerPxX = cx + layer.posX * pxPerCm - renderW / 2;
    const layerPxY = cy + layer.posY * pxPerCm - renderH / 2;

    const bgImageData = bgCtx.getImageData(
      Math.max(0, layerPxX - 20),
      Math.max(0, layerPxY - 20),
      renderW + 40,
      renderH + 40
    );

    // 3. Process the layer image
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = imgW;
    layerCanvas.height = imgH;
    const layerCtx = layerCanvas.getContext('2d')!;
    layerCtx.drawImage(layer.imageObj, 0, 0);
    const layerImageData = layerCtx.getImageData(0, 0, imgW, imgH);

    // Generate mask from alpha
    const mask: boolean[] = [];
    for (let i = 0; i < layerImageData.data.length; i += 4) {
      mask.push(layerImageData.data[i+3] > 128);
    }

    // 4. Analysis and Execution
    // Note: Analysis on bgImageData requires transforming mask to bgImageData space or vice versa.
    // For simplicity in this v1, we sample the average color and min luminance of the bg snippet.
    const stats = analyzeBackground(bgImageData, new Array(bgImageData.width * bgImageData.height).fill(false), 10);

    adjustBlackPoint(layerImageData, stats.minLuminance);
    applyLightWrap(layerImageData, stats.avgColor, 0.4, 5);

    layerCtx.putImageData(layerImageData, 0, 0);
    const newSrc = layerCanvas.toDataURL('image/png');
    const newImg = new Image();
    await new Promise(resolve => {
        newImg.onload = resolve;
        newImg.src = newSrc;
    });

    updateLayer(layerId, {
        imageSrc: newSrc,
        imageObj: newImg,
        name: `${layer.name} (Integrada)`
    });

  }, [layers, updateLayer, renderPattern]);

  return { autoIntegrate };
}
