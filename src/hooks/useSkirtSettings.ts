import { useState, useMemo } from 'react';

export function useSkirtSettings() {
  const [waistCircumferenceCm, setWaistCircumferenceCm] = useState<number | ''>(70);
  const [skirtLengthCm, setSkirtLengthCm] = useState<number | ''>(50);
  const [fabricWidthCm, setFabricWidthCm] = useState<number | ''>(150);
  const [showFabricLimits, setShowFabricLimits] = useState(false);
  const [dpi, setDpi] = useState<number | ''>(150);
  const [bgColor, setBgColor] = useState<string>('transparent');

  const {
    safeWaist,
    safeLength,
    safeFabricWidth,
    innerRadiusCm,
    outerRadiusCm,
    hemCircumferenceCm,
    canvasSizeCm
  } = useMemo(() => {
    const safeWaist = waistCircumferenceCm === '' ? 30 : Number(waistCircumferenceCm);
    const safeLength = skirtLengthCm === '' ? 10 : Number(skirtLengthCm);
    const safeFabricWidth = Number(fabricWidthCm) || 150;
    
    const innerRadiusCm = safeWaist / (2 * Math.PI);
    const outerRadiusCm = innerRadiusCm + safeLength;
    const hemCircumferenceCm = 2 * Math.PI * outerRadiusCm;
    const canvasSizeCm = (outerRadiusCm + 2) * 2;

    return {
      safeWaist,
      safeLength,
      safeFabricWidth,
      innerRadiusCm,
      outerRadiusCm,
      hemCircumferenceCm,
      canvasSizeCm
    };
  }, [waistCircumferenceCm, skirtLengthCm, fabricWidthCm]);

  return {
    waistCircumferenceCm,
    setWaistCircumferenceCm,
    skirtLengthCm,
    setSkirtLengthCm,
    fabricWidthCm,
    setFabricWidthCm,
    showFabricLimits,
    setShowFabricLimits,
    dpi,
    setDpi,
    bgColor,
    setBgColor,
    safeWaist,
    safeLength,
    safeFabricWidth,
    innerRadiusCm,
    outerRadiusCm,
    hemCircumferenceCm,
    canvasSizeCm
  };
}
