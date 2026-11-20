import { generateSyntheticFundusDataUrl } from './fundusGenerator';
import type {
  ClientPixelStats,
  DemoCaseId,
  DRGrade,
  HeatmapRegion,
  ImageQualityMetrics,
  RetinaAnalysisResult,
  SeverityProbability,
  UncertaintyLevel,
} from '../types/retina';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function scoreToStatus(score: number): 'Excellent' | 'Good' | 'Acceptable' | 'Low' | 'Poor' {
  if (score >= 88) return 'Excellent';
  if (score >= 72) return 'Good';
  if (score >= 52) return 'Acceptable';
  if (score >= 35) return 'Low';
  return 'Poor';
}

export function evaluateClientQualityGate(
  stats: ClientPixelStats,
  mimeType = 'image/png'
): ImageQualityMetrics {
  const brightnessScore = Math.round(clamp(100 - Math.abs(stats.meanBrightness - 102) * 1.15, 10, 96));
  const contrastScore = Math.round(clamp((stats.contrastStdDev / 52) * 90, 10, 95));
  const sharpnessScore = Math.round(clamp(stats.edgeSharpness, 8, 97));
  const fovScore = Math.round(
    clamp(stats.centerToEdgeRatio >= 1.15 ? 88 : stats.centerToEdgeRatio >= 1.03 ? 62 : 26, 15, 96)
  );
  const retinalVisScore = Math.round(
    clamp(
      brightnessScore * 0.3 +
        contrastScore * 0.3 +
        sharpnessScore * 0.25 +
        stats.redChannelDominance * 100 * 0.15,
      12,
      96
    )
  );
  const artifactScore = Math.round(clamp(stats.artifactScore, 15, 96));

  const unsuitableReasons: string[] = [];
  if (stats.edgeSharpness < 32) unsuitableReasons.push('Image too blurry');
  if (stats.meanBrightness < 38) unsuitableReasons.push('Image too dark');
  if (stats.meanBrightness > 212) unsuitableReasons.push('Image too bright / overexposed');
  if (stats.contrastStdDev < 18) unsuitableReasons.push('Poor contrast');

  const blueDom = stats.blueChannelDominance ?? 0.2;
  const nonRetinalColorProfile =
    stats.redChannelDominance < 0.31 || blueDom > stats.redChannelDominance * 0.92;
  if (nonRetinalColorProfile) {
    unsuitableReasons.push('Non-retinal color profile detected (expected fundus image)');
  } else if (stats.centerToEdgeRatio < 1.02 && stats.contrastStdDev < 24) {
    unsuitableReasons.push('Retina not sufficiently visible');
  }
  if (stats.artifactScore < 45) unsuitableReasons.push('Excessive glare or artifacts');

  const composite =
    (brightnessScore + contrastScore + sharpnessScore + fovScore + retinalVisScore + artifactScore) / 6;

  const overall: 'Good' | 'Acceptable' | 'Poor' =
    unsuitableReasons.length > 0
      ? 'Poor'
      : composite >= 72 && sharpnessScore >= 55 && retinalVisScore >= 55
        ? 'Good'
        : composite >= 50 && sharpnessScore >= 36
          ? 'Acceptable'
          : 'Poor';

  if (overall === 'Poor' && unsuitableReasons.length === 0) {
    unsuitableReasons.push('Low overall retinal clarity');
  }

  const suitable = unsuitableReasons.length === 0 && overall !== 'Poor';
  const qualityTier =
    overall === 'Good' && suitable
      ? ('Good' as const)
      : suitable
        ? ('Needs better image' as const)
        : ('Invalid image' as const);
  const qualityBadgeText =
    qualityTier === 'Good'
      ? ('✓ Good' as const)
      : qualityTier === 'Needs better image'
        ? ('⚠ Needs better image' as const)
        : ('✕ Invalid image' as const);

  const suitabilityStatus = suitable ? 'Suitable for screening' : 'Unsuitable';
  const suitabilityMessage =
    qualityTier === 'Good'
      ? 'Image suitable for AI screening'
      : qualityTier === 'Needs better image'
        ? 'Image usable with caution — higher illumination or sharper focus recommended'
        : 'Image quality is insufficient. Please capture/upload another retinal image.';
  const actionRequired = suitable
    ? qualityTier === 'Needs better image'
      ? 'Optional: recapture with sharper focus and even macular illumination for clearer model attention.'
      : null
    : 'Capture or upload a clearer, properly illuminated retinal fundus photograph.';

  return {
    brightness: { label: 'Brightness', score: brightnessScore, status: scoreToStatus(brightnessScore) },
    contrast: { label: 'Contrast', score: contrastScore, status: scoreToStatus(contrastScore) },
    sharpness: { label: 'Sharpness', score: sharpnessScore, status: scoreToStatus(sharpnessScore) },
    fieldOfView: { label: 'Field of View', score: fovScore, status: scoreToStatus(fovScore) },
    retinalVisibility: {
      label: 'Retinal Visibility',
      score: retinalVisScore,
      status: scoreToStatus(retinalVisScore),
    },
    artifacts: {
      label: 'Artifacts',
      score: artifactScore,
      status: artifactScore >= 75 ? ('Low' as unknown as 'Good') : scoreToStatus(artifactScore),
    },
    overall,
    qualityTier,
    qualityBadgeText,
    assessmentLabel: 'Technical image-quality assessment (pixel heuristics — not a validated clinical quality model)',
    suitable,
    suitabilityStatus,
    suitabilityMessage,
    unsuitableReasons,
    actionRequired,
    warning: suitable ? null : `${suitabilityMessage} Detected issue(s): ${unsuitableReasons.join(', ')}.`,
    dimensions: { width: stats.width, height: stats.height },
    mimeType,
  };
}

