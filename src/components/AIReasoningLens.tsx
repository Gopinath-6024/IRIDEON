import React, { useState } from 'react';
import {
  ChevronRight,
  Crosshair,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';
import type { RetinaAnalysisResult } from '../types/retina';
import type { FocusTarget } from './ExplainabilityViewer';

interface AIReasoningLensProps {
  analysis: RetinaAnalysisResult;
  onFocusRegion: (target: FocusTarget) => void;
}

export const AIReasoningLens: React.FC<AIReasoningLensProps> = ({
  analysis,
  onFocusRegion,
}) => {
  const [activeStage, setActiveStage] = useState<string>('features');

  const radarData = [
    { metric: 'Brightness', score: analysis.imageQuality.brightness.score },
    { metric: 'Contrast', score: analysis.imageQuality.contrast.score },
    { metric: 'Sharpness', score: analysis.imageQuality.sharpness.score },
    { metric: 'Field of View', score: analysis.imageQuality.fieldOfView.score },
    { metric: 'Visibility', score: analysis.imageQuality.retinalVisibility.score },
    { metric: 'Low Artifacts', score: analysis.imageQuality.artifacts.score },
  ];

  const activeStageMeta = analysis.explanation.reasoningSteps.find(
    (s) => s.stageId === activeStage
  );

  return (
    <section
      aria-labelledby="ai-reasoning-lens-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 sm:p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-violet-700 dark:text-violet-400">
            Interactive Reasoning Pipeline
          </p>
          <h2
            id="ai-reasoning-lens-heading"
            className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5"
          >
            AI Reasoning Lens
          </h2>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Click any pipeline stage to inspect evidence
        </span>
      </div>

      {/* Horizontal 6-Stage Clickable Pipeline */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-stretch gap-2 min-w-[780px]">
          {analysis.explanation.reasoningSteps.map((stage, idx) => {
            const isSelected = activeStage === stage.stageId;
            return (
              <React.Fragment key={stage.stageId}>
                <button
                  type="button"
                  onClick={() => setActiveStage(stage.stageId)}
                  className={`flex-1 text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    isSelected
                      ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/70 dark:bg-cyan-950/35'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>0{idx + 1}</span>
                    <span
                      className={
                        isSelected
                          ? 'text-cyan-700 dark:text-cyan-300 font-semibold'
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {stage.status}
                    </span>
                  </div>
                  <p className="font-display text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {stage.title}
                  </p>
                </button>
                {idx < analysis.explanation.reasoningSteps.length - 1 && (
                  <div className="flex items-center shrink-0 text-slate-400" aria-hidden="true">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Stage Context Banner */}
      {activeStageMeta && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-white">
            {activeStageMeta.title}:
          </span>{' '}
          {activeStageMeta.summary}
        </div>
      )}

      {/* Stage 1: Input Image */}
      {activeStage === 'input' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Source Mode</p>
            <p className="font-semibold text-slate-900 dark:text-white mt-1">
              {analysis.sourceType === 'demo' ? 'Synthetic Demo Dataset' : 'Uploaded Fundus Image'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Dimensions</p>
            <p className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
              {analysis.imageQuality.dimensions.width} × {analysis.imageQuality.dimensions.height} px
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Encoding Format</p>
            <p className="font-mono font-semibold text-slate-900 dark:text-white mt-1">
              {analysis.imageQuality.mimeType}
            </p>
          </div>
        </div>
      )}

      {/* Stage 2: Image Quality Check */}
      {activeStage === 'quality' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 space-y-2.5">
            {radarData.map((item) => (
              <div key={item.metric} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {item.metric}
                  </span>
                  <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                    {item.score} / 100
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      item.score >= 72
                        ? 'bg-cyan-600 dark:bg-cyan-400'
                        : item.score >= 50
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#94a3b8" strokeOpacity={0.3} />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Image Quality"
                  dataKey="score"
                  stroke="#0891b2"
                  fill="#06b6d4"
                  fillOpacity={0.25}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stage 3: Retinal Feature Detection (All 8 categories) */}
      {activeStage === 'features' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analysis.detectedFeatures.map((feat) => {
            const importanceColor =
              feat.importance === 'High'
                ? 'text-red-700 dark:text-red-400'
                : feat.importance === 'Medium'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-500 dark:text-slate-400';

            return (
              <div
                key={feat.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#090E1A] p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {feat.name}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-mono font-medium shrink-0 ${
                        feat.detected
                          ? 'text-cyan-700 dark:text-cyan-300'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {feat.detected ? (
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <MinusCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>Detected: {feat.detected ? 'Yes' : 'No'}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1.5">
                    <span className={`font-mono font-medium ${importanceColor}`}>
                      Importance: {feat.importance}
                    </span>
                    <span className="text-slate-400" aria-hidden="true">·</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {feat.approximateLocation}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed">
                    {feat.explanation}
                  </p>
                </div>

                {feat.detected && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        onFocusRegion({
                          x: feat.coordinates.x,
                          y: feat.coordinates.y,
                          zoom: 2.3,
                          label: feat.name,
                        })
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline"
                    >
                      <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Locate in Viewer</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stage 4: Feature Importance */}
      {activeStage === 'importance' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Relative visual contribution scores indicating which retinal patterns influenced the demonstration model output most strongly.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analysis.featureContributions}
                layout="vertical"
                margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={200}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <Tooltip />
                <Bar dataKey="weight" name="Contribution (%)" radius={[0, 4, 4, 0]}>
                  {analysis.featureContributions.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={
                        entry.importance === 'High'
                          ? '#0891b2'
                          : entry.importance === 'Medium'
                            ? '#7c3aed'
                            : '#64748b'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stage 5: Severity Estimation */}
      {activeStage === 'severity' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribution across the 5-grade diabetic retinopathy educational rubric. High probability concentration does not represent medical certainty.
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analysis.severityDistribution}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <XAxis dataKey="grade" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip />
                <Bar dataKey="probability" name="Estimated Weight (%)" radius={[4, 4, 0, 0]}>
                  {analysis.severityDistribution.map((item) => (
                    <Cell
                      key={item.grade}
                      fill={item.grade === analysis.prediction ? '#06b6d4' : '#475569'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Stage 6: Final Output */}
      {activeStage === 'output' && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Synthesis Summary
            </p>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
              {analysis.explanation.summary}
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Key Model Limitations</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-900 dark:text-amber-200">
              {analysis.explanation.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
};
