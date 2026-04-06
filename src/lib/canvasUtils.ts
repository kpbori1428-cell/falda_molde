import { PatternLayer } from './types';

export const drawGuides = (
  ctx: CanvasRenderingContext2D, 
  targetDpi: number, 
  width: number, 
  height: number,
  innerRadiusCm: number,
  outerRadiusCm: number,
  showFabricLimits: boolean,
  safeFabricWidth: number
) => {
  const currentPxPerCm = targetDpi / 2.54;
  const cx = width / 2;
  const cy = height / 2;
  const innerRadiusPx = innerRadiusCm * currentPxPerCm;
  const outerRadiusPx = outerRadiusCm * currentPxPerCm;

  // Fabric Limits
  if (showFabricLimits) {
    const fabricWidthPx = safeFabricWidth * currentPxPerCm;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.05)'; // red-500 very light
    ctx.fillRect(cx - fabricWidthPx / 2, 0, fabricWidthPx, height);
    
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)'; // red-500
    ctx.lineWidth = Math.max(1, 2 * (targetDpi / 150));
    ctx.setLineDash([20 * (targetDpi / 150), 10 * (targetDpi / 150)]);
    ctx.beginPath();
    ctx.moveTo(cx - fabricWidthPx / 2, 0);
    ctx.lineTo(cx - fabricWidthPx / 2, height);
    ctx.moveTo(cx + fabricWidthPx / 2, 0);
    ctx.lineTo(cx + fabricWidthPx / 2, height);
    ctx.stroke();
  }

  // Skirt Guides
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // blue-500
  ctx.lineWidth = Math.max(1, 2 * (targetDpi / 150));
  ctx.setLineDash([10 * (targetDpi / 150), 10 * (targetDpi / 150)]);

  ctx.beginPath();
  ctx.arc(cx, cy, innerRadiusPx, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, outerRadiusPx, 0, Math.PI * 2);
  ctx.stroke();

  const crosshairSize = 15 * (targetDpi / 150);
  ctx.beginPath();
  ctx.moveTo(cx - crosshairSize, cy);
  ctx.lineTo(cx + crosshairSize, cy);
  ctx.moveTo(cx, cy - crosshairSize);
  ctx.lineTo(cx, cy + crosshairSize);
  ctx.stroke();

  ctx.setLineDash([]);
};

