import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import type { EyeLaterality } from '../types/retina';

export type DetectorEngine =
  | 'MediaPipe Face Landmarker'
  | 'On-Device Optical ROI Tracker (Fallback)';

export type EyeAlignmentStatus =
  | 'no_face'
  | 'too_far'
  | 'too_close'
  | 'adjust_position'
  | 'center_eye'
  | 'hold_still'
  | 'eye_detected'
  | 'ready';

export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EyeDetectionFrameResult {
  engineUsed: DetectorEngine;
  status: EyeAlignmentStatus;
  message: string;
  faceDetected: boolean;
  eyeDetected: boolean;
  aligned: boolean;
  steady: boolean;
  readyToCapture: boolean;
  alignmentScore: number; // 0-100
  motionDelta: number;
  faceBox?: NormalizedBox;
  eyeBox?: NormalizedBox;
  irisPoint?: { x: number; y: number };
  nextPrevCentroid?: { x: number; y: number; timestamp: number } | null;
}

export interface WebcamAccessErrorInfo {
  code: 'permission_denied' | 'not_found' | 'in_use' | 'insecure_context' | 'hardware_error';
  title: string;
  message: string;
  recoveryAction: string;
}

// MediaPipe FaceMesh eye landmark groups (anatomical patient laterality)
// Right Eye (OD): contour [33, 133, 159, 145], optional iris landmark 468
// Left Eye (OS):  contour [362, 263, 386, 374], optional iris landmark 473
const RIGHT_EYE_INDICES = [33, 133, 159, 145, 158, 153];
const LEFT_EYE_INDICES = [362, 263, 386, 374, 385, 380];
const FACE_ANCHOR_INDICES = [10, 152, 234, 454];

const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let cachedLandmarker: FaceLandmarker | null = null;
let landmarkerInitPromise: Promise<FaceLandmarker | null> | null = null;

export async function initializeFaceLandmarker(): Promise<{
  landmarker: FaceLandmarker | null;
  engine: DetectorEngine;
}> {
  if (cachedLandmarker) {
    return { landmarker: cachedLandmarker, engine: 'MediaPipe Face Landmarker' };
  }

  if (!landmarkerInitPromise) {
    landmarkerInitPromise = (async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
        const instance = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        cachedLandmarker = instance;
        return instance;
      } catch {
        // Retry with CPU delegate in case WebGL is unavailable, otherwise fallback cleanly
        try {
          const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
          const cpuInstance = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_ASSET_URL,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          cachedLandmarker = cpuInstance;
          return cpuInstance;
        } catch {
          return null;
        }
      }
    })();
  }

  const resolved = await landmarkerInitPromise;
  return {
    landmarker: resolved,
    engine: resolved ? 'MediaPipe Face Landmarker' : 'On-Device Optical ROI Tracker (Fallback)',
  };
}

export function mapWebcamError(err: unknown): WebcamAccessErrorInfo {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      code: 'insecure_context',
      title: 'HTTPS Required for Webcam Access',
      message: 'Browser webcam access requires a secure HTTPS origin or localhost.',
      recoveryAction: 'Open IRIDEON over HTTPS or import a compatible retinal fundus image directly.',
    };
  }

  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return {
      code: 'hardware_error',
      title: 'MediaDevices API Unavailable',
      message: 'This browser does not expose camera access APIs.',
      recoveryAction: 'Use a modern Chrome, Edge, Firefox, or Safari browser or import a fundus file directly.',
    };
  }

  const name = err instanceof Error ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      code: 'permission_denied',
      title: 'Camera Permission Denied',
      message: 'Camera access was blocked by the browser or operating system.',
      recoveryAction:
        'Click the camera/lock icon in the browser address bar to allow Camera access, then click Start Camera.',
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      code: 'not_found',
      title: 'No Webcam Detected',
      message: 'No connected video camera was found on this device.',
      recoveryAction:
        'Connect a webcam or USB ophthalmic adapter and click Refresh Cameras, or import a compatible retinal fundus image.',
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      code: 'in_use',
      title: 'Camera Already in Use',
      message: 'Another application or browser tab is currently locking the camera hardware.',
      recoveryAction:
        'Close video calls or camera apps (Zoom, Meet, Teams, OBS) and click Start Camera again.',
    };
  }

  return {
    code: 'hardware_error',
    title: 'Camera Initialization Error',
    message: 'Unable to open the selected webcam stream cleanly.',
    recoveryAction: 'Choose another camera device from the dropdown or check USB/hardware connections.',
  };
}

