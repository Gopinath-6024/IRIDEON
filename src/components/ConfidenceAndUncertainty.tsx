import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';
import type { UncertaintyFactor, UncertaintyLevel } from '../types/retina';

interface ConfidenceAndUncertaintyProps {
  confidence: number;
  uncertainty: UncertaintyLevel;
  uncertaintyFactors: UncertaintyFactor[];
}

export const ConfidenceAndUncertainty: React.FC<ConfidenceAndUncertaintyProps> = ({
  confidence,
  uncertainty,
  uncertaintyFactors,
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

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          AI Confidence & Uncertainty
        </h3>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Calibration View
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
        {/* Circular Confidence Gauge */}
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
                Confidence
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Prediction Confidence
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 leading-snug">
              Reflects relative score concentration across severity outputs.
            </p>
          </div>
        </div>

        {/* Separate Model Uncertainty Block */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-1.5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Model Uncertainty
          </p>
          <p className={`text-lg font-display font-bold ${uncertaintyTone}`}>
            <span aria-hidden="true">{uncertaintySymbol} </span>
            {uncertainty}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            A high confidence score does not guarantee a correct medical interpretation.
          </p>
        </div>
      </div>

      {/* Uncertainty Explorer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <HelpCircle className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
          <span>Uncertainty Explorer — Possible Sources of Model Uncertainty</span>
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
            Additional theoretical uncertainty drivers include poor image quality, unusual retinal pigmentation, insufficient training representation, ambiguous borderline features, camera artifacts, and limited cross-device generalization.
          </span>
        </div>
      </div>
    </div>
  );
};
