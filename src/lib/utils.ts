// Flood fill on alpha channel — used by segmentation tool
export function floodFillAlpha(imageData: ImageData, startX: number, startY: number, threshold = 10): boolean[] {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const visited = new Array(totalPixels).fill(false);

  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return visited;
  const startIdx = startY * width + startX;
  if (data[startIdx * 4 + 3] < threshold) return visited;

  const stack: number[] = [startIdx];
  visited[startIdx] = true;

  while (stack.length > 0) {
    const idx = stack.pop()!;
    const x = idx % width;
    const y = (idx - x) / width;

    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x < width - 1 ? idx + 1 : -1,
      y > 0 ? idx - width : -1,
      y < height - 1 ? idx + width : -1,
    ];

    for (const nIdx of neighbors) {
      if (nIdx < 0 || visited[nIdx]) continue;
      if (data[nIdx * 4 + 3] < threshold) continue;
      visited[nIdx] = true;
      stack.push(nIdx);
    }
  }

  return visited;
}
