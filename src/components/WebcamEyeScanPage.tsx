import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Camera,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Trash2,
  Upload,
  Video,
  VideoOff,
  XCircle,
} from 'lucide-react';
import {
  analyzeMediaPipeFrame,
  analyzeOpticalFallbackFrame,
  FUNDUS_ACQUISITION_ADAPTERS,
  initializeFaceLandmarker,
  mapWebcamError,
  resetOpticalTrackerState,
  TARGET_RETICLE,
  type DetectorEngine,
  type EyeDetectionFrameResult,
  type WebcamAccessErrorInfo,
} from '../utils/eyeVisionDetector';
import { computeClientPixelStats } from '../utils/fundusGenerator';
import { createCompactThumbnail, evaluateClientQualityGate } from '../utils/retinalSaliency';
import { ExplainabilityViewer, type FocusTarget, type ViewerTab } from './ExplainabilityViewer';
import { AIReasoningLens } from './AIReasoningLens';
import { ConfidenceAndUncertainty } from './ConfidenceAndUncertainty';
import { ClinicalIndicatorsPanel } from './ClinicalIndicatorsPanel';
import { RetinaExplainChat } from './RetinaExplainChat';
import {
  FiveClassScaleStrip,
  InlineClinicianReviewCard,
  ScreeningDecisionSupportCard,
  WhyThisResultCard,
} from './WhyResultAndDecisionCards';
import type {
  AppPage,
  ChatMessage,
  ClientPixelStats,
  ClinicianDecision,
  DoctorReviewData,
  ExplainMode,
  ExternalEyeCapture,
  EyeLaterality,
  ImageQualityMetrics,
  LocalScreeningRecord,
  RetinaAnalysisResult,
} from '../types/retina';

interface WebcamEyeScanPageProps {
  localRecords: LocalScreeningRecord[];
  analysis: RetinaAnalysisResult | null;
  activeFundusImageUrl: string | null;
  isAnalyzing: boolean;
  analysisStageLabel?: string | null;
  errorMsg: string | null;
  isOffline: boolean;
  defaultExplainMode: ExplainMode;
  colormap: 'thermal' | 'clinical';
  activeDoctorReview?: DoctorReviewData | null;
  onSaveClinicianDecision?: (decision: ClinicianDecision, notes: string) => void;
  onAnalyzeWebcamWorkflowFundus: (params: {
    fundusImageUrl: string;
    pixelStats: ClientPixelStats;
    patientId: string;
    eyeLaterality: EyeLaterality;
    deviceLabel: string;
    externalEyeReference?: RetinaAnalysisResult['externalEyeReference'];
  }) => Promise<void>;
  onCancelAnalysis?: () => void;
  onNavigate: (page: AppPage) => void;
  onSendToDoctorReview: () => void;
  onCreateReferral: () => void;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  onSendChatQuestion: (question: string, mode: ExplainMode) => void;
  onClearChat: () => void;
}

const MAX_FUNDUS_BYTES = 10 * 1024 * 1024;
const AUTO_CAPTURE_HOLD_FRAMES = 14; // ~1.0s of consecutive steady alignment

