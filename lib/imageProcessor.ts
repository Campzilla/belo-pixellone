import { PixelSettings, RGB, ProcessResult } from '../types';
import { renderFromIndices } from './pngEncoder';

interface Color { r: number; g: number; b: number; }

// Weighted Color Distance (Redmean approximation)
const colorDistanceSq = (c1: Color, c2: Color) => {
  const rmean = (c1.r + c2.r) / 2;
  const r = c1.r - c2.r;
  const g = c1.g - c2.g;
  const b = c1.b - c2.b;
  return (((512 + rmean) * r * r) >> 8) + 4 * g * g + (((767 - rmean) * b * b) >> 8);
};

// --- BAYER MATRIX FOR ORDERED DITHERING (4x4) ---
const bayerMatrix4x4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5]
];

export const extractPaletteFromImage = async (file: File): Promise<RGB[]> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = Math.min(1, 256 / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve([]);
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                
                const uniqueColors = new Set<string>();
                const palette: RGB[] = [];
                
                for(let i=0; i<data.length; i+=4) {
                    if (data[i+3] < 128) continue;
                    const key = `${data[i]},${data[i+1]},${data[i+2]}`;
                    if (!uniqueColors.has(key)) {
                        uniqueColors.add(key);
                        palette.push({r: data[i], g: data[i+1], b: data[i+2]});
                        if (palette.length >= 256) break;
                    }
                }
                resolve(palette);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
};

