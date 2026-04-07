import { useState } from 'react';
import { PatternLayer, createDefaultLayer, createDefaultGroup } from '../lib/types';
import { readPsd } from 'ag-psd';

export function useLayers() {
  const [layers, setLayers] = useState<PatternLayer[]>([createDefaultLayer(1)]);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([layers[0].id]);

  const handleLayerClick = (id: string, ctrlKey: boolean, shiftKey: boolean) => {
    if (shiftKey && selectedLayerIds.length > 0) {
      const lastSelectedId = selectedLayerIds[selectedLayerIds.length - 1];
      const lastIndex = layers.findIndex(l => l.id === lastSelectedId);
      const currentIndex = layers.findIndex(l => l.id === id);
      const start = Math.min(lastIndex, currentIndex);
      const end = Math.max(lastIndex, currentIndex);
      const rangeIds = layers.slice(start, end + 1).map(l => l.id);
      setSelectedLayerIds(Array.from(new Set([...selectedLayerIds, ...rangeIds])));
    } else if (ctrlKey) {
      setSelectedLayerIds(prev =>
        prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
      );
    } else {
      setSelectedLayerIds([id]);
    }
  };

  const addLayer = () => {
    const newLayer = createDefaultLayer(layers.length + 1);
    setLayers([...layers, newLayer]);
    setSelectedLayerIds([newLayer.id]);
  };

  const addGroup = () => {
    const newGroup = createDefaultGroup(layers.filter(l => l.type === 'group').length + 1);
    setLayers([...layers, newGroup]);
    setSelectedLayerIds([newGroup.id]);
  };

  const groupSelectedLayers = () => {
    if (selectedLayerIds.length === 0) return;

    const newGroup = createDefaultGroup(layers.filter(l => l.type === 'group').length + 1);
    const newGroupId = newGroup.id;

    const selectedIndices = selectedLayerIds
      .map(id => layers.findIndex(l => l.id === id))
      .filter(idx => idx !== -1)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) return;
    const targetIndex = selectedIndices[0];

    const updatedLayers = layers.map(layer =>
      selectedLayerIds.includes(layer.id) ? { ...layer, parentId: newGroupId } : layer
    );

    const selected = updatedLayers.filter(l => selectedLayerIds.includes(l.id));
    const others = updatedLayers.filter(l => !selectedLayerIds.includes(l.id));

    others.splice(targetIndex, 0, newGroup, ...selected);

    setLayers(others);
    setSelectedLayerIds([newGroupId]);
  };

  const moveLayersToGroup = (ids: string[], targetGroupId: string | null) => {
    // Avoid moving a group into itself or its descendants
    if (targetGroupId) {
      const isDescendant = (parentId: string, potentialChildId: string): boolean => {
        const child = layers.find(l => l.id === potentialChildId);
        if (!child || !child.parentId) return false;
        if (child.parentId === parentId) return true;
        return isDescendant(parentId, child.parentId);
      };

      if (ids.some(id => id === targetGroupId || isDescendant(id, targetGroupId))) {
        return;
      }
    }

    const updatedLayers = layers.map(layer =>
      ids.includes(layer.id) ? { ...layer, parentId: targetGroupId } : layer
    );

    // Reorder to keep children together under the group if it exists
    if (targetGroupId) {
      const groupIdx = updatedLayers.findIndex(l => l.id === targetGroupId);
      const moved = updatedLayers.filter(l => ids.includes(l.id));
      const remaining = updatedLayers.filter(l => !ids.includes(l.id));
      const finalGroupIdx = remaining.findIndex(l => l.id === targetGroupId);
      remaining.splice(finalGroupIdx + 1, 0, ...moved);
      setLayers(remaining);
    } else {
      setLayers(updatedLayers);
    }
  };

  const ungroup = (groupId: string) => {
    const group = layers.find(l => l.id === groupId);
    if (!group || group.type !== 'group') return;

    const groupParentId = group.parentId;
    const newLayers = layers.map(layer =>
      layer.parentId === groupId ? { ...layer, parentId: groupParentId } : layer
    ).filter(layer => layer.id !== groupId);

    setLayers(newLayers);
    if (selectedLayerIds.includes(groupId)) {
      setSelectedLayerIds(selectedLayerIds.filter(id => id !== groupId));
    }
  };

  const updateLayer = (id: string, updates: Partial<PatternLayer>) => {
    setLayers(layers.map(layer => {
      if (layer.id === id) {
        return { ...layer, ...updates };
      }
      // If updating transformation and multiple layers are selected, apply relative changes
      if (selectedLayerIds.includes(id) && selectedLayerIds.includes(layer.id) && id !== layer.id) {
        const multiUpdates: Partial<PatternLayer> = {};
        if ('posX' in updates && typeof updates.posX === 'number' && typeof layer.posX === 'number') {
          const deltaX = updates.posX - (layers.find(l => l.id === id)?.posX || 0);
          multiUpdates.posX = layer.posX + deltaX;
        }
        if ('posY' in updates && typeof updates.posY === 'number' && typeof layer.posY === 'number') {
          const deltaY = updates.posY - (layers.find(l => l.id === id)?.posY || 0);
          multiUpdates.posY = layer.posY + deltaY;
        }
        if (Object.keys(multiUpdates).length > 0) {
          return { ...layer, ...multiUpdates };
        }
      }
      return layer;
    }));
  };

  const deleteLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (!layer) return;
    
    if (window.confirm(`¿Estás seguro de que deseas eliminar "${layer.name}"? Esta acción no se puede deshacer.`)) {
      const idsToDelete = [id];
      const findDescendants = (parentId: string) => {
        layers.forEach(l => {
          if (l.parentId === parentId) {
            idsToDelete.push(l.id);
            if (l.type === 'group') findDescendants(l.id);
          }
        });
      };
      if (layer.type === 'group') findDescendants(id);

      const newLayers = layers.filter(l => !idsToDelete.includes(l.id));
      setLayers(newLayers);
      setSelectedLayerIds(selectedLayerIds.filter(sid => !idsToDelete.includes(sid)));
    }
  };

  const duplicateLayer = (id: string) => {
    const source = layers.find(l => l.id === id);
    if (!source) return;

    const duplicates: PatternLayer[] = [];
    const idMap: { [oldId: string]: string } = {};

    const createDuplicate = (original: PatternLayer, newParentId: string | null) => {
      const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      idMap[original.id] = newId;
      const dup: PatternLayer = {
        ...original,
        id: newId,
        parentId: newParentId,
        name: original.id === id ? `${original.name} (copia)` : original.name
      };
      duplicates.push(dup);

      if (original.type === 'group') {
        layers.forEach(l => {
          if (l.parentId === original.id) {
            createDuplicate(l, newId);
          }
        });
      }
    };

    createDuplicate(source, source.parentId);

    const idx = layers.findIndex(l => l.id === id);
    const lastDescendantIndex = (layerId: string): number => {
      let maxIdx = layers.findIndex(l => l.id === layerId);
      layers.forEach((l, i) => {
        if (l.parentId === layerId) {
          maxIdx = Math.max(maxIdx, i);
          if (l.type === 'group') maxIdx = Math.max(maxIdx, lastDescendantIndex(l.id));
        }
      });
      return maxIdx;
    };

    const targetIdx = lastDescendantIndex(id);
    const newLayers = [...layers];
    newLayers.splice(targetIdx + 1, 0, ...duplicates);
    setLayers(newLayers);
    setSelectedLayerIds([duplicates[0].id]);
  };

  const getBlockIndices = (index: number): number[] => {
    const layer = layers[index];
    const indices = [index];
    if (layer.type === 'group') {
      const findDescendants = (parentId: string) => {
        layers.forEach((l, i) => {
          if (l.parentId === parentId) {
            indices.push(i);
            if (l.type === 'group') findDescendants(l.id);
          }
        });
      };
      findDescendants(layer.id);
    }
    return indices.sort((a, b) => a - b);
  };

  const moveLayerUp = (index: number) => {
    if (index === 0) return;

    const blockIndices = getBlockIndices(index);
    const firstIdx = blockIndices[0];
    if (firstIdx === 0) return;

    const prevLayerIdx = firstIdx - 1;
    const prevBlockIndices = getBlockIndices(prevLayerIdx);

    const newLayers = [...layers];
    const block = newLayers.splice(firstIdx, blockIndices.length);
    newLayers.splice(prevBlockIndices[0], 0, ...block);
    setLayers(newLayers);
  };

  const moveLayerDown = (index: number) => {
    const blockIndices = getBlockIndices(index);
    const lastIdx = blockIndices[blockIndices.length - 1];
    if (lastIdx >= layers.length - 1) return;

    const nextLayerIdx = lastIdx + 1;
    const nextBlockIndices = getBlockIndices(nextLayerIdx);

    const newLayers = [...layers];
    const block = newLayers.splice(blockIndices[0], blockIndices.length);
    const newInsertIdx = nextBlockIndices[nextBlockIndices.length - 1] - blockIndices.length + 1;
    newLayers.splice(newInsertIdx, 0, ...block);
    setLayers(newLayers);
  };
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, layerId: string | null, asWorkLayer: boolean = false) => {
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
          if (asWorkLayer) {
            const newWorkLayers: PatternLayer[] = extractedLayers.map((el, i) => ({
              ...createDefaultLayer(layers.length + i + 1),
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`,
              name: el.name,
              imageSrc: el.src,
              imageObj: el.img,
              placementType: 'manual'
            }));
            setLayers([...layers, ...newWorkLayers]);
            setSelectedLayerIds([newWorkLayers[newWorkLayers.length - 1].id]);
          } else {
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
          }
        } else if (psd.canvas) {
          const src = psd.canvas.toDataURL('image/png');
          const img = new Image();
          img.onload = () => {
            if (asWorkLayer) {
              const newWorkLayer: PatternLayer = {
                ...createDefaultLayer(layers.length + 1),
                name: file.name.replace('.psd', ''),
                imageSrc: src,
                imageObj: img,
                placementType: 'manual'
              };
              setLayers([...layers, newWorkLayer]);
              setSelectedLayerIds([newWorkLayer.id]);
            } else if (layerId) {
              updateLayer(layerId, { imageSrc: src, imageObj: img });
            }
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
          if (asWorkLayer) {
            const newWorkLayer: PatternLayer = {
              ...createDefaultLayer(layers.length + 1),
              name: file.name.split('.')[0],
              imageSrc: src,
              imageObj: img,
              placementType: 'manual'
            };
            setLayers([...layers, newWorkLayer]);
            setSelectedLayerIds([newWorkLayer.id]);
          } else if (layerId) {
            updateLayer(layerId, { imageSrc: src, imageObj: img });
          }
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    }
    
    e.target.value = '';
  };

  const convertToSmartObject = (ids: string[], mergedSrc: string, mergedImg: HTMLImageElement) => {
    if (ids.length === 0) return;

    const newSmartLayer: PatternLayer = {
      ...createDefaultLayer(1),
      id: `smart-${Date.now()}`,
      name: "Smart Object",
      imageSrc: mergedSrc,
      imageObj: mergedImg,
      isSmartObject: true,
      placementType: 'manual',
      posX: 0,
      posY: 0,
      manualScale: 1
    };

    // Find the insertion point (index of the first selected layer)
    const insertionIdx = layers.findIndex(l => ids.includes(l.id));

    // Filter out the original layers
    const remaining = layers.filter(l => !ids.includes(l.id));
    remaining.splice(insertionIdx, 0, newSmartLayer);

    setLayers(remaining);
    setSelectedLayerIds([newSmartLayer.id]);
  };

  const activeLayerId = selectedLayerIds.length > 0 ? selectedLayerIds[selectedLayerIds.length - 1] : null;
  const activeLayer = layers.find(l => l.id === activeLayerId);

  return {
    layers,
    setLayers,
    selectedLayerIds,
    setSelectedLayerIds,
    handleLayerClick,
    activeLayerId,
    activeLayer,
    addLayer,
    addGroup,
    groupSelectedLayers,
    moveLayersToGroup,
    ungroup,
    updateLayer,
    deleteLayer,
    duplicateLayer,
    moveLayerUp,
    moveLayerDown,
    convertToSmartObject,
    handleImageUpload,
    handleWorkImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, null, true)
  };
}
