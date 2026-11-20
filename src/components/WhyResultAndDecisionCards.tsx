import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  ClipboardCheck,
  ArrowRight,
  Stethoscope,
} from 'lucide-react';
import type {
  ClinicianDecision,
  DecisionSupportSummary,
  DoctorReviewData,
  DRGrade,
  RetinaAnalysisResult,
} from '../types/retina';

interface WhyResultAndDecisionCardsProps {
  analysis: RetinaAnalysisResult;
  doctorReview?: DoctorReviewData | null;
  onSaveClinicianDecision?: (decision: ClinicianDecision, notes: string) => void;
}

const ETDRS_CLASSES: { code: number; grade: DRGrade; shortLabel: string; summary: string }[] = [
  { code: 0, grade: 'No apparent DR', shortLabel: 'No DR', summary: 'Clear vascular arcades' },
  { code: 1, grade: 'Mild', shortLabel: 'Mild', summary: 'Microaneurysm-like cues' },
  { code: 2, grade: 'Moderate', shortLabel: 'Moderate', summary: 'Exudate / blot patterns' },
  { code: 3, grade: 'Severe', shortLabel: 'Severe', summary: 'Multi-quadrant ischemia' },
  { code: 4, grade: 'Proliferative', shortLabel: 'Proliferative', summary: 'Neovascular stress' },
];

export function resolveDecisionSupport(analysis: RetinaAnalysisResult): DecisionSupportSummary {
  if (analysis.decisionSupport) return analysis.decisionSupport;
  const isUrgent =
    analysis.reliabilityStatus === 'professional_review_required' ||
    analysis.prediction === 'Severe' ||
    analysis.prediction === 'Proliferative';
  const isLow =
    analysis.prediction === 'No apparent DR' &&
    analysis.uncertainty === 'Low' &&
    analysis.imageQuality.suitable;

  return {
    riskLevel: isUrgent ? 'URGENT REVIEW' : isLow ? 'LOW RISK' : 'REVIEW RECOMMENDED',
    interpretation:
      analysis.reliabilityStatus === 'professional_review_required'
        ? 'High uncertainty or technical image quality limitations prevent reliable automated interpretation.'
        : isLow
          ? 'No prominent abnormal visual patterns flagged within prototype thresholds.'
          : `Output (${analysis.prediction}) warrants follow-up verification by a qualified clinician.`,
    suggestedAction: isUrgent
      ? 'Prioritize specialist ophthalmologist examination and verify image clarity.'
      : isLow
        ? 'Continue periodic routine eye checkups as advised by an eye care professional.'
        : 'Schedule specialist retinal exam to confirm or rule out diabetic retinopathy findings.',
    disclaimer:
      'IRIDEON is an AI-assisted research/screening prototype and is not a substitute for professional medical diagnosis or clinical judgment.',
  };
}

