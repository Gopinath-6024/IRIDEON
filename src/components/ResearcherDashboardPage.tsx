import React from 'react';
import {
  UserCheck,
  LogIn,
  Play,
  Upload,
  FileText,
  ArrowRight,
  Layers,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react';
import type {
  AppPage,
  DemoCaseId,
  LocalScreeningRecord,
  ResearcherSession,
  RetinaAnalysisResult,
} from '../types/retina';

interface SessionCaseEntry {
  analysis: RetinaAnalysisResult;
  imageUrl: string;
}

interface ResearcherDashboardPageProps {
  session: ResearcherSession | null;
  onOpenAuth: () => void;
  sessionHistory: SessionCaseEntry[];
  localRecords?: LocalScreeningRecord[];
  activeCaseId: string | null;
  onSelectHistoryCase: (entry: SessionCaseEntry) => void;
  onDeleteHistoryCase?: (caseId: string) => void;
  onRunDemo: (demoId: DemoCaseId) => void;
  onNavigate: (page: AppPage) => void;
}

export const ResearcherDashboardPage: React.FC<ResearcherDashboardPageProps> = ({
  session,
  onOpenAuth,
  sessionHistory,
  localRecords = [],
  activeCaseId,
  onSelectHistoryCase,
  onDeleteHistoryCase,
  onRunDemo,
  onNavigate,
}) => {
  const avgConfidence =
    sessionHistory.length > 0
      ? Math.round(
          sessionHistory.reduce((acc, c) => acc + c.analysis.confidence, 0) /
            sessionHistory.length
        )
      : null;

  const reviewedCount = localRecords.filter(
    (r) => r.doctorReview.clinicianDecision || r.doctorReview.reviewStatus !== 'Pending Review'
  ).length;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            IRIDEON Workspace Overview
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Researcher Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('analyze')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Analyze Fundus Image</span>
          </button>

          {!session && (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-medium hover:border-cyan-500 transition-colors whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In as Researcher</span>
            </button>
          )}
        </div>
      </div>

      {/* Researcher Session Status Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {session ? (
          <>
            <div className="flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-display font-semibold text-slate-900 dark:text-white">
                  {session.displayName}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {session.role} · {session.institution} · ID: {session.researcherId}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline whitespace-nowrap self-start sm:self-center"
            >
              Manage Session
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="font-display font-semibold text-slate-900 dark:text-white">
                Guest Educational Session
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Sign in with an ephemeral researcher profile to tag session exports and review lab role metadata. No clinical data is persisted remotely.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-cyan-600 text-white text-xs font-semibold whitespace-nowrap self-start sm:self-center"
            >
              Researcher Sign In
            </button>
          </>
        )}
      </div>

      {/* Session KPI Strip (strictly derived from real current-session runs & local records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Session Analyses Run
          </p>
          <p className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white mt-1.5">
            {sessionHistory.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Active cases held in browser session memory
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Mean Confidence Estimate
          </p>
          <p className="font-mono text-3xl font-bold tabular-nums text-cyan-700 dark:text-cyan-400 mt-1.5">
            {avgConfidence !== null ? `${avgConfidence}%` : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Uncalibrated prototype score (not diagnostic accuracy)
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Clinician Reviews Logged
          </p>
          <p className="font-mono text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 mt-1.5">
            {reviewedCount}
            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
              /{localRecords.length}
            </span>
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Human-in-the-loop sign-offs saved locally
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5">
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Active Model Adapter
          </p>
          <p className="font-display text-base font-bold text-slate-900 dark:text-white mt-2">
            IRIDEON Prototype / Demonstration Model
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Modular interface ready for external ML endpoint
          </p>
        </div>
      </div>

      {/* Session Case Log */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Current Session Case Log
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            Inspect, compare, export, or remove session runs
          </span>
        </div>

        {sessionHistory.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No analyses have been run in this session yet. Launch a synthetic demo case or upload a retinal fundus image to inspect explanations.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {(['demo-a', 'demo-b', 'demo-c'] as DemoCaseId[]).map((id, i) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onRunDemo(id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] hover:border-cyan-500 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Run Demo Case {['A', 'B', 'C'][i]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-[#090E1A]">
                  <th className="py-3 px-4 font-medium">Case ID</th>
                  <th className="py-3 px-4 font-medium">Source</th>
                  <th className="py-3 px-4 font-medium">Estimated Output</th>
                  <th className="py-3 px-4 font-medium text-right">Confidence</th>
                  <th className="py-3 px-4 font-medium">Uncertainty</th>
                  <th className="py-3 px-4 font-medium">Quality</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sessionHistory.map((entry) => {
                  const isActive = entry.analysis.caseId === activeCaseId;
                  return (
                    <tr
                      key={entry.analysis.caseId}
                      className={
                        isActive
                          ? 'bg-cyan-50/50 dark:bg-cyan-950/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                      }
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {entry.analysis.caseId}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {entry.analysis.sourceType === 'demo'
                          ? 'DEMO / EDUCATIONAL'
                          : 'Uploaded Image'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {entry.analysis.prediction}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-cyan-700 dark:text-cyan-400">
                        {entry.analysis.confidence}%
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {entry.analysis.uncertainty}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {entry.analysis.imageQuality.qualityBadgeText ?? entry.analysis.imageQuality.overall}
                      </td>
                      <td className="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectHistoryCase(entry);
                            onNavigate('explainability');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-400 hover:underline"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectHistoryCase(entry);
                            onNavigate('comparison');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-400 hover:underline"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>Compare</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectHistoryCase(entry);
                            onNavigate('reports');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Report</span>
                        </button>
                        {onDeleteHistoryCase && (
                          <button
                            type="button"
                            onClick={() => onDeleteHistoryCase(entry.analysis.caseId)}
                            aria-label={`Delete case ${entry.analysis.caseId}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