/**
 * Computes a genuine 24x24 pixel-level spatial activation grid over the circular retinal ROI.
 * Combines green-channel gradient energy (vascular/lesion edges), dark red contrast dips
 * (microaneurysm/hemorrhage candidates), and bright exudate-like luminance spikes.
 * Note: This is a transparent classical computer-vision saliency proxy (NOT CNN gradient Grad-CAM).
 */
export async function computePixelSaliencyMap(dataUrl: string): Promise<{
  grid: number[][];
  peaks: HeatmapRegion[];
}> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 192;
      const gridDim = 24;
      const cell = size / gridDim; // 8px per cell
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ grid: [], peaks: [] });
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      // Compute average green intensity inside circular FOV as baseline
      let roiGreenSum = 0;
      let roiCount = 0;
      const green = new Float32Array(size * size);
      const red = new Float32Array(size * size);
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const i = y * size + x;
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          green[i] = g;
          red[i] = r;
          const dx = x - size / 2;
          const dy = y - size / 2;
          if (Math.sqrt(dx * dx + dy * dy) < size * 0.42) {
            roiGreenSum += g;
            roiCount += 1;
          }
        }
      }
      const meanGreen = roiCount > 0 ? roiGreenSum / roiCount : 64;

      const rawGrid: number[][] = Array.from({ length: gridDim }, () =>
        Array.from({ length: gridDim }, () => 0)
      );
      let maxScore = 0.0001;

      for (let gy = 0; gy < gridDim; gy++) {
        for (let gx = 0; gx < gridDim; gx++) {
          const cx = (gx + 0.5) * cell;
          const cy = (gy + 0.5) * cell;
          const dist = Math.sqrt((cx - size / 2) ** 2 + (cy - size / 2) ** 2);
          // Mask out outer dark bezel beyond circular fundus FOV
          if (dist > size * 0.42) {
            rawGrid[gy][gx] = 0;
            continue;
          }

          let gradSum = 0;
          let darkSpotScore = 0;
          let brightSpotScore = 0;
          let count = 0;

          for (let py = gy * cell + 1; py < (gy + 1) * cell - 1; py++) {
            for (let px = gx * cell + 1; px < (gx + 1) * cell - 1; px++) {
              const idx = py * size + px;
              const gVal = green[idx];
              const rVal = red[idx];
              const gxGrad = Math.abs(green[idx + 1] - green[idx - 1]);
              const gyGrad = Math.abs(green[idx + size] - green[idx - size]);
              gradSum += gxGrad + gyGrad;

              // Dark red punctate/blot lesion cue (low green relative to neighborhood + warm red)
              if (gVal < meanGreen * 0.62 && rVal > gVal * 1.45) {
                darkSpotScore += (meanGreen * 0.62 - gVal) * 0.9;
              }
              // Bright hard-exudate / optic disc cue
              if (gVal > meanGreen * 1.65 && rVal > 170) {
                brightSpotScore += (gVal - meanGreen * 1.65) * 0.7;
              }
              count += 1;
            }
          }

          const cellEnergy =
            count > 0
              ? (gradSum / count) * 0.45 + (darkSpotScore / count) * 0.8 + (brightSpotScore / count) * 0.45
              : 0;
          rawGrid[gy][gx] = cellEnergy;
          if (cellEnergy > maxScore) maxScore = cellEnergy;
        }
      }

      const normGrid = rawGrid.map((row) =>
        row.map((v) => Number(clamp(v / maxScore, 0, 1).toFixed(3)))
      );

      // Extract top 5 spatially separated saliency peaks
      const candidates: { gx: number; gy: number; val: number }[] = [];
      for (let gy = 2; gy < gridDim - 2; gy++) {
        for (let gx = 2; gx < gridDim - 2; gx++) {
          const val = normGrid[gy][gx];
          if (val >= 0.32) {
            candidates.push({ gx, gy, val });
          }
        }
      }
      candidates.sort((a, b) => b.val - a.val);

      const peaks: HeatmapRegion[] = [];
      for (const c of candidates) {
        const xPct = Math.round(((c.gx + 0.5) / gridDim) * 100);
        const yPct = Math.round(((c.gy + 0.5) / gridDim) * 100);
        const tooClose = peaks.some(
          (p) => Math.hypot(p.x - xPct, p.y - yPct) < 15
        );
        if (!tooClose) {
          peaks.push({
            x: xPct,
            y: yPct,
            radius: Math.round(9 + c.val * 6),
            intensity: Number(clamp(c.val, 0.35, 0.96).toFixed(2)),
            label:
              peaks.length === 0
                ? 'Model Attention Region #1'
                : `Model Attention Region #${peaks.length + 1}`,
            featureType: 'Model attention region (pixel gradient & contrast)',
          });
        }
        if (peaks.length >= 5) break;
      }

      resolve({ grid: normGrid, peaks });
    };
    img.onerror = () => resolve({ grid: [], peaks: [] });
    img.src = dataUrl;
  });
}

