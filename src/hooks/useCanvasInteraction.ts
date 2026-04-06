import { useState, useCallback, useRef } from 'react';
import { PatternLayer } from '../lib/types';

interface DragParams {
  layers: PatternLayer[];
  updateLayer: (id: string, updates: Partial<PatternLayer>) => void;
  selectedLayerIds: string[];
  handleLayerClick: (id: string, ctrlKey: boolean, shiftKey: boolean) => void;
  scale: number;
  pan: { x: number; y: number; };
  containerSize: { width: number; height: number; S: number; };
  previewDpi: number;
}

export function useCanvasInteraction({
  layers,
  updateLayer,
  selectedLayerIds,
  handleLayerClick,
  scale: viewportScale,
  pan,
  containerSize,
  previewDpi
}: DragParams) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const lastPointerPos = useRef<{ x: number, y: number } | null>(null);

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!containerSize.S) return { x: 0, y: 0 };

    // This is complex because of pan and scale.
    // viewportScale and pan are applied to the div containing the canvas.
    // We need the coordinates relative to the center of the canvas in cm.

    const rect = document.querySelector('canvas')?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };

    const pxPerCm = previewDpi / 2.54;

    // Relative to canvas top-left in pixels
    const rx = (clientX - rect.left) / viewportScale;
    const ry = (clientY - rect.top) / viewportScale;

    // Relative to canvas center in pixels
    const cx = rx - (rect.width / viewportScale) / 2;
    const cy = ry - (rect.height / viewportScale) / 2;

    // In cm
    return { x: cx / pxPerCm, y: cy / pxPerCm };
  }, [containerSize, viewportScale, previewDpi]);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // Only manual layers are draggable for now
    const manualLayers = layers.filter(l => l.placementType === 'manual' && l.visible && !l.locked);
    const pxPerCm = previewDpi / 2.54;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    // Hit detection (very simple: check if pointer is within image bounds)
    // Images are centered at posX, posY
    for (let i = 0; i < manualLayers.length; i++) {
        const layer = manualLayers[i];
        if (!layer.imageObj) continue;

        const w = (Number(layer.imageWidthCm) || 8) * (layer.manualScale || 1);
        const h = (layer.imageObj.height / layer.imageObj.width) * w;

        // Basic rectangular hit test (ignoring rotation for now for simplicity)
        if (x >= layer.posX - w/2 && x <= layer.posX + w/2 &&
            y >= layer.posY - h/2 && y <= layer.posY + h/2) {

            setDraggedLayerId(layer.id);
            lastPointerPos.current = { x, y };
            handleLayerClick(layer.id, e.ctrlKey || e.metaKey, e.shiftKey);
            e.stopPropagation();
            return;
        }
    }
  }, [layers, getCanvasCoordinates, handleLayerClick, previewDpi]);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggedLayerId || !lastPointerPos.current) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const dx = x - lastPointerPos.current.x;
    const dy = y - lastPointerPos.current.y;

    const layer = layers.find(l => l.id === draggedLayerId);
    if (layer) {
        updateLayer(draggedLayerId, {
            posX: (layer.posX || 0) + dx,
            posY: (layer.posY || 0) + dy
        });
    }

    lastPointerPos.current = { x, y };
  }, [draggedLayerId, layers, updateLayer, getCanvasCoordinates]);

  const handleCanvasPointerUp = useCallback(() => {
    setDraggedLayerId(null);
    lastPointerPos.current = null;
  }, []);

  return {
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    isDraggingLayer: !!draggedLayerId
  };
}
