import React, { useState } from 'react';
import { DR_GRADING_GUIDE } from '../data/retinalKnowledge';
import { ChevronRight, CheckCircle2 } from 'lucide-react';

const XAI_PIPELINE_STEPS = [
  {
    step: 1,
    title: 'Input',
    detail:
      'A retinal fundus photograph is standardized in resolution, aspect ratio, and circular field-of-view masking while checking brightness and focus.',
  },
  {
    step: 2,
    title: 'Feature extraction',
    detail:
      'Early convolutional filters capture fine edges, blood vessels, and punctate dots, while deeper layers assemble spatial relationships around the macula and optic disc.',
  },
  {
    step: 3,
    title: 'Model prediction',
    detail:
      'A classification head produces raw probability estimates across severity categories alongside an epistemic/aleatoric uncertainty indicator.',
  },
  {
    step: 4,
    title: 'Attribution',
    detail:
      'Methods such as Grad-CAM, Integrated Gradients, or attention rollout trace gradients backward to measure which spatial pixels contributed most to the output.',
  },
  {
    step: 5,
    title: 'Visualization',
    detail:
      'Attribution scores are normalized and overlaid onto the original fundus image as color-calibrated heatmaps, bounding boxes, and ranked Evidence Trails.',
  },
  {
    step: 6,
    title: 'Human interpretation',
    detail:
      'Researchers and clinicians inspect whether highlighted regions align with real retinal anatomy or misleading artifacts before making any educational or scientific conclusions.',
  },
];

const BLACKBOX_VS_XAI = [
  {
    dimension: 'Output Structure',
    blackBox: 'Single severity label or opaque probability score',
    xai: 'Severity estimate + spatial heatmap + feature decomposition + Evidence Trail',
  },
  {
    dimension: 'Artifact Detection',
    blackBox: 'Hidden; lens glare or compression noise may silently drive high confidence',
    xai: 'Explicit pre-analysis quality gate and visual overlay verification',
  },
  {
    dimension: 'Uncertainty Handling',
    blackBox: 'Often overconfident softmax values on out-of-distribution images',
    xai: 'Confidence separated from uncertainty drivers (quality, ambiguity, shift)',
  },
  {
    dimension: 'Educational Value',
    blackBox: 'Minimal; offers no insight into retinal landmarks',
    xai: 'Teaches students and engineers which microvascular features matter',
  },
  {
    dimension: 'Clinical Accountability',
    blackBox: 'Hard to audit or challenge erroneous outputs',
    xai: 'Supports traceable documentation and human-in-the-loop verification',
  },
];

export const LearnPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const currentStep =
    XAI_PIPELINE_STEPS.find((s) => s.step === activeStep) ?? XAI_PIPELINE_STEPS[0];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
          Educational DR & Explainable AI Curriculum
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          Educational Guide: Diabetic Retinopathy & How XAI Works
        </h1>
      </div>

      {/* Animated Interactive 6-Step XAI Pipeline */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            How Explainable AI Works
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Click each stage of the pipeline to see how raw fundus pixels become human-interpretable explanations.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {XAI_PIPELINE_STEPS.map((item) => {
            const active = item.step === activeStep;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStep(item.step)}
                className={`p-3.5 rounded-xl border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  active
                    ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                  <span>Step 0{item.step}</span>
                  {active ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
                <p className="font-display text-sm font-semibold text-slate-900 dark:text-white mt-1.5">
                  {item.title}
                </p>
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/20 p-5">
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            Stage 0{currentStep.step} · {currentStep.title}
          </p>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 mt-1.5 leading-relaxed">
            {currentStep.detail}
          </p>
        </div>
      </section>

      {/* Black-box AI vs Explainable AI Table */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-8 space-y-5">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Black-box AI vs Explainable AI
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400">
                <th className="py-3 pr-4">Dimension</th>
                <th className="py-3 pr-4">Traditional Black-Box AI</th>
                <th className="py-3 text-cyan-700 dark:text-cyan-400">Explainable AI (IRIDEON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {BLACKBOX_VS_XAI.map((row) => (
                <tr key={row.dimension}>
                  <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {row.dimension}
                  </td>
                  <td className="py-3.5 pr-4 text-slate-600 dark:text-slate-400">
                    {row.blackBox}
                  </td>
                  <td className="py-3.5 text-slate-800 dark:text-slate-200">
                    {row.xai}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Educational Diabetic Retinopathy Severity Guide */}
      <section className="space-y-5">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Educational Diabetic Retinopathy Severity Spectrum
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Overview of the 5-grade international clinical diabetic retinopathy scale used in academic imaging research.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {DR_GRADING_GUIDE.map((item, idx) => (
            <div
              key={item.grade}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                  Grade 0{idx}
                </span>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {item.grade}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.summary}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  Typical Fundus Visuals
                </p>
                <p className="text-slate-600 dark:text-slate-400">{item.keyVisuals}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
