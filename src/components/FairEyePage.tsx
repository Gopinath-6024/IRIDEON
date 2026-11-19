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
import type {
  ClientPixelStats,
  FairEyeEvaluationReport,
  FairEyeGroupResult,
  LocalScreeningRecord,
} from '../types/retina';

interface FairEyePageProps {
  records: LocalScreeningRecord[];
}

interface SyntheticEvalSample {
  groupId: string;
  groupName: string;
  datasetSource: string;
  groundTruthReferable: boolean;
  stats: ClientPixelStats;
  lesionSignalStrength: number; // simulated visual lesion contrast [0..1]
}

function buildSyntheticBenchmarkSuite(): SyntheticEvalSample[] {
  const samples: SyntheticEvalSample[] = [];

  const pushGroup = (
    groupId: string,
    groupName: string,
    datasetSource: string,
    n: number,
    posRatio: number,
    brightnessBase: number,
    contrastBase: number,
    sharpnessBase: number,
    fovRatio: number,
    redDom: number,
    signalAttenuation: number
  ) => {
    const posCount = Math.round(n * posRatio);
    for (let i = 0; i < n; i++) {
      const isPos = i < posCount;
      const jitter = ((i * 37) % 11) - 5; // deterministic variation [-5..+5]
      const rawSignal = isPos ? 0.68 - (i % 4) * 0.08 : 0.22 + (i % 5) * 0.07;
      samples.push({
        groupId,
        groupName,
        datasetSource,
        groundTruthReferable: isPos,
        stats: {
          width: 768,
          height: 768,
          meanBrightness: Math.max(20, Math.min(230, brightnessBase + jitter * 1.4)),
          contrastStdDev: Math.max(12, Math.min(75, contrastBase + jitter * 0.9)),
          edgeSharpness: Math.max(18, Math.min(95, sharpnessBase + jitter * 1.3)),
          centerToEdgeRatio: fovRatio,
          redChannelDominance: redDom,
          artifactScore: 84 + (i % 9),
        },
        lesionSignalStrength: Math.max(0.05, Math.min(0.98, rawSignal * signalAttenuation)),
      });
    }
  };

  // Group 1: Balanced Benchmark Illumination (N=24)
  pushGroup(
    'g-balanced',
    'Balanced Fundus Illumination Cohort',
    'Synthetic Calibration Batch A (Demo)',
    24,
    0.5,
    108,
    46,
    82,
    1.45,
    0.48,
    1.0
  );

  // Group 2: Low-Illumination / Darker Choroidal Fundus Contrast (N=20)
  pushGroup(
    'g-dark-contrast',
    'Low-Illumination / Darker Fundus Pigmentation Tier',
    'Synthetic Calibration Batch B (Demo)',
    20,
    0.5,
    58,
    31,
    71,
    1.28,
    0.44,
    0.84
  );

  // Group 3: Peripheral / Off-Axis Field Illumination (N=18)
  pushGroup(
    'g-off-axis',
    'Off-Axis / Peripheral Illumination Subgroup',
    'Synthetic Calibration Batch C (Demo)',
    18,
    0.5,
    118,
    36,
    66,
    1.12,
    0.42,
    0.88
  );

  // Group 4: Borderline Sharpness / Mild Motion Blur (N=16)
  pushGroup(
    'g-blur',
    'Mild Motion Blur / Lower Sharpness Subgroup',
    'Synthetic Calibration Batch D (Demo)',
    16,
    0.5,
    102,
    29,
    44,
    1.32,
    0.45,
    0.78
  );

  // Group 5: Small Rare Edge-Case Subgroup (N=6 < 15 -> triggers insufficient sample size warning)
  pushGroup(
    'g-small',
    'Rare Artifact / High-Myopia Edge Subgroup',
    'Synthetic Edge-Case Mini-Batch (Demo)',
    6,
    0.5,
    92,
    34,
    62,
    1.25,
    0.43,
    0.85
  );

  return samples;
}