export const FiveClassScaleStrip: React.FC<{ analysis: RetinaAnalysisResult }> = ({ analysis }) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            5-Class Diabetic Retinopathy Educational Scale (ICDR / ETDRS)
          </p>
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
            Active Severity Spectrum Position
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          {analysis.sourceType === 'upload' && analysis.modelMetadata.mode !== 'EXTERNAL_ML_ENDPOINT'
            ? 'Prototype uploads explore 3 contrast tiers · Full 5-class requires ML_BACKEND_URL'
            : '5-Class Spectrum View'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {ETDRS_CLASSES.map((item) => {
          const isActive = analysis.prediction === item.grade;
          const prob =
            analysis.severityDistribution.find((s) => s.grade === item.grade)?.probability ?? 0;
          return (
            <div
              key={item.grade}
              className={`rounded-lg border p-2.5 transition-colors ${
                isActive
                  ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/80 dark:bg-cyan-950/35'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px] font-mono">
                <span
                  className={
                    isActive
                      ? 'font-bold text-cyan-700 dark:text-cyan-300'
                      : 'text-slate-500 dark:text-slate-400'
                  }
                >
                  Class {item.code}
                </span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">{prob}%</span>
              </div>
              <p
                className={`font-display text-xs font-semibold mt-0.5 ${
                  isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {item.shortLabel}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                {item.summary}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const WhyThisResultCard: React.FC<{ analysis: RetinaAnalysisResult }> = ({ analysis }) => {
  const decisionSupport = resolveDecisionSupport(analysis);
  const confLevel =
    analysis.confidence >= 80 ? 'High' : analysis.confidence >= 55 ? 'Moderate' : 'Low';
  const importantRegionsText =
    analysis.heatmapData.regions.length > 0
      ? analysis.heatmapData.regions
          .slice(0, 3)
          .map((r) => `${r.label} (${r.x}%, ${r.y}%)`)
          .join(' · ')
      : 'Global circular fundus ROI';

  const qualityLabel =
    analysis.imageQuality.qualityBadgeText ??
    (analysis.imageQuality.suitable
      ? analysis.imageQuality.overall === 'Good'
        ? '✓ Good'
        : '⚠ Needs better image'
      : '✕ Invalid image');

  const modelEvidenceText =
    analysis.modelMetadata.mode === 'EXTERNAL_ML_ENDPOINT'
      ? `External CNN Grad-CAM & class probabilities (${analysis.modelMetadata.modelName})`
      : analysis.sourceType === 'demo'
        ? 'Synthetic educational demonstration profile + 24×24 green-channel pixel saliency'
        : 'On-device 24×24 green-channel gradient & contrast Model Attention Regions (Prototype Mode — not lesion segmentation)';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            Structured XAI Explanation Card
          </p>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            WHY THIS RESULT?
          </h3>
        </div>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          {analysis.sourceType === 'demo' ? 'DEMO REFERENCE' : 'PROTOTYPE UPLOAD'}
        </span>
      </div>

      <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <dt className="sm:col-span-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Prediction
          </dt>
          <dd className="sm:col-span-8 font-semibold text-slate-900 dark:text-white">
            {analysis.prediction} (Proliferation Level {analysis.proliferationGrading.level}/4)
          </dd>
        </div>

        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <dt className="sm:col-span-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Model confidence estimate
          </dt>
          <dd className="sm:col-span-8 text-slate-800 dark:text-slate-200">
            <span className="font-mono font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
              {analysis.confidence}%
            </span>{' '}
            ({confLevel} concentration · Uncertainty: {analysis.uncertainty}) —{' '}
            <span className="text-xs text-slate-500 dark:text-slate-400">
              uncalibrated prototype score
            </span>
          </dd>
        </div>

        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <dt className="sm:col-span-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Image quality
          </dt>
          <dd className="sm:col-span-8 font-medium text-slate-800 dark:text-slate-200">
            {qualityLabel} (Technical assessment: Sharpness {analysis.imageQuality.sharpness.score}%, Brightness{' '}
            {analysis.imageQuality.brightness.score}%)
          </dd>
        </div>

        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <dt className="sm:col-span-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Important regions
          </dt>
          <dd className="sm:col-span-8 text-slate-800 dark:text-slate-200">
            {importantRegionsText}
          </dd>
        </div>

        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <dt className="sm:col-span-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Model evidence
          </dt>
          <dd className="sm:col-span-8 text-slate-700 dark:text-slate-300 leading-relaxed">
            {modelEvidenceText}
          </dd>
        </div>

        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <dt className="sm:col-span-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Interpretation
          </dt>
          <dd className="sm:col-span-8 text-slate-700 dark:text-slate-300 leading-relaxed">
            {analysis.explanation.summary}
          </dd>
        </div>

        <div className="py-2.5 grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-4">
          <dt className="sm:col-span-4 font-mono text-xs text-slate-500 dark:text-slate-400">
            Recommended next step
          </dt>
          <dd className="sm:col-span-8 font-medium text-slate-900 dark:text-white leading-relaxed">
            {decisionSupport.suggestedAction}
          </dd>
        </div>
      </dl>
    </div>
  );
};

export const ScreeningDecisionSupportCard: React.FC<{ analysis: RetinaAnalysisResult }> = ({
  analysis,
}) => {
  const ds = resolveDecisionSupport(analysis);
  const badgeStyle =
    ds.riskLevel === 'URGENT REVIEW'
      ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/35 text-red-900 dark:text-red-200'
      : ds.riskLevel === 'LOW RISK'
        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/25 text-emerald-900 dark:text-emerald-200'
        : 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200';

  const RiskIcon =
    ds.riskLevel === 'URGENT REVIEW'
      ? ShieldAlert
      : ds.riskLevel === 'LOW RISK'
        ? CheckCircle2
        : AlertTriangle;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-violet-700 dark:text-violet-400">
            AI Finding → Risk Interpretation → Suggested Action
          </p>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            SCREENING DECISION SUPPORT
          </h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md border text-xs font-mono font-bold ${badgeStyle}`}>
          <RiskIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{ds.riskLevel}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>1. AI Finding</span>
            <ArrowRight className="w-3.5 h-3.5 hidden md:block text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
            {analysis.prediction} ({analysis.confidence}% est.)
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Proliferation Level {analysis.proliferationGrading.level}/4 · Uncertainty: {analysis.uncertainty}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span>2. Risk Interpretation</span>
            <ArrowRight className="w-3.5 h-3.5 hidden md:block text-cyan-600 dark:text-cyan-400" />
          </div>
          <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
            {ds.riskLevel}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {ds.interpretation}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 space-y-1">
          <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            3. Suggested Action
          </p>
          <p className="text-xs font-medium text-slate-900 dark:text-white leading-relaxed">
            {ds.suggestedAction}
          </p>
        </div>
      </div>

      <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>{ds.disclaimer}</span>
      </p>
    </div>
  );
};

export const InlineClinicianReviewCard: React.FC<WhyResultAndDecisionCardsProps> = ({
  analysis,
  doctorReview,
  onSaveClinicianDecision,
}) => {
  const [selectedDecision, setSelectedDecision] = useState<ClinicianDecision | null>(
    doctorReview?.clinicianDecision ?? null
  );
  const [notes, setNotes] = useState(doctorReview?.reviewNotes ?? '');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    setSelectedDecision(doctorReview?.clinicianDecision ?? null);
    setNotes(doctorReview?.reviewNotes ?? '');
    setSavedBanner(null);
  }, [analysis.caseId, doctorReview?.clinicianDecision, doctorReview?.reviewNotes]);

  const handleDecisionClick = (decision: ClinicianDecision) => {
    setSelectedDecision(decision);
    if (onSaveClinicianDecision) {
      onSaveClinicianDecision(decision, notes);
      setSavedBanner(`Recorded "${decision}" in local session log.`);
    }
  };

  const handleSaveNotes = () => {
    const decision = selectedDecision ?? 'Needs review';
    setSelectedDecision(decision);
    if (onSaveClinicianDecision) {
      onSaveClinicianDecision(decision, notes);
      setSavedBanner(`Saved review decision ("${decision}") & notes locally.`);
    }
  };

  const options: {
    value: ClinicianDecision;
    label: string;
    activeClass: string;
  }[] = [
    {
      value: 'Agree with AI',
      label: 'Agree with AI',
      activeClass:
        'border-emerald-600 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950/35 text-emerald-900 dark:text-emerald-200',
    },
    {
      value: 'Needs review',
      label: 'Needs review',
      activeClass:
        'border-amber-600 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/35 text-amber-900 dark:text-amber-200',
    },
    {
      value: 'Disagree with AI',
      label: 'Disagree with AI',
      activeClass:
        'border-red-600 dark:border-red-400 bg-red-50 dark:bg-red-950/35 text-red-900 dark:text-red-200',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          <div>
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              CLINICIAN REVIEW (Human-in-the-Loop)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record specialist agreement or disagreement — persisted in local browser session storage (no external EHR connected).
            </p>
          </div>
        </div>
        {selectedDecision && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Status: {selectedDecision}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {options.map((opt) => {
          const isSelected = selectedDecision === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleDecisionClick(opt.value)}
              className={`px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-colors ${
                isSelected
                  ? opt.activeClass
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] text-slate-700 dark:text-slate-300 hover:border-cyan-500'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional clinician / reviewer observation (do NOT enter patient PII)..."
          aria-label="Clinician review note"
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="button"
          onClick={handleSaveNotes}
          className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          Save Review Note
        </button>
      </div>

      {(savedBanner || doctorReview?.reviewedAt) && (
        <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
          {savedBanner ||
            `Last recorded: ${new Date(doctorReview!.reviewedAt!).toLocaleString()} (${doctorReview?.clinicianDecision ?? doctorReview?.reviewStatus})`}
        </p>
      )}
    </div>
  );
};
