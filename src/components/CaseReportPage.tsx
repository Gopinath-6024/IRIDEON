import React, { useState } from 'react';
import { Printer, Download, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { AppPage, RetinaAnalysisResult } from '../types/retina';

interface CaseReportPageProps {
  analysis: RetinaAnalysisResult | null;
  imageUrl: string | null;
  onNavigate: (page: AppPage) => void;
}

export const CaseReportPage: React.FC<CaseReportPageProps> = ({
  analysis,
  imageUrl,
  onNavigate,
}) => {
  const [researcherNotes, setResearcherNotes] = useState('');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  if (!analysis) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Educational Case Report Generator
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          Run an analysis or load a synthetic demo case first to preview and export a structured research report.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('analyze')}
          className="px-5 py-2.5 rounded-lg bg-cyan-700 text-white text-sm font-semibold hover:bg-cyan-800 transition-colors"
        >
          Open Analysis Dashboard
        </button>
      </div>
    );
  }

  const handlePrintPdf = () => {
    window.print();
    setExportStatus('Print / Save as PDF dialog opened.');
  };

  const handleDownloadJson = async () => {
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, researcherNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Report generation failed');

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.reportId}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setExportStatus(`Exported ${data.reportId}.json`);
    } catch {
      setExportStatus('Could not export JSON report right now.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
            Structured XAI Documentation
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            Case Report Preview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 hover:border-cyan-500 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON</span>
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Export Report (PDF)</span>
          </button>
        </div>
      </div>

      {exportStatus && (
        <div className="no-print rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportStatus}</span>
        </div>
      )}

      {/* Optional Research Notes Input (no PII) */}
      <div className="no-print rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-2">
        <label
          htmlFor="researcher-notes"
          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
        >
          Optional Educational / Research Notes (Do NOT enter patient names, DOB, or identifiers)
        </label>
        <textarea
          id="researcher-notes"
          rows={2}
          value={researcherNotes}
          onChange={(e) => setResearcherNotes(e.target.value)}
          placeholder="Add observations on heatmap alignment, quality metrics, or teaching points..."
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      </div>

      {/* PDF-Style Document Sheet */}
      <article className="print-container rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-10 space-y-8 shadow-sm">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <p className="font-mono text-xs text-cyan-700 dark:text-cyan-400">
              IRIDEON · EXPLAINABLE RETINAL AI RESEARCH REPORT
            </p>
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
              Case {analysis.caseId}
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
              Analysis Date: {new Date(analysis.analyzedAt).toLocaleString()}
            </p>
          </div>
          <div className="text-left sm:text-right text-xs font-mono text-slate-500 dark:text-slate-400 space-y-1">
            <p>{analysis.modelMetadata.modelName}</p>
            <p>
              {analysis.sourceType === 'demo'
                ? 'DEMO / EDUCATIONAL DATA'
                : 'Session Uploaded Image'}
            </p>
          </div>
        </div>

        {/* Safety Disclaimer Box */}
        <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-xs sm:text-sm text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Non-Diagnostic Research Notice</p>
            <p className="mt-0.5">{analysis.modelMetadata.disclaimer}</p>
          </div>
        </div>

        {/* Core Output Grid + Thumbnail */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
          {imageUrl && (
            <div className="sm:col-span-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-black aspect-square overflow-hidden">
                <img
                  src={imageUrl}
                  alt="Case fundus reference thumbnail"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          <div className={imageUrl ? 'sm:col-span-8' : 'sm:col-span-12'}>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">AI Prediction</p>
                <p className="font-display text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {analysis.prediction}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Proliferation Grade</p>
                <p className="font-mono text-lg font-bold text-violet-700 dark:text-violet-400 mt-0.5">
                  Level {analysis.proliferationGrading.level} / 4 ({analysis.proliferationGrading.overallPercent}%)
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Confidence</p>
                <p className="font-mono text-lg font-bold tabular-nums text-cyan-700 dark:text-cyan-400 mt-0.5">
                  {analysis.confidence}%
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-3.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">Uncertainty & Quality</p>
                <p className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 mt-1">
                  {analysis.uncertainty} · {analysis.imageQuality.overall}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Systemic Estimates & Symptoms Summary */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Estimated Retinal Blood Sugar Pattern (Educational)
            </p>
            <p className="font-mono text-base font-bold text-slate-900 dark:text-white">
              {analysis.systemicEstimates.bloodSugar.estimatedRangeMgDl}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {analysis.systemicEstimates.bloodSugar.educationalNote}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-1">
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Estimated Retinal BP Pattern (Educational)
            </p>
            <p className="font-mono text-base font-bold text-slate-900 dark:text-white">
              {analysis.systemicEstimates.bloodPressure.estimatedRangeMmHg}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {analysis.systemicEstimates.bloodPressure.educationalNote}
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Inside Retina Signs
            </h3>
            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {analysis.symptoms.insideRetina.map((s) => (
                <li key={s.title}>
                  <span className="font-semibold">{s.title}:</span> {s.detail}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Outside / Person Symptoms & Eye Pain
            </h3>
            <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1">
              {analysis.symptoms.outsidePerson.map((s) => (
                <li key={s.title}>
                  <span className="font-semibold">{s.title}:</span> {s.detail}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Detected Features */}
        <section className="space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Detected Retinal Features
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 pr-4 font-medium">Feature</th>
                  <th className="py-2 pr-4 font-medium">Detected</th>
                  <th className="py-2 pr-4 font-medium">Importance</th>
                  <th className="py-2 font-medium">Approximate Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {analysis.detectedFeatures.map((feat) => (
                  <tr key={feat.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">
                      {feat.name}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">
                      {feat.detected ? 'Yes' : 'No'}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">{feat.importance}</td>
                    <td className="py-2.5 text-slate-600 dark:text-slate-300">
                      {feat.approximateLocation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Contributing Regions */}
        <section className="space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Top Contributing Regions (Evidence Trail)
          </h3>
          <div className="space-y-2">
            {analysis.evidenceTrail.map((ev) => (
              <div
                key={ev.id}
                className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs sm:text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 font-medium text-slate-900 dark:text-white">
                  <span>
                    #{ev.step} · {ev.feature} ({ev.region})
                  </span>
                  <span className="font-mono text-xs text-cyan-700 dark:text-cyan-400">
                    {ev.contribution} contribution
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{ev.rationale}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Explanation & Limitations */}
        <section className="space-y-3">
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Explanation Summary
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {analysis.explanation.summary}
          </p>

          {researcherNotes.trim() && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5 text-sm">
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">
                Researcher Notes
              </p>
              <p className="text-slate-800 dark:text-slate-200">{researcherNotes}</p>
            </div>
          )}

          <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white pt-2">
            Limitations
          </h4>
          <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {analysis.explanation.limitations.map((l, idx) => (
              <li key={idx}>{l}</li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
};
