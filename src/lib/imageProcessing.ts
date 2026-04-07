/**
 * Image processing utilities for automatic integration (Compositing)
 */

export interface BackgroundStats {
  minLuminance: number;
  avgLuminance: number;
  avgColor: { r: number; g: number; b: number };
  noiseIntensity: number;
  sharpness: number;
}

/**
 * Extracts statistics from the background area surrounding a mask
 */
export function analyzeBackground(
  bgData: ImageData,
  mask: boolean[],
  radius: number = 5
): BackgroundStats {
  const { width, height, data } = bgData;
  let totalL = 0, minL = 255, count = 0;
  let totalR = 0, totalG = 0, totalB = 0;
  let diffSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      // Check if it's a contact pixel (non-mask near mask)
      if (!mask[idx]) {
        let isNear = false;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx]) {
              isNear = true; break;
            }
          }
          if (isNear) break;
        }

        if (isNear) {
          const r = data[idx * 4];
          const g = data[idx * 4 + 1];
          const b = data[idx * 4 + 2];
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

          totalL += l;
          if (l < minL) minL = l;
          totalR += r; totalG += g; totalB += b;

          // Estimate high-frequency components (sharpness/noise)
          if (x < width - 1) {
            const nl = (0.2126 * data[(idx + 1) * 4] + 0.7152 * data[(idx + 1) * 4 + 1] + 0.0722 * data[(idx + 1) * 4 + 2]);
            diffSum += Math.abs(l - nl);
          }

          count++;
        }
      }
    }
  }

  if (count === 0) return { minLuminance: 0, avgLuminance: 128, avgColor: {r:128, g:128, b:128}, noiseIntensity: 0, sharpness: 1 };

  const avgDiff = diffSum / count;

  return {
    minLuminance: minL / 255,
    avgLuminance: (totalL / count) / 255,
    avgColor: { r: totalR / count, g: totalG / count, b: totalB / count },
    noiseIntensity: Math.min(0.2, avgDiff / 500),
    sharpness: Math.min(1, avgDiff / 50)
  };
}

/**
 * Adjusts the black point of an image
 */
export function adjustBlackPoint(imageData: ImageData, targetMinL: number) {
  const { data } = imageData;
  // Simple linear remapping: [0, 1] -> [targetMinL, 1]
  for (let i = 0; i < data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      const val = data[i + j] / 255;
      data[i + j] = (targetMinL + val * (1 - targetMinL)) * 255;
    }
  }
}

/**
 * Applies procedural grain to an image
 */
export function applyGrain(imageData: ImageData, intensity: number) {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const noise = (Math.random() - 0.5) * intensity * 255;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
}

/**
 * Simplified blur (box blur) for sharpness matching
 */
export function applyBlur(imageData: ImageData, amount: number) {
  if (amount <= 0) return;
  const { width, height, data } = imageData;
  const originalData = new Uint8ClampedArray(data);
  const size = Math.floor(amount * 5); // scale blur radius

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (originalData[idx + 3] === 0) continue;

      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -size; dy <= size; dy++) {
        for (let dx = -size; dx <= size; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = (ny * width + nx) * 4;
            if (originalData[nIdx + 3] > 0) {
                r += originalData[nIdx];
                g += originalData[nIdx + 1];
                b += originalData[nIdx + 2];
                count++;
            }
          }
        }
      }
      if (count > 0) {
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
      }
    }
  }
}

/**
 * Applies a light wrap effect (edge bleed)
 */
export function applyLightWrap(
  layerData: ImageData,
  avgColor: { r: number; g: number; b: number },
  intensity: number = 0.3,
  radius: number = 3
) {
  const { width, height, data } = layerData;
  const originalData = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = originalData[idx + 3];
      if (alpha === 0) continue;

      // Distance to edge (approximate)
      let minDist = radius;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || originalData[(ny * width + nx) * 4 + 3] < 128) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) minDist = dist;
          }
        }
      }

      const factor = (1 - minDist / radius) * intensity;
      if (factor > 0) {
        data[idx] = originalData[idx] * (1 - factor) + avgColor.r * factor;
        data[idx + 1] = originalData[idx + 1] * (1 - factor) + avgColor.g * factor;
        data[idx + 2] = originalData[idx + 2] * (1 - factor) + avgColor.b * factor;
      }
    }
  }
}
