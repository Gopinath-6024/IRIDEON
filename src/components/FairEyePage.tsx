import React, { useMemo, useState } from 'react';
import {
  Scale,
  AlertTriangle,
  Play,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { evaluateClientQualityGate } from '../utils/retinalSaliency';
import type { ClientPixelStats, LocalScreeningRecord } from '../types/retina';

interface FairEyePageProps {
  records: LocalScreeningRecord[];
}

interface QualityStressCohort {
  cohortId: string;
  cohortName: string;
  description: string;
  samples: ClientPixelStats[];
}

function buildQualityStressCohorts(): QualityStressCohort[] {
  const mkStats = (
    n: number,
    brightnessBase: number,
    contrastBase: number,
    sharpnessBase: number,
    fovBase: number,
    redDom: number
  ): ClientPixelStats[] => {
    const out: ClientPixelStats[] = [];
    for (let i = 0; i < n; i++) {
      const jitter = ((i * 37) % 13) - 6;
      out.push({
        width: 768,
        height: 768,
        meanBrightness: Math.max(15, Math.min(235, brightnessBase + jitter * 1.5)),
        contrastStdDev: Math.max(10, Math.min(75, contrastBase + jitter * 1.1)),
        edgeSharpness: Math.max(12, Math.min(96, sharpnessBase + jitter * 1.4)),
        centerToEdgeRatio: fovBase,
        redChannelDominance: redDom,
        blueChannelDominance: Math.max(0.08, (1 - redDom) * 0.32),
        artifactScore: 84 + (i % 9),
      });
    }
    return out;
  };

  return [
    {
      cohortId: 'stress-balanced',
      cohortName: 'Balanced Illumination Simulation (N=24)',
      description: 'Well-lit, centered fundus pixel parameters',
      samples: mkStats(24, 108, 46, 82, 1.45, 0.48),
    },
    {
      cohortId: 'stress-low-light',
      cohortName: 'Low-Illumination / Dark Fundus Simulation (N=20)',
      description: 'Low mean brightness & reduced contrast stress',
      samples: mkStats(20, 44, 24, 68, 1.25, 0.44),
    },
    {
      cohortId: 'stress-blur',
      cohortName: 'Motion Blur / Low Sharpness Simulation (N=16)',
      description: 'Borderline Laplacian edge sharpness stress',
      samples: mkStats(16, 102, 29, 36, 1.32, 0.45),
    },
    {
      cohortId: 'stress-glare',
      cohortName: 'Overexposed / Off-Axis Stress (N=18)',
      description: 'High brightness / peripheral framing stress',
      samples: mkStats(18, 196, 32, 60, 1.05, 0.41),
    },
  ];
}

export const FairEyePage: React.FC<FairEyePageProps> = ({ records }) => {
  const [minSharpnessCutoff, setMinSharpnessCutoff] = useState<number>(32);
  const [evalNonce, setEvalNonce] = useState<number>(0);

  const stressResults = useMemo(() => {
    void evalNonce;
    const cohorts = buildQualityStressCohorts();
    return cohorts.map((c) => {
      let passed = 0;
      let blocked = 0;
      let avgBrightness = 0;
      let avgSharpness = 0;

      for (const s of c.samples) {
        const q = evaluateClientQualityGate(s, 'image/png');
        const passesSharp = s.edgeSharpness >= minSharpnessCutoff;
        if (q.suitable && passesSharp) passed += 1;
        else blocked += 1;
        avgBrightness += s.meanBrightness;
        avgSharpness += s.edgeSharpness;
      }

      const n = c.samples.length;
      const passRate = Math.round((passed / n) * 100);
      return {
        cohortId: c.cohortId,
        cohortName: c.cohortName,
        shortName: c.cohortName.split(' Simulation')[0],
        description: c.description,
        sampleCount: n,
        passRate,
        blockRate: 100 - passRate,
        passed,
        blocked,
        meanSharpness: Math.round(avgSharpness / n),
        meanBrightness: Math.round(avgBrightness / n),
      };
    });
  }, [minSharpnessCutoff, evalNonce]);

  const unavailableClinicalMetrics = [
    { metric: 'Accuracy', status: 'Not Available', note: 'Requires labeled multi-center clinical dataset' },
    { metric: 'Precision', status: 'Not Available', note: 'No clinical validation set connected' },
    { metric: 'Recall / Sensitivity', status: 'Not Available', note: 'Requires ground-truth DR grading cohort' },
    { metric: 'Specificity', status: 'Not Available', note: 'Requires clinical ground-truth comparison' },
    { metric: 'F1-Score', status: 'Not Available', note: 'No evaluated validation cohort' },
    { metric: 'ROC-AUC', status: 'Not Available', note: 'Requires continuous logits over validated dataset' },
    { metric: 'Confusion Matrix', status: 'Not Available', note: 'Cannot compute without clinical ground truth' },
  ];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-violet-700 dark:text-violet-400">
            IRIDEON Fair-Eye · Validation Transparency &amp; Quality-Gate Stress Audit
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Model Performance &amp; Validation Audit
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Truthfully documents clinical evaluation availability alongside non-clinical stress testing of IRIDEON&apos;s technical image-quality gate across illumination and blur scenarios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1322] px-3 py-1.5 text-xs">
            <label htmlFor="fair-thresh" className="font-mono text-slate-600 dark:text-slate-300">
              Min Sharpness Gate: {minSharpnessCutoff}
            </label>
            <input
              id="fair-thresh"
              type="range"
              min={20}
              max={65}
              step={3}
              value={minSharpnessCutoff}
              onChange={(e) => setMinSharpnessCutoff(Number(e.target.value))}
              className="w-24 accent-cyan-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setEvalNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Re-Run Quality Stress Audit</span>
          </button>
        </div>
      </div>

      {/* Mandatory Truthful Notice */}
      <div
        role="status"
        className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 p-5 flex items-start gap-3 text-sm text-amber-950 dark:text-amber-100"
      >
        <ShieldAlert className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-display font-bold">
            Model performance metrics are not currently available in this prototype.
          </p>
          <p className="text-xs leading-relaxed">
            IRIDEON operates in Prototype / Educational Mode without pretrained clinical CNN weights or a linked ophthalmologist-graded validation dataset. Consequently, Accuracy, Precision, Recall, F1-Score, Sensitivity, Specificity, ROC-AUC, and Confusion Matrices are intentionally reported as unavailable rather than fabricated.
          </p>
        </div>
      </div>

      {/* Clinical Performance Matrix (Truthfully Unavailable) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Clinical Validation Benchmark Status</span>
          </h2>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Session Stored Cases: {records.length} (Unlabeled clinical ground truth)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5">
          {unavailableClinicalMetrics.map((m) => (
            <div
              key={m.metric}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-1"
            >
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{m.metric}</p>
              <p className="font-display text-base font-bold text-slate-700 dark:text-slate-300">
                {m.status}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                {m.note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Non-Clinical Technical Quality-Gate Stress Simulator */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Technical Quality-Gate Pass vs. Rejection Stress Test (Synthetic Pixel Profiles)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulates how the preprocessing gate responds to underexposure, blur, and off-axis lighting — NOT clinical diagnostic accuracy.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            Sharpness Cutoff: {minSharpnessCutoff}
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stressResults} margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="passRate" name="Quality Gate Pass %" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="blockRate" name="Quality Gate Rejected %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800 pt-3">
          <table className="w-full text-left text-xs">
            <thead className="font-mono text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2 pr-4">Synthetic Stress Condition</th>
                <th className="py-2 px-3 text-right">Samples</th>
                <th className="py-2 px-3 text-right">Mean Sharpness</th>
                <th className="py-2 px-3 text-right">Mean Brightness</th>
                <th className="py-2 px-3 text-right">Gate Passed</th>
                <th className="py-2 pl-3 text-right">Gate Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {stressResults.map((r) => (
                <tr key={r.cohortId}>
                  <td className="py-2.5 pr-4">
                    <p className="font-semibold text-slate-900 dark:text-white">{r.cohortName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{r.description}</p>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.sampleCount}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.meanSharpness}%</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">{r.meanBrightness}</td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {r.passed} ({r.passRate}%)
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                    {r.blocked} ({r.blockRate}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Connect an externally validated clinical ML endpoint via ML_BACKEND_URL to inspect real cohort calibration metrics.
          </span>
        </p>
      </div>
    </div>
  );
};
