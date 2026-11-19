import React from 'react';
import { AlertCircle, HelpCircle, ShieldAlert, Stethoscope, Send } from 'lucide-react';
import type { ReliabilityStatus, UncertaintyFactor, UncertaintyLevel } from '../types/retina';

interface ConfidenceAndUncertaintyProps {
  confidence: number;
  uncertainty: UncertaintyLevel;
  entropyScore?: number;
  reliabilityStatus?: ReliabilityStatus;
  reliabilityLabel?: string;
  reliabilityMessage?: string;
  uncertaintyFactors: UncertaintyFactor[];
  onOpenDoctorReview?: () => void;
  onCreateReferral?: () => void;
}

export const ConfidenceAndUncertainty: React.FC<ConfidenceAndUncertaintyProps> = ({
  confidence,
  uncertainty,
  entropyScore,
  reliabilityStatus = 'uncertain_result',
  reliabilityLabel = 'AI Uncertain Result',
  reliabilityMessage,
  uncertaintyFactors,
  onOpenDoctorReview,
  onCreateReferral,
}) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence / 100) * circumference;

  const uncertaintyTone =
    uncertainty === 'Low'
      ? 'text-emerald-700 dark:text-emerald-400'
      : uncertainty === 'Moderate'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-red-700 dark:text-red-400';

  const uncertaintySymbol =
    uncertainty === 'Low' ? '●' : uncertainty === 'Moderate' ? '▲' : '✖';

  const isReviewRequired = reliabilityStatus === 'professional_review_required' || uncertainty === 'High';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          AI Uncertainty & Reliability Evaluation
        </h3>
        <span
          className={`text-xs font-mono font-semibold ${
            reliabilityStatus === 'reliable_screening'
              ? 'text-emerald-700 dark:text-emerald-400'
              : reliabilityStatus === 'uncertain_result'
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-red-700 dark:text-red-400'
          }`}
        >
          {reliabilityLabel}
        </span>
      </div>

      {/* Distinct Reliability Outcome Banner */}
      {isReviewRequired ? (
        <div
          role="alert"
          className="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/35 p-4 space-y-3"
        >
          <div className="flex items-start gap-2.5 text-red-900 dark:text-red-200">
            <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-display text-sm font-bold">
                AI unable to provide a reliable screening result. Professional review required.
              </p>
              <p className="text-xs leading-relaxed">
                {reliabilityMessage ||
                  'Uncertainty or image ambiguity exceeds prototype screening thresholds. Route this case directly to an eye specialist.'}
              </p>
            </div>
          </div>

          {(onOpenDoctorReview || onCreateReferral) && (
            <div className="flex flex-wrap gap-2 pl-7">
              {onOpenDoctorReview && (
                <button
                  type="button"
                  onClick={onOpenDoctorReview}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Send to Doctor Review</span>
                </button>
              )}
              {onCreateReferral && (
                <button
                  type="button"
                  onClick={onCreateReferral}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 text-red-800 dark:text-red-200 text-xs font-semibold hover:border-red-500 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Create Referral</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className={`rounded-lg border p-3 text-xs ${
            reliabilityStatus === 'reliable_screening'
              ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200'
              : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200'
          }`}
        >
          <span className="font-semibold">{reliabilityLabel}:</span>{' '}
          {reliabilityMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
        {/* Circular Output Score Gauge */}
        <div className="flex items-center gap-4">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-cyan-600 dark:text-cyan-400 transition-all duration-500"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {confidence}%
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                Prototype Score
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Output Concentration
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-snug">
              Prototype heuristic score concentration — not clinically calibrated probability.
            </p>
            {typeof entropyScore === 'number' && (
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1.5">
                Shannon Entropy: {entropyScore}%
              </p>
            )}
          </div>
        </div>

        {/* Separate Model Uncertainty Block */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-1.5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Model Uncertainty Tier
          </p>
          <p className={`text-lg font-display font-bold ${uncertaintyTone}`}>
            <span aria-hidden="true">{uncertaintySymbol} </span>
            {uncertainty}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Screening support — not a standalone diagnosis. Uncertain results require specialist evaluation.
          </p>
        </div>
      </div>

      {/* Uncertainty Explorer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <HelpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          <span>Uncertainty Explorer — Prototype Calibration Factors</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {uncertaintyFactors.map((item) => (
            <div
              key={item.factor}
              className={`rounded-lg border p-3 text-xs ${
                item.active
                  ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090E1A] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2 font-medium text-slate-900 dark:text-white">
                <span>{item.factor}</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {item.active ? `Active · ${item.impact}` : 'Nominal'}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Prototype mechanism: combines normalized Shannon entropy across severity classes with image quality checks and domain-shift indicators.
          </span>
        </div>
      </div>
    </div>
  );
};
