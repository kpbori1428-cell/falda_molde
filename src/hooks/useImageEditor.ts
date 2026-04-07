import { useState } from 'react';
import { PatternLayer } from '../lib/types';
import { floodFillAlpha } from '../lib/utils';

export function useImageEditor(layers: PatternLayer[], setLayers: (layers: PatternLayer[]) => void) {
  // --- Segmentation State & Logic ---
  const [segmentLayerId, setSegmentLayerId] = useState<string | null>(null);
  const [segmentSelections, setSegmentSelections] = useState<{mask: boolean[], color: string}[]>([]);
  
  const segmentLayer = segmentLayerId ? layers.find(l => l.id === segmentLayerId) : null;

  const startSegmenting = (layerId: string) => {
    setSegmentLayerId(layerId);
    setSegmentSelections([]);
  };

  const handleSegmentClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!segmentLayer?.imageObj) return;

    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const sx = segmentLayer.imageObj.width / rect.width;
    const sy = segmentLayer.imageObj.height / rect.height;
    const clickX = Math.floor((e.clientX - rect.left) * sx);
    const clickY = Math.floor((e.clientY - rect.top) * sy);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = segmentLayer.imageObj.width;
    tempCanvas.height = segmentLayer.imageObj.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(segmentLayer.imageObj, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    for (let idx = 0; idx < segmentSelections.length; idx++) {
      if (segmentSelections[idx].mask[clickY * tempCanvas.width + clickX]) {
        setSegmentSelections(prev => prev.filter((_, i) => i !== idx));
        return;
      }
    }

    const mask = floodFillAlpha(imageData, clickX, clickY);
    if (!mask.some(v => v)) return;

    const colors = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#f97316', '#ec4899'];
    const color = colors[segmentSelections.length % colors.length];
    setSegmentSelections(prev => [...prev, { mask, color }]);
  };

  const confirmSegmentation = async () => {
    if (!segmentLayer?.imageObj) return;

    const imgW = segmentLayer.imageObj.width;
    const imgH = segmentLayer.imageObj.height;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = imgW;
    srcCanvas.height = imgH;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(segmentLayer.imageObj, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, imgW, imgH);

    const newLayerPromises = segmentSelections.map(async (sel, i) => {
      let minX = imgW, minY = imgH, maxX = 0, maxY = 0;
      for (let j = 0; j < sel.mask.length; j++) {
        if (sel.mask[j]) {
          const x = j % imgW;
          const y = Math.floor(j / imgW);
          minX = Math.min(minX, x); minY = Math.min(minY, y);
          maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
      }
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d')!;
      const cropData = cropCtx.createImageData(cropW, cropH);

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const sIdx = (y * imgW + x) * 4;
          const dIdx = ((y - minY) * cropW + (x - minX)) * 4;
          if (sel.mask[y * imgW + x]) {
            cropData.data[dIdx] = srcData.data[sIdx];
            cropData.data[dIdx + 1] = srcData.data[sIdx + 1];
            cropData.data[dIdx + 2] = srcData.data[sIdx + 2];
            cropData.data[dIdx + 3] = srcData.data[sIdx + 3];
          }
        }
      }
      cropCtx.putImageData(cropData, 0, 0);
      // Ensure we are getting the highest quality PNG
      const src = cropCanvas.toDataURL('image/png', 1.0);

      const img = await new Promise<HTMLImageElement>((resolve) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.src = src;
      });

      return {
        ...segmentLayer,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + i,
        name: `${segmentLayer.name} - ${i + 1}`,
        imageSrc: src,
        imageObj: img,
      };
    });

    const newLayers = await Promise.all(newLayerPromises);
    setLayers([...layers, ...newLayers]);
    setSegmentLayerId(null);
    setSegmentSelections([]);
  };

  // --- Remove Background State & Logic ---
  const [removeBgLayerId, setRemoveBgLayerId] = useState<string | null>(null);
  const removeBgLayer = removeBgLayerId ? layers.find(l => l.id === removeBgLayerId) : null;

  const startRemovingBg = (layerId: string) => {
    setRemoveBgLayerId(layerId);
  };

  const confirmRemoveBg = async (newImageSrc: string) => {
    if (!removeBgLayer) return;

    const img = await new Promise<HTMLImageElement>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.src = newImageSrc;
    });

    const newLayer: PatternLayer = {
      ...removeBgLayer,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: `${removeBgLayer.name} (Sin Fondo)`,
      imageSrc: newImageSrc,
      imageObj: img,
      // Reset placement to manual to avoid pattern distortion after cutout if it was auto-placed
      placementType: removeBgLayer.placementType === 'manual' ? 'manual' : 'manual'
    };
    
    setLayers([...layers, newLayer]);
    setRemoveBgLayerId(null);
  };

  return {
    segmentLayer,
    segmentSelections,
    startSegmenting,
    handleSegmentClick,
    confirmSegmentation,
    setSegmentLayerId,
    setSegmentSelections,

    removeBgLayer,
    startRemovingBg,
    confirmRemoveBg,
    setRemoveBgLayerId
  };
}