function runEvaluationSuite(
  thresholdCutoff: number,
  sessionRecords: LocalScreeningRecord[]
): FairEyeEvaluationReport {
  const suite = buildSyntheticBenchmarkSuite();
  const grouped = new Map<string, SyntheticEvalSample[]>();
  for (const s of suite) {
    const arr = grouped.get(s.groupId) ?? [];
    arr.push(s);
    grouped.set(s.groupId, arr);
  }

  const results: FairEyeGroupResult[] = [];
  let totalCorrect = 0;
  let totalTP = 0;
  let totalFP = 0;
  let totalTN = 0;
  let totalFN = 0;
  let totalN = 0;

  for (const [groupId, items] of grouped.entries()) {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const sample of items) {
      const quality = evaluateClientQualityGate(sample.stats, 'image/png');
      // Prototype scoring rule combining actual lesion signal + contrast/quality attenuation
      const qualityPenalty = quality.suitable ? 0 : 0.08;
      const score = sample.lesionSignalStrength + (sample.stats.contrastStdDev > 44 ? 0.06 : 0) - qualityPenalty;
      const predictedReferable = score >= thresholdCutoff;

      if (sample.groundTruthReferable && predictedReferable) tp += 1;
      else if (!sample.groundTruthReferable && predictedReferable) fp += 1;
      else if (!sample.groundTruthReferable && !predictedReferable) tn += 1;
      else fn += 1;
    }

    const n = items.length;
    const sufficient = n >= 15;
    const acc = sufficient ? Math.round(((tp + tn) / n) * 100) : null;
    const sens = sufficient && tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) : null;
    const spec = sufficient && tn + fp > 0 ? Math.round((tn / (tn + fp)) * 100) : null;
    const err = acc !== null ? 100 - acc : null;

    if (sufficient) {
      totalCorrect += tp + tn;
      totalTP += tp;
      totalFP += fp;
      totalTN += tn;
      totalFN += fn;
      totalN += n;
    }

    results.push({
      groupId,
      groupName: items[0].groupName,
      datasetSource: items[0].datasetSource,
      sampleCount: n,
      sufficientSampleSize: sufficient,
      accuracy: acc,
      sensitivity: sens,
      specificity: spec,
      errorRate: err,
      falsePositives: fp,
      falseNegatives: fn,
      truePositives: tp,
      trueNegatives: tn,
      limitationNote: !sufficient
        ? 'Insufficient sample size for reliable comparison.'
        : fn > fp
          ? 'Higher false-negative rate under lower illumination/sharpness — further validation required.'
          : fp > fn
            ? 'Elevated false-positive rate due to background contrast variations.'
            : 'Balanced error profile on synthetic calibration batch.',
    });
  }

  // Also summarize local saved browser records as an observational cohort (unlabeled clinical truth unless flagged)
  if (sessionRecords.length > 0) {
    const n = sessionRecords.length;
    results.push({
      groupId: 'g-session-local',
      groupName: 'Current Browser Session Queue (Observational)',
      datasetSource: 'Local Saved Records (Unvalidated)',
      sampleCount: n,
      sufficientSampleSize: n >= 15,
      accuracy: null,
      sensitivity: null,
      specificity: null,
      errorRate: null,
      falsePositives: 0,
      falseNegatives: 0,
      truePositives: 0,
      trueNegatives: 0,
      limitationNote:
        n < 15
          ? 'Insufficient sample size for reliable comparison.'
          : 'No clinical ground-truth biopsy/grading label stored locally.',
    });
  }

  const poweredSens = results
    .filter((r) => r.sufficientSampleSize && r.sensitivity !== null)
    .map((r) => r.sensitivity as number);
  const maxSensitivityGap =
    poweredSens.length >= 2 ? Math.max(...poweredSens) - Math.min(...poweredSens) : 0;
  const performanceGapDetected = maxSensitivityGap >= 10;

  return {
    evaluatedAt: new Date().toISOString(),
    totalSamples: totalN,
    overallAccuracy: totalN > 0 ? Math.round((totalCorrect / totalN) * 100) : 0,
    overallSensitivity:
      totalTP + totalFN > 0 ? Math.round((totalTP / (totalTP + totalFN)) * 100) : 0,
    overallSpecificity:
      totalTN + totalFP > 0 ? Math.round((totalTN / (totalTN + totalFP)) * 100) : 0,
    performanceGapDetected,
    maxSensitivityGap,
    groups: results,
    summaryNotice: performanceGapDetected
      ? 'Performance difference detected — further validation required.'
      : 'Powered synthetic subgroups within 10% sensitivity spread — independent clinical validation still required.',
  };
}