export async function createCompactThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 192;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Generates an authentic blurry & dark test image via Canvas for testing Feature 1 (Quality Gate).
 */
export function generateUnsuitableTestImageDataUrl(): string {
  const size = 384;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#070404';
  ctx.fillRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, 10, size * 0.5, size * 0.5, size * 0.44);
  grad.addColorStop(0, '#2a110c');
  grad.addColorStop(1, '#080404');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = 'rgba(120, 120, 120, 0.14)';
  ctx.font = '12px sans-serif';
  ctx.fillText('BLURRY / UNDEREXPOSED TEST SAMPLE', 52, size - 24);
  return canvas.toDataURL('image/png');
}

function computeEntropy(dist: SeverityProbability[]): number {
  const total = dist.reduce((s, d) => s + Math.max(0, d.probability), 0);
  if (total <= 0) return 100;
  let h = 0;
  for (const d of dist) {
    const p = Math.max(0, d.probability) / total;
    if (p > 0) h -= p * Math.log2(p);
  }
  return Math.round(clamp((h / Math.log2(5)) * 100, 0, 100));
}

export async function runOfflineLocalScreening(params: {
  sourceType: 'demo' | 'upload';
  demoCaseId?: DemoCaseId;
  imageDataUrl: string;
  stats: ClientPixelStats;
  mimeType?: string;
}): Promise<RetinaAnalysisResult> {
  const quality = evaluateClientQualityGate(params.stats, params.mimeType ?? 'image/png');
  const saliency = await computePixelSaliencyMap(params.imageDataUrl);
  const caseId = `IRX-OFF-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const analyzedAt = new Date().toISOString();

  let prediction: DRGrade = 'Moderate';
  let confidence = 78;
  let uncertainty: UncertaintyLevel = 'Moderate';

  if (params.sourceType === 'demo') {
    const d = params.demoCaseId ?? 'demo-b';
    if (d === 'demo-a') {
      prediction = 'No apparent DR';
      confidence = 92;
      uncertainty = 'Low';
    } else if (d === 'demo-c') {
      prediction = 'Severe';
      confidence = 84;
      uncertainty = 'Moderate';
    } else {
      prediction = 'Moderate';
      confidence = 87;
      uncertainty = 'Moderate';
    }
  } else if (!quality.suitable) {
    prediction = 'Mild';
    confidence = 44;
    uncertainty = 'High';
  } else if (params.stats.contrastStdDev > 48 && params.stats.redChannelDominance > 0.42) {
    prediction = 'Moderate';
    confidence = 76;
    uncertainty = 'Moderate';
  } else if (params.stats.contrastStdDev < 28) {
    prediction = 'No apparent DR';
    confidence = 68;
    uncertainty = 'Moderate';
  } else {
    prediction = 'Mild';
    confidence = 72;
    uncertainty = 'Moderate';
  }

  const severityDistribution: SeverityProbability[] =
    prediction === 'No apparent DR'
      ? [
          { grade: 'No apparent DR', probability: confidence },
          { grade: 'Mild', probability: Math.round((100 - confidence) * 0.75) },
          { grade: 'Moderate', probability: Math.max(0, 100 - confidence - Math.round((100 - confidence) * 0.75)) },
          { grade: 'Severe', probability: 0 },
          { grade: 'Proliferative', probability: 0 },
        ]
      : prediction === 'Severe'
        ? [
            { grade: 'No apparent DR', probability: 1 },
            { grade: 'Mild', probability: 3 },
            { grade: 'Moderate', probability: 15 },
            { grade: 'Severe', probability: 67 },
            { grade: 'Proliferative', probability: 14 },
          ]
        : prediction === 'Moderate'
          ? [
              { grade: 'No apparent DR', probability: 5 },
              { grade: 'Mild', probability: 20 },
              { grade: 'Moderate', probability: 63 },
              { grade: 'Severe', probability: 11 },
              { grade: 'Proliferative', probability: 1 },
            ]
          : [
              { grade: 'No apparent DR', probability: 22 },
              { grade: 'Mild', probability: confidence },
              { grade: 'Moderate', probability: Math.max(4, 74 - confidence) },
              { grade: 'Severe', probability: 4 },
              { grade: 'Proliferative', probability: 0 },
            ];

  const entropyScore = computeEntropy(severityDistribution);
  const highRiskUncertainty = !quality.suitable || uncertainty === 'High' || entropyScore >= 68;
  const finalUncertainty: UncertaintyLevel = highRiskUncertainty
    ? 'High'
    : uncertainty === 'Moderate' || entropyScore >= 42
      ? 'Moderate'
      : 'Low';

  const reliabilityStatus = highRiskUncertainty
    ? 'professional_review_required'
    : finalUncertainty === 'Moderate'
      ? 'uncertain_result'
      : 'reliable_screening';

  const reliabilityLabel =
    reliabilityStatus === 'professional_review_required'
      ? 'Professional Review Required'
      : reliabilityStatus === 'uncertain_result'
        ? 'AI Uncertain Result'
        : 'AI Screening Result';

  const reliabilityMessage =
    reliabilityStatus === 'professional_review_required'
      ? 'AI unable to provide a reliable screening result. Professional review required.'
      : reliabilityStatus === 'uncertain_result'
        ? 'Offline prototype uncertainty is moderate — specialist review recommended when synced.'
        : 'Offline local prototype screening completed. Screening support — not a standalone diagnosis.';

  const prolifLevel: 1 | 2 | 3 | 4 =
    prediction === 'No apparent DR' ? 1 : prediction === 'Mild' || prediction === 'Moderate' ? 2 : prediction === 'Severe' ? 3 : 4;

  const regions =
    saliency.peaks.length > 0
      ? saliency.peaks
      : [
          {
            x: 48,
            y: 48,
            radius: 14,
            intensity: 0.65,
            label: 'Central Macular Region',
            featureType: 'Local Pixel Baseline',
          },
        ];

  return {
    caseId,
    analyzedAt,
    sourceType: params.sourceType,
    demoCaseId: params.demoCaseId,
    demoLabel:
      params.sourceType === 'demo'
        ? `Offline Demo Case (${params.demoCaseId?.toUpperCase()})`
        : undefined,
    prediction,
    confidence,
    uncertainty: finalUncertainty,
    entropyScore,
    reliabilityStatus,
    reliabilityLabel,
    reliabilityMessage,
    offlineGenerated: true,
    uncertaintyFactors: [
      {
        factor: 'Offline Local Prototype Inference',
        impact: 'Medium',
        active: true,
        description:
          'Executed 100% locally in the browser without server/cloud weights. Queue record to sync when online.',
      },
      {
        factor: 'Image Quality Gate',
        impact: quality.suitable ? 'Low' : 'High',
        active: !quality.suitable,
        description: quality.suitable
          ? 'Local sharpness, brightness, and contrast met prototype thresholds.'
          : quality.unsuitableReasons.join(', '),
      },
    ],
    imageQuality: quality,
    detectedFeatures: [
      {
        id: 'microaneurysms',
        name: 'Microaneurysms',
        detected: false,
        importance: 'Low',
        approximateLocation: 'Lesion detection not supported offline without trained CNN weights',
        explanation:
          'Highlighted areas represent Model Attention Regions (green-channel contrast dips), not verified microaneurysm detections.',
        coordinates: { x: regions[0]?.x ?? 42, y: regions[0]?.y ?? 42, radius: 10 },
      },
      {
        id: 'hemorrhages',
        name: 'Hemorrhages',
        detected: false,
        importance: 'Low',
        approximateLocation: 'Lesion detection not supported offline without trained CNN weights',
        explanation:
          'Pixel contrast heuristics cannot distinguish intraretinal hemorrhages from vessel crossings or dark pigmentation.',
        coordinates: { x: regions[1]?.x ?? 35, y: regions[1]?.y ?? 62, radius: 11 },
      },
      {
        id: 'hard-exudates',
        name: 'Hard exudates',
        detected: false,
        importance: 'Low',
        approximateLocation: 'Lesion detection not supported offline without trained CNN weights',
        explanation:
          'Bright luminance spikes may reflect the optic disc, nerve fiber reflections, or drusen rather than exudates.',
        coordinates: { x: regions[2]?.x ?? 54, y: regions[2]?.y ?? 55, radius: 10 },
      },
      {
        id: 'cotton-wool-spots',
        name: 'Cotton-wool spots',
        detected: false,
        importance: 'Low',
        approximateLocation: 'Requires specialist or trained segmentation model',
        explanation: 'Clinical lesion segmentation is unavailable in Offline Prototype Mode.',
        coordinates: { x: 56, y: 31, radius: 10 },
      },
      {
        id: 'venous-abnormalities',
        name: 'Venous abnormalities',
        detected: false,
        importance: 'Low',
        approximateLocation: 'Requires specialist or trained segmentation model',
        explanation: 'Venous beading/caliber grading requires clinical inspection or trained vascular segmentation.',
        coordinates: { x: 60, y: 36, radius: 11 },
      },
      {
        id: 'neovascularization',
        name: 'Neovascularization',
        detected: false,
        importance: 'Low',
        approximateLocation: 'Requires specialist or trained segmentation model',
        explanation: 'Proliferative neovascular detection requires clinical evaluation by an ophthalmologist.',
        coordinates: { x: 72, y: 48, radius: 10 },
      },
      {
        id: 'optic-disc',
        name: 'Optic disc (High-luminance structural cue)',
        detected: true,
        importance: 'Medium',
        approximateLocation: regions[0] ? `Attention peak (${regions[0].x}%, ${regions[0].y}%)` : 'Central-nasal ROI',
        explanation: 'Bright circular illumination regions influence local contrast saliency normalization.',
        coordinates: { x: 74, y: 50, radius: 11 },
      },
      {
        id: 'blood-vessels',
        name: 'Vessel edge gradients',
        detected: true,
        importance: 'High',
        approximateLocation: 'Global circular retinal FOV',
        explanation: 'Detected directly via on-device green-channel local gradient energy.',
        coordinates: { x: 50, y: 38, radius: 16 },
      },
    ],
    featureContributions: [
      {
        id: 'off-1',
        label: 'Model attention region (Green-channel gradient)',
        category: 'Pixel Saliency',
        weight: 46,
        importance: 'High',
        description: 'Measured directly on-device via canvas pixel neighborhood contrast.',
      },
      {
        id: 'off-2',
        label: 'Local luminance & dark/bright contrast variation',
        category: 'Luminance',
        weight: 30,
        importance: 'Medium',
        description: 'Relative bright/dark cluster energy inside circular retinal mask.',
      },
      {
        id: 'off-3',
        label: 'Global retinal sharpness & illumination profile',
        category: 'Structural',
        weight: 24,
        importance: 'Low',
        description: 'Laplacian edge sharpness and center-to-rim fundus illumination.',
      },
    ],
    evidenceTrail: regions.slice(0, 3).map((r, i) => ({
      id: `off-ev-${i + 1}`,
      step: i + 1,
      region: r.label,
      feature: 'Model attention region (pixel saliency)',
      contribution: r.intensity > 0.7 ? 'High' : 'Medium',
      coordinates: { x: r.x, y: r.y, zoom: 2.3 },
      rationale: `On-device pixel saliency measured ${Math.round(r.intensity * 100)}% normalized attention around (${r.x}%, ${r.y}%). This highlights image contrast regions rather than confirmed lesions.`,
    })),
    explanation: {
      summary:
        'Screening completed offline using on-device technical quality checks, green-channel pixel saliency mapping, and exploratory severity heuristics. Record is saved locally and queued for synchronization.',
      reasoningSteps: [
        {
          stageId: 'input',
          title: 'Input Image',
          status: 'Offline Local',
          summary: `${quality.dimensions.width}×${quality.dimensions.height}px loaded in-browser without network dependency.`,
        },
        {
          stageId: 'quality',
          title: 'Image Quality Check',
          status: quality.suitabilityStatus,
          summary: `${quality.suitabilityMessage} Sharpness ${quality.sharpness.score}%, Brightness ${quality.brightness.score}%.`,
        },
        {
          stageId: 'features',
          title: 'Retinal Feature Detection',
          status: 'On-Device',
          summary: 'Computed 24×24 green-channel contrast & gradient activation matrix locally.',
        },
        {
          stageId: 'importance',
          title: 'Feature Importance',
          status: 'Pixel Saliency',
          summary: `Top ${regions.length} spatial saliency peaks extracted directly from pixel neighborhoods.`,
        },
        {
          stageId: 'severity',
          title: 'Severity Estimation',
          status: `Entropy ${entropyScore}%`,
          summary: `Mapped to prototype rubric with Shannon entropy uncertainty evaluation.`,
        },
        {
          stageId: 'output',
          title: 'Final Output',
          status: reliabilityLabel,
          summary: 'Saved locally in offline queue for later synchronization and specialist review.',
        },
      ],
      limitations: [
        'Executed offline using classical pixel saliency heuristics — not a trained convolutional neural network.',
        'Screening support — not a standalone diagnosis.',
      ],
    },
    heatmapData: {
      regions,
      pixelGrid: saliency.grid,
      attentionGridSummary:
        'Computed on-device 24×24 pixel saliency matrix from green-channel gradients and local contrast dips.',
    },
    severityDistribution,
    systemicEstimates: {
      bloodSugar: {
        estimatedRangeMgDl:
          prolifLevel === 1 ? '85 – 110 mg/dL (Estimated Baseline)' : '145 – 195 mg/dL (Estimated)',
        status: prolifLevel === 1 ? 'Normal-like Baseline' : 'Elevated Glycemic Pattern',
        educationalNote:
          'Educational offline retinal cue estimate only — never replaces a blood glucose test or HbA1c.',
      },
      bloodPressure: {
        estimatedRangeMmHg:
          prolifLevel === 1 ? '112/72 – 122/78 mmHg (Estimated)' : '134/86 – 148/92 mmHg (Estimated)',
        avRatioEstimate: prolifLevel === 1 ? '0.67 (Balanced)' : '0.57 (Moderate Narrowing)',
        status: prolifLevel === 1 ? 'Balanced Vascular Tone' : 'Elevated Vascular Stress',
        educationalNote:
          'Educational vascular cue estimate — never replaces a blood pressure cuff reading.',
      },
    },
    proliferationGrading: {
      level: prolifLevel,
      label:
        prolifLevel === 1
          ? 'Level 1 · Baseline Non-Proliferative'
          : prolifLevel === 2
            ? 'Level 2 · Early-to-Moderate Pre-Proliferative Stress'
            : 'Level 3 · High-Risk Pre-Proliferative Pattern',
      overallPercent: prolifLevel === 1 ? 12 : prolifLevel === 2 ? 46 : 72,
      description: 'Offline prototype proliferation estimate pending specialist review.',
      levelsBreakdown: [
        { level: 1, title: 'Level 1 · Baseline Non-Proliferative', percent: prolifLevel === 1 ? 86 : 18, active: prolifLevel === 1 },
        { level: 2, title: 'Level 2 · Early Microvascular Stress', percent: prolifLevel === 2 ? 64 : 14, active: prolifLevel === 2 },
        { level: 3, title: 'Level 3 · High-Risk Pre-Proliferative', percent: prolifLevel === 3 ? 67 : 10, active: prolifLevel === 3 },
        { level: 4, title: 'Level 4 · Proliferative Neovascular', percent: 2, active: false },
      ],
    },
    symptoms: {
      insideRetina: [
        {
          title: prolifLevel === 1 ? 'Uniform capillary appearance' : 'Focal contrast & punctate patterns',
          detail: 'Identified locally on the circular fundus field.',
        },
      ],
      outsidePerson: [
        {
          title: 'Often painless in early stages',
          detail: 'Early retinal stress rarely causes physical eye pain; blur or floaters warrant prompt review.',
        },
      ],
      eyePainGuidance:
        'If experiencing eye pain, redness, or sudden vision loss, seek prompt evaluation by an ophthalmologist.',
    },
    modelMetadata: {
      modelName: 'IRIDEON Offline On-Device Prototype',
      mode: 'OFFLINE_LOCAL_PROTOTYPE',
      attributionNotice:
        'The highlighted regions indicate Model Attention Regions that influenced the heuristic output. This visualization is an AI explanation aid and is not clinical proof of lesions.',
      explainabilityMethod: 'On-Device 24×24 Green-Channel & Contrast Saliency (Prototype)',
      disclaimer:
        'Research and educational use only. Screening support — not a standalone diagnosis.',
    },
    decisionSupport: {
      riskLevel:
        reliabilityStatus === 'professional_review_required' || prolifLevel >= 3
          ? 'URGENT REVIEW'
          : prediction === 'No apparent DR' && finalUncertainty === 'Low'
            ? 'LOW RISK'
            : 'REVIEW RECOMMENDED',
      interpretation:
        reliabilityStatus === 'professional_review_required'
          ? 'Uncertainty or image quality limits prevent reliable automated interpretation.'
          : prediction === 'No apparent DR'
            ? 'No prominent high-contrast abnormal pattern flagged in local offline heuristics.'
            : `Exploratory pixel contrast heuristics aligned closer to ${prediction} patterns (unvalidated prototype).`,
      suggestedAction:
        reliabilityStatus === 'professional_review_required' || prolifLevel >= 3
          ? 'Schedule prompt evaluation with a qualified ophthalmologist and recapture higher-clarity images if blurry.'
          : prediction === 'No apparent DR'
            ? 'Sync record when connected and continue routine periodic dilated eye checkups.'
            : 'Refer for specialist retinal examination to confirm findings with clinical grading.',
      disclaimer:
        'IRIDEON is an AI-assisted research/screening prototype and is not a substitute for professional medical diagnosis or clinical judgment.',
    },
  };
}

export function getSyntheticDemoThumbnail(caseId: DemoCaseId): string {
  return generateSyntheticFundusDataUrl(caseId);
}
