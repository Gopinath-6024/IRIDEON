import React, { useMemo, useState } from 'react';
import {
  Stethoscope,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle2,
  Send,
  History,
  FileCheck2,
  ShieldAlert,
} from 'lucide-react';
import type {
  DoctorReviewData,
  DoctorReviewStatus,
  LocalScreeningRecord,
} from '../types/retina';

interface DoctorReviewPageProps {
  records: LocalScreeningRecord[];
  initialRecordId?: string | null;
  onUpdateReview: (recordId: string, review: DoctorReviewData) => void;
  onCreateReferralFromRecord: (record: LocalScreeningRecord) => void;
}

const REVIEW_STATUSES: DoctorReviewStatus[] = [
  'Pending Review',
  'Under Review',
  'Reviewed',
  'Follow-up Required',
  'Referral Recommended',
  'Completed',
];

function statusTone(status: DoctorReviewStatus): string {
  switch (status) {
    case 'Pending Review':
      return 'text-amber-700 dark:text-amber-400';
    case 'Under Review':
      return 'text-cyan-700 dark:text-cyan-400';
    case 'Referral Recommended':
    case 'Follow-up Required':
      return 'text-red-700 dark:text-red-400';
    case 'Reviewed':
    case 'Completed':
      return 'text-emerald-700 dark:text-emerald-400';
  }
}

