import React, { useRef, useState } from 'react';
import {
  Upload,
  Sparkles,
  AlertTriangle,
  Crosshair,
  FileText,
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Brain,
  Gauge,
  Droplets,
  Eye,
  ArrowRight,
  BookOpen,
  Wifi,
  WifiOff,
  CloudUpload,
  Stethoscope,
  Send,
  XCircle,
  RotateCcw,
  Camera,
} from 'lucide-react';
import { ExplainabilityViewer, type FocusTarget, type ViewerTab } from './ExplainabilityViewer';
import { AIReasoningLens } from './AIReasoningLens';
import { ConfidenceAndUncertainty } from './ConfidenceAndUncertainty';
import { WhatIfExplorer } from './WhatIfExplorer';
import { RetinaExplainChat } from './RetinaExplainChat';
import { ClinicalIndicatorsPanel } from './ClinicalIndicatorsPanel';
import {
  FiveClassScaleStrip,
  InlineClinicianReviewCard,
  ScreeningDecisionSupportCard,
  WhyThisResultCard,
} from './WhyResultAndDecisionCards';
import type {
  AppPage,
  ChatMessage,
  ClinicianDecision,
  DemoCaseId,
  DoctorReviewData,
  ExplainMode,
  ImageQualityMetrics,
  RetinaAnalysisResult,
} from '../types/retina';

interface AnalysisWorkspaceProps {
  mode: 'analyze' | 'explainability';
  analysis: RetinaAnalysisResult | null;
  imageUrl: string | null;
  preQuality: ImageQualityMetrics | null;
  isAnalyzing: boolean;
  analysisStageLabel?: string | null;
  errorMsg: string | null;
  defaultExplainMode: ExplainMode;
  colormap: 'thermal' | 'clinical';
  hasAcknowledgedFeatures: boolean;
  onAcknowledgeFeatures: () => void;
  onUploadFile: (file: File) => void;
  onRunAnalysis: () => void;
  onCancelAnalysis?: () => void;
  onResetWorkspace?: () => void;
  onSelectDemo: (demoId: DemoCaseId) => void;
  onTestUnsuitableImage: () => void;
  onNavigate: (page: AppPage) => void;
  onSendToDoctorReview: () => void;
  onCreateReferral: () => void;
  activeDoctorReview?: DoctorReviewData | null;
  onSaveClinicianDecision?: (decision: ClinicianDecision, notes: string) => void;
  isOffline: boolean;
  simulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
  queuedCount: number;
  isSyncing: boolean;
  syncBanner: string | null;
  onSyncQueuedRecords: () => void;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  onSendChatQuestion: (question: string, mode: ExplainMode) => void;
  onClearChat: () => void;
}

const PROCESS_FEATURES = [
  {
    icon: Brain,
    title: '1. Explainable Retinal Scan',
    text: 'Inspects fundus images across 8 retinal feature classes with visual heatmaps and clickable Evidence Trails.',
  },
  {
    icon: Gauge,
    title: '2. Proliferation Grading (Level 1–4)',
    text: 'Grades microvascular proliferation from Level 1 to Level 4 with clear percentage bars.',
  },
  {
    icon: Droplets,
    title: '3. Estimated Sugar & BP Patterns',
    text: 'Provides educational retinal biomarker estimates for glycemic and blood pressure vascular stress (not a lab or cuff test).',
  },
  {
    icon: Eye,
    title: '4. Inside vs Outside Symptoms + Doubt Clarifier',
    text: 'Explains internal retinal signs, external symptoms like eye pain or blur, and lets you ask IRIDEON any doubt in simple language.',
  },
];