export const WebcamEyeScanPage: React.FC<WebcamEyeScanPageProps> = ({
  localRecords,
  analysis,
  activeFundusImageUrl,
  isAnalyzing,
  analysisStageLabel,
  errorMsg,
  isOffline,
  defaultExplainMode,
  colormap,
  activeDoctorReview,
  onSaveClinicianDecision,
  onAnalyzeWebcamWorkflowFundus,
  onCancelAnalysis,
  onNavigate,
  onSendToDoctorReview,
  onCreateReferral,
  chatMessages,
  chatLoading,
  onSendChatQuestion,
  onClearChat,
}) => {
  // Patient & Laterality State (do NOT auto-assume laterality)
  const existingPatientIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of localRecords) {
      if (r.patientDemoId) ids.add(r.patientDemoId);
    }
    return Array.from(ids);
  }, [localRecords]);

  const [selectedPatientPreset, setSelectedPatientPreset] = useState<string>(
    () => existingPatientIds[0] || 'CUSTOM'
  );
  const [customPatientId, setCustomPatientId] = useState<string>('PT-WEBCAM-01');
  const [selectedEye, setSelectedEye] = useState<EyeLaterality | null>(null);

  const resolvedPatientId =
    selectedPatientPreset === 'CUSTOM'
      ? customPatientId.trim() || 'PT-WEBCAM-01'
      : selectedPatientPreset;

  // Camera Hardware State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastDetectTsRef = useRef<number>(0);
  const prevCentroidRef = useRef<{ x: number; y: number; timestamp: number } | null>(null);
  const steadyStreakRef = useRef<number>(0);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<WebcamAccessErrorInfo | null>(null);
  const [mirroredPreview, setMirroredPreview] = useState(true);
  const [autoCaptureConsent, setAutoCaptureConsent] = useState(false);
  const [detectorEngine, setDetectorEngine] = useState<DetectorEngine | null>(null);
  const [detectionState, setDetectionState] = useState<EyeDetectionFrameResult | null>(null);
  const [steadyProgress, setSteadyProgress] = useState(0);

  // External-Eye Capture State (Strictly non-diagnostic reference)
  const [externalCapture, setExternalCapture] = useState<ExternalEyeCapture | null>(null);

  // Actual Retinal Fundus Acquisition State (Path B)
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(
    FUNDUS_ACQUISITION_ADAPTERS[0].adapterId
  );
  const [fundusImageUrl, setFundusImageUrl] = useState<string | null>(null);
  const [fundusPixelStats, setFundusPixelStats] = useState<ClientPixelStats | null>(null);
  const [fundusQuality, setFundusQuality] = useState<ImageQualityMetrics | null>(null);
  const [fundusUploadError, setFundusUploadError] = useState<string | null>(null);
  const [fundusDeviceLabel, setFundusDeviceLabel] = useState<string>(
    FUNDUS_ACQUISITION_ADAPTERS[0].displayName
  );
  const [uvcConfirmRetinalAdapter, setUvcConfirmRetinalAdapter] = useState(false);
  const fundusFileInputRef = useRef<HTMLInputElement | null>(null);

  // Unified XAI Results Viewer State
  const [viewerTab, setViewerTab] = useState<ViewerTab>('grid');
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);

  // Stop webcam tracks cleanly
  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore cleanup failures
        }
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    prevCentroidRef.current = null;
    steadyStreakRef.current = 0;
    resetOpticalTrackerState();
    setSteadyProgress(0);
    setCameraActive(false);
    setDetectionState(null);
  }, []);

  // Ensure hardware tracks are always released when leaving Webcam Eye Scan
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const refreshCameraList = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const vids = all.filter((d) => d.kind === 'videoinput');
      setCameras(vids);
      if (vids.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(vids[0].deviceId);
      }
    } catch {
      // ignore enumeration failures until getUserMedia resolves
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    refreshCameraList();
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshCameraList);
      return () =>
        navigator.mediaDevices.removeEventListener('devicechange', refreshCameraList);
    }
  }, [refreshCameraList]);

  const startCamera = useCallback(
    async (overrideDeviceId?: string) => {
      setCameraError(null);
      if (!selectedEye) {
        setCameraError({
          code: 'hardware_error',
          title: 'Select Eye Laterality First',
          message: 'Please select Right Eye (OD) or Left Eye (OS) before starting the camera.',
          recoveryAction: 'Choose Right Eye (OD) or Left Eye (OS) above, then click Start Camera.',
        });
        return;
      }

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraError(mapWebcamError(new Error('insecure')));
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(mapWebcamError(new Error('unsupported')));
        return;
      }

      stopCamera();
      setCameraStarting(true);

      try {
        const targetId = overrideDeviceId ?? selectedDeviceId;
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: targetId
            ? { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        await refreshCameraList();
        const { engine } = await initializeFaceLandmarker();
        setDetectorEngine(engine);
        setCameraActive(true);
      } catch (err) {
        stopCamera();
        setCameraError(mapWebcamError(err));
      } finally {
        setCameraStarting(false);
      }
    },
    [refreshCameraList, selectedDeviceId, selectedEye, stopCamera]
  );

  // Capture external-eye frame cleanly from live video (NEVER sent to DR diagnostic model)
  const captureExternalEyeFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraActive || !selectedEye || video.videoWidth <= 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (mirroredPreview) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    setExternalCapture({
      captureId: `EXT-${Date.now().toString(36).toUpperCase()}`,
      imageDataUrl: dataUrl,
      eyeLaterality: selectedEye,
      capturedAt: new Date().toISOString(),
      patientId: resolvedPatientId,
      sourceType: 'external_webcam_reference',
      detectorEngine: detectorEngine || 'Webcam',
      alignmentScore: detectionState?.alignmentScore ?? 0,
      consentConfirmed: autoCaptureConsent,
    });
    steadyStreakRef.current = 0;
    setSteadyProgress(0);
  }, [
    autoCaptureConsent,
    cameraActive,
    detectionState?.alignmentScore,
    detectorEngine,
    mirroredPreview,
    resolvedPatientId,
    selectedEye,
  ]);

  // Real-time computer vision eye tracking + canvas guide loop
  useEffect(() => {
    if (!cameraActive || !selectedEye) return;

    let cancelled = false;
    let cachedLandmarkerRef: Awaited<ReturnType<typeof initializeFaceLandmarker>>['landmarker'] =
      null;

    initializeFaceLandmarker().then(({ landmarker, engine }) => {
      if (!cancelled) {
        cachedLandmarkerRef = landmarker;
        setDetectorEngine(engine);
      }
    });

    const renderGuideOverlay = (res: EyeDetectionFrameResult | null) => {
      const canvas = overlayCanvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const cw = video.clientWidth || 640;
      const ch = video.clientHeight || 360;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cw, ch);

      const gx = TARGET_RETICLE.cx * cw;
      const gy = TARGET_RETICLE.cy * ch;
      const gr = TARGET_RETICLE.radius * Math.min(cw, ch) * 1.15;

      // Reticle ring color conveys alignment state (paired with text message below)
      const ringColor = res?.readyToCapture
        ? '#10b981'
        : res?.aligned
          ? '#06b6d4'
          : res?.faceDetected
            ? '#f59e0b'
            : '#94a3b8';

      // Target guide circle
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.5;
      ctx.setLineDash(res?.readyToCapture ? [] : [8, 6]);
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Steady hold arc
      if (steadyStreakRef.current > 0) {
        const pct = Math.min(1, steadyStreakRef.current / AUTO_CAPTURE_HOLD_FRAMES);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(gx, gy, gr + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();
      }

      // Crosshairs
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx - gr - 12, gy);
      ctx.lineTo(gx - gr + 6, gy);
      ctx.moveTo(gx + gr - 6, gy);
      ctx.lineTo(gx + gr + 12, gy);
      ctx.moveTo(gx, gy - gr - 12);
      ctx.lineTo(gx, gy - gr + 6);
      ctx.moveTo(gx, gy + gr - 6);
      ctx.lineTo(gx, gy + gr + 12);
      ctx.stroke();

      // Detected face box
      if (res?.faceBox) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(
          res.faceBox.x * cw,
          res.faceBox.y * ch,
          res.faceBox.width * cw,
          res.faceBox.height * ch
        );
      }

      // Detected selected eye ROI box
      if (res?.eyeBox) {
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          res.eyeBox.x * cw,
          res.eyeBox.y * ch,
          res.eyeBox.width * cw,
          res.eyeBox.height * ch
        );
      }

      // Iris / Pupil marker
      if (res?.irisPoint) {
        ctx.fillStyle = ringColor;
        ctx.beginPath();
        ctx.arc(res.irisPoint.x * cw, res.irisPoint.y * ch, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (now: number) => {
      if (cancelled) return;
      const video = videoRef.current;

      if (video && video.readyState >= 2 && now - lastDetectTsRef.current >= 70) {
        lastDetectTsRef.current = now;

        let frameRes: EyeDetectionFrameResult;
        if (cachedLandmarkerRef) {
          try {
            frameRes = analyzeMediaPipeFrame({
              landmarker: cachedLandmarkerRef,
              video,
              selectedEye,
              timestampMs: now,
              prevCentroid: prevCentroidRef.current,
              mirroredPreview,
            });
          } catch {
            frameRes = analyzeOpticalFallbackFrame({
              video,
              prevCentroid: prevCentroidRef.current,
              timestampMs: now,
              mirroredPreview,
            });
          }
        } else {
          frameRes = analyzeOpticalFallbackFrame({
            video,
            prevCentroid: prevCentroidRef.current,
            timestampMs: now,
            mirroredPreview,
          });
        }

        prevCentroidRef.current = frameRes.nextPrevCentroid ?? null;

        if (frameRes.readyToCapture) {
          steadyStreakRef.current = Math.min(
            AUTO_CAPTURE_HOLD_FRAMES,
            steadyStreakRef.current + 1
          );
        } else {
          steadyStreakRef.current = Math.max(0, steadyStreakRef.current - 2);
        }

        const pct = Math.round((steadyStreakRef.current / AUTO_CAPTURE_HOLD_FRAMES) * 100);
        setSteadyProgress(pct);
        setDetectionState(frameRes);
        renderGuideOverlay(frameRes);

        if (autoCaptureConsent && steadyStreakRef.current >= AUTO_CAPTURE_HOLD_FRAMES) {
          captureExternalEyeFrame();
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [autoCaptureConsent, cameraActive, captureExternalEyeFrame, mirroredPreview, selectedEye]);

  // Shared fundus image validation for Path B (Device Import or UVC Fundus Adapter)
  const validateAndStageFundusImage = useCallback(
    async (dataUrl: string, mimeType: string, deviceName: string) => {
      setFundusUploadError(null);
      setFundusQuality(null);
      try {
        const stats = await computeClientPixelStats(dataUrl);
        setFundusImageUrl(dataUrl);
        setFundusPixelStats(stats);
        setFundusDeviceLabel(deviceName);

        if (isOffline) {
          setFundusQuality(evaluateClientQualityGate(stats, mimeType || 'image/png'));
          return;
        }

        try {
          const qRes = await fetch('/api/image-quality', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageDataUrl: dataUrl, pixelStats: stats }),
          });
          const qData = (await qRes.json()) as {
            imageQuality?: ImageQualityMetrics;
            error?: string;
          };

          if (!qRes.ok || !qData.imageQuality) {
            setFundusImageUrl(null);
            setFundusPixelStats(null);
            setFundusUploadError(
              qData.error ?? 'Retinal image validation failed. Please import a valid JPG or PNG.'
            );
            return;
          }
          setFundusQuality(qData.imageQuality);
        } catch {
          setFundusQuality(evaluateClientQualityGate(stats, mimeType || 'image/png'));
        }
      } catch {
        setFundusUploadError(
          'Unable to decode the selected image. Ensure it is a valid JPG or PNG fundus file.'
        );
      }
    },
    [isOffline]
  );

  const handleFundusFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFundusUploadError(null);

    const validMime = file.type === 'image/jpeg' || file.type === 'image/png';
    const validExt = /\.(jpe?g|png)$/i.test(file.name);
    if (!validMime && !validExt) {
      setFundusUploadError(
        'Unsupported file format. Please import a JPG, JPEG, or PNG retinal fundus image.'
      );
      return;
    }

    if (file.size > MAX_FUNDUS_BYTES) {
      setFundusUploadError('File exceeds 10 MB limit. Choose a compressed retinal fundus image.');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read file.'));
        };
        reader.onerror = () => reject(new Error('Could not read image file.'));
        reader.readAsDataURL(file);
      });
      await validateAndStageFundusImage(
        dataUrl,
        file.type || 'image/png',
        `Device Export (${file.name.slice(0, 32)})`
      );
    } catch {
      setFundusUploadError('Unable to read the selected fundus image file.');
    }
  };

  // Capture directly from connected UVC Ophthalmic Fundus Adapter (ONLY if operator confirms optical adapter)
  const handleCaptureFromUvcFundusAdapter = async () => {
    const video = videoRef.current;
    if (!video || !cameraActive || !uvcConfirmRetinalAdapter || video.videoWidth <= 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/png');
    const selectedCam = cameras.find((c) => c.deviceId === selectedDeviceId);
    await validateAndStageFundusImage(
      dataUrl,
      'image/png',
      selectedCam?.label || 'Compatible UVC Ophthalmic Adapter'
    );
  };

  const handleTriggerAnalyzeRetina = async () => {
    if (!selectedEye || !fundusImageUrl || !fundusPixelStats || !fundusQuality?.suitable) {
      return;
    }

    let extThumb: string | undefined;
    if (externalCapture) {
      extThumb = await createCompactThumbnail(externalCapture.imageDataUrl);
    }

    await onAnalyzeWebcamWorkflowFundus({
      fundusImageUrl,
      pixelStats: fundusPixelStats,
      patientId: resolvedPatientId,
      eyeLaterality: selectedEye,
      deviceLabel: fundusDeviceLabel,
      externalEyeReference: externalCapture
        ? {
            captureId: externalCapture.captureId,
            eyeLaterality: externalCapture.eyeLaterality,
            capturedAt: externalCapture.capturedAt,
            detectorEngine: externalCapture.detectorEngine,
            consentConfirmed: externalCapture.consentConfirmed,
            thumbnailUrl: extThumb,
          }
        : undefined,
    });
  };

  const isAnalyzeEnabled =
    Boolean(selectedEye) &&
    Boolean(fundusImageUrl) &&
    Boolean(fundusQuality?.suitable) &&
    !isAnalyzing;

  const qualityMetricsList = fundusQuality
    ? [
        fundusQuality.brightness,
        fundusQuality.contrast,
        fundusQuality.sharpness,
        fundusQuality.fieldOfView,
        fundusQuality.retinalVisibility,
        fundusQuality.artifacts,
      ]
    : [];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. Page Header & Instructions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            IRIDEON · Dual-Stage Ocular Alignment & Fundus Workflow
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            AI Webcam Eye Scan
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 max-w-3xl">
            1) Select Patient ID & Eye Laterality (OD/OS). 2) Use your webcam for automatic eye positioning and capture an external-eye reference photo. 3) Acquire or import a genuine retinal fundus image to run the standard IRIDEON DR screening pipeline.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            stopCamera();
            onNavigate('analyze');
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors whitespace-nowrap self-start md:self-auto"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Switch to Add Retina (Upload)</span>
        </button>
      </div>

      {/* Explicit Medical Hardware Boundary Banner */}
      <div className="rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/70 dark:bg-cyan-950/25 p-4 flex items-start gap-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
        <Info className="w-5 h-5 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">
            External-Eye Positioning vs. Retinal Fundus Imaging
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            A standard laptop webcam captures external ocular anatomy (eyelid, iris, positioning) and{' '}
            <strong>cannot photograph the retina</strong>. IRIDEON never synthesizes fake fundus images or feeds external-eye webcam snapshots into diabetic retinopathy prediction. Connect a compatible retinal fundus camera adapter or import an actual fundus image in Step B below.
          </p>
        </div>
      </div>

      {/* 2. Patient Identification & Explicit Left / Right Eye Selection */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Patient Selection */}
          <div className="lg:col-span-5 space-y-2.5">
            <label
              htmlFor="webcam-patient-select"
              className="block text-xs font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Step 1 · Patient / Case Identifier (Anonymous — No PII)
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <select
                id="webcam-patient-select"
                value={selectedPatientPreset}
                onChange={(e) => setSelectedPatientPreset(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {existingPatientIds.map((pid) => (
                  <option key={pid} value={pid}>
                    Existing Record: {pid}
                  </option>
                ))}
                <option value="CUSTOM">New Anonymous Case Code...</option>
              </select>

              {selectedPatientPreset === 'CUSTOM' && (
                <input
                  type="text"
                  value={customPatientId}
                  onChange={(e) => setCustomPatientId(e.target.value.slice(0, 40))}
                  aria-label="Anonymous Patient ID code"
                  placeholder="e.g. PT-WEBCAM-01"
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active Identifier: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{resolvedPatientId}</span>
            </p>
          </div>

          {/* Left / Right Eye Laterality */}
          <div className="lg:col-span-7 space-y-2.5">
            <p className="text-xs font-mono uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Step 2 · Select Eye Under Examination (Required — Never Auto-Assumed)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  {
                    code: 'OD' as EyeLaterality,
                    title: 'Right Eye (OD)',
                    subtitle: 'Oculus Dexter · Temporal optic disc nasal side',
                  },
                  {
                    code: 'OS' as EyeLaterality,
                    title: 'Left Eye (OS)',
                    subtitle: 'Oculus Sinister · Temporal optic disc nasal side',
                  },
                ] as const
              ).map((eye) => {
                const active = selectedEye === eye.code;
                return (
                  <button
                    key={eye.code}
                    type="button"
                    onClick={() => setSelectedEye(eye.code)}
                    aria-pressed={active}
                    className={`rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                      active
                        ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/70 dark:bg-cyan-950/35'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] hover:border-cyan-500/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        {eye.title}
                      </span>
                      <span
                        className={`font-mono text-xs font-semibold ${
                          active
                            ? 'text-cyan-700 dark:text-cyan-300'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {active ? 'Selected' : eye.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                      {eye.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Main Split Acquisition Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN (Path A): Live Webcam Eye Detection & External-Eye Capture */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400 uppercase tracking-wide">
                Path A · Webcam Eye Positioning & Reference
              </p>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Live Webcam & Auto Eye Alignment
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {selectedEye ? `Examining: ${selectedEye === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}` : 'Eye Not Selected'}
            </span>
          </div>

          {/* Camera Selector & Start/Stop Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Select webcam device"
              value={selectedDeviceId}
              onChange={(e) => {
                setSelectedDeviceId(e.target.value);
                if (cameraActive) startCamera(e.target.value);
              }}
              className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {cameras.length === 0 ? (
                <option value="">Default Camera (Click Start to detect)</option>
              ) : (
                cameras.map((cam, idx) => (
                  <option key={cam.deviceId || idx} value={cam.deviceId}>
                    {cam.label || `Camera Device #${idx + 1}`}
                  </option>
                ))
              )}
            </select>

            <button
              type="button"
              onClick={refreshCameraList}
              title="Refresh camera list"
              aria-label="Refresh camera list"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-cyan-500"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {!cameraActive ? (
              <button
                type="button"
                disabled={cameraStarting}
                onClick={() => startCamera()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {cameraStarting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Video className="w-4 h-4" />
                )}
                <span>{cameraStarting ? 'Starting...' : 'Start Camera'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/35 text-red-800 dark:text-red-200 text-xs sm:text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors whitespace-nowrap"
              >
                <VideoOff className="w-4 h-4" />
                <span>Stop Camera</span>
              </button>
            )}
          </div>

          {/* Camera Error Recovery Banner */}
          {cameraError && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-4 text-xs text-red-950 dark:text-red-100 space-y-1.5"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>{cameraError.title}</span>
              </div>
              <p>{cameraError.message}</p>
              <p className="font-medium">Recovery: {cameraError.recoveryAction}</p>
            </div>
          )}

          {/* Live Video + Canvas Eye Alignment Guide */}
          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-[#04070E]">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${mirroredPreview ? 'scale-x-[-1]' : ''} ${
                cameraActive ? 'opacity-100' : 'opacity-0'
              }`}
            />

            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2">
                <Camera className="w-9 h-9 text-slate-500" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-200">
                  {selectedEye
                    ? `Camera inactive · Ready for ${selectedEye === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}`
                    : 'Select Right Eye (OD) or Left Eye (OS) to activate webcam'}
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Position your selected eye inside the reticle. Camera tracks are released automatically when stopped or when leaving this page.
                </p>
              </div>
            )}

            {/* Contrast Scrim HUD for Real-Time Detection Feedback */}
            {cameraActive && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-semibold ${
                      detectionState?.readyToCapture
                        ? 'text-emerald-300'
                        : detectionState?.aligned
                          ? 'text-cyan-300'
                          : 'text-amber-300'
                    }`}
                  >
                    {detectionState?.message || 'Initializing eye detection...'}
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono tabular-nums text-[11px] text-slate-300">
                  <span>Align: {detectionState?.alignmentScore ?? 0}%</span>
                  {autoCaptureConsent && <span>Hold: {steadyProgress}%</span>}
                </div>
              </div>
            )}
          </div>

          {/* Alignment Telemetry + Consent + Manual Capture */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={autoCaptureConsent}
                  onChange={(e) => setAutoCaptureConsent(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  Auto-capture external eye when steady (operator/subject consent obtained)
                </span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={mirroredPreview}
                  onChange={(e) => setMirroredPreview(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>Mirror preview</span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Detector: {detectorEngine || 'Awaiting camera start'}
              </p>

              <button
                type="button"
                disabled={!cameraActive || !selectedEye}
                onClick={captureExternalEyeFrame}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture External Eye Reference</span>
              </button>
            </div>
          </div>

          {/* Captured External-Eye Reference Preview (Strictly Separated from Fundus Input) */}
          {externalCapture && (
            <div className="rounded-xl border border-amber-300/80 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-mono font-semibold text-amber-900 dark:text-amber-300">
                    EXTERNAL-EYE REFERENCE IMAGE · NOT A RETINAL SCAN
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                    {externalCapture.eyeLaterality === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'} · Patient {externalCapture.patientId} ·{' '}
                    {new Date(externalCapture.capturedAt).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExternalCapture(null)}
                  className="text-xs text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 inline-flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <img
                  src={externalCapture.imageDataUrl}
                  alt={`External ${externalCapture.eyeLaterality} eye reference photo`}
                  className="w-36 h-24 object-cover rounded-lg border border-slate-300 dark:border-slate-700 bg-black shrink-0"
                />
                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p>
                    Stored purely as an external-eye positioning reference ({externalCapture.captureId}).
                  </p>
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    Safeguard: Excluded from diabetic retinopathy AI inference — cannot substitute for a fundus camera image.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (Path B): Retinal Fundus Acquisition & Existing Quality Gate */}
        <section className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                Path B · Actual Retinal Fundus Acquisition
              </p>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Retinal Fundus Image & Quality Validation
              </h2>
            </div>
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              Reuses Add Retina Pipeline
            </span>
          </div>

          {/* Modular Acquisition Source Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#090E1A]">
            {FUNDUS_ACQUISITION_ADAPTERS.map((adapter) => {
              const active = selectedAdapterId === adapter.adapterId;
              return (
                <button
                  key={adapter.adapterId}
                  type="button"
                  onClick={() => setSelectedAdapterId(adapter.adapterId)}
                  className={`flex-1 px-3 py-2 rounded-md text-xs font-medium transition-colors text-center ${
                    active
                      ? 'bg-white dark:bg-[#0D1322] text-slate-900 dark:text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {adapter.transportType === 'file_import'
                    ? 'Import Retinal Camera Image'
                    : 'UVC Ophthalmic Adapter'}
                </button>
              );
            })}
          </div>

          {selectedAdapterId === 'device_file_import' ? (
            <div
              onClick={() => fundusFileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fundusFileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Import genuine retinal fundus image from fundus camera export"
              className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500/70 bg-slate-50/70 dark:bg-[#090E1A] p-6 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fundusFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={(e) => handleFundusFileSelect(e.target.files)}
                className="hidden"
              />
              {fundusImageUrl ? (
                <div className="space-y-3">
                  <div className="w-40 h-40 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                    <img
                      src={fundusImageUrl}
                      alt="Acquired retinal fundus preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Source: {fundusDeviceLabel} · Click to import a different fundus capture
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-3">
                  <Upload className="w-7 h-7 mx-auto text-cyan-600 dark:text-cyan-400" />
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Import Retinal Fundus Image from Ophthalmic Camera
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supports JPG, JPEG, PNG exports from tabletop or smartphone fundus optics (Max 10 MB)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-3 text-xs">
              <p className="font-semibold text-slate-900 dark:text-white">
                USB / UVC Ophthalmic Fundus Camera Stream
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Use this option only when an external retinal fundus optics adapter (non-mydriatic UVC camera or slit-lamp imaging feed) is selected in the camera dropdown on the left. All captures pass strict fundus validation and non-retinal images are rejected.
              </p>
              <label className="flex items-start gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uvcConfirmRetinalAdapter}
                  onChange={(e) => setUvcConfirmRetinalAdapter(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span>
                  I confirm the active video source is a genuine retinal fundus camera or ophthalmic lens adapter (not an external selfie webcam).
                </span>
              </label>
              <button
                type="button"
                disabled={!cameraActive || !uvcConfirmRetinalAdapter}
                onClick={handleCaptureFromUvcFundusAdapter}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 dark:bg-cyan-600 text-white text-xs font-semibold disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture Retinal Frame from Optical Adapter</span>
              </button>
            </div>
          )}

          {fundusUploadError && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3.5 text-xs text-red-950 dark:text-red-200 flex items-start gap-2"
            >
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <span>{fundusUploadError}</span>
            </div>
          )}

          {/* Fundus Quality Gate Results */}
          {fundusQuality && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                    Retinal Image Validation Gate
                  </p>
                  <p
                    className={`font-display text-base font-bold mt-0.5 ${
                      fundusQuality.qualityTier === 'Good'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : fundusQuality.suitable
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {fundusQuality.qualityBadgeText ??
                      (fundusQuality.suitable ? '✓ Good' : '✕ Invalid image')}
                  </p>
                </div>
                <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                  {fundusQuality.dimensions.width}×{fundusQuality.dimensions.height} px
                </span>
              </div>

              {fundusQuality.suitable ? (
                <div className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{fundusQuality.suitabilityMessage}</span>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs text-red-800 dark:text-red-200">
                  <p className="font-semibold">{fundusQuality.suitabilityMessage}</p>
                  {fundusQuality.unsuitableReasons.length > 0 && (
                    <ul className="list-disc pl-4 space-y-0.5">
                      {fundusQuality.unsuitableReasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                  <p className="font-medium">
                    Recovery: {fundusQuality.actionRequired || 'Import a focused, properly exposed fundus image.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {qualityMetricsList.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-2.5"
                  >
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.label}</p>
                    <p className="font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {m.status} · {m.score}%
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {fundusQuality.assessmentLabel ||
                  'Technical pixel heuristics & spectral checks (non-clinical validation layer).'}
              </p>
            </div>
          )}

          {/* Analyze Retina Gate Notice + Action Button */}
          {!selectedEye && (
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              Select Right Eye (OD) or Left Eye (OS) in Step 2 above before running retinal analysis.
            </p>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3 text-xs text-red-900 dark:text-red-200 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={!isAnalyzeEnabled}
              onClick={handleTriggerAnalyzeRetina}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{analysisStageLabel || 'Running DR Analysis...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Retina</span>
                </>
              )}
            </button>

            {isAnalyzing && onCancelAnalysis && (
              <button
                type="button"
                onClick={onCancelAnalysis}
                className="px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-red-500"
              >
                Cancel
              </button>
            )}
          </div>
        </section>
      </div>

      {/* 3. Unified Existing IRIDEON Result & Explainability Display */}
      {analysis && activeFundusImageUrl && !isAnalyzing && (
        <div className="space-y-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          {/* Clear Separation Strip: External-Eye Reference vs Actual Retinal Image vs AI Prediction */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>Case {analysis.caseId}</span>
                  <span aria-hidden="true">·</span>
                  <span>Patient {analysis.patientId || resolvedPatientId}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-cyan-700 dark:text-cyan-400">
                    {analysis.eyeLaterality === 'OD'
                      ? 'Right Eye (OD)'
                      : analysis.eyeLaterality === 'OS'
                        ? 'Left Eye (OS)'
                        : selectedEye === 'OS'
                          ? 'Left Eye (OS)'
                          : 'Right Eye (OD)'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{new Date(analysis.analyzedAt).toLocaleString()}</span>
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  Prediction: {analysis.prediction}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('comparison')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Compare</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('reports')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-cyan-600 text-white text-xs font-semibold"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open Report</span>
                </button>
              </div>
            </div>

            {/* Side-by-side Asset Separation: External Eye vs Retinal Fundus vs AI Output */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 space-y-2">
                <p className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
                  1. EXTERNAL-EYE REFERENCE (WEBCAM)
                </p>
                {externalCapture ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={externalCapture.imageDataUrl}
                      alt="External eye reference"
                      className="w-20 h-16 object-cover rounded border border-slate-300 dark:border-slate-700"
                    />
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {externalCapture.eyeLaterality === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                      </p>
                      <p>Alignment reference only (not analyzed)</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No external-eye snapshot captured; fundus imported directly.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 space-y-2">
                <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                  2. ACTUAL RETINAL FUNDUS IMAGE
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={activeFundusImageUrl}
                    alt="Retinal fundus image submitted to DR model"
                    className="w-16 h-16 object-contain rounded border border-slate-300 dark:border-slate-700 bg-black"
                  />
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {analysis.imageQuality.qualityBadgeText ?? analysis.imageQuality.overall}
                    </p>
                    <p>Source: {analysis.imageMetadata?.deviceLabel || fundusDeviceLabel}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 space-y-1.5">
                <p className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400">
                  3. AI PREDICTION SUMMARY
                </p>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {analysis.prediction}
                </p>
                <p className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  Confidence estimate: {analysis.confidence}% · Uncertainty: {analysis.uncertainty}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onSendToDoctorReview}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-700 dark:text-cyan-400 hover:underline"
                  >
                    <Stethoscope className="w-3 h-3" />
                    <span>Doctor Review</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCreateReferral}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-violet-700 dark:text-violet-400 hover:underline"
                  >
                    <Send className="w-3 h-3" />
                    <span>Refer</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <FiveClassScaleStrip analysis={analysis} />

          <ExplainabilityViewer
            imageUrl={activeFundusImageUrl}
            heatmapRegions={analysis.heatmapData.regions}
            pixelGrid={analysis.heatmapData.pixelGrid}
            explainabilityMethod={analysis.modelMetadata.explainabilityMethod}
            detectedFeatures={analysis.detectedFeatures}
            focusTarget={focusTarget}
            activeTab={viewerTab}
            onTabChange={setViewerTab}
            colormap={colormap}
            attributionNotice={analysis.modelMetadata.attributionNotice}
            caseId={analysis.caseId}
            predictionLabel={analysis.prediction}
          />

          <WhyThisResultCard analysis={analysis} />
          <ScreeningDecisionSupportCard analysis={analysis} />

          <InlineClinicianReviewCard
            analysis={analysis}
            doctorReview={activeDoctorReview}
            onSaveClinicianDecision={onSaveClinicianDecision}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <ConfidenceAndUncertainty
              confidence={analysis.confidence}
              uncertainty={analysis.uncertainty}
              entropyScore={analysis.entropyScore}
              reliabilityStatus={analysis.reliabilityStatus}
              reliabilityLabel={analysis.reliabilityLabel}
              reliabilityMessage={analysis.reliabilityMessage}
              uncertaintyFactors={analysis.uncertaintyFactors}
              onOpenDoctorReview={onSendToDoctorReview}
              onCreateReferral={onCreateReferral}
            />
            <AIReasoningLens
              analysis={analysis}
              onFocusRegion={(t) => setFocusTarget({ ...t })}
            />
          </div>

          <ClinicalIndicatorsPanel analysis={analysis} />

          <RetinaExplainChat
            analysis={analysis}
            defaultMode={defaultExplainMode}
            messages={chatMessages}
            isLoading={chatLoading}
            onSendQuestion={onSendChatQuestion}
            onClearMessages={onClearChat}
          />
        </div>
      )}

      {/* Safety reminder footer inside workspace */}
      <div className="rounded-xl border border-amber-300/70 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200">
        <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <span>
          Research and educational use only. Screening support — not a standalone diagnosis. All AI predictions and visual attention maps require verification by a qualified ophthalmologist.
        </span>
      </div>
    </div>
  );
};
