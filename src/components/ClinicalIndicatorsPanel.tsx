import React from 'react';
import {
  Activity,
  Droplets,
  Gauge,
  Eye,
  AlertCircle,
  User,
} from 'lucide-react';
import type { RetinaAnalysisResult } from '../types/retina';

interface ClinicalIndicatorsPanelProps {
  analysis: RetinaAnalysisResult;
}

export const ClinicalIndicatorsPanel: React.FC<ClinicalIndicatorsPanelProps> = ({
  analysis,
}) => {
  const { proliferationGrading, systemicEstimates, symptoms } = analysis;

  return (
    <div className="space-y-6">
      {/* 1. Proliferation Grade 1–4 with Percentage Bars */}
      <section
        aria-labelledby="proliferation-grade-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 sm:p-6 space-y-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                IRIDEON Proliferation Scale (Grade 1 – 4)
              </p>
            </div>
            <h2
              id="proliferation-grade-heading"
              className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1"
            >
              {proliferationGrading.label}
            </h2>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
              Proliferation Index
            </span>
            <span className="font-mono text-2xl font-bold tabular-nums text-cyan-700 dark:text-cyan-400">
              {proliferationGrading.overallPercent}%
            </span>
          </div>
        </div>

        {/* Overall 1–4 Proliferation Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Level 1 (Baseline)</span>
            <span>Level 2</span>
            <span>Level 3</span>
            <span>Level 4 (Proliferative)</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                proliferationGrading.level === 4
                  ? 'bg-red-600 dark:bg-red-500'
                  : proliferationGrading.level === 3
                    ? 'bg-amber-500'
                    : proliferationGrading.level === 2
                      ? 'bg-cyan-600 dark:bg-cyan-400'
                      : 'bg-emerald-600 dark:bg-emerald-400'
              }`}
              style={{ width: `${proliferationGrading.overallPercent}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 pt-1">
            {proliferationGrading.description}
          </p>
        </div>

        {/* Individual Level 1 to 4 Percentage Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
          {proliferationGrading.levelsBreakdown.map((item) => (
            <div
              key={item.level}
              className={`rounded-lg border p-3.5 space-y-2 ${
                item.active
                  ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className={`font-semibold ${
                    item.active
                      ? 'text-cyan-900 dark:text-cyan-200'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.title}
                </span>
                <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                  {item.percent}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.active
                      ? item.level === 4
                        ? 'bg-red-600'
                        : item.level === 3
                          ? 'bg-amber-500'
                          : 'bg-cyan-600 dark:bg-cyan-400'
                      : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                  style={{ width: `${item.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Estimated Blood Sugar & Blood Pressure from Retinal Scan (Educational Simulation) */}
      <section
        aria-labelledby="systemic-estimates-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-mono text-violet-700 dark:text-violet-400">
              Retinal Oculomics Biomarker Simulation
            </p>
            <h2
              id="systemic-estimates-heading"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5"
            >
              Estimated Blood Sugar & Blood Pressure Patterns
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-700 dark:text-amber-400">
            Educational Estimate · Not a Lab/Cuff Test
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Blood Sugar Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Droplets className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                <span>Estimated Blood Sugar Level</span>
              </div>
              <span className="text-xs font-mono text-amber-700 dark:text-amber-400">
                {systemicEstimates.bloodSugar.status}
              </span>
            </div>
            <p className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
              {systemicEstimates.bloodSugar.estimatedRangeMgDl}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {systemicEstimates.bloodSugar.educationalNote}
            </p>
          </div>

          {/* Blood Pressure Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
                <span>Estimated Blood Pressure (BP)</span>
              </div>
              <span className="text-xs font-mono text-amber-700 dark:text-amber-400">
                {systemicEstimates.bloodPressure.status}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {systemicEstimates.bloodPressure.estimatedRangeMmHg}
              </p>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                AV Ratio: {systemicEstimates.bloodPressure.avRatioEstimate}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {systemicEstimates.bloodPressure.educationalNote}
            </p>
          </div>
        </div>
      </section>

      {/* 3. Symptoms Inside the Retina vs Outside the Person (including Eye Pain) */}
      <section
        aria-labelledby="symptoms-breakdown-heading"
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 sm:p-6 space-y-5"
      >
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            Internal Pathology vs External Experience
          </p>
          <h2
            id="symptoms-breakdown-heading"
            className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-0.5"
          >
            Symptoms Inside the Retina & Outside for the Person
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Inside Retina */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-3">
            <div className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
              <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <span>Inside the Retina (Microscopic Signs)</span>
            </div>
            <ul className="space-y-3">
              {symptoms.insideRetina.map((item) => (
                <li key={item.title} className="text-xs sm:text-sm space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Outside Person */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-3">
            <div className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
              <User className="w-4 h-4 text-violet-600 dark:text-violet-400" aria-hidden="true" />
              <span>Outside Symptoms & Eye Pain Experience</span>
            </div>
            <ul className="space-y-3">
              {symptoms.outsidePerson.map((item) => (
                <li key={item.title} className="text-xs sm:text-sm space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <span className="font-semibold">Eye Pain & Urgent Symptom Guidance: </span>
            <span>{symptoms.eyePainGuidance}</span>
          </div>
        </div>
      </section>
    </div>
  );
};
