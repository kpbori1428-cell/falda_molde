import { useCallback } from 'react';
import { PatternLayer } from '../lib/types';
import { analyzeBackground, adjustBlackPoint, applyLightWrap, applyBlur, applyGrain } from '../lib/imageProcessing';

interface IntegrationParams {
  layers: PatternLayer[];
  updateLayer: (id: string, updates: Partial<PatternLayer>) => void;
  renderPattern: (canvas: HTMLCanvasElement, targetDpi: number, excludeLayerId?: string) => void;
}

export function useAutoIntegration({ layers, updateLayer, renderPattern }: IntegrationParams) {

  const autoIntegrate = useCallback(async (layerId: string) => {
    const layer = layers.find(l => l.id === layerId);
    if (!layer || !layer.imageObj || layer.type !== 'layer') return;

    // We need the background specifically where the layer is positioned.
    // For pattern layers this is complex, let's focus on 'manual' layers first as they are the primary 'flor' target.
    if (layer.placementType !== 'manual') {
        alert("La integración automática actualmente solo está optimizada para Capas de Trabajo (Manuales).");
        return;
    }

    const PREVIEW_DPI = 40;
    const pxPerCm = PREVIEW_DPI / 2.54;

    // 1. Create a background snapshot excluding the target layer
    const tempCanvas = document.createElement('canvas');
    // Using a large enough size or matching preview size.
    // In App.tsx canvasSizeCm is used. We can estimate it or just use a fixed large buffer.
    const canvasSize = 3000;
    tempCanvas.width = canvasSize;
    tempCanvas.height = canvasSize;

    // We use the new excludeLayerId parameter to get the background ONLY
    renderPattern(tempCanvas, PREVIEW_DPI, layerId);
    const bgCtx = tempCanvas.getContext('2d')!;

    // 2. Sample the specific area behind the layer
    const cx = tempCanvas.width / 2;
    const cy = tempCanvas.height / 2;

    const imgW = layer.imageObj.width;
    const imgH = layer.imageObj.height;
    const renderW = (Number(layer.imageWidthCm) || 8) * (layer.manualScale || 1) * pxPerCm;
    const renderH = (imgH / imgW) * renderW;

    const layerPxX = cx + layer.posX * pxPerCm - renderW / 2;
    const layerPxY = cy + layer.posY * pxPerCm - renderH / 2;

    // Padding for analysis
    const padding = 40;
    const sampleX = Math.max(0, layerPxX - padding);
    const sampleY = Math.max(0, layerPxY - padding);
    const sampleW = Math.min(tempCanvas.width - sampleX, renderW + padding * 2);
    const sampleH = Math.min(tempCanvas.height - sampleY, renderH + padding * 2);

    const bgImageData = bgCtx.getImageData(sampleX, sampleY, sampleW, sampleH);

    // 3. Process the layer image
    // To analyze background based on layer position, we need a mask in bgImageData space.
    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = sampleW;
    analysisCanvas.height = sampleH;
    const analysisCtx = analysisCanvas.getContext('2d')!;

    // Draw the layer into the analysis space to create the mask
    analysisCtx.save();
    analysisCtx.translate(layerPxX - sampleX + renderW / 2, layerPxY - sampleY + renderH / 2);
    analysisCtx.rotate((layer.manualRotation || 0) * Math.PI / 180);
    analysisCtx.scale(layer.flipVertical ? -1 : 1, 1);
    analysisCtx.drawImage(layer.imageObj, -renderW / 2, -renderH / 2, renderW, renderH);
    analysisCtx.restore();

    const analysisImageData = analysisCtx.getImageData(0, 0, sampleW, sampleH);
    const bgMask: boolean[] = [];
    for (let i = 0; i < analysisImageData.data.length; i += 4) {
      bgMask.push(analysisImageData.data[i+3] > 10); // Any non-transparent pixel is part of the "foreground" mask
    }

    // 4. Analysis and Execution
    const stats = analyzeBackground(bgImageData, bgMask, 15);

    // Now prepare the actual layer image for modification
    const layerCanvas = document.createElement('canvas');
    layerCanvas.width = imgW;
    layerCanvas.height = imgH;
    const layerCtx = layerCanvas.getContext('2d')!;
    layerCtx.drawImage(layer.imageObj, 0, 0);
    const layerImageData = layerCtx.getImageData(0, 0, imgW, imgH);

    adjustBlackPoint(layerImageData, stats.minLuminance);
    applyLightWrap(layerImageData, stats.avgColor, 0.4, 8);

    // Match Sharpness (if background is blurry, blur the flower)
    if (stats.sharpness < 0.6) {
        applyBlur(layerImageData, 0.6 - stats.sharpness);
    }

    // Match Noise (add grain if background is noisy)
    if (stats.noiseIntensity > 0.02) {
        applyGrain(layerImageData, stats.noiseIntensity);
    }

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