// Target reticle center in normalized frame coordinates (0..1)
export const TARGET_RETICLE = {
  cx: 0.5,
  cy: 0.48,
  radius: 0.16,
};

export function analyzeMediaPipeFrame(params: {
  landmarker: FaceLandmarker;
  video: HTMLVideoElement;
  selectedEye: EyeLaterality;
  timestampMs: number;
  prevCentroid: { x: number; y: number; timestamp: number } | null;
  mirroredPreview?: boolean;
}): EyeDetectionFrameResult {
  const { landmarker, video, selectedEye, timestampMs, prevCentroid, mirroredPreview } = params;
  const detection = landmarker.detectForVideo(video, timestampMs);

  if (!detection.faceLandmarks || detection.faceLandmarks.length === 0) {
    return {
      engineUsed: 'MediaPipe Face Landmarker',
      status: 'no_face',
      message: 'Face not detected.',
      faceDetected: false,
      eyeDetected: false,
      aligned: false,
      steady: false,
      readyToCapture: false,
      alignmentScore: 0,
      motionDelta: 0,
      nextPrevCentroid: null,
    };
  }

  const landmarks = detection.faceLandmarks[0];
  const xs = FACE_ANCHOR_INDICES.map((i) => landmarks[i]?.x ?? 0.5);
  const ys = FACE_ANCHOR_INDICES.map((i) => landmarks[i]?.y ?? 0.5);
  const faceMinX = Math.min(...xs);
  const faceMaxX = Math.max(...xs);
  const faceMinY = Math.min(...ys);
  const faceMaxY = Math.max(...ys);

  const faceWidth = Math.max(0.01, faceMaxX - faceMinX);
  const faceBox: NormalizedBox = {
    x: mirroredPreview ? 1 - faceMaxX : faceMinX,
    y: faceMinY,
    width: faceWidth,
    height: Math.max(0.01, faceMaxY - faceMinY),
  };

  const eyeIndices = selectedEye === 'OD' ? RIGHT_EYE_INDICES : LEFT_EYE_INDICES;
  const irisIndex = selectedEye === 'OD' ? 468 : 473;

  const eyeXs = eyeIndices.map((i) => landmarks[i]?.x ?? 0.5);
  const eyeYs = eyeIndices.map((i) => landmarks[i]?.y ?? 0.5);

  const rawEyeMinX = Math.min(...eyeXs);
  const rawEyeMaxX = Math.max(...eyeXs);
  const rawEyeMinY = Math.min(...eyeYs);
  const rawEyeMaxY = Math.max(...eyeYs);

  const rawCenterX = (rawEyeMinX + rawEyeMaxX) / 2;
  const rawCenterY = (rawEyeMinY + rawEyeMaxY) / 2;
  const irisLm = landmarks[irisIndex];
  const rawIrisX = irisLm ? irisLm.x : rawCenterX;
  const rawIrisY = irisLm ? irisLm.y : rawCenterY;

  const displayCenterX = mirroredPreview ? 1 - rawIrisX : rawIrisX;
  const displayCenterY = rawIrisY;

  const padX = Math.max(0.03, (rawEyeMaxX - rawEyeMinX) * 0.65);
  const padY = Math.max(0.03, (rawEyeMaxY - rawEyeMinY) * 1.15);
  const eyeBox: NormalizedBox = {
    x: Math.max(0, (mirroredPreview ? 1 - rawEyeMaxX : rawEyeMinX) - padX),
    y: Math.max(0, rawEyeMinY - padY),
    width: rawEyeMaxX - rawEyeMinX + padX * 2,
    height: rawEyeMaxY - rawEyeMinY + padY * 2,
  };

  const eyeWidth = rawEyeMaxX - rawEyeMinX;
  const eyeHeight = rawEyeMaxY - rawEyeMinY;
  const eyeOpenness = eyeWidth > 0 ? eyeHeight / eyeWidth : 0;

  const dx = displayCenterX - TARGET_RETICLE.cx;
  const dy = displayCenterY - TARGET_RETICLE.cy;
  const distFromTarget = Math.hypot(dx, dy);

  const motionDelta = prevCentroid
    ? Math.hypot(displayCenterX - prevCentroid.x, displayCenterY - prevCentroid.y)
    : 0.03;

  const nextPrevCentroid = { x: displayCenterX, y: displayCenterY, timestamp: timestampMs };

  const insideTarget = distFromTarget <= TARGET_RETICLE.radius * 0.72;
  const tooFar = faceWidth < 0.16;
  const tooClose = faceWidth > 0.68;
  const steady = prevCentroid !== null && motionDelta < 0.015;
  const eyeOpen = eyeOpenness >= 0.13;

  const centerScore = Math.max(0, 100 - (distFromTarget / 0.35) * 100);
  const scaleScore = tooFar || tooClose ? 35 : 100;
  const stabilityScore = steady ? 100 : Math.max(25, 100 - motionDelta * 2500);
  const alignmentScore = Math.round(centerScore * 0.55 + scaleScore * 0.2 + stabilityScore * 0.25);

  let status: EyeAlignmentStatus = 'eye_detected';
  let message = 'Eye position detected.';

  if (tooFar) {
    status = 'too_far';
    message = 'Please move closer.';
  } else if (tooClose) {
    status = 'too_close';
    message = 'Please adjust your position (move slightly back).';
  } else if (!insideTarget) {
    status = distFromTarget > TARGET_RETICLE.radius * 1.3 ? 'adjust_position' : 'center_eye';
    message =
      distFromTarget > TARGET_RETICLE.radius * 1.3
        ? 'Please adjust your position.'
        : 'Keep your eye centered.';
  } else if (!eyeOpen) {
    status = 'adjust_position';
    message = `Keep ${selectedEye === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'} open inside the guide.`;
  } else if (!steady) {
    status = 'hold_still';
    message = 'Hold still.';
  } else {
    status = 'ready';
    message = 'Ready to capture.';
  }

  return {
    engineUsed: 'MediaPipe Face Landmarker',
    status,
    message,
    faceDetected: true,
    eyeDetected: true,
    aligned: insideTarget && !tooFar && !tooClose && eyeOpen,
    steady,
    readyToCapture: status === 'ready',
    alignmentScore,
    motionDelta,
    faceBox,
    eyeBox,
    irisPoint: { x: displayCenterX, y: displayCenterY },
    nextPrevCentroid,
  };
}

