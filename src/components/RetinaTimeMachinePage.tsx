import React, { useMemo, useState } from 'react';
import {
  Clock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { generateSyntheticFundusDataUrl } from '../utils/fundusGenerator';
import { deriveRiskTier } from '../utils/localRecordsStore';
import type { LocalScreeningRecord, TimeMachineCohort } from '../types/retina';

interface RetinaTimeMachinePageProps {
  records: LocalScreeningRecord[];
}

function buildDemoCohorts(): TimeMachineCohort[] {
  const imgA = generateSyntheticFundusDataUrl('demo-a');
  const imgB = generateSyntheticFundusDataUrl('demo-b');
  const imgC = generateSyntheticFundusDataUrl('demo-c');

  return [
    {
      cohortId: 'demo-progression',
      patientDemoId: 'DEMO-COHORT-PROG-01',
      title: 'Demo Cohort A · Progressive Microvascular Pattern (Synthetic)',
      description:
        'Synthetic 4-visit longitudinal sequence illustrating visual progression from Baseline (Level 1) through Mild/Moderate features to High-Risk Pre-Proliferative patterns (Level 3).',
      isDemo: true,
      visits: [
        {
          visitId: 'v1',
          label: 'Screening 1',
          date: '2025-02-14',
          imageUrl: imgA,
          prediction: 'No apparent DR',
          riskTier: 'Low Risk',
          proliferationLevel: 1,
          confidence: 92,
          uncertainty: 'Low',
          heatmapRegions: [
            { x: 74, y: 50, radius: 13, intensity: 0.42, label: 'Optic Disc', featureType: 'Anatomical Baseline' },
          ],
          summary: 'Clean baseline vessel arcades and unremarkable macular center.',
          isDemo: true,
        },
        {
          visitId: 'v2',
          label: 'Screening 2',
          date: '2025-07-10',
          imageUrl: imgB,
          prediction: 'Mild',
          riskTier: 'Moderate Risk',
          proliferationLevel: 2,
          confidence: 76,
          uncertainty: 'Moderate',
          heatmapRegions: [
            { x: 37, y: 38, radius: 11, intensity: 0.72, label: 'Superior Macular Specks', featureType: 'Microaneurysm-like' },
          ],
          summary: 'Early punctate contrast dips noticed in superior-temporal field.',
          isDemo: true,
        },
        {
          visitId: 'v3',
          label: 'Screening 3',
          date: '2025-12-03',
          imageUrl: imgB,
          prediction: 'Moderate',
          riskTier: 'Moderate Risk',
          proliferationLevel: 2,
          confidence: 87,
          uncertainty: 'Moderate',
          heatmapRegions: [
            { x: 37, y: 38, radius: 13, intensity: 0.88, label: 'Microaneurysm Cluster', featureType: 'Microaneurysm-like' },
            { x: 54, y: 57, radius: 11, intensity: 0.76, label: 'Parafoveal Ring', featureType: 'Exudate-like' },
            { x: 34, y: 63, radius: 10, intensity: 0.68, label: 'Inferior Blot', featureType: 'Hemorrhage-like' },
          ],
          summary: 'Expanded punctate cluster plus parafoveal exudate-like bright specks.',
          isDemo: true,
        },
        {
          visitId: 'v4',
          label: 'Current screening',
          date: '2026-04-18',
          imageUrl: imgC,
          prediction: 'Severe',
          riskTier: 'High Risk',
          proliferationLevel: 3,
          confidence: 84,
          uncertainty: 'Moderate',
          heatmapRegions: [
            { x: 32, y: 60, radius: 16, intensity: 0.94, label: 'Clustered Hemorrhages', featureType: 'Hemorrhage-like' },
            { x: 50, y: 54, radius: 14, intensity: 0.87, label: 'Dense Macular Ring', featureType: 'Exudate-like' },
            { x: 56, y: 31, radius: 11, intensity: 0.74, label: 'Superior Arcade Patch', featureType: 'Cotton-wool-like' },
          ],
          summary: 'Multi-quadrant blot hemorrhages and perimacular ring — urgent specialist review indicated.',
          isDemo: true,
        },
      ],
    },
    {
      cohortId: 'demo-stable',
      patientDemoId: 'DEMO-COHORT-STABLE-02',
      title: 'Demo Cohort B · Stable Baseline Sequence (Synthetic)',
      description:
        'Synthetic 4-visit control sequence demonstrating consistent baseline appearance across screenings.',
      isDemo: true,
      visits: [
        {
          visitId: 's1',
          label: 'Screening 1',
          date: '2025-01-20',
          imageUrl: imgA,
          prediction: 'No apparent DR',
          riskTier: 'Low Risk',
          proliferationLevel: 1,
          confidence: 91,
          uncertainty: 'Low',
          heatmapRegions: [
            { x: 74, y: 50, radius: 12, intensity: 0.4, label: 'Optic Disc', featureType: 'Landmark' },
          ],
          summary: 'Normal-like baseline synthetic fundus.',
          isDemo: true,
        },
        {
          visitId: 's2',
          label: 'Screening 2',
          date: '2025-06-15',
          imageUrl: imgA,
          prediction: 'No apparent DR',
          riskTier: 'Low Risk',
          proliferationLevel: 1,
          confidence: 92,
          uncertainty: 'Low',
          heatmapRegions: [
            { x: 74, y: 50, radius: 12, intensity: 0.38, label: 'Optic Disc', featureType: 'Landmark' },
          ],
          summary: 'Consistent vascular caliber without new punctate spots.',
          isDemo: true,
        },
        {
          visitId: 's3',
          label: 'Screening 3',
          date: '2025-11-18',
          imageUrl: imgA,
          prediction: 'No apparent DR',
          riskTier: 'Low Risk',
          proliferationLevel: 1,
          confidence: 92,
          uncertainty: 'Low',
          heatmapRegions: [
            { x: 74, y: 50, radius: 12, intensity: 0.39, label: 'Optic Disc', featureType: 'Landmark' },
          ],
          summary: 'Macular center remains uniform.',
          isDemo: true,
        },
        {
          visitId: 's4',
          label: 'Current screening',
          date: '2026-04-12',
          imageUrl: imgA,
          prediction: 'No apparent DR',
          riskTier: 'Low Risk',
          proliferationLevel: 1,
          confidence: 93,
          uncertainty: 'Low',
          heatmapRegions: [
            { x: 74, y: 50, radius: 12, intensity: 0.41, label: 'Optic Disc', featureType: 'Landmark' },
          ],
          summary: 'No interval change detected across synthetic baseline visits.',
          isDemo: true,
        },
      ],
    },
  ];
}

export const RetinaTimeMachinePage: React.FC<RetinaTimeMachinePageProps> = ({ records }) => {
  const demoCohorts = useMemo(() => buildDemoCohorts(), []);

  const cohorts = useMemo<TimeMachineCohort[]>(() => {
    if (records.length < 2) return demoCohorts;
    const chronological = [...records].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const localCohort: TimeMachineCohort = {
      cohortId: 'local-session',
      patientDemoId: 'LOCAL-SAVED-TIMELINE',
      title: `Local Saved Records Sequence (${chronological.length} Screenings)`,
      description:
        'Chronological comparison built directly from your local saved screening records in this browser session.',
      isDemo: chronological.every((r) => r.isDemoRecord),
      visits: chronological.map((rec, idx) => ({
        visitId: rec.recordId,
        label: idx === chronological.length - 1 ? 'Current screening' : `Screening ${idx + 1}`,
        date: rec.createdAt.slice(0, 10),
        imageUrl: rec.imageThumbnailUrl,
        prediction: rec.analysis.prediction,
        riskTier: deriveRiskTier(rec.analysis),
        proliferationLevel: rec.analysis.proliferationGrading.level,
        confidence: rec.analysis.confidence,
        uncertainty: rec.analysis.uncertainty,
        heatmapRegions: rec.analysis.heatmapData.regions,
        summary: rec.analysis.explanation.summary,
        isDemo: rec.isDemoRecord,
      })),
    };
    return [...demoCohorts, localCohort];
  }, [demoCohorts, records]);

  const [selectedCohortId, setSelectedCohortId] = useState<string>(cohorts[0].cohortId);
  const activeCohort = cohorts.find((c) => c.cohortId === selectedCohortId) ?? cohorts[0];

  const [prevIdx, setPrevIdx] = useState<number>(0);
  const [currIdx, setCurrIdx] = useState<number>(activeCohort.visits.length - 1);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);
  const [opacity, setOpacity] = useState<number>(72);

  const safePrev = activeCohort.visits[Math.min(prevIdx, activeCohort.visits.length - 1)];
  const safeCurr = activeCohort.visits[Math.min(currIdx, activeCohort.visits.length - 1)];

  const changeDetected =
    safePrev.prediction !== safeCurr.prediction ||
    safePrev.proliferationLevel !== safeCurr.proliferationLevel ||
    safePrev.riskTier !== safeCurr.riskTier;

  const handleSwitchCohort = (cohortId: string) => {
    setSelectedCohortId(cohortId);
    const next = cohorts.find((c) => c.cohortId === cohortId) ?? cohorts[0];
    setPrevIdx(0);
    setCurrIdx(Math.max(0, next.visits.length - 1));
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            IRIDEON Retina Time Machine · Longitudinal Comparison Prototype
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Retina Time Machine
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Compare retinal scans and Retina Map saliency overlays across successive screening dates to inspect potential visual differences over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeCohort.cohortId}
            onChange={(e) => handleSwitchCohort(e.target.value)}
            aria-label="Select longitudinal screening cohort"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1322] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
          >
            {cohorts.map((c) => (
              <option key={c.cohortId} value={c.cohortId}>
                {c.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowOverlay((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1322] text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors"
          >
            {showOverlay ? (
              <>
                <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Retina Map On</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Retina Map Off</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Explicit Demo Notice */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <span>
          <strong>{activeCohort.isDemo ? 'DEMO / SYNTHETIC LONGITUDINAL DATA:' : 'SESSION RECORDS:'}</strong>{' '}
          {activeCohort.description} Screening support — not a standalone diagnosis.
        </span>
      </div>

      {/* Visual Visit Timeline */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Screening Timeline ({activeCohort.patientDemoId})</span>
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <label htmlFor="tm-opacity" className="text-slate-500 dark:text-slate-400">
              Overlay Opacity
            </label>
            <input
              id="tm-opacity"
              type="range"
              min={15}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-24 accent-cyan-600"
            />
            <span className="font-mono text-slate-700 dark:text-slate-300 w-9">{opacity}%</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeCohort.visits.map((visit, idx) => {
            const isPrev = idx === Math.min(prevIdx, activeCohort.visits.length - 1);
            const isCurr = idx === Math.min(currIdx, activeCohort.visits.length - 1);
            return (
              <React.Fragment key={visit.visitId}>
                <div
                  className={`rounded-lg border px-3.5 py-2.5 text-xs space-y-1 ${
                    isCurr
                      ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/70 dark:bg-cyan-950/35'
                      : isPrev
                        ? 'border-violet-600 dark:border-violet-400 bg-violet-50/70 dark:bg-violet-950/35'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="font-bold text-slate-900 dark:text-white">{visit.label}</span>
                    <span className="text-slate-500 dark:text-slate-400">{visit.date}</span>
                  </div>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {visit.prediction} · Level {visit.proliferationLevel}/4
                  </p>
                  <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPrevIdx(idx)}
                      className={`underline-offset-2 hover:underline ${
                        isPrev ? 'text-violet-700 dark:text-violet-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isPrev ? '● Previous' : 'Set Previous'}
                    </button>
                    <span className="text-slate-400">·</span>
                    <button
                      type="button"
                      onClick={() => setCurrIdx(idx)}
                      className={`underline-offset-2 hover:underline ${
                        isCurr ? 'text-cyan-700 dark:text-cyan-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {isCurr ? '● Current' : 'Set Current'}
                    </button>
                  </div>
                </div>
                {idx < activeCohort.visits.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Observation Alert */}
      <div
        role="status"
        className={`rounded-xl border p-4 flex items-start gap-3 text-sm ${
          changeDetected
            ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 text-amber-950 dark:text-amber-100'
            : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/25 text-emerald-950 dark:text-emerald-100'
        }`}
      >
        <AlertTriangle
          className={`w-5 h-5 shrink-0 mt-0.5 ${
            changeDetected ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}
        />
        <div className="space-y-0.5">
          <p className="font-display font-bold">
            {changeDetected
              ? 'Change observed between screening records — professional interpretation required.'
              : 'No category shift observed between selected screening records — routine specialist oversight still applies.'}
          </p>
          <p className="text-xs opacity-90">
            Comparing {safePrev.label} ({safePrev.date}: {safePrev.prediction}, Level{' '}
            {safePrev.proliferationLevel}/4) vs {safeCurr.label} ({safeCurr.date}: {safeCurr.prediction}, Level{' '}
            {safeCurr.proliferationLevel}/4).
          </p>
        </div>
      </div>

      {/* Side-by-Side Previous vs Current Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { role: 'Previous Visit', accent: 'text-violet-700 dark:text-violet-400', visit: safePrev, prefix: 'prev' },
          { role: 'Current Visit', accent: 'text-cyan-700 dark:text-cyan-400', visit: safeCurr, prefix: 'curr' },
        ].map(({ role, accent, visit, prefix }) => (
          <div
            key={`${prefix}-${visit.visitId}`}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className={`text-xs font-mono font-semibold ${accent}`}>
                  {role} · {visit.label}
                </p>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {visit.date} — {visit.prediction}
                </h3>
              </div>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                {visit.isDemo ? 'DEMO DATA' : 'LOCAL RECORD'}
              </span>
            </div>

            <div className="relative aspect-square max-h-[380px] w-full mx-auto rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-700">
              <img
                src={visit.imageUrl}
                alt={`${role} retinal image from ${visit.date}`}
                className="w-full h-full object-contain"
              />
              {showOverlay && (
                <svg
                  viewBox="0 0 100 100"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ opacity: opacity / 100 }}
                  aria-hidden="true"
                >
                  <defs>
                    {visit.heatmapRegions.map((reg, idx) => (
                      <radialGradient
                        key={`tm-${prefix}-${idx}`}
                        id={`tm-${prefix}-${idx}`}
                        cx="50%"
                        cy="50%"
                        r="50%"
                      >
                        <stop
                          offset="0%"
                          stopColor={reg.intensity > 0.78 ? '#ef4444' : reg.intensity > 0.5 ? '#f59e0b' : '#06b6d4'}
                          stopOpacity={Math.min(0.85, reg.intensity)}
                        />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity={reg.intensity * 0.35} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                      </radialGradient>
                    ))}
                  </defs>
                  {visit.heatmapRegions.map((reg, idx) => (
                    <circle
                      key={`tm-c-${prefix}-${idx}`}
                      cx={reg.x}
                      cy={reg.y}
                      r={reg.radius}
                      fill={`url(#tm-${prefix}-${idx})`}
                    />
                  ))}
                </svg>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-2.5">
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Risk Tier</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{visit.riskTier}</p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-2.5">
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Proliferation</p>
                <p className="font-semibold text-violet-700 dark:text-violet-400 mt-0.5">
                  Level {visit.proliferationLevel} / 4
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-2.5">
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Output Conc.</p>
                <p className="font-mono font-semibold text-cyan-700 dark:text-cyan-400 mt-0.5">
                  {visit.confidence}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-2.5">
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Uncertainty</p>
                <p className="font-semibold text-slate-900 dark:text-white mt-0.5">{visit.uncertainty}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {visit.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
