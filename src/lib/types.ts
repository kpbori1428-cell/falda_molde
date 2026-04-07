export type PlacementType = 'fill' | 'waist' | 'hem' | 'radial' | 'arc' | 'manual';

export interface PatternLayer {
  id: string;
  name: string;
  type: 'layer' | 'group';
  parentId: string | null;
  isExpanded: boolean;
  imageSrc: string | null;
  imageObj: HTMLImageElement | null;
  imageWidthCm: number | '';
  spacingCm: number | '';
  repetitionMode: 'spacing' | 'count';
  repetitionCount: number | '';
  rotationOffset: number | '';
  alternateRotation: number | '';
  mirrorAlternate: boolean;
  faceOutward: boolean;
  placementType: PlacementType;
  arcOrigin: 'waist' | 'hem';
  arcCurvature: number | '';
  offsetCm: number | '';
  rings: number | '';
  ringSpacingCm: number | '';
  visible: boolean;
  opacity: number;
  angularOffset: number | '';
  raysCount: number | '';
  flipVertical: boolean;
  flipHorizontal: boolean;
  // Manual transformation properties
  posX: number;
  posY: number;
  manualScale: number;
  manualRotation: number;
  locked: boolean;
  isSmartObject: boolean;
  subLayers?: PatternLayer[];
}

export const createDefaultLayer = (index: number): PatternLayer => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  name: `Capa ${index}`,
  type: 'layer',
  parentId: null,
  isExpanded: true,
  imageSrc: null,
  imageObj: null,
  imageWidthCm: 8,
  spacingCm: 12,
  repetitionMode: 'spacing',
  repetitionCount: 12,
  rotationOffset: 0,
  alternateRotation: 0,
  mirrorAlternate: false,
  faceOutward: true,
  placementType: 'fill',
  arcOrigin: 'waist',
  arcCurvature: 0,
  offsetCm: 0,
  rings: 1,
  ringSpacingCm: 5,
  visible: true,
  opacity: 100,
  angularOffset: 0,
  raysCount: 8,
  flipVertical: false,
  flipHorizontal: false,
  posX: 0,
  posY: 0,
  manualScale: 1,
  manualRotation: 0,
  locked: false,
  isSmartObject: false,
});

export const createDefaultGroup = (index: number): PatternLayer => ({
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  name: `Grupo ${index}`,
  type: 'group',
  parentId: null,
  isExpanded: true,
  imageSrc: null,
  imageObj: null,
  imageWidthCm: 8,
  spacingCm: 12,
  repetitionMode: 'spacing',
  repetitionCount: 12,
  rotationOffset: 0,
  alternateRotation: 0,
  mirrorAlternate: false,
  faceOutward: true,
  placementType: 'fill',
  arcOrigin: 'waist',
  arcCurvature: 0,
  offsetCm: 0,
  rings: 1,
  ringSpacingCm: 5,
  visible: true,
  opacity: 100,
  angularOffset: 0,
  raysCount: 8,
  flipVertical: false,
  flipHorizontal: false,
  posX: 0,
  posY: 0,
  manualScale: 1,
  manualRotation: 0,
  locked: false,
  isSmartObject: false,
});
