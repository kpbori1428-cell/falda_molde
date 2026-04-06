import { useState } from 'react';
import { PatternLayer, createDefaultLayer } from '../lib/types';
import { readPsd } from 'ag-psd';

export function useLayers() {
  const [layers, setLayers] = useState<PatternLayer[]>([createDefaultLayer(1)]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(layers[0].id);

  const addLayer = () => {
    const newLayer = createDefaultLayer(layers.length + 1);
    setLayers([...layers, newLayer]);
    setActiveLayerId(newLayer.id);
  };

  const updateLayer = (id: string, updates: Partial<PatternLayer>) => {
    setLayers(layers.map(layer => layer.id === id ? { ...layer, ...updates } : layer));
  };

  const deleteLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    
    if (window.confirm(`¿Estás seguro de que deseas eliminar la capa "${layer.name}"? Esta acción no se puede deshacer.`)) {
      const newLayers = layers.filter(l => l.id !== id);
      setLayers(newLayers);
      if (activeLayerId === id) {
        setActiveLayerId(newLayers.length > 0 ? newLayers[0].id : null);
      }
    }
  };

  const duplicateLayer = (id: string) => {
    const source = layers.find(l => l.id === id);
    if (!source) return;
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const duplicate: PatternLayer = { ...source, id: newId, name: `${source.name} (copia)` };
    const idx = layers.findIndex(l => l.id === id);
    const newLayers = [...layers];
    newLayers.splice(idx + 1, 0, duplicate);
    setLayers(newLayers);
    setActiveLayerId(newId);
  };

  const moveLayerUp = (index: number) => {
    if (index === 0) return;
    const newLayers = [...layers];
    [newLayers[index - 1], newLayers[index]] = [newLayers[index], newLayers[index - 1]];
    setLayers(newLayers);
  };

  const moveLayerDown = (index: number) => {
    if (index === layers.length - 1) return;
    const newLayers = [...layers];
    [newLayers[index + 1], newLayers[index]] = [newLayers[index], newLayers[index + 1]];
    setLayers(newLayers);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, layerId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.psd')) {
      try {
        const buffer = await file.arrayBuffer();
        const psd = readPsd(buffer);
        
        const extractedLayers: { name: string, src: string, img: HTMLImageElement }[] = [];
        
        const extractCanvases = async (children: any[]) => {
          for (const child of children) {
            if (child.canvas) {
              const src = child.canvas.toDataURL('image/png');
              const img = new Image();
              await new Promise((resolve) => {
                img.onload = resolve;
                img.src = src;
              });
              extractedLayers.push({ name: child.name || 'Capa PSD', src, img });
            }
            if (child.children) {
              await extractCanvases(child.children);
            }
          }
        };

        if (psd.children) {
          await extractCanvases(psd.children);
        }

        if (extractedLayers.length > 0) {
          setLayers(prevLayers => {
            const activeIndex = prevLayers.findIndex(l => l.id === layerId);
            if (activeIndex === -1) return prevLayers;

            const baseSettings = { ...prevLayers[activeIndex] };
            const newLayers = [...prevLayers];

            newLayers[activeIndex] = {
              ...baseSettings,
              name: extractedLayers[0].name,
              imageSrc: extractedLayers[0].src,
              imageObj: extractedLayers[0].img
            };

            const psdPatternLayers: PatternLayer[] = extractedLayers.slice(1).map((el, i) => ({
              ...baseSettings,
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
              name: el.name,
              imageSrc: el.src,
              imageObj: el.img
            }));

            newLayers.splice(activeIndex + 1, 0, ...psdPatternLayers);
            return newLayers;
          });
        } else if (psd.canvas) {
          const src = psd.canvas.toDataURL('image/png');
          const img = new Image();
          img.onload = () => {
            updateLayer(layerId, { imageSrc: src, imageObj: img });
          };
          img.src = src;
        } else {
          alert("No se encontraron capas rasterizadas en el PSD.");
        }
      } catch (err) {
        console.error("Error reading PSD:", err);
        alert("Error al leer el archivo PSD. Asegúrate de que sea un archivo válido.");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          updateLayer(layerId, { imageSrc: src, imageObj: img });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
    
    e.target.value = '';
  };

  const activeLayer = layers.find(l => l.id === activeLayerId);

  return {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    activeLayer,
    addLayer,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    handleImageUpload
  };
}