// --- K-MEANS CLUSTERING ---
const generateKMeansPalette = (data: Uint8ClampedArray, k: number): Color[] => {
  const samples: Color[] = [];
  for (let i = 0; i < data.length; i += 4) { 
    if (data[i + 3] > 128) {
       samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  if (samples.length === 0) return [{ r: 0, g: 0, b: 0 }];
  
  const maxSamples = 4000;
  const usedSamples = samples.length > maxSamples 
    ? samples.filter((_, i) => i % Math.ceil(samples.length / maxSamples) === 0) 
    : samples;

  if (usedSamples.length <= k) return usedSamples;

  let centroids = new Array(k).fill(0).map(() => usedSamples[Math.floor(Math.random() * usedSamples.length)]);

  for (let iter = 0; iter < 8; iter++) {
    const sums = new Array(k).fill(0).map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    for (const color of usedSamples) {
      let minDist = Infinity;
      let closestIndex = 0;
      for (let j = 0; j < k; j++) {
        const dist = colorDistanceSq(color, centroids[j]);
        if (dist < minDist) { minDist = dist; closestIndex = j; }
      }
      sums[closestIndex].r += color.r;
      sums[closestIndex].g += color.g;
      sums[closestIndex].b += color.b;
      sums[closestIndex].count++;
    }

    let change = 0;
    const newCentroids = centroids.map((c, i) => {
      if (sums[i].count === 0) return usedSamples[Math.floor(Math.random() * usedSamples.length)];
      const newC = {
        r: Math.round(sums[i].r / sums[i].count),
        g: Math.round(sums[i].g / sums[i].count),
        b: Math.round(sums[i].b / sums[i].count)
      };
      change += Math.abs(newC.r - c.r) + Math.abs(newC.g - c.g) + Math.abs(newC.b - c.b);
      return newC;
    });
    centroids = newCentroids;
    if (change < 5) break;
  }
  return centroids;
};

// --- MAIN PIPELINE ---
export const processImage = (
  img: HTMLImageElement,
  settings: PixelSettings
): Promise<ProcessResult> => {
  return new Promise((resolve) => {
    // 1. HIGH RES PRE-PROCESSING
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) return resolve({} as any);
    
    if (settings.smoothing > 0) {
        srcCtx.filter = `blur(${settings.smoothing * 2}px)`;
    }
    srcCtx.drawImage(img, 0, 0);
    srcCtx.filter = 'none';

    const srcData = srcCtx.getImageData(0, 0, img.width, img.height).data;

    // 2. SMART DOWNSCALING with BLOCK SIZE LOGIC
    const targetW = settings.targetWidth;
    const targetH = settings.targetHeight;
    const tempBuffer = new Uint8ClampedArray(targetW * targetH * 4);
    
    const ratioX = img.width / targetW;
    const ratioY = img.height / targetH;
    const contrastFactor = (259 * (settings.contrast * 255 + 255)) / (255 * (259 - settings.contrast * 255));
    const satFactor = 1 + settings.saturation;
    const blockSize = Math.max(1, Math.floor(settings.blockSize));

    // Iterate by blockSize steps
    for (let y = 0; y < targetH; y += blockSize) {
        for (let x = 0; x < targetW; x += blockSize) {
            
            // Calculate representative color for this block
            const startX = Math.floor(x * ratioX);
            const startY = Math.floor(y * ratioY);
            // We want to sample enough from source to cover the block in target
            const endX = Math.floor(Math.min(targetW, x + blockSize) * ratioX);
            const endY = Math.floor(Math.min(targetH, y + blockSize) * ratioY);
            
            let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
            
            for (let sy = startY; sy < endY && sy < img.height; sy++) {
                for (let sx = startX; sx < endX && sx < img.width; sx++) {
                    const idx = (sy * img.width + sx) * 4;
                    rSum += srcData[idx];
                    gSum += srcData[idx+1];
                    bSum += srcData[idx+2];
                    aSum += srcData[idx+3];
                    count++;
                }
            }

            if (count === 0) continue;

            let r = rSum / count;
            let g = gSum / count;
            let b = bSum / count;
            let a = aSum / count;

            // Apply Corrections
            if (settings.contrast !== 0) {
                r = contrastFactor * (r - 128) + 128;
                g = contrastFactor * (g - 128) + 128;
                b = contrastFactor * (b - 128) + 128;
            }
            if (settings.saturation !== 0) {
                const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
                r = gray + (r - gray) * satFactor;
                g = gray + (g - gray) * satFactor;
                b = gray + (b - gray) * satFactor;
            }

            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));
            const finalA = a > 128 ? 255 : 0; // Binary alpha

            // Fill the block in tempBuffer
            for (let by = 0; by < blockSize; by++) {
                for (let bx = 0; bx < blockSize; bx++) {
                    const tx = x + bx;
                    const ty = y + by;
                    if (tx >= targetW || ty >= targetH) continue;
                    
                    const outIdx = (ty * targetW + tx) * 4;
                    tempBuffer[outIdx] = r;
                    tempBuffer[outIdx+1] = g;
                    tempBuffer[outIdx+2] = b;
                    tempBuffer[outIdx+3] = finalA;
                }
            }
        }
    }

    // 3. BACKGROUND REMOVAL
    if (settings.removeBackground) {
        const width = targetW;
        const height = targetH;
        const visited = new Uint8Array(width * height);
        const queue = [0, width - 1, (height - 1) * width, (height - 1) * width + (width - 1)];
        const tolSq = (settings.bgTolerance * 2.55 * 3) ** 2;

        const refR = tempBuffer[0];
        const refG = tempBuffer[1];
        const refB = tempBuffer[2];
        const refA = tempBuffer[3];

        if (refA > 0) {
            for (const q of queue) visited[q] = 1;
            let head = 0;
            while (head < queue.length) {
                const i = queue[head++];
                const idx = i * 4;
                let isBg = false;
                if (tempBuffer[idx+3] === 0) {
                    isBg = true;
                } else {
                    const dist = colorDistanceSq(
                        {r: tempBuffer[idx], g: tempBuffer[idx+1], b: tempBuffer[idx+2]}, 
                        {r: refR, g: refG, b: refB}
                    );
                    if (dist <= tolSq) {
                        tempBuffer[idx+3] = 0; 
                        isBg = true;
                    }
                }
                if (isBg) {
                    const x = i % width;
                    const y = Math.floor(i / width);
                    const neighbors = [{x: x+1, y: y}, {x: x-1, y: y}, {x: x, y: y+1}, {x: x, y: y-1}];
                    for (const n of neighbors) {
                        if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                            const ni = n.y * width + n.x;
                            if (!visited[ni]) {
                                visited[ni] = 1;
                                queue.push(ni);
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. PALETTE GENERATION
    let palette: Color[];
    if (settings.paletteMode === 'preset' && settings.currentPalette.length > 0) {
        palette = settings.currentPalette;
    } else {
        palette = generateKMeansPalette(tempBuffer, settings.paletteSize);
    }

    // We prepare the Indexed Data Array
    const indexedData = new Uint8Array(targetW * targetH);
    // Reserve index 0 for transparency IF there is transparency
    let transparentIndex = -1;
    let effectivePalette = [...palette];
    
    let hasTransparency = false;
    for(let i=0; i<tempBuffer.length; i+=4) {
        if(tempBuffer[i+3] === 0) {
            hasTransparency = true;
            break;
        }
    }

    if (hasTransparency) {
        transparentIndex = effectivePalette.length; 
        effectivePalette.push({r: 0, g: 0, b: 0}); // Placeholder color for transparency
    }

    // 5. MAPPING & DITHERING
    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            const idx = (y * targetW + x) * 4;
            const pixelIndex = y * targetW + x;

            if (tempBuffer[idx+3] === 0) {
                indexedData[pixelIndex] = transparentIndex; // Transparent
                continue;
            }

            let r = tempBuffer[idx];
            let g = tempBuffer[idx+1];
            let b = tempBuffer[idx+2];

            // Dithering
            if (settings.dithering > 0) {
                // Relate dithering to block size to avoid high-freq noise on large blocks
                const ditherX = Math.floor(x / blockSize) % 4;
                const ditherY = Math.floor(y / blockSize) % 4;
                
                const threshold = bayerMatrix4x4[ditherY][ditherX]; 
                const factor = (threshold - 7.5) * settings.dithering * 8; 
                
                r = Math.min(255, Math.max(0, r + factor));
                g = Math.min(255, Math.max(0, g + factor));
                b = Math.min(255, Math.max(0, b + factor));
            }

            // Find closest color index (skipping the transparent index at the end)
            let closestIndex = 0;
            let minDist = Infinity;
            
            // Iterate only over the actual colors, not the transparent placeholder
            const limit = hasTransparency ? effectivePalette.length - 1 : effectivePalette.length;

            for (let i = 0; i < limit; i++) {
                const dist = colorDistanceSq({r, g, b}, effectivePalette[i]);
                if (dist < minDist) {
                    minDist = dist;
                    closestIndex = i;
                }
            }
            
            indexedData[pixelIndex] = closestIndex;
        }
    }

    // 6. DESPECKLE (Refactored for indices)
    if (settings.despeckleLevel > 0) {
        const width = targetW;
        const copy = new Uint8Array(indexedData);
        const iterations = settings.despeckleLevel; 

        for (let iter = 0; iter < iterations; iter++) {
             for (let y = 1; y < targetH - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const i = y * width + x;
                    const myIdx = copy[i];
                    if (myIdx === transparentIndex) continue;

                    const nU = (y-1) * width + x;
                    const nD = (y+1) * width + x;
                    const nL = y * width + (x-1);
                    const nR = y * width + (x+1);

                    const neighbors = [copy[nU], copy[nD], copy[nL], copy[nR]];

                    if (!neighbors.includes(myIdx)) {
                         // Find most frequent neighbor
                         const counts: Record<number, number> = {};
                         let maxC = 0;
                         let bestI = neighbors[0];
                         for (const n of neighbors) {
                             counts[n] = (counts[n] || 0) + 1;
                             if (counts[n] > maxC) { maxC = counts[n]; bestI = n; }
                         }
                         indexedData[i] = bestI;
                    }
                }
             }
             copy.set(indexedData);
        }
    }

    // 8. FINAL RENDER
    const dataUrl = renderFromIndices(targetW, targetH, indexedData, effectivePalette, transparentIndex);

    resolve({
        dataUrl,
        indices: indexedData,
        palette: effectivePalette,
        width: targetW,
        height: targetH,
        transparentIndex
    });
  });
};