export const DoctorReviewPage: React.FC<DoctorReviewPageProps> = ({
  records,
  initialRecordId,
  onUpdateReview,
  onCreateReferralFromRecord,
}) => {
  const [filterStatus, setFilterStatus] = useState<'All' | DoctorReviewStatus>('All');
  const [selectedId, setSelectedId] = useState<string>(
    () => initialRecordId || records[0]?.recordId || ''
  );
  const [showHeatmapOverlay, setShowHeatmapOverlay] = useState(true);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    if (filterStatus === 'All') return records;
    return records.filter((r) => r.doctorReview.reviewStatus === filterStatus);
  }, [records, filterStatus]);

  const activeRecord = useMemo(() => {
    return (
      records.find((r) => r.recordId === selectedId) ||
      filteredRecords[0] ||
      records[0] ||
      null
    );
  }, [records, filteredRecords, selectedId]);

  const [draftStatus, setDraftStatus] = useState<DoctorReviewStatus>(
    activeRecord?.doctorReview.reviewStatus ?? 'Pending Review'
  );
  const [draftReviewer, setDraftReviewer] = useState<string>(
    activeRecord?.doctorReview.reviewerName || 'Dr. S. Kulkarni (Demo Ophthalmologist)'
  );
  const [draftReferralReason, setDraftReferralReason] = useState<string>(
    activeRecord?.doctorReview.referralReason ?? ''
  );
  const [draftDecision, setDraftDecision] = useState<string>(
    activeRecord?.doctorReview.followUpDecision ?? ''
  );
  const [draftNotes, setDraftNotes] = useState<string>(
    activeRecord?.doctorReview.reviewNotes ?? ''
  );

  const handleSelectRecord = (rec: LocalScreeningRecord) => {
    setSelectedId(rec.recordId);
    setDraftStatus(rec.doctorReview.reviewStatus);
    setDraftReviewer(
      rec.doctorReview.reviewerName || 'Dr. S. Kulkarni (Demo Ophthalmologist)'
    );
    setDraftReferralReason(rec.doctorReview.referralReason);
    setDraftDecision(rec.doctorReview.followUpDecision);
    setDraftNotes(rec.doctorReview.reviewNotes);
    setSaveBanner(null);
  };

  const patientHistory = useMemo(() => {
    if (!activeRecord) return [];
    return records
      .filter((r) => r.patientDemoId === activeRecord.patientDemoId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, activeRecord]);

  const counts = useMemo(() => {
    return {
      total: records.length,
      pending: records.filter(
        (r) =>
          r.doctorReview.reviewStatus === 'Pending Review' ||
          r.doctorReview.reviewStatus === 'Under Review'
      ).length,
      flagged: records.filter(
        (r) =>
          r.doctorReview.reviewStatus === 'Follow-up Required' ||
          r.doctorReview.reviewStatus === 'Referral Recommended'
      ).length,
      completed: records.filter(
        (r) =>
          r.doctorReview.reviewStatus === 'Completed' ||
          r.doctorReview.reviewStatus === 'Reviewed'
      ).length,
    };
  }, [records]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    const updated: DoctorReviewData = {
      reviewStatus: draftStatus,
      reviewerName: draftReviewer.trim() || 'Prototype Specialist Reviewer',
      referralReason: draftReferralReason.trim(),
      followUpDecision: draftDecision.trim() || 'Clinical follow-up per specialist judgment',
      reviewNotes: draftNotes.trim(),
      reviewedAt: new Date().toISOString(),
    };
    onUpdateReview(activeRecord.recordId, updated);
    setSaveBanner(`Saved prototype review (${draftStatus}) for ${activeRecord.recordId}.`);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            IRIDEON Specialist Connect · Prototype Review Workflow (No Real EHR)
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Doctor Review Dashboard
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Inspect screening images, Retina Map overlays, image quality, uncertainty flags, and previous history, then record review decisions or initiate referrals.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] px-3.5 py-2.5">
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Total Queue</p>
            <p className="font-mono text-lg font-bold tabular-nums text-slate-900 dark:text-white">
              {counts.total}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] px-3.5 py-2.5">
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Pending / Active</p>
            <p className="font-mono text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {counts.pending}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] px-3.5 py-2.5">
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Referral / Follow-up</p>
            <p className="font-mono text-lg font-bold tabular-nums text-red-700 dark:text-red-400">
              {counts.flagged}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] px-3.5 py-2.5">
            <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Reviewed</p>
            <p className="font-mono text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {counts.completed}
            </p>
          </div>
        </div>
      </div>

      {/* Prototype Transparency Notice */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <span>
          <strong>Prototype Workflow Only:</strong> Records are stored locally in browser storage and do not connect to a real hospital EHR or live licensed physician network. Screening support — not a standalone diagnosis.
        </span>
      </div>

      {/* Main Split: Case Queue + Specialist Review Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Case Queue */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Specialist Review Queue</span>
            </h2>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'All' | DoctorReviewStatus)}
              aria-label="Filter review queue by status"
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-slate-800 dark:text-slate-200 px-2.5 py-1.5"
            >
              <option value="All">All Statuses</option>
              {REVIEW_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {filteredRecords.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                No screening records match this status filter.
              </p>
            ) : (
              filteredRecords.map((rec) => {
                const selected = activeRecord?.recordId === rec.recordId;
                return (
                  <button
                    key={rec.recordId}
                    type="button"
                    onClick={() => handleSelectRecord(rec)}
                    className={`w-full text-left rounded-lg border p-3 flex items-start gap-3 transition-colors ${
                      selected
                        ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50/70 dark:bg-cyan-950/35'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] hover:border-cyan-500/60'
                    }`}
                  >
                    <img
                      src={rec.imageThumbnailUrl}
                      alt={`Thumbnail for ${rec.patientDemoId}`}
                      className="w-14 h-14 rounded-md object-cover bg-black border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {rec.patientDemoId}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                          {rec.isDemoRecord ? 'DEMO' : 'LOCAL'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {rec.analysis.prediction}
                        {rec.eyeLaterality ? ` · ${rec.eyeLaterality}` : ''} · {rec.riskTier}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className={statusTone(rec.doctorReview.reviewStatus)}>
                          {rec.doctorReview.reviewStatus}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {rec.syncStatus === 'synced' ? '✓ Synced' : '☁ Queued'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: 9-Field Inspection & Review Form */}
        <div className="lg:col-span-8 space-y-6">
          {!activeRecord ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Select a screening record from the queue or run a retinal scan in the Analysis Workspace.
            </div>
          ) : (
            <>
              {/* Inspection Summary + Visual Overlay Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Record {activeRecord.recordId} · Patient/Demo ID: {activeRecord.patientDemoId}
                      {activeRecord.eyeLaterality
                        ? ` · ${activeRecord.eyeLaterality === 'OD' ? 'Right Eye (OD)' : 'Left Eye (OS)'}`
                        : ''}{' '}
                      · {activeRecord.isDemoRecord ? 'Synthetic Demo Record' : 'Session Screening Record'}
                    </p>
                    <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      Case Inspection & Clinical Decision Support
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => onCreateReferralFromRecord(activeRecord)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Create Referral</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Field 1 & Field 4: Retinal Thumbnail + Retina Map Overlay Toggle */}
                  <div className="md:col-span-5 space-y-2.5">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-700">
                      <img
                        src={activeRecord.imageThumbnailUrl}
                        alt={`Retinal fundus for ${activeRecord.patientDemoId}`}
                        className="w-full h-full object-contain"
                      />
                      {showHeatmapOverlay && (
                        <svg
                          viewBox="0 0 100 100"
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          aria-hidden="true"
                        >
                          <defs>
                            {activeRecord.analysis.heatmapData.regions.map((reg, idx) => (
                              <radialGradient
                                key={`dr-hm-${idx}`}
                                id={`dr-hm-${idx}`}
                                cx="50%"
                                cy="50%"
                                r="50%"
                              >
                                <stop
                                  offset="0%"
                                  stopColor={reg.intensity > 0.75 ? '#ef4444' : '#f59e0b'}
                                  stopOpacity={Math.min(0.82, reg.intensity)}
                                />
                                <stop
                                  offset="60%"
                                  stopColor="#f59e0b"
                                  stopOpacity={reg.intensity * 0.35}
                                />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                              </radialGradient>
                            ))}
                          </defs>
                          {activeRecord.analysis.heatmapData.regions.map((reg, idx) => (
                            <circle
                              key={`dr-c-${idx}`}
                              cx={reg.x}
                              cy={reg.y}
                              r={reg.radius}
                              fill={`url(#dr-hm-${idx})`}
                            />
                          ))}
                        </svg>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setShowHeatmapOverlay((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500 transition-colors"
                      >
                        {showHeatmapOverlay ? (
                          <>
                            <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                            <span>Retina Map Overlay: On</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                            <span>Retina Map Overlay: Off</span>
                          </>
                        )}
                      </button>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {new Date(activeRecord.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Fields 2, 3, 5, 6, 8, 9 */}
                  <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3">
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        AI Screening Result
                      </p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {activeRecord.analysis.prediction}
                      </p>
                      <p className="font-mono text-[11px] text-cyan-700 dark:text-cyan-400 mt-0.5">
                        Level {activeRecord.analysis.proliferationGrading.level}/4 · Confidence{' '}
                        {activeRecord.analysis.confidence}%
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3">
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Risk Tier
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${
                          activeRecord.riskTier === 'High Risk' ||
                          activeRecord.riskTier === 'Uncertain / Review Required'
                            ? 'text-red-700 dark:text-red-400'
                            : activeRecord.riskTier === 'Moderate Risk'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {activeRecord.riskTier}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {activeRecord.offlineCaptured ? 'Captured Offline' : 'Captured Online'}
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3">
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        Image Quality Result
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${
                          activeRecord.analysis.imageQuality.suitable
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {activeRecord.analysis.imageQuality.suitabilityStatus} (
                        {activeRecord.analysis.imageQuality.overall})
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Sharpness {activeRecord.analysis.imageQuality.sharpness.score}% · Contrast{' '}
                        {activeRecord.analysis.imageQuality.contrast.score}%
                      </p>
                    </div>

                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3">
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        AI Uncertainty / Reliability Status
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${
                          activeRecord.analysis.reliabilityStatus === 'reliable_screening'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : activeRecord.analysis.reliabilityStatus === 'uncertain_result'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {activeRecord.analysis.reliabilityLabel}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Uncertainty: {activeRecord.analysis.uncertainty} · Entropy{' '}
                        {activeRecord.analysis.entropyScore}%
                      </p>
                    </div>

                    <div className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          Current Review Status & Referral Reason
                        </p>
                        <span className={`font-mono text-xs font-bold ${statusTone(activeRecord.doctorReview.reviewStatus)}`}>
                          {activeRecord.doctorReview.reviewStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 mt-1">
                        {activeRecord.doctorReview.referralReason || 'No referral reason noted yet.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Field 7: Previous Screening History for this Patient/Demo ID */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <h3 className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Previous Screening History ({activeRecord.patientDemoId})</span>
                  </h3>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A]">
                    {patientHistory.map((h) => (
                      <div
                        key={h.recordId}
                        className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-mono text-slate-600 dark:text-slate-300">
                          {new Date(h.createdAt).toLocaleString()} · {h.recordId}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {h.analysis.prediction} (Level {h.analysis.proliferationGrading.level}/4) ·{' '}
                          {h.doctorReview.reviewStatus}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Interactive Review Decision Form */}
              <form
                onSubmit={handleSave}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <span>Specialist Review Notes & Decision</span>
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Saved locally to prototype queue
                  </span>
                </div>

                {saveBanner && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-2.5 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{saveBanner}</span>
                  </div>
                )}

                {activeRecord.analysis.reliabilityStatus === 'professional_review_required' && (
                  <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/25 px-3.5 py-2.5 flex items-center gap-2 text-xs text-red-900 dark:text-red-200">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      AI flagged high uncertainty / reliability boundary. Manual specialist inspection is required before closing this case.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="dr-status"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Review Status
                    </label>
                    <select
                      id="dr-status"
                      value={draftStatus}
                      onChange={(e) => setDraftStatus(e.target.value as DoctorReviewStatus)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                    >
                      {REVIEW_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="dr-reviewer"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Reviewer Name (Prototype)
                    </label>
                    <input
                      id="dr-reviewer"
                      type="text"
                      value={draftReviewer}
                      onChange={(e) => setDraftReviewer(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="dr-reason"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Referral / Flag Reason
                    </label>
                    <input
                      id="dr-reason"
                      type="text"
                      value={draftReferralReason}
                      onChange={(e) => setDraftReferralReason(e.target.value)}
                      placeholder="Summarize imaging concern or quality limitation..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="dr-decision"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Follow-up Decision
                    </label>
                    <input
                      id="dr-decision"
                      type="text"
                      value={draftDecision}
                      onChange={(e) => setDraftDecision(e.target.value)}
                      placeholder="e.g., Dilated fundus exam within 4 weeks / Repeat screening in 6 months"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      htmlFor="dr-notes"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Reviewer Clinical-Style Notes (Educational Prototype)
                    </label>
                    <textarea
                      id="dr-notes"
                      rows={3}
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Enter observations on Retina Map regions, image artifacts, or referral urgency..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onCreateReferralFromRecord(activeRecord)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Refer for Professional Review</span>
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Review Decision</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
