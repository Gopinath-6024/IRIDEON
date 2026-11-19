import type { ClientPixelStats, DemoCaseId } from '../types/retina';

const syntheticCache = new Map<DemoCaseId, string>();
const edgeCache = new Map<string, string>();

// Deterministic pseudo-random generator for reproducible synthetic fundus textures
function createRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawVesselBranch(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  width: number,
  color: string,
  reflexColor: string,
  tortuous = false
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Main vessel body
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  if (tortuous) {
    const mx1 = (x0 + cx) * 0.5 + 8;
    const my1 = (y0 + cy) * 0.5 - 10;
    const mx2 = (cx + x1) * 0.5 - 9;
    const my2 = (cy + y1) * 0.5 + 11;
    ctx.bezierCurveTo(mx1, my1, mx2, my2, x1, y1);
  } else {
    ctx.quadraticCurveTo(cx, cy, x1, y1);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();

  // Subtle specular light reflex along center of larger vessels
  if (width >= 3.2) {
    ctx.strokeStyle = reflexColor;
    ctx.lineWidth = Math.max(1, width * 0.25);
    ctx.globalAlpha = 0.35;
    ctx.stroke();
  }
  ctx.restore();
}

export function generateSyntheticFundusDataUrl(caseId: DemoCaseId): string {
  const cached = syntheticCache.get(caseId);
  if (cached) return cached;

  const size = 768;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const rng = createRng(caseId === 'demo-a' ? 104729 : caseId === 'demo-b' ? 209441 : 319993);

  // Outer black fundus camera frame
  ctx.fillStyle = '#04060a';
  ctx.fillRect(0, 0, size, size);

  const cx = size * 0.5;
  const cy = size * 0.5;
  const radius = size * 0.44;

  // Clip circular retinal field of view
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  // Base choroidal retinal background gradient
  const baseGrad = ctx.createRadialGradient(
    size * 0.58,
    size * 0.5,
    size * 0.04,
    cx,
    cy,
    radius * 1.05
  );
  if (caseId === 'demo-a') {
    baseGrad.addColorStop(0, '#c6582a');
    baseGrad.addColorStop(0.45, '#a83c1c');
    baseGrad.addColorStop(0.82, '#792411');
    baseGrad.addColorStop(1, '#3b1008');
  } else if (caseId === 'demo-b') {
    baseGrad.addColorStop(0, '#bf5026');
    baseGrad.addColorStop(0.48, '#9b361a');
    baseGrad.addColorStop(0.82, '#6f200f');
    baseGrad.addColorStop(1, '#350d07');
  } else {
    baseGrad.addColorStop(0, '#b54922');
    baseGrad.addColorStop(0.45, '#8f2f16');
    baseGrad.addColorStop(0.82, '#621a0d');
    baseGrad.addColorStop(1, '#2b0905');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle choroidal texture patches
  for (let i = 0; i < 420; i++) {
    const px = cx + (rng() - 0.5) * radius * 2;
    const py = cy + (rng() - 0.5) * radius * 2;
    const pr = 6 + rng() * 24;
    ctx.fillStyle = rng() > 0.5 ? 'rgba(255, 160, 100, 0.025)' : 'rgba(40, 5, 5, 0.035)';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Macula & foveal darkening around (46%, 50%)
  const macX = size * 0.46;
  const macY = size * 0.5;
  const macGrad = ctx.createRadialGradient(macX, macY, 4, macX, macY, size * 0.14);
  macGrad.addColorStop(0, 'rgba(52, 12, 8, 0.62)');
  macGrad.addColorStop(0.45, 'rgba(72, 18, 10, 0.34)');
  macGrad.addColorStop(1, 'rgba(72, 18, 10, 0)');
  ctx.fillStyle = macGrad;
  ctx.beginPath();
  ctx.arc(macX, macY, size * 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Foveal reflex pinpoint
  ctx.fillStyle = 'rgba(255, 220, 175, 0.18)';
  ctx.beginPath();
  ctx.arc(macX, macY, 3.2, 0, Math.PI * 2);
  ctx.fill();

  // Optic disc at (74%, 50%)
  const discX = size * 0.74;
  const discY = size * 0.5;
  const discHalo = ctx.createRadialGradient(discX, discY, size * 0.02, discX, discY, size * 0.1);
  discHalo.addColorStop(0, 'rgba(255, 236, 178, 0.95)');
  discHalo.addColorStop(0.48, 'rgba(248, 190, 108, 0.92)');
  discHalo.addColorStop(0.75, 'rgba(225, 130, 62, 0.38)');
  discHalo.addColorStop(1, 'rgba(210, 100, 45, 0)');
  ctx.fillStyle = discHalo;
  ctx.beginPath();
  ctx.ellipse(discX, discY, size * 0.055, size * 0.062, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bright physiological cup inside optic disc
  const cupGrad = ctx.createRadialGradient(discX - 4, discY, 2, discX - 4, discY, size * 0.032);
  cupGrad.addColorStop(0, 'rgba(255, 250, 225, 0.92)');
  cupGrad.addColorStop(1, 'rgba(255, 230, 165, 0)');
  ctx.fillStyle = cupGrad;
  ctx.beginPath();
  ctx.arc(discX - 4, discY, size * 0.032, 0, Math.PI * 2);
  ctx.fill();

  // Retinal vascular tree radiating from optic disc
  const tortuous = caseId === 'demo-c';
  const veinColor = caseId === 'demo-c' ? '#580e10' : '#6c1414';
  const arteryColor = '#9b2218';
  const reflex = '#e98870';

  // Superior temporal vein + artery
  drawVesselBranch(ctx, discX - 4, discY - 10, size * 0.62, size * 0.24, size * 0.28, size * 0.34, tortuous ? 7.8 : 6.2, veinColor, reflex, tortuous);
  drawVesselBranch(ctx, discX - 2, discY - 6, size * 0.60, size * 0.28, size * 0.31, size * 0.38, 4.4, arteryColor, reflex, tortuous);
  // Secondary superior branches
  drawVesselBranch(ctx, size * 0.56, size * 0.27, size * 0.46, size * 0.18, size * 0.32, size * 0.22, 3.6, veinColor, reflex, tortuous);
  drawVesselBranch(ctx, size * 0.44, size * 0.29, size * 0.38, size * 0.35, size * 0.34, size * 0.41, 2.4, arteryColor, reflex);
  drawVesselBranch(ctx, size * 0.58, size * 0.32, size * 0.53, size * 0.38, size * 0.48, size * 0.42, 2.1, veinColor, reflex);

  // Inferior temporal vein + artery
  drawVesselBranch(ctx, discX - 4, discY + 12, size * 0.61, size * 0.77, size * 0.26, size * 0.64, tortuous ? 8.2 : 6.5, veinColor, reflex, tortuous);
  drawVesselBranch(ctx, discX - 2, discY + 8, size * 0.59, size * 0.73, size * 0.30, size * 0.61, 4.5, arteryColor, reflex, tortuous);
  // Secondary inferior branches
  drawVesselBranch(ctx, size * 0.55, size * 0.73, size * 0.45, size * 0.82, size * 0.31, size * 0.78, 3.5, veinColor, reflex, tortuous);
  drawVesselBranch(ctx, size * 0.42, size * 0.70, size * 0.36, size * 0.64, size * 0.33, size * 0.57, 2.5, arteryColor, reflex);
  drawVesselBranch(ctx, size * 0.58, size * 0.66, size * 0.54, size * 0.60, size * 0.49, size * 0.56, 2.0, veinColor, reflex);

  // Nasal superior & inferior arcades
  drawVesselBranch(ctx, discX + 6, discY - 8, size * 0.82, size * 0.32, size * 0.89, size * 0.24, 5.0, veinColor, reflex, tortuous);
  drawVesselBranch(ctx, discX + 8, discY - 4, size * 0.84, size * 0.38, size * 0.92, size * 0.34, 3.5, arteryColor, reflex);
  drawVesselBranch(ctx, discX + 6, discY + 10, size * 0.82, size * 0.68, size * 0.89, size * 0.76, 5.2, veinColor, reflex, tortuous);
  drawVesselBranch(ctx, discX + 8, discY + 5, size * 0.85, size * 0.63, size * 0.92, size * 0.66, 3.4, arteryColor, reflex);

  // Case B: Synthetic Mild/Moderate DR-like patterns matching Evidence Trail coordinates
  if (caseId === 'demo-b') {
    // Punctate microaneurysm cluster around (37%, 38%)
    const maPoints = [
      [0.36, 0.37],
      [0.38, 0.39],
      [0.355, 0.40],
      [0.39, 0.365],
      [0.375, 0.41],
      [0.41, 0.35],
    ];
    for (const [nx, ny] of maPoints) {
      ctx.fillStyle = '#4e0809';
      ctx.beginPath();
      ctx.arc(size * nx, size * ny, 2.4 + rng() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Small hard exudate specks around (54%, 57%)
    const exPoints = [
      [0.535, 0.565, 3.2],
      [0.546, 0.573, 2.8],
      [0.541, 0.582, 2.2],
      [0.554, 0.566, 2.5],
      [0.529, 0.576, 2.0],
    ];
    for (const [nx, ny, r] of exPoints) {
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.arc(size * nx, size * ny, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Focal blot hemorrhage around (34%, 63%)
    ctx.fillStyle = 'rgba(72, 8, 10, 0.88)';
    ctx.beginPath();
    ctx.ellipse(size * 0.34, size * 0.63, 7.5, 5.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.355, size * 0.615, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Case C: Synthetic Advanced DR-like patterns matching Evidence Trail coordinates
  if (caseId === 'demo-c') {
    // Multi-quadrant microaneurysms around (35%, 40%) & periphery
    for (let i = 0; i < 16; i++) {
      const nx = 0.30 + rng() * 0.25;
      const ny = 0.32 + rng() * 0.36;
      ctx.fillStyle = '#430607';
      ctx.beginPath();
      ctx.arc(size * nx, size * ny, 2.2 + rng() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clustered blot hemorrhages around (32%, 60%) & superior arcade
    const blots = [
      [0.31, 0.59, 13, 9, 0.3],
      [0.335, 0.615, 10, 7.5, -0.4],
      [0.30, 0.625, 8, 6, 0.6],
      [0.36, 0.40, 9, 6.5, 0.1],
      [0.44, 0.68, 10, 7, -0.2],
    ];
    for (const [nx, ny, rx, ry, rot] of blots) {
      ctx.fillStyle = 'rgba(65, 6, 9, 0.9)';
      ctx.beginPath();
      ctx.ellipse(size * nx, size * ny, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // Dense perimacular hard exudate ring around (50%, 54%)
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 1.6 + 0.4;
      const dist = 0.03 + rng() * 0.032;
      const nx = 0.50 + Math.cos(angle) * dist;
      const ny = 0.54 + Math.sin(angle) * dist;
      ctx.fillStyle = rng() > 0.3 ? '#fef08a' : '#facc15';
      ctx.beginPath();
      ctx.ellipse(size * nx, size * ny, 2.5 + rng() * 2.5, 2 + rng() * 1.8, rng(), 0, Math.PI * 2);
      ctx.fill();
    }

    // Fluffy pale cotton-wool spot around (56%, 31%)
    const cwsGrad = ctx.createRadialGradient(size * 0.56, size * 0.31, 2, size * 0.56, size * 0.31, 22);
    cwsGrad.addColorStop(0, 'rgba(241, 245, 249, 0.78)');
    cwsGrad.addColorStop(0.55, 'rgba(226, 232, 240, 0.42)');
    cwsGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.fillStyle = cwsGrad;
    ctx.beginPath();
    ctx.ellipse(size * 0.56, size * 0.31, 24, 15, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Fine peripapillary irregular vessel loops around (71%, 46%)
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const bx = size * (0.70 + rng() * 0.03);
      const by = size * (0.44 + rng() * 0.04);
      ctx.moveTo(bx, by);
      ctx.bezierCurveTo(bx - 12, by - 10, bx - 18, by + 12, bx - 6, by + 16);
      ctx.stroke();
    }
  }

  // Optical circular vignette rim
  const rimGrad = ctx.createRadialGradient(cx, cy, radius * 0.78, cx, cy, radius);
  rimGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  rimGrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.25)');
  rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, 0, size, size);

  ctx.restore();

  // Subtle corner synthetic educational marker inside dark frame
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.font = '600 12px monospace';
  ctx.fillText('SYNTHETIC EDUCATIONAL FUNDUS', 20, size - 18);

  const dataUrl = canvas.toDataURL('image/png');
  syntheticCache.set(caseId, dataUrl);
  return dataUrl;
}

export async function computeClientPixelStats(dataUrl: string): Promise<ClientPixelStats> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sampleSize = 192;
      const canvas = document.createElement('canvas');
      canvas.width = sampleSize;
      canvas.height = sampleSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
      const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

      let sumLum = 0;
      let sumLumSq = 0;
      let sumRed = 0;
      let sumGreen = 0;
      let sumBlue = 0;
      let centerLum = 0;
      let centerCount = 0;
      let cornerLum = 0;
      let cornerCount = 0;

      const gray = new Float32Array(sampleSize * sampleSize);

      for (let y = 0; y < sampleSize; y++) {
        for (let x = 0; x < sampleSize; x++) {
          const idx = (y * sampleSize + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          gray[y * sampleSize + x] = lum;

          sumLum += lum;
          sumLumSq += lum * lum;
          sumRed += r;
          sumGreen += g;
          sumBlue += b;

          const dx = x - sampleSize / 2;
          const dy = y - sampleSize / 2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < sampleSize * 0.28) {
            centerLum += lum;
            centerCount += 1;
          } else if (dist > sampleSize * 0.44) {
            cornerLum += lum;
            cornerCount += 1;
          }
        }
      }

      const n = sampleSize * sampleSize;
      const meanBrightness = sumLum / n;
      const variance = Math.max(0, sumLumSq / n - meanBrightness * meanBrightness);
      const contrastStdDev = Math.sqrt(variance);

      // Compute Laplacian edge energy for sharpness
      let lapSum = 0;
      let lapCount = 0;
      let saturatedPixels = 0;
      for (let y = 1; y < sampleSize - 1; y++) {
        for (let x = 1; x < sampleSize - 1; x++) {
          const c = gray[y * sampleSize + x];
          if (c > 246) saturatedPixels += 1;
          const lap =
            Math.abs(
              4 * c -
                gray[(y - 1) * sampleSize + x] -
                gray[(y + 1) * sampleSize + x] -
                gray[y * sampleSize + x - 1] -
                gray[y * sampleSize + x + 1]
            );
          lapSum += lap;
          lapCount += 1;
        }
      }

      const meanLap = lapSum / Math.max(1, lapCount);
      const edgeSharpness = Math.min(100, Math.round(meanLap * 4.2));

      const avgCenter = centerLum / Math.max(1, centerCount);
      const avgCorner = cornerLum / Math.max(1, cornerCount);
      const centerToEdgeRatio = avgCorner < 1 ? 3 : avgCenter / avgCorner;

      const totalRgb = sumRed + sumGreen + sumBlue;
      const redChannelDominance = totalRgb > 0 ? sumRed / totalRgb : 0.33;
      const glareRatio = saturatedPixels / n;
      const artifactScore = Math.max(20, Math.min(98, Math.round(95 - glareRatio * 350)));

      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        meanBrightness,
        contrastStdDev,
        edgeSharpness,
        centerToEdgeRatio,
        redChannelDominance,
        artifactScore,
      });
    };
    img.onerror = () => reject(new Error('Unable to decode uploaded image'));
    img.src = dataUrl;
  });
}

export async function generateSobelEdgeDataUrl(sourceDataUrl: string): Promise<string> {
  const cacheKey = sourceDataUrl.slice(0, 120) + sourceDataUrl.length;
  const cached = edgeCache.get(cacheKey);
  if (cached) return cached;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 384;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const imgData = ctx.getImageData(0, 0, size, size);
      const src = imgData.data;
      const out = ctx.createImageData(size, size);
      const dst = out.data;

      // Use green channel (highest retinal vessel contrast in fundus imaging)
      const green = new Float32Array(size * size);
      for (let i = 0; i < size * size; i++) {
        green[i] = src[i * 4 + 1];
      }

      for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
          const tl = green[(y - 1) * size + (x - 1)];
          const tc = green[(y - 1) * size + x];
          const tr = green[(y - 1) * size + (x + 1)];
          const ml = green[y * size + (x - 1)];
          const mr = green[y * size + (x + 1)];
          const bl = green[(y + 1) * size + (x - 1)];
          const bc = green[(y + 1) * size + x];
          const br = green[(y + 1) * size + (x + 1)];

          const gx = -tl + tr - 2 * ml + 2 * mr - bl + br;
          const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
          const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy) * 1.45);

          const idx = (y * size + x) * 4;
          dst[idx] = Math.round(mag * 0.12);
          dst[idx + 1] = Math.round(mag * 0.86);
          dst[idx + 2] = Math.round(mag * 0.98);
          dst[idx + 3] = 255;
        }
      }

      ctx.putImageData(out, 0, 0);
      const resultUrl = canvas.toDataURL('image/png');
      edgeCache.set(cacheKey, resultUrl);
      resolve(resultUrl);
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}
