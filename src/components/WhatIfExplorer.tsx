import React, { useMemo, useState } from 'react';
import { Sliders, RotateCcw, Info } from 'lucide-react';
import type { DRGrade, RetinaAnalysisResult, UncertaintyLevel } from '../types/retina';

interface WhatIfExplorerProps {
  analysis: RetinaAnalysisResult;
}

const GRADES: DRGrade[] = [
  'No apparent DR',
  'Mild',
  'Moderate',
  'Severe',
  'Proliferative',
];

export const WhatIfExplorer: React.FC<WhatIfExplorerProps> = ({ analysis }) => {
  const [moreLesions, setMoreLesions] = useState(false);
  const [fewerLesions, setFewerLesions] = useState(false);
  const [lowerQuality, setLowerQuality] = useState(false);
  const [moreVascular, setMoreVascular] = useState(false);

  const simulation = useMemo(() => {
    const baseIdx = Math.max(0, GRADES.indexOf(analysis.prediction));
    let deltaIdx = 0;
    let deltaConf = 0;
    let uncertaintyShift: UncertaintyLevel = analysis.uncertainty;
    const notes: string[] = [];

    if (moreLesions) {
      deltaIdx += 1;
      deltaConf += 4;
      notes.push(
        'Additional punctate microaneurysm or blot-like activations increase feature importance weights toward higher severity.'
      );
    }
    if (fewerLesions) {
      deltaIdx -= 1;
      deltaConf -= 3;
      notes.push(
        'Reducing localized lesion density shifts probability mass downward toward Mild or No apparent DR.'
      );
    }
    if (moreVascular) {
      deltaIdx += 1;
      deltaConf -= 4;
      notes.push(
        'Increased venous tortuosity or fine peripapillary loops shifts attribution toward Severe/Proliferative patterns.'
      );
    }
    if (lowerQuality) {
      deltaConf -= 24;
      uncertaintyShift = 'High';
      notes.push(
        'Degraded focus, glare, or illumination blurs small lesions, dropping confidence sharply and elevating model uncertainty to High.'
      );
    }

    const simulatedIdx = Math.max(0, Math.min(GRADES.length - 1, baseIdx + deltaIdx));
    const simulatedGrade = GRADES[simulatedIdx];
    const simulatedConfidence = Math.max(25, Math.min(97, analysis.confidence + deltaConf));

    if (notes.length === 0) {
      notes.push(
        'Toggle one or more hypothetical image perturbations above to observe how an explainable retinal model responds.'
      );
    }

    return {
      grade: simulatedGrade,
      confidence: simulatedConfidence,
      uncertainty: uncertaintyShift,
      notes,
      hasChanges: moreLesions || fewerLesions || lowerQuality || moreVascular,
    };
  }, [analysis, moreLesions, fewerLesions, lowerQuality, moreVascular]);

  const toggleMoreLesions = () => {
    setMoreLesions((v) => !v);
    if (!moreLesions) setFewerLesions(false);
  };

  const toggleFewerLesions = () => {
    setFewerLesions((v) => !v);
    if (!fewerLesions) setMoreLesions(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              “What If?” Sensitivity Explorer
            </h3>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
            Educational simulation — not a clinical prediction.
          </p>
        </div>

        {simulation.hasChanges && (
          <button
            type="button"
            onClick={() => {
              setMoreLesions(false);
              setFewerLesions(false);
              setLowerQuality(false);
              setMoreVascular(false);
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Hypothetical Perturbation Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {[
          {
            label: '+ More lesion-like regions',
            active: moreLesions,
            onClick: toggleMoreLesions,
          },
          {
            label: '+ Fewer lesion-like regions',
            active: fewerLesions,
            onClick: toggleFewerLesions,
          },
          {
            label: '+ Lower image quality',
            active: lowerQuality,
            onClick: () => setLowerQuality((v) => !v),
          },
          {
            label: '+ More vascular abnormalities',
            active: moreVascular,
            onClick: () => setMoreVascular((v) => !v),
          },
        ].map((item) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={item.active}
            onClick={item.onClick}
            className={`px-3.5 py-2.5 rounded-lg border text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
              item.active
                ? 'border-violet-600 dark:border-violet-400 bg-violet-50 dark:bg-violet-950/35 text-violet-900 dark:text-violet-200'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Expected Model Behavior Output */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Expected model behavior
          </span>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums">
            <span className="text-slate-900 dark:text-white font-semibold">
              Output: {simulation.grade}
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span className="text-cyan-700 dark:text-cyan-400">
              Confidence: {simulation.confidence}%
            </span>
            <span className="text-slate-400" aria-hidden="true">·</span>
            <span
              className={
                simulation.uncertainty === 'High'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-700 dark:text-amber-400'
              }
            >
              Uncertainty: {simulation.uncertainty}
            </span>
          </div>
        </div>

        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
          {simulation.notes.map((n, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