export const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({
  mode,
  analysis,
  imageUrl,
  preQuality,
  isAnalyzing,
  analysisStageLabel,
  errorMsg,
  defaultExplainMode,
  colormap,
  hasAcknowledgedFeatures,
  onAcknowledgeFeatures,
  onUploadFile,
  onRunAnalysis,
  onCancelAnalysis,
  onResetWorkspace,
  onSelectDemo,
  onTestUnsuitableImage,
  onNavigate,
  onSendToDoctorReview,
  onCreateReferral,
  activeDoctorReview,
  onSaveClinicianDecision,
  isOffline,
  simulatedOffline,
  onToggleSimulatedOffline,
  queuedCount,
  isSyncing,
  syncBanner,
  onSyncQueuedRecords,
  chatMessages,
  chatLoading,
  onSendChatQuestion,
  onClearChat,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [viewerTab, setViewerTab] = useState<ViewerTab>('grid');
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [showFeaturesDrawer, setShowFeaturesDrawer] = useState(false);

  const activeQuality = analysis?.imageQuality ?? preQuality;
  const isQualityBlocked = Boolean(preQuality && !preQuality.suitable);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onUploadFile(files[0]);
  };

  const handleFocusRegion = (target: FocusTarget) => {
    setFocusTarget({ ...target });
  };

  const qualityMetricsList = activeQuality
    ? [
        activeQuality.brightness,
        activeQuality.contrast,
        activeQuality.sharpness,
        activeQuality.fieldOfView,
        activeQuality.retinalVisibility,
        activeQuality.artifacts,
      ]
    : [];

  // Pre-process Gate: Features at the top — user reads them before entering the analysis process
  if (!hasAcknowledgedFeatures && !analysis) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-10 space-y-8">
          <div className="space-y-2 pb-6 border-b border-slate-200 dark:border-slate-800">
            <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
              IRIDEON Pre-Analysis Briefing · Read Before Entering Process
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Understand IRIDEON’s Features Before You Begin
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
              Review what IRIDEON inspects inside the retina, how proliferation levels (1–4) and systemic biomarker estimates work, and important medical safety boundaries before entering the retinal scanning process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PROCESS_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-5 space-y-2"
                >
                  <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {f.title}
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {f.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold">Important Safety & Simulation Notice</p>
            <p>
              Research and educational use only. IRIDEON’s retinal predictions, proliferation grades (1–4), and estimated blood sugar or blood pressure patterns are educational simulations and are not a substitute for lab tests, blood pressure cuffs, or evaluation by a qualified ophthalmologist.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('learn')}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-400"
            >
              Read Full XAI Curriculum →
            </button>

            <button
              type="button"
              onClick={onAcknowledgeFeatures}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
            >
              <span>I Have Read the Features — Enter Analysis Process</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            {mode === 'explainability'
              ? 'IRIDEON · Reasoning & Attribution Lens'
              : 'IRIDEON · Retinal Fundus Analysis Workspace'}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {mode === 'explainability'
              ? 'IRIDEON Explainability & Reasoning Lens'
              : 'IRIDEON AI Analysis Dashboard'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowFeaturesDrawer((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{showFeaturesDrawer ? 'Hide Features Overview' : 'Features Overview'}</span>
          </button>

          {(imageUrl || analysis) && onResetWorkspace && (
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={onResetWorkspace}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-amber-500 disabled:opacity-45 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}

          {analysis && (
            <>
              <button
                type="button"
                onClick={() => onNavigate('comparison')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors whitespace-nowrap"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Human vs AI View</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 dark:bg-cyan-600 text-white text-xs font-semibold hover:bg-slate-800 dark:hover:bg-cyan-500 transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                <span>View Case Report</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Offline & Local Sync Status Bar */}
      <div
        className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
          isOffline
            ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 text-amber-950 dark:text-amber-100'
            : queuedCount > 0
              ? 'border-cyan-300 dark:border-cyan-800 bg-cyan-50/70 dark:bg-cyan-950/25 text-slate-800 dark:text-slate-100'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] text-slate-700 dark:text-slate-300'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {isOffline ? (
            <WifiOff className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          ) : (
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )}
          <span className="font-mono font-semibold">
            {isOffline ? 'OFFLINE MODE ACTIVE' : 'ONLINE'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {isOffline
              ? 'On-device screening active. Saved locally · ✓ Screening completed · ☁ Waiting for synchronization'
              : queuedCount > 0
                ? `Synchronization available → ${queuedCount} queued record(s) ready for upload`
                : syncBanner || '✓ Record synchronized · Local queue up to date'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSimulatedOffline}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-mono text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors"
          >
            {simulatedOffline ? 'Exit Offline Test' : 'Simulate Offline'}
          </button>

          {!isOffline && queuedCount > 0 && (
            <button
              type="button"
              disabled={isSyncing}
              onClick={onSyncQueuedRecords}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Uploading...' : `Upload queued record (${queuedCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Features Reference at Top */}
      {showFeaturesDrawer && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROCESS_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-1.5"
              >
                <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                  <Icon className="w-4 h-4 shrink-0" />
                  <h2 className="font-display text-xs font-semibold text-slate-900 dark:text-white">
                    {f.title}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {f.text}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 px-4 py-3.5 flex items-start gap-3 text-sm text-red-900 dark:text-red-200"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Input or Analysis Issue</p>
            <p className="text-xs sm:text-sm mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Upload, Demo Mode, Image Quality Assessment */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upload Dropzone + Adjacent Workflow Switch */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Add Retina (Upload Fundus Image)
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('webcam-scan')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] hover:border-cyan-500 text-xs font-medium text-cyan-700 dark:text-cyan-400 transition-colors whitespace-nowrap"
              >
                <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Webcam Eye Scan</span>
              </button>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="Upload retinal fundus image via click or drag and drop"
              className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                isDraggingOver
                  ? 'border-cyan-500 bg-cyan-50/60 dark:bg-cyan-950/30'
                  : 'border-slate-300 dark:border-slate-700 hover:border-cyan-500/70 bg-slate-50/70 dark:bg-[#090E1A]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
              {imageUrl ? (
                <div className="space-y-3">
                  <div className="w-36 h-36 mx-auto rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                    <img
                      src={imageUrl}
                      alt="Uploaded or selected retinal fundus preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Click or drop another JPG/PNG image to replace
                  </p>
                </div>
              ) : (
                <div className="space-y-2 py-3">
                  <Upload className="w-7 h-7 mx-auto text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Drop retinal fundus image here, or click to browse
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Do not upload personally identifiable information · Max 10 MB
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!imageUrl || isAnalyzing || isQualityBlocked}
                onClick={onRunAnalysis}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing with IRIDEON...</span>
                  </>
                ) : isQualityBlocked ? (
                  <>
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Quality Insufficient — Blocked</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" aria-hidden="true" />
                    <span>Run IRIDEON Analysis</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => onSelectDemo('demo-b')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors whitespace-nowrap"
              >
                <ImageIcon className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                <span>Try Demo Image</span>
              </button>

              <button
                type="button"
                disabled={isAnalyzing}
                onClick={onTestUnsuitableImage}
                title="Test Quality Gate with a dark & blurry sample"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-500 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors whitespace-nowrap"
              >
                <span>Test Blurry/Dark</span>
              </button>
            </div>

            {/* Synthetic Demo Case Selector */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Demo Mode
                </span>
                <span className="font-mono text-amber-700 dark:text-amber-400">
                  DEMO / EDUCATIONAL DATA
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'demo-a' as DemoCaseId, label: 'Case A', sub: 'No DR · Level 1' },
                  { id: 'demo-b' as DemoCaseId, label: 'Case B', sub: 'Moderate · Level 2' },
                  { id: 'demo-c' as DemoCaseId, label: 'Case C', sub: 'Advanced · Level 3' },
                ].map((d) => {
                  const selected = analysis?.demoCaseId === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => onSelectDemo(d.id)}
                      className={`p-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/70 dark:bg-cyan-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <p className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                        {d.label}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {d.sub}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pre-Analysis Technical Retinal Image Quality Gate */}
          {activeQuality && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    IMAGE QUALITY GATE
                  </p>
                  <h2
                    className={`font-display text-base font-bold mt-0.5 ${
                      activeQuality.qualityTier === 'Good' || (activeQuality.suitable && activeQuality.overall === 'Good')
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : activeQuality.suitable
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {activeQuality.qualityBadgeText ??
                      (activeQuality.suitable
                        ? activeQuality.overall === 'Good'
                          ? '✓ Good'
                          : '⚠ Needs better image'
                        : '✕ Invalid image')}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {activeQuality.assessmentLabel ||
                      'Technical image-quality assessment (pixel heuristics — not a validated clinical quality model)'}
                  </p>
                </div>
                <span
                  className={`font-mono text-xs font-semibold shrink-0 ${
                    activeQuality.overall === 'Good'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : activeQuality.overall === 'Acceptable'
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-red-700 dark:text-red-400'
                  }`}
                >
                  {activeQuality.suitable ? activeQuality.suitabilityStatus : 'Blocked'}
                </span>
              </div>

              {activeQuality.suitable ? (
                <div
                  className={`rounded-lg border p-3 text-xs flex items-center gap-2 ${
                    activeQuality.overall === 'Acceptable' || activeQuality.qualityTier === 'Needs better image'
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/25 text-amber-900 dark:text-amber-200'
                      : 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  {activeQuality.overall === 'Acceptable' || activeQuality.qualityTier === 'Needs better image' ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span className="font-medium">{activeQuality.suitabilityMessage}</span>
                </div>
              ) : (
                <div
                  role="alert"
                  className="rounded-lg border border-red-300 dark:border-red-900/70 bg-red-50 dark:bg-red-950/35 p-3.5 text-xs text-red-950 dark:text-red-200 space-y-2"
                >
                  <div className="flex items-start gap-2 font-semibold">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                    <span>{activeQuality.suitabilityMessage}</span>
                  </div>
                  {activeQuality.unsuitableReasons.length > 0 && (
                    <div className="pl-6 space-y-0.5">
                      <p className="font-mono text-[11px] uppercase text-red-800 dark:text-red-300">
                        Reason(s):
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {activeQuality.unsuitableReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="pl-6 font-medium text-red-900 dark:text-red-100">
                    Action: {activeQuality.actionRequired || 'Capture another image'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {qualityMetricsList.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3"
                  >
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {m.label}
                    </p>
                    <div className="flex items-baseline justify-between gap-1 mt-1">
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">
                        {m.status}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                        {m.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence Trail (Clickable Zoom-to-Region) */}
          {analysis && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
              <div>
                <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                  Interactive Spatial Chain
                </p>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-0.5">
                  Evidence Trail
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Click any evidence step to pan and zoom the retinal viewer directly to that region.
                </p>
              </div>

              <div className="space-y-2.5">
                {analysis.evidenceTrail.map((item) => {
                  const isFocused = focusTarget?.label === item.feature;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        handleFocusRegion({
                          x: item.coordinates.x,
                          y: item.coordinates.y,
                          zoom: item.coordinates.zoom,
                          label: item.feature,
                        })
                      }
                      className={`w-full text-left rounded-lg border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                        isFocused
                          ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/70 dark:bg-cyan-950/35'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] hover:border-cyan-500/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-400">
                          Evidence #{item.step}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                          <Crosshair className="w-3 h-3" aria-hidden="true" />
                          <span>Contribution: {item.contribution}</span>
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
                        {item.feature}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Region: {item.region}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {item.rationale}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Summary, Explainability Viewer, Why This Prediction */}
        <div className="lg:col-span-7 space-y-6">
          {!analysis && !isAnalyzing && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-10 text-center space-y-4">
              <Sparkles className="w-8 h-8 mx-auto text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white">
                Select a Demo Case or Upload a Retinal Image
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                Load one of the synthetic educational cases on the left to inspect Proliferation Levels (1–4), estimated sugar & BP patterns, inside/outside symptoms, and IRIDEON’s Reasoning Lens.
              </p>
              <button
                type="button"
                onClick={() => onSelectDemo('demo-b')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-semibold transition-colors"
              >
                <span>Load Demo Case B (Moderate · Level 2)</span>
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-8 sm:p-10 space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <div>
                    <p className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {analysisStageLabel || 'Analyzing retinal image...'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Running validation, technical quality checks, pixel saliency, and explanation packaging.
                    </p>
                  </div>
                </div>

                {onCancelAnalysis && (
                  <button
                    type="button"
                    onClick={onCancelAnalysis}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-red-500 transition-colors shrink-0"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                {[
                  'Validating image...',
                  'Assessing image quality...',
                  'Running DR analysis...',
                  'Generating explanation...',
                ].map((stage, idx) => {
                  const stageIdx = [
                    'Validating image...',
                    'Assessing image quality...',
                    'Running DR analysis...',
                    'Generating explanation...',
                  ].indexOf(analysisStageLabel || 'Validating image...');
                  const done = stageIdx > idx;
                  const active = stageIdx === idx;
                  return (
                    <div
                      key={stage}
                      className={`rounded-lg border p-3 font-mono text-[11px] ${
                        active
                          ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/35 text-cyan-800 dark:text-cyan-200 font-semibold'
                          : done
                            ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/25 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] text-slate-400'
                      }`}
                    >
                      {done ? '✓ ' : active ? '● ' : '○ '}
                      {stage}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {analysis && imageUrl && !isAnalyzing && (
            <>
              {/* Analysis Summary Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                      <span>Case {analysis.caseId}</span>
                      {analysis.patientId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Patient {analysis.patientId}</span>
                        </>
                      )}
                      {analysis.eyeLaterality && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-cyan-700 dark:text-cyan-400 font-semibold">
                            {analysis.eyeLaterality === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>
                        {analysis.sourceType === 'demo'
                          ? 'DEMO / EDUCATIONAL DATA'
                          : analysis.acquisitionSource === 'webcam_assisted_device_import'
                            ? 'Webcam-Assisted Device Import'
                            : 'Uploaded Image (Prototype Mode)'}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      Prediction: {analysis.prediction}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span
                      className={
                        analysis.reliabilityStatus === 'reliable_screening'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : analysis.reliabilityStatus === 'uncertain_result'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-red-700 dark:text-red-400'
                      }
                    >
                      {analysis.reliabilityLabel}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{analysis.offlineGenerated ? 'Saved locally (Offline)' : 'Saved to queue'}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Model confidence estimate
                    </p>
                    <p className="font-mono text-xl font-bold tabular-nums text-cyan-700 dark:text-cyan-400 mt-0.5">
                      {analysis.confidence}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Proliferation Grade
                    </p>
                    <p className="font-mono text-xl font-bold text-violet-700 dark:text-violet-400 mt-0.5">
                      Level {analysis.proliferationGrading.level} / 4
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Uncertainty
                    </p>
                    <p
                      className={`font-mono text-xl font-bold mt-0.5 ${
                        analysis.uncertainty === 'Low'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : analysis.uncertainty === 'Moderate'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {analysis.uncertainty}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Image quality
                    </p>
                    <p className="font-mono text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {analysis.imageQuality.overall}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Screening support — not a standalone diagnosis. Confidence values are uncalibrated prototype estimates.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={onSendToDoctorReview}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Open in Doctor Review</span>
                    </button>
                    <button
                      type="button"
                      onClick={onCreateReferral}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Refer for Professional Review</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 5-Class DR Educational Spectrum */}
              <FiveClassScaleStrip analysis={analysis} />

              {/* Dedicated Explainability Center Heading */}
              <div className="pt-1">
                <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                  Visual XAI Inspection Center
                </p>
                <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  WHY DID IRIDEON MAKE THIS PREDICTION?
                </h2>
              </div>

              {/* Explainability Image Viewer (with 4-Panel Grid + Download PNG) */}
              <ExplainabilityViewer
                imageUrl={imageUrl}
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

              {/* Structured "WHY THIS RESULT?" XAI Summary Card */}
              <WhyThisResultCard analysis={analysis} />

              {/* Feature Attribution Breakdown */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
                <div>
                  <p className="text-xs font-mono text-violet-700 dark:text-violet-400">
                    IRIDEON Attribution Breakdown
                  </p>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    CONTRIBUTING VISUAL FACTORS
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    Relative weights of the visual cues that influenced the model output.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {analysis.featureContributions.map((contrib, idx) => (
                    <div key={contrib.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {idx + 1}. {contrib.label} —{' '}
                          <span className="text-slate-500 dark:text-slate-400 font-normal">
                            {contrib.importance} contribution
                          </span>
                        </span>
                        <span className="font-mono tabular-nums text-xs font-semibold text-cyan-700 dark:text-cyan-400 shrink-0">
                          {contrib.weight}%
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            contrib.importance === 'High'
                              ? 'bg-cyan-600 dark:bg-cyan-400'
                              : contrib.importance === 'Medium'
                                ? 'bg-violet-600 dark:bg-violet-400'
                                : 'bg-slate-400 dark:bg-slate-500'
                          }`}
                          style={{ width: `${contrib.weight}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {contrib.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full-Width Screening Decision Support + Inline Clinician Review + Deep Explainability + Proliferation 1-4 + Sugar/BP + Symptoms + IRIDEON Doubt Clarifier */}
      {analysis && !isAnalyzing && (
        <div className="space-y-8 pt-4">
          <ScreeningDecisionSupportCard analysis={analysis} />

          <InlineClinicianReviewCard
            analysis={analysis}
            doctorReview={activeDoctorReview}
            onSaveClinicianDecision={onSaveClinicianDecision}
          />

          <ClinicalIndicatorsPanel analysis={analysis} />

          <AIReasoningLens analysis={analysis} onFocusRegion={handleFocusRegion} />

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
            <WhatIfExplorer analysis={analysis} />
          </div>

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
    </div>
  );
};
