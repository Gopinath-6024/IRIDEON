import React, { useEffect, useMemo, useState } from 'react';
import {
  Send,
  Building2,
  ShieldAlert,
  CheckCircle2,
  ClipboardList,
  Plus,
} from 'lucide-react';
import { deriveDefaultReferralReason } from '../utils/localRecordsStore';
import type {
  LocalScreeningRecord,
  ReferralPriority,
  ReferralRecord,
  ReferralStatus,
} from '../types/retina';

interface SmartReferralPageProps {
  records: LocalScreeningRecord[];
  referrals: ReferralRecord[];
  draftRecord: LocalScreeningRecord | null;
  onCreateReferral: (referral: ReferralRecord) => void;
  onUpdateReferral: (
    referralId: string,
    updates: Partial<Pick<ReferralRecord, 'referralStatus' | 'followUpStatus' | 'notes'>>
  ) => void;
}

const REFERRAL_STATUSES: ReferralStatus[] = [
  'Pending',
  'Referred',
  'Under Review',
  'Follow-up Required',
  'Completed',
];

const PRIORITIES: ReferralPriority[] = ['Routine', 'Urgent', 'Priority Specialist'];

const FACILITY_PRESETS = [
  'Prototype District Eye Care Center (Demo Facility)',
  'Community Retina Outreach Clinic (Demo Facility)',
  'Regional Tertiary Ophthalmology Unit (Demo Facility)',
];

const SPECIALIST_PRESETS = [
  'Dr. M. Deshmukh — Vitreoretinal Clinic (Demo)',
  'Dr. S. Kulkarni — General Ophthalmology (Demo)',
  'Ophthalmology Triage Desk (Demo)',
];