export const drawSingleLayer = (
  ctx: CanvasRenderingContext2D, 
  layer: PatternLayer, 
  targetDpi: number, 
  width: number, 
  height: number,
  innerRadiusCm: number,
  outerRadiusCm: number,
) => {
  if (!layer.imageObj || !layer.visible) return;

  const currentPxPerCm = targetDpi / 2.54;
  const cx = width / 2;
  const cy = height / 2;
  const innerRadiusPx = innerRadiusCm * currentPxPerCm;
  const outerRadiusPx = outerRadiusCm * currentPxPerCm;

  const imgW = layer.imageObj.width;
  const imgH = layer.imageObj.height;
  
  const safeImageWidth = Number(layer.imageWidthCm) || 8;
  const safeRings = Number(layer.rings) || 1;
  const safeSpacing = Number(layer.spacingCm) || 12;
  const safeRotOffset = Number(layer.rotationOffset) || 0;
  const safeAltRot = Number(layer.alternateRotation) || 0;
  const safeOffset = Number(layer.offsetCm) || 0;
  const safeRingSpacing = Number(layer.ringSpacingCm) || 5;
  const safeAngularOffset = Number(layer.angularOffset) || 0;
  const safeRaysCount = Number(layer.raysCount) || 8;

  const imageWidthPx = safeImageWidth * currentPxPerCm;
  const scale = imageWidthPx / imgW;
  const scaleY = scale * (layer.flipVertical ? -1 : 1);
  const spacingPx = safeSpacing * currentPxPerCm;
  const offsetPx = safeOffset * currentPxPerCm;
  const ringSpacingPx = safeRingSpacing * currentPxPerCm;

  ctx.globalAlpha = layer.opacity / 100;

  if (layer.placementType === 'manual') {
    const x = cx + layer.posX * currentPxPerCm;
    const y = cy + layer.posY * currentPxPerCm;
    const manualScale = layer.manualScale || 1;
    const manualRot = layer.manualRotation || 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(manualRot * Math.PI / 180);
    ctx.scale(scale * manualScale, scaleY * manualScale);
    ctx.drawImage(layer.imageObj, -imgW / 2, -imgH / 2);
    ctx.restore();
  } else if (layer.placementType === 'radial') {
    const startOffset = innerRadiusPx + offsetPx;
    
    for (let r = 0; r < safeRaysCount; r++) {
      // Use angularOffset for position, not rotationOffset
      const angle = (r / safeRaysCount) * Math.PI * 2 + (safeAngularOffset * Math.PI / 180);
      
      for (let i = 0; i < safeRings; i++) { // Using rings as items per ray
        const currentRadiusPx = startOffset + (i * spacingPx);
        if (currentRadiusPx <= 0) continue;

        const x = cx + Math.cos(angle) * currentRadiusPx;
        const y = cy + Math.sin(angle) * currentRadiusPx;

        const isAlternate = r % 2 !== 0; // Alternate by ray
        const currentRot = safeRotOffset + (isAlternate ? safeAltRot : 0);
        const currentScaleX = scale * (layer.mirrorAlternate && isAlternate ? -1 : 1);

        ctx.save();
        ctx.translate(x, y);
        if (layer.faceOutward) {
          // Add global rotation to the outward-facing angle
          ctx.rotate(angle + Math.PI / 2 + (currentRot * Math.PI / 180));
        } else {
          ctx.rotate(currentRot * Math.PI / 180);
        }
        ctx.scale(currentScaleX, scaleY);
        ctx.drawImage(layer.imageObj, -imgW / 2, -imgH / 2);
        ctx.restore();
      }
    }
  } else if (layer.placementType === 'arc') {
    const renderedHeight = (imgH / imgW) * imageWidthPx;

    for (let l = 0; l < safeRings; l++) {
      let positionRadius;
      if (layer.arcOrigin === 'hem') {
        positionRadius = outerRadiusPx - offsetPx - (l * ringSpacingPx) - renderedHeight / 2;
      } else {
        positionRadius = innerRadiusPx + offsetPx + (l * ringSpacingPx) + renderedHeight / 2;
      }
      if (positionRadius <= 0) continue;

      const circumference = 2 * Math.PI * positionRadius;
      const safeRepetitionCount = Number(layer.repetitionCount) || 1;
      const currentCount = layer.repetitionMode === 'count'
        ? safeRepetitionCount
        : Math.max(1, Math.floor(circumference / spacingPx));
      
      for (let i = 0; i < currentCount; i++) {
        const ringOffset = (l % 2 === 1) ? (Math.PI * 2 / currentCount) / 2 : 0;
        const repetitionAngle = (i / currentCount) * Math.PI * 2 + ringOffset + (safeAngularOffset * Math.PI / 180);

        const safeArcCurvature = Number(layer.arcCurvature) || 0;
        const curvatureFactor = 1 - (safeArcCurvature / 250); // Make range more sensitive
        const curvatureRadius = positionRadius * curvatureFactor;
        
        const arcAngle = (curvatureRadius > 0) ? (imageWidthPx / curvatureRadius) : 0;
        const startAngle = repetitionAngle - arcAngle / 2;

        const sliceWidthSrc = 4;
        const sliceCount = Math.ceil(imgW / sliceWidthSrc);
        const anglePerSlice = arcAngle / sliceCount;
        const renderedSliceWidth = (sliceWidthSrc * scale) + 0.3;

        for (let s = 0; s < sliceCount; s++) {
          const sx = s * sliceWidthSrc;
          const actualSliceWidth = Math.min(sliceWidthSrc, imgW - sx);
          const sliceAngle = startAngle + (s + 0.5) * anglePerSlice;

          const x = cx + Math.cos(sliceAngle) * positionRadius;
          const y = cy + Math.sin(sliceAngle) * positionRadius;

          const currentRot = safeRotOffset * Math.PI / 180;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(sliceAngle + Math.PI / 2 + currentRot);
          if (layer.flipVertical) ctx.scale(1, -1);
          ctx.drawImage(
            layer.imageObj,
            sx, 0, actualSliceWidth, imgH,
            -renderedSliceWidth / 2, -renderedHeight / 2, renderedSliceWidth, renderedHeight
          );
          ctx.restore();
        }
      }
    }
  } else {
    // Concentric Rings Logic (Fill, Waist, Hem)
    for (let l = 0; l < safeRings; l++) {
      let currentRadiusPx;

      if (layer.placementType === 'fill') {
        if (safeRings === 1) {
            currentRadiusPx = innerRadiusPx + (outerRadiusPx - innerRadiusPx) / 2;
        } else {
            const availableSpace = outerRadiusPx - innerRadiusPx;
            const step = availableSpace / safeRings;
            currentRadiusPx = innerRadiusPx + step / 2 + l * step;
        }
      } else if (layer.placementType === 'waist') {
        currentRadiusPx = innerRadiusPx + offsetPx + (l * ringSpacingPx);
      } else if (layer.placementType === 'hem') {
        currentRadiusPx = outerRadiusPx - offsetPx - (l * ringSpacingPx);
      } else {
        currentRadiusPx = innerRadiusPx;
      }

      if (currentRadiusPx <= 0) continue;

      const circumference = 2 * Math.PI * currentRadiusPx;
      const safeRepetitionCount = Number(layer.repetitionCount) || 1;
      
      const currentCount = layer.repetitionMode === 'count'
        ? safeRepetitionCount
        : Math.max(1, Math.floor(circumference / spacingPx));
      
      for (let i = 0; i < currentCount; i++) {
        const ringOffset = (l % 2 === 1) ? (Math.PI * 2 / currentCount) / 2 : 0;
        // Use angularOffset for position, not rotationOffset
        const angle = (i / currentCount) * Math.PI * 2 + ringOffset + (safeAngularOffset * Math.PI / 180);
        
        const x = cx + Math.cos(angle) * currentRadiusPx;
        const y = cy + Math.sin(angle) * currentRadiusPx;

        const isAlternate = i % 2 !== 0;
        const currentRot = safeRotOffset + (isAlternate ? safeAltRot : 0);
        const currentScaleX = scale * (layer.mirrorAlternate && isAlternate ? -1 : 1);

        ctx.save();
        ctx.translate(x, y);
        if (layer.faceOutward) {
          // Add global rotation to the outward-facing angle
          ctx.rotate(angle + Math.PI / 2 + (currentRot * Math.PI / 180));
        } else {
          ctx.rotate(currentRot * Math.PI / 180);
        }
        ctx.scale(currentScaleX, scaleY);
        ctx.drawImage(layer.imageObj, -imgW / 2, -imgH / 2);
        ctx.restore();
      }
    }
  }
  ctx.globalAlpha = 1.0; // Reset
};