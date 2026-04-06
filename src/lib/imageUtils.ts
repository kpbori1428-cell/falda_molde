export function removeColor(
  imageData: ImageData,
  targetColor: { r: number; g: number; b: number },
  tolerance: number
): ImageData {
  const { data, width, height } = imageData;
  const newImageData = new ImageData(width, height);
  const toleranceSquared = tolerance * tolerance;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Calculate squared Euclidean distance in RGB space
    const distanceSquared = (r - targetColor.r) ** 2 + (g - targetColor.g) ** 2 + (b - targetColor.b) ** 2;

    newImageData.data[i] = r;
    newImageData.data[i + 1] = g;
    newImageData.data[i + 2] = b;

    if (distanceSquared <= toleranceSquared) {
      newImageData.data[i + 3] = 0; // Set alpha to 0 (transparent)
    } else {
      newImageData.data[i + 3] = a;
    }
  }

  return newImageData;
}

// Helper to get color from a click event on a canvas
export function getColorFromClick(
  e: React.MouseEvent<HTMLCanvasElement>,
  image: HTMLImageElement
): { r: number, g: number, b: number } {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const scaleX = image.width / rect.width;
  const scaleY = image.height / rect.height;
  
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = image.width;
  tempCanvas.height = image.height;
  const ctx = tempCanvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0, image.width, image.height);
  
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  
  return { r: pixel[0], g: pixel[1], b: pixel[2] };
}