// Fallback optical luminance & motion ROI tracker when offline / WASM model unreachable
let fallbackScratchCanvas: HTMLCanvasElement | null = null;
let prevFallbackLuma: Uint8ClampedArray | null = null;

export function analyzeOpticalFallbackFrame(params: {
  video: HTMLVideoElement;
  prevCentroid: { x: number; y: number; timestamp: number } | null;
  timestampMs: number;
  mirroredPreview?: boolean;
}): EyeDetectionFrameResult {
  const { video, prevCentroid, timestampMs, mirroredPreview } = params;
  if (!fallbackScratchCanvas) {
    fallbackScratchCanvas = document.createElement('canvas');
    fallbackScratchCanvas.width = 96;
    fallbackScratchCanvas.height = 72;
  }
  const w = 96;
  const h = 72;
  const ctx = fallbackScratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      engineUsed: 'On-Device Optical ROI Tracker (Fallback)',
      status: 'adjust_position',
      message: 'Please adjust your position.',
      faceDetected: false,
      eyeDetected: false,
      aligned: false,
      steady: false,
      readyToCapture: false,
      alignmentScore: 0,
      motionDelta: 0,
      nextPrevCentroid: null,
    };
  }

  ctx.save();
  if (mirroredPreview) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  const data = ctx.getImageData(0, 0, w, h).data;
  const luma = new Uint8ClampedArray(w * h);
  let totalLuma = 0;

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const yVal = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    luma[i] = yVal;
    totalLuma += yVal;
  }

  let frameDiff = 0;
  if (prevFallbackLuma && prevFallbackLuma.length === luma.length) {
    let diffSum = 0;
    for (let i = 0; i < luma.length; i++) {
      diffSum += Math.abs(luma[i] - prevFallbackLuma[i]);
    }
    frameDiff = diffSum / (luma.length * 255);
  } else {
    frameDiff = 0.05;
  }
  prevFallbackLuma = luma;

  const meanLuma = totalLuma / (w * h);
  // Find darkest local cluster inside central 50% window as iris/pupil proxy
  const x0 = Math.floor(w * 0.25);
  const x1 = Math.floor(w * 0.75);
  const y0 = Math.floor(h * 0.22);
  const y1 = Math.floor(h * 0.76);

  let darkSumX = 0;
  let darkSumY = 0;
  let darkWeight = 0;
  let minPatch = 255;
  let maxPatch = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = luma[y * w + x];
      if (v < minPatch) minPatch = v;
      if (v > maxPatch) maxPatch = v;
      const wDark = Math.max(0, meanLuma * 0.78 - v);
      if (wDark > 8) {
        darkSumX += x * wDark;
        darkSumY += y * wDark;
        darkWeight += wDark;
      }
    }
  }

  const contrastSpan = maxPatch - minPatch;
  if (meanLuma < 28 || contrastSpan < 30 || darkWeight < 40) {
    return {
      engineUsed: 'On-Device Optical ROI Tracker (Fallback)',
      status: 'no_face',
      message: meanLuma < 28 ? 'Please move into brighter lighting.' : 'Face not detected.',
      faceDetected: false,
      eyeDetected: false,
      aligned: false,
      steady: false,
      readyToCapture: false,
      alignmentScore: 15,
      motionDelta: frameDiff,
      nextPrevCentroid: null,
    };
  }

  const cx = darkSumX / darkWeight / w;
  const cy = darkSumY / darkWeight / h;
  const distFromTarget = Math.hypot(cx - TARGET_RETICLE.cx, cy - TARGET_RETICLE.cy);
  const insideTarget = distFromTarget <= TARGET_RETICLE.radius * 0.82;
  const steady = prevCentroid !== null && frameDiff < 0.025;
  const nextPrevCentroid = { x: cx, y: cy, timestamp: timestampMs };

  let status: EyeAlignmentStatus = 'eye_detected';
  let message = 'Eye position detected.';
  if (!insideTarget) {
    status = 'center_eye';
    message = 'Keep your eye centered.';
  } else if (!steady) {
    status = 'hold_still';
    message = 'Hold still.';
  } else {
    status = 'ready';
    message = 'Ready to capture.';
  }

  return {
    engineUsed: 'On-Device Optical ROI Tracker (Fallback)',
    status,
    message,
    faceDetected: true,
    eyeDetected: true,
    aligned: insideTarget,
    steady,
    readyToCapture: status === 'ready',
    alignmentScore: Math.round(Math.max(20, 100 - distFromTarget * 220)),
    motionDelta: frameDiff,
    eyeBox: {
      x: Math.max(0, cx - 0.1),
      y: Math.max(0, cy - 0.08),
      width: 0.2,
      height: 0.16,
    },
    irisPoint: { x: cx, y: cy },
    nextPrevCentroid,
  };
}

export function resetOpticalTrackerState(): void {
  prevFallbackLuma = null;
}

// Modular interface for external compatible retinal fundus imaging hardware integrations
export interface FundusAcquisitionSourceAdapter {
  readonly adapterId: string;
  readonly displayName: string;
  readonly transportType: 'file_import' | 'uvc_fundus_adapter' | 'sdk_bridge';
  readonly description: string;
}

export const FUNDUS_ACQUISITION_ADAPTERS: FundusAcquisitionSourceAdapter[] = [
  {
    adapterId: 'device_file_import',
    displayName: 'Retinal Camera Export / Device File Import',
    transportType: 'file_import',
    description:
      'Import JPG or PNG retinal fundus captures exported from a non-mydriatic tabletop or smartphone-attached fundus camera.',
  },
  {
    adapterId: 'uvc_ophthalmic_stream',
    displayName: 'Compatible UVC Ophthalmic Adapter (Video Input)',
    transportType: 'uvc_fundus_adapter',
    description:
      'Capture directly from an external medical fundus adapter attached as a USB Video Class camera (hardware adapter required; standard webcams cannot image the retina).',
  },
];