export const FairEyePage: React.FC<FairEyePageProps> = ({ records }) => {
  const [thresholdCutoff, setThresholdCutoff] = useState<number>(0.48);
  const [evalNonce, setEvalNonce] = useState<number>(0);

  const report = useMemo(() => {
    void evalNonce;
    return runEvaluationSuite(thresholdCutoff, records);
  }, [thresholdCutoff, records, evalNonce]);

  const chartData = useMemo(
    () =>
      report.groups
        .filter((g) => g.sufficientSampleSize && g.accuracy !== null)
        .map((g) => ({
          name: g.groupName.replace(' Subgroup', '').replace(' Cohort', '').replace(' Tier', ''),
          Accuracy: g.accuracy,
          Sensitivity: g.sensitivity,
          Specificity: g.specificity,
        })),
    [report]
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-violet-700 dark:text-violet-400">
            IRIDEON Fair-Eye · Model Limitation & Subgroup Disparity Audit
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Fair-Eye Evaluation & Bias Discovery
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Audits prototype screening performance across illumination, sharpness, off-axis geometry, and low-sample cohorts to uncover potential disparities and validation gaps rather than assuming universal fairness.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1322] px-3 py-1.5 text-xs">
            <label htmlFor="fair-thresh" className="font-mono text-slate-600 dark:text-slate-300">
              Decision Cutoff: {thresholdCutoff.toFixed(2)}
            </label>
            <input
              id="fair-thresh"
              type="range"
              min={0.35}
              max={0.65}
              step={0.02}
              value={thresholdCutoff}
              onChange={(e) => setThresholdCutoff(Number(e.target.value))}
              className="w-24 accent-cyan-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setEvalNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Re-Run Subgroup Audit</span>
          </button>
        </div>
      </div>

      {/* Explicit Ethical / Non-Clinical Notice */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <span>
          <strong>Synthetic Calibration Audit Only — Not Clinical Validation:</strong> Metrics below are computed live in-browser across synthetic pixel test cohorts ({report.totalSamples} powered test samples) to expose sensitivity/specificity trade-offs and domain-shift failure modes. IRIDEON never claims to be unbiased or clinically certified.
        </span>
      </div>

      {/* Mandatory Gap Alert */}
      {report.performanceGapDetected && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/35 p-4 flex items-start gap-3 text-sm text-red-950 dark:text-red-100"
        >
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-display font-bold">
              Performance difference detected — further validation required.
            </p>
            <p className="text-xs">
              Maximum sensitivity disparity across sufficiently powered cohorts is{' '}
              <span className="font-mono font-bold">{report.maxSensitivityGap}%</span>. Lower illumination and mild motion blur increase false-negative risk.
            </p>
          </div>
        </div>
      )}

      {/* Top Overall Powered Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Powered Test Samples</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
            {report.totalSamples}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Aggregate Accuracy (Demo)</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-cyan-700 dark:text-cyan-400 mt-1">
            {report.overallAccuracy}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Aggregate Sensitivity (Demo)</p>
          <p className="font-mono text-2xl font-bold tabular-nums text-violet-700 dark:text-violet-400 mt-1">
            {report.overallSensitivity}%
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Max Sensitivity Gap</p>
          <p
            className={`font-mono text-2xl font-bold tabular-nums mt-1 ${
              report.performanceGapDetected
                ? 'text-red-700 dark:text-red-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {report.maxSensitivityGap}%
          </p>
        </div>
      </div>

      {/* Grouped Performance Chart */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Subgroup Performance Comparison (Synthetic Test Cohorts with N ≥ 15)</span>
          </h2>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Cutoff: {thresholdCutoff.toFixed(2)}
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.25} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
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
              <Bar dataKey="Accuracy" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sensitivity" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Specificity" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Complete Metrics Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Detailed Fair-Eye Evaluation Matrix
          </h2>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Minimum sample threshold: N ≥ 15
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-[#090E1A] border-b border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Group / Cohort</th>
                <th className="px-3 py-3 text-right">Samples</th>
                <th className="px-3 py-3 text-right">Accuracy</th>
                <th className="px-3 py-3 text-right">Sensitivity</th>
                <th className="px-3 py-3 text-right">Specificity</th>
                <th className="px-3 py-3 text-right">Error Rate</th>
                <th className="px-3 py-3 text-right">FP</th>
                <th className="px-3 py-3 text-right">FN</th>
                <th className="px-4 py-3">Limitation / Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {report.groups.map((g) => (
                <tr key={g.groupId} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{g.groupName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{g.datasetSource}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold">
                    {g.sampleCount}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {g.accuracy !== null ? `${g.accuracy}%` : '—'}
                  </td>
                  <td
                    className={`px-3 py-3 text-right font-mono tabular-nums font-semibold ${
                      g.sensitivity !== null && g.sensitivity < 75
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {g.sensitivity !== null ? `${g.sensitivity}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {g.specificity !== null ? `${g.specificity}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">
                    {g.errorRate !== null ? `${g.errorRate}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-amber-700 dark:text-amber-400">
                    {g.sufficientSampleSize && g.accuracy !== null ? g.falsePositives : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-red-700 dark:text-red-400">
                    {g.sufficientSampleSize && g.accuracy !== null ? g.falseNegatives : '—'}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {!g.sufficientSampleSize ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>Insufficient sample size for reliable comparison.</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">{g.limitationNote}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
