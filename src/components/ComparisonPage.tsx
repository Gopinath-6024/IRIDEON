import React, { useState } from 'react';
import { SlidersHorizontal, ArrowLeft, Info } from 'lucide-react';
import type { AppPage, RetinaAnalysisResult } from '../types/retina';

interface ComparisonPageProps {
  analysis: RetinaAnalysisResult | null;
  imageUrl: string | null;
  onNavigate: (page: AppPage) => void;
}

export const ComparisonPage: React.FC<ComparisonPageProps> = ({
  analysis,
  imageUrl,
  onNavigate,
}) => {
  const [sliderPos, setSliderPos] = useState(50);

  if (!analysis || !imageUrl) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Human View vs AI View Comparison
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Load a synthetic demo case or upload a fundus image in the Analysis Dashboard to compare the original view against the AI explanation overlay.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('analyze')}
          className="px-5 py-2.5 rounded-lg bg-cyan-700 text-white text-sm font-semibold hover:bg-cyan-800 transition-colors"
        >
          Go to Analysis Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            Side-by-Side Attribution Inspection · Case {analysis.caseId}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Human View vs AI View
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('explainability')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reasoning Lens</span>
        </button>
      </div>

      {/* Side-by-Side Original vs Overlay */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Human View (Original Fundus Image)
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Raw Optical Input
            </span>
          </div>
          <div className="bg-[#04060B] aspect-square max-h-[420px] flex items-center justify-center">
            <img
              src={imageUrl}
              alt="Original human view of retinal fundus"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              AI View (Explanation Overlay)
            </span>
            <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
              Simulated Saliency
            </span>
          </div>
          <div className="relative bg-[#04060B] aspect-square max-h-[420px] flex items-center justify-center">
            <img
              src={imageUrl}
              alt="AI overlay view of retinal fundus"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                {analysis.heatmapData.regions.map((reg, idx) => (
                  <radialGradient key={`cmp-g-${idx}`} id={`cmp-grad-${idx}`} cx="50%" cy="50%" r="50%">
                    <stop
                      offset="0%"
                      stopColor={reg.intensity > 0.75 ? '#ef4444' : '#f59e0b'}
                      stopOpacity={reg.intensity * 0.85}
                    />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity={reg.intensity * 0.35} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                  </radialGradient>
                ))}
              </defs>
              {analysis.heatmapData.regions.map((reg, idx) => (
                <circle
                  key={`cmp-c-${idx}`}
                  cx={reg.x}
                  cy={reg.y}
                  r={reg.radius}
                  fill={`url(#cmp-grad-${idx})`}
                />
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Interactive Draggable Before/After Comparison Slider */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              What changed? (Interactive Original → Explanation Reveal)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Drag the divider horizontally to inspect how AI attention regions align with retinal landmarks.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-cyan-700 dark:text-cyan-400">
            Reveal Split: {sliderPos}%
          </span>
        </div>

        <div className="relative bg-[#04060B] rounded-xl overflow-hidden aspect-square max-h-[480px] max-w-[480px] mx-auto select-none">
          <img
            src={imageUrl}
            alt="Original fundus side of comparison slider"
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain"
          />

          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
          >
            <img
              src={imageUrl}
              alt="AI explanation overlay side of comparison slider"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none">
              {analysis.heatmapData.regions.map((reg, idx) => (
                <g key={`sl-${idx}`}>
                  <circle
                    cx={reg.x}
                    cy={reg.y}
                    r={reg.radius}
                    fill={`url(#cmp-grad-${idx})`}
                  />
                  <circle
                    cx={reg.x}
                    cy={reg.y}
                    r={reg.radius * 0.5}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="0.45"
                    strokeDasharray="1.4 1"
                  />
                </g>
              ))}
            </svg>
          </div>

          <div
            className="absolute inset-y-0 w-0.5 bg-cyan-400 pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>

          <input
            type="range"
            min={0}
            max={100}
            value={sliderPos}
            onChange={(e) => setSliderPos(Number(e.target.value))}
            aria-label="Draggable comparison slider between Original and AI Explanation"
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
          />

          <span className="pointer-events-none absolute top-3 left-3 text-xs font-mono text-white bg-slate-950/75 px-2.5 py-1 rounded">
            Original
          </span>
          <span className="pointer-events-none absolute top-3 right-3 text-xs font-mono text-cyan-300 bg-slate-950/75 px-2.5 py-1 rounded">
            Explanation
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {analysis.evidenceTrail.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 text-xs space-y-1"
            >
              <p className="font-mono font-semibold text-cyan-700 dark:text-cyan-400">
                {item.region}
              </p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {item.feature}
              </p>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.rationale}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 shrink-0" />
          <span>{analysis.modelMetadata.attributionNotice}</span>
        </div>
      </div>
    </div>
  );
};
