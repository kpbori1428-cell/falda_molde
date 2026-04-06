import { useState } from 'react';
import { saveAs } from 'file-saver';
import { writePsd } from 'ag-psd';
import { PatternLayer } from '../lib/types';
import { drawGuides, drawSingleLayer } from '../lib/canvasUtils';

interface ExporterParams {
  dpi: number | '';
  canvasSizeCm: number;
  bgColor: string;
  layers: PatternLayer[];
  renderPattern: (canvas: HTMLCanvasElement, targetDpi: number) => void;
  innerRadiusCm: number;
  outerRadiusCm: number;
  showFabricLimits: boolean;
  safeFabricWidth: number;
}

export function useExporter({
  dpi,
  canvasSizeCm,
  bgColor,
  layers,
  renderPattern,
  innerRadiusCm,
  outerRadiusCm,
  showFabricLimits,
  safeFabricWidth
}: ExporterParams) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExportingPsd, setIsExportingPsd] = useState(false);

  const downloadImage = () => {
    const safeDpi = Number(dpi) || 150;
    const exportPxPerCm = safeDpi / 2.54;
    const exportWidth = Math.round(canvasSizeCm * exportPxPerCm);
    const exportHeight = Math.round(canvasSizeCm * exportPxPerCm);

    const MAX_CANVAS_SIZE = 16384;
    if (exportWidth > MAX_CANVAS_SIZE || exportHeight > MAX_CANVAS_SIZE) {
      alert(`La resolución solicitada (${safeDpi} DPI) genera un lienzo de ${exportWidth}px, lo cual excede el límite de su navegador (${MAX_CANVAS_SIZE}px). Por favor, reduzca el DPI o el largo de la falda.`);
      return;
    }

    setIsDownloading(true);
    setTimeout(() => {
      try {
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = exportWidth;
        exportCanvas.height = exportHeight;
        
        renderPattern(exportCanvas, safeDpi);
        
        const dataUrl = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'skirt-pattern-composition.png';
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error("Failed to export image", err);
        alert("Error al exportar la imagen. La resolución es demasiado alta para la memoria de su navegador. Intente bajar el DPI.");
      } finally {
        setIsDownloading(false);
      }
    }, 50);
  };

  const exportForPhotoshop = async () => {
    const safeDpi = Number(dpi) || 150;
    const exportPxPerCm = safeDpi / 2.54;
    const width = Math.round(canvasSizeCm * exportPxPerCm);
    const height = Math.round(canvasSizeCm * exportPxPerCm);

    const MAX_CANVAS_SIZE = 16384;
    if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
      alert(`La resolución solicitada para el PSD excede el límite del sistema (${MAX_CANVAS_SIZE}px). Reduzca el DPI para poder exportar.`);
      return;
    }

    setIsExportingPsd(true);
    try {
      const psdChildren: any[] = [];

      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = width; bgCanvas.height = height;
      const bgCtx = bgCanvas.getContext('2d')!;
      if (bgColor !== 'transparent') {
        bgCtx.fillStyle = bgColor;
        bgCtx.fillRect(0, 0, width, height);
      }
      psdChildren.push({ name: 'Fondo', canvas: bgCanvas });

      const guidesCanvas = document.createElement('canvas');
      guidesCanvas.width = width; guidesCanvas.height = height;
      const gCtx = guidesCanvas.getContext('2d')!;
      drawGuides(gCtx, safeDpi, width, height, innerRadiusCm, outerRadiusCm, showFabricLimits, safeFabricWidth);
      psdChildren.push({ name: 'Guias_Falda', canvas: guidesCanvas });

      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!layer.imageObj) continue;
        
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = width; layerCanvas.height = height;
        const lCtx = layerCanvas.getContext('2d')!;
        
        const exportLayer = { ...layer, opacity: 100, visible: true };
        drawSingleLayer(lCtx, exportLayer, safeDpi, width, height, innerRadiusCm, outerRadiusCm);
        
        psdChildren.push({
          name: layer.name,
          canvas: layerCanvas,
          opacity: layer.opacity / 100,
          hidden: !layer.visible
        });
      }

      const psd = {
        width,
        height,
        children: psdChildren
      };

      const buffer = writePsd(psd);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      saveAs(blob, "Patron_Falda.psd");

    } catch (err) {
      console.error(err);
      alert("Error al exportar PSD.");
    } finally {
      setIsExportingPsd(false);
    }
  };

  return {
    isDownloading,
    isExportingPsd,
    downloadImage,
    exportForPhotoshop
  };
}