export const SmartReferralPage: React.FC<SmartReferralPageProps> = ({
  records,
  referrals,
  draftRecord,
  onCreateReferral,
  onUpdateReferral,
}) => {
  const defaultSource = draftRecord || records[0] || null;

  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    defaultSource?.recordId ?? ''
  );
  const [patientDemoId, setPatientDemoId] = useState<string>(
    defaultSource?.patientDemoId ?? 'DEMO-PT-NEW'
  );
  const [screeningDate, setScreeningDate] = useState<string>(
    defaultSource ? defaultSource.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [screeningResult, setScreeningResult] = useState<string>(
    defaultSource
      ? `${defaultSource.analysis.prediction} (Level ${defaultSource.analysis.proliferationGrading.level}/4 · ${defaultSource.analysis.reliabilityLabel})`
      : 'Moderate (Prototype Screening)'
  );
  const [referralReason, setReferralReason] = useState<string>(
    defaultSource
      ? defaultSource.doctorReview.referralReason || deriveDefaultReferralReason(defaultSource.analysis)
      : 'Moderate/high-uncertainty screening pattern requiring ophthalmologist exam.'
  );
  const [priority, setPriority] = useState<ReferralPriority>(
    defaultSource?.riskTier === 'High Risk' ||
      defaultSource?.riskTier === 'Uncertain / Review Required'
      ? 'Priority Specialist'
      : 'Routine'
  );
  const [healthcareFacility, setHealthcareFacility] = useState<string>(FACILITY_PRESETS[0]);
  const [specialist, setSpecialist] = useState<string>(SPECIALIST_PRESETS[0]);
  const [referralDate, setReferralDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>('Pending');
  const [followUpStatus, setFollowUpStatus] = useState<string>(
    'Awaiting specialist scheduling confirmation (Prototype)'
  );
  const [notes, setNotes] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'All' | ReferralStatus>('All');
  const [createdBanner, setCreatedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!draftRecord) return;
    setSelectedRecordId(draftRecord.recordId);
    setPatientDemoId(draftRecord.patientDemoId);
    setScreeningDate(draftRecord.createdAt.slice(0, 10));
    setScreeningResult(
      `${draftRecord.analysis.prediction} (Level ${draftRecord.analysis.proliferationGrading.level}/4 · ${draftRecord.analysis.reliabilityLabel})`
    );
    setReferralReason(
      draftRecord.doctorReview.referralReason || deriveDefaultReferralReason(draftRecord.analysis)
    );
    setPriority(
      draftRecord.riskTier === 'High Risk' ||
        draftRecord.riskTier === 'Uncertain / Review Required'
        ? 'Priority Specialist'
        : 'Routine'
    );
    setReferralStatus('Referred');
  }, [draftRecord]);

  const handleSourceRecordChange = (recordId: string) => {
    setSelectedRecordId(recordId);
    const rec = records.find((r) => r.recordId === recordId);
    if (!rec) return;
    setPatientDemoId(rec.patientDemoId);
    setScreeningDate(rec.createdAt.slice(0, 10));
    setScreeningResult(
      `${rec.analysis.prediction} (Level ${rec.analysis.proliferationGrading.level}/4 · ${rec.analysis.reliabilityLabel})`
    );
    setReferralReason(rec.doctorReview.referralReason || deriveDefaultReferralReason(rec.analysis));
    setPriority(
      rec.riskTier === 'High Risk' || rec.riskTier === 'Uncertain / Review Required'
        ? 'Priority Specialist'
        : 'Routine'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReferral: ReferralRecord = {
      referralId: `REF-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      recordId: selectedRecordId || 'MANUAL-ENTRY',
      patientDemoId: patientDemoId.trim() || 'DEMO-PT',
      screeningDate,
      screeningResult: screeningResult.trim(),
      referralReason: referralReason.trim(),
      priority,
      healthcareFacility: healthcareFacility.trim(),
      specialist: specialist.trim(),
      referralDate,
      referralStatus,
      followUpStatus: followUpStatus.trim() || 'Awaiting confirmation',
      notes: notes.trim(),
      isDemoRecord: true,
      syncStatus: navigator.onLine ? 'synced' : 'pending_sync',
    };
    onCreateReferral(newReferral);
    setCreatedBanner(
      `Referral ${newReferral.referralId} created for ${newReferral.patientDemoId} (${newReferral.referralStatus}).`
    );
    setNotes('');
  };

  const visibleReferrals = useMemo(() => {
    if (filterStatus === 'All') return referrals;
    return referrals.filter((r) => r.referralStatus === filterStatus);
  }, [referrals, filterStatus]);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            IRIDEON Smart Referral · Prototype Care-Pathway Tracking
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Smart Referral & Follow-up Workflow
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
            Convert referable or uncertain screening findings into structured professional review referrals and track follow-up status locally.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Total Referrals: </span>
            <span className="font-bold text-slate-900 dark:text-white">{referrals.length}</span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Open Follow-ups: </span>
            <span className="font-bold text-amber-700 dark:text-amber-400">
              {referrals.filter((r) => r.referralStatus !== 'Completed').length}
            </span>
          </div>
        </div>
      </div>

      {/* Prototype Boundary Notice */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
        <span>
          <strong>Prototype Referral Simulation:</strong> This module demonstrates structured referral documentation and status tracking only. It does not transmit orders to real hospitals, prescribe treatment, or establish a clinical diagnosis.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Create Referral Form (All 11 Required Fields) */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4"
        >
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Create Referral</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              11-Field Structured Record
            </span>
          </div>

          {createdBanner && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{createdBanner}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label htmlFor="ref-source" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Link Screening Record
              </label>
              <select
                id="ref-source"
                value={selectedRecordId}
                onChange={(e) => handleSourceRecordChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
              >
                {records.map((rec) => (
                  <option key={rec.recordId} value={rec.recordId}>
                    {rec.patientDemoId} — {rec.analysis.prediction} ({rec.recordId})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ref-ptid" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  1. Patient / Demo ID
                </label>
                <input
                  id="ref-ptid"
                  type="text"
                  value={patientDemoId}
                  onChange={(e) => setPatientDemoId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="ref-sdate" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  2. Screening Date
                </label>
                <input
                  id="ref-sdate"
                  type="date"
                  value={screeningDate}
                  onChange={(e) => setScreeningDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ref-result" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                3. Screening Result
              </label>
              <input
                id="ref-result"
                type="text"
                value={screeningResult}
                onChange={(e) => setScreeningResult(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="ref-reason" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                4. Referral Reason
              </label>
              <input
                id="ref-reason"
                type="text"
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ref-priority" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  5. Priority
                </label>
                <select
                  id="ref-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ReferralPriority)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ref-rdate" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  8. Referral Date
                </label>
                <input
                  id="ref-rdate"
                  type="date"
                  value={referralDate}
                  onChange={(e) => setReferralDate(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ref-facility" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                6. Healthcare Facility (Demo Directory)
              </label>
              <select
                id="ref-facility"
                value={healthcareFacility}
                onChange={(e) => setHealthcareFacility(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
              >
                {FACILITY_PRESETS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ref-specialist" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                7. Specialist (Demo Directory)
              </label>
              <select
                id="ref-specialist"
                value={specialist}
                onChange={(e) => setSpecialist(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
              >
                {SPECIALIST_PRESETS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ref-status" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  9. Referral Status
                </label>
                <select
                  id="ref-status"
                  value={referralStatus}
                  onChange={(e) => setReferralStatus(e.target.value as ReferralStatus)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
                >
                  {REFERRAL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ref-followup" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  10. Follow-up Status
                </label>
                <input
                  id="ref-followup"
                  type="text"
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ref-notes" className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                11. Notes
              </label>
              <textarea
                id="ref-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional coordination notes (do not include real patient PII)..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Refer for Professional Review</span>
            </button>
          </div>
        </form>

        {/* RIGHT: Referral Tracking List */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Active Referral Tracker ({visibleReferrals.length})</span>
            </h2>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'All' | ReferralStatus)}
              aria-label="Filter referrals by status"
              className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
            >
              <option value="All">All Statuses</option>
              {REFERRAL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {visibleReferrals.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-8 text-center">
                No referrals match the selected filter.
              </p>
            ) : (
              visibleReferrals.map((ref) => (
                <div
                  key={ref.referralId}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">{ref.referralId}</span>
                      <span> · {ref.patientDemoId} · Screened {ref.screeningDate}</span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        ref.priority === 'Priority Specialist'
                          ? 'text-red-700 dark:text-red-400'
                          : ref.priority === 'Urgent'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-cyan-700 dark:text-cyan-400'
                      }`}
                    >
                      {ref.priority} Priority
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Result: {ref.screeningResult}
                    </p>
                    <p className="text-slate-700 dark:text-slate-300">
                      Reason: {ref.referralReason}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {ref.healthcareFacility} · {ref.specialist} (Referred {ref.referralDate})
                      </span>
                    </p>
                    {ref.notes && (
                      <p className="text-slate-500 dark:text-slate-400 italic">
                        Notes: {ref.notes}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                        Update Referral Status
                      </label>
                      <select
                        value={ref.referralStatus}
                        onChange={(e) =>
                          onUpdateReferral(ref.referralId, {
                            referralStatus: e.target.value as ReferralStatus,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white"
                      >
                        {REFERRAL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1">
                        Follow-up Status
                      </label>
                      <input
                        type="text"
                        value={ref.followUpStatus}
                        onChange={(e) =>
                          onUpdateReferral(ref.referralId, {
                            followUpStatus: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
