import { useState, useRef, useEffect, useCallback } from 'react';

export function useViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [containerSize, setContainerSize] = useState({ width: 1000, height: 1000, S: 1000 });
  const [isMiniDragging, setIsMiniDragging] = useState(false);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    setScale((prevScale) => {
      const newScale = Math.min(Math.max(0.1, prevScale * (1 + delta)), 5);
      
      setPan((prevPan) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        
        const relX = px - rect.width / 2;
        const relY = py - rect.height / 2;
        
        return {
          x: relX - (newScale / prevScale) * (relX - prevPan.x),
          y: relY - (newScale / prevScale) * (relY - prevPan.y)
        };
      });
      
      return newScale;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({
          width,
          height,
          S: Math.min(width, height)
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const miniSize = 160; 
  const boxW = Math.max(2, (containerSize.width / scale) * (miniSize / containerSize.S));
  const boxH = Math.max(2, (containerSize.height / scale) * (miniSize / containerSize.S));
  const boxLeft = miniSize / 2 - (containerSize.width / 2 + pan.x) / scale * (miniSize / containerSize.S);
  const boxTop = miniSize / 2 - (containerSize.height / 2 + pan.y) / scale * (miniSize / containerSize.S);

  const updatePanFromMiniEvent = useCallback((e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let cursorMx = e.clientX - rect.left;
    let cursorMy = e.clientY - rect.top;
    
    const halfW = boxW / 2;
    const halfH = boxH / 2;
    
    if (boxW <= miniSize) {
       cursorMx = Math.max(halfW, Math.min(miniSize - halfW, cursorMx));
    } else {
       cursorMx = miniSize / 2;
    }

    if (boxH <= miniSize) {
       cursorMy = Math.max(halfH, Math.min(miniSize - halfH, cursorMy));
    } else {
       cursorMy = miniSize / 2;
    }

    setPan({
      x: (miniSize / 2 - cursorMx) / (miniSize / containerSize.S) * scale,
      y: (miniSize / 2 - cursorMy) / (miniSize / containerSize.S) * scale
    });
  }, [containerSize.S, scale, miniSize, boxW, boxH]);

  const handleMiniPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    setIsMiniDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePanFromMiniEvent(e);
  };

  const handleMiniPointerMove = (e: React.PointerEvent) => {
    if (!isMiniDragging) return;
    updatePanFromMiniEvent(e);
  };

  const handleMiniPointerUp = (e: React.PointerEvent) => {
    setIsMiniDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };
  
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };
  
  const zoomInView = () => {
    setScale(s => Math.min(s * 1.5, 5));
  };
  
  const zoomOutView = () => {
    setScale(s => Math.max(s / 1.5, 0.1));
  };

  return {
    containerRef,
    miniCanvasRef,
    canvasRef,
    scale,
    pan,
    isDragging,
    containerSize,
    handleMiniPointerDown,
    handleMiniPointerMove,
    handleMiniPointerUp,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    resetView,
    zoomInView,
    zoomOutView,
    boxW,
    boxH,
    boxLeft,
    boxTop
  };
}
