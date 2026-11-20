import React from 'react';
import {
  ArrowRight,
  Brain,
  ScanEye,
  Layers,
  Gauge,
  ShieldCheck,
  BookOpen,
  Scale,
  Play,
  CheckCircle2,
  Droplets,
  Eye,
} from 'lucide-react';
import type { AppPage, DemoCaseId } from '../types/retina';

interface LandingPageProps {
  onNavigate: (page: AppPage) => void;
  onRunDemoCase: (demoId: DemoCaseId) => void;
  onAcknowledgeAndEnter: () => void;
}

const TOP_FEATURES = [
  {
    icon: Brain,
    title: '01. Explainable Retinal AI',
    description:
      'Analyzes retinal fundus images for diabetic retinopathy patterns with transparent visual overlays instead of black-box scores.',
  },
  {
    icon: Gauge,
    title: '02. Proliferation Grading (Level 1–4)',
    description:
      'Grades retinal vascular proliferation from Level 1 (Baseline) to Level 4 (Proliferative) using intuitive percentage bars.',
  },
  {
    icon: Droplets,
    title: '03. Retinal Sugar & BP Biomarkers',
    description:
      'Estimates educational blood sugar and blood pressure stress patterns from retinal capillary and vessel ratio cues (non-clinical simulation).',
  },
  {
    icon: Eye,
    title: '04. Inside & Outside Symptom Guide',
    description:
      'Separates internal retinal pathology from external symptoms like blurry vision, floaters, or eye pain, paired with the IRIDEON Doubt Clarifier.',
  },
];

const FEATURE_CARDS = [
  {
    icon: Brain,
    title: 'AI Prediction',
    description:
      'Structured severity estimation across the 5-grade diabetic retinopathy educational spectrum with explicit non-diagnostic framing.',
  },
  {
    icon: ScanEye,
    title: 'Visual Explanation',
    description:
      'Interactive Grad-CAM-style heatmaps, attention overlays, Sobel structural vessel views, and before/after comparison sliders.',
  },
  {
    icon: Layers,
    title: 'Feature Detection',
    description:
      'Decomposes retinal findings into microaneurysms, hemorrhages, hard exudates, cotton-wool spots, and vascular landmarks.',
  },
  {
    icon: Gauge,
    title: 'Confidence & Uncertainty',
    description:
      'Separates model confidence from uncertainty factors such as image quality, feature ambiguity, and dataset shift.',
  },
];

const WHY_XAI_CARDS = [
  {
    icon: ShieldCheck,
    title: 'Trust',
    description:
      'Clinicians and researchers cannot rely on opaque probability scores. Inspectable spatial evidence reveals whether IRIDEON focused on real retinal structures or imaging artifacts.',
  },
  {
    icon: BookOpen,
    title: 'Understanding',
    description:
      'Connecting pixel attributions back to recognizable ophthalmic landmarks helps students and ML engineers learn how automated screening models reason.',
  },
  {
    icon: Scale,
    title: 'Accountability',
    description:
      'Explicit uncertainty indicators, image quality gates, and reproducible case reports document model limitations before any human interpretation.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onRunDemoCase,
  onAcknowledgeAndEnter,
}) => {
  return (
    <div className="space-y-16 pb-8">
      {/* TOP FEATURES BRIEFING — Read Before Entering the Analysis Process */}
      <section className="border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-[#0A101E]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                Step 1 · Read IRIDEON Capabilities Before Scanning
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                Core Features of IRIDEON
              </h2>
            </div>
            <button
              type="button"
              onClick={onAcknowledgeAndEnter}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap self-start lg:self-center"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              <span>I Have Read the Features — Enter Process</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TOP_FEATURES.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-4 space-y-2"
                >
                  <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                      {feat.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#070B14]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-mono tracking-wide text-cyan-700 dark:text-cyan-400">
                IRIDEON · Explainable AI · Retinal Imaging · Research Tool
              </p>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-slate-900 dark:text-white leading-[1.08]">
                See What the AI Sees.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                IRIDEON is an explainable AI interface for understanding diabetic retinopathy predictions, proliferation levels (1–4), systemic vascular cues, and retinal symptoms from fundus images.
              </p>

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
                “Don’t just trust the prediction. Understand it.”
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('analyze')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 whitespace-nowrap"
                >
                  <span>Analyze a Retinal Image</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('learn')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 whitespace-nowrap"
                >
                  <span>Explore How XAI Works</span>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
                <span>6-Stage AI Reasoning Lens</span>
                <span aria-hidden="true">·</span>
                <span>Proliferation Grade 1–4</span>
                <span aria-hidden="true">·</span>
                <span>IRIDEON Doubt Clarifier</span>
              </div>
            </div>

            {/* Right Abstract Retinal Visualization */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#050912] p-5 sm:p-7 overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-4">
                  <span>IRIDEON OPTICAL XAI FIELD</span>
                  <span className="tabular-nums text-cyan-400">ROI 768×768 · SIMULATED</span>
                </div>

                <div className="relative aspect-square max-w-[440px] mx-auto rounded-full overflow-hidden border border-slate-800 bg-[#04070e]">
                  <div
                    className="animate-retina-scan pointer-events-none absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent z-20"
                    aria-hidden="true"
                  />

                  <svg
                    viewBox="0 0 400 400"
                    className="w-full h-full"
                    role="img"
                    aria-label="Abstract retinal fundus visualization showing optic disc, branching retinal vessels, and highlighted AI explanation regions"
                  >
                    <defs>
                      <radialGradient id="retinaBg" cx="54%" cy="50%" r="52%">
                        <stop offset="0%" stopColor="#3c1310" />
                        <stop offset="55%" stopColor="#1f0b0e" />
                        <stop offset="100%" stopColor="#070a12" />
                      </radialGradient>
                      <radialGradient id="opticDiscGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
                        <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="xaiRegionHot" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.55" />
                        <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="xaiRegionWarn" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.52" />
                        <stop offset="65%" stopColor="#ef4444" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    <circle cx="200" cy="200" r="196" fill="url(#retinaBg)" />
                    <circle cx="200" cy="200" r="165" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                    <circle cx="200" cy="200" r="105" fill="none" stroke="#1e293b" strokeWidth="1" />
                    <line x1="20" y1="200" x2="380" y2="200" stroke="#1e293b" strokeWidth="0.75" />
                    <line x1="200" y1="20" x2="200" y2="380" stroke="#1e293b" strokeWidth="0.75" />

                    <circle cx="176" cy="200" r="34" fill="#120608" opacity="0.65" />
                    <circle cx="176" cy="200" r="2.5" fill="#cbd5e1" opacity="0.5" />

                    <circle cx="294" cy="200" r="34" fill="url(#opticDiscGlow)" />
                    <circle cx="292" cy="200" r="18" fill="#fde68a" opacity="0.78" />

                    <g fill="none" strokeLinecap="round">
                      <path d="M 290 192 Q 238 110 120 142" stroke="#b91c1c" strokeWidth="3.2" opacity="0.82" />
                      <path d="M 235 142 Q 190 95 135 102" stroke="#dc2626" strokeWidth="2.1" opacity="0.75" />
                      <path d="M 185 132 Q 162 158 148 175" stroke="#ef4444" strokeWidth="1.4" opacity="0.7" />
                      <path d="M 290 208 Q 234 292 118 258" stroke="#b91c1c" strokeWidth="3.4" opacity="0.82" />
                      <path d="M 228 260 Q 182 302 128 292" stroke="#dc2626" strokeWidth="2.0" opacity="0.75" />
                      <path d="M 178 268 Q 158 240 145 224" stroke="#ef4444" strokeWidth="1.4" opacity="0.7" />
                      <path d="M 300 194 Q 332 140 356 112" stroke="#b91c1c" strokeWidth="2.4" opacity="0.7" />
                      <path d="M 300 208 Q 332 260 356 288" stroke="#b91c1c" strokeWidth="2.4" opacity="0.7" />
                    </g>

                    <circle cx="148" cy="152" r="46" fill="url(#xaiRegionWarn)" />
                    <circle cx="216" cy="228" r="38" fill="url(#xaiRegionHot)" />

                    <g stroke="#22d3ee" strokeWidth="1.2" fill="none">
                      <circle cx="148" cy="152" r="14" strokeDasharray="3 2" />
                      <circle cx="148" cy="152" r="2.5" fill="#f59e0b" stroke="none" />
                      <line x1="148" y1="133" x2="148" y2="140" />
                      <line x1="148" y1="164" x2="148" y2="171" />

                      <circle cx="216" cy="228" r="12" stroke="#a78bfa" />
                      <circle cx="216" cy="228" r="2.5" fill="#22d3ee" stroke="none" />
                    </g>

                    <text x="86" y="130" fill="#e2e8f0" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                      ROI-01 · Lesion-like cluster
                    </text>
                    <text x="195" y="255" fill="#94a3b8" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                      ROI-02 · Parafoveal saliency
                    </text>
                    <text x="266" y="246" fill="#fde68a" fontSize="9" fontFamily="JetBrains Mono, monospace">
                      Optic Disc
                    </text>
                  </svg>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                  <span>Illustration · Synthetic Retinal Topology</span>
                  <span className="text-cyan-400">IRIDEON Overlay Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rapid Judge / Reviewer Scannable Strip: UPLOAD -> ANALYZE -> EXPLAIN -> REVIEW & WHAT MAKES IRIDEON DIFFERENT? */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* 4-Step End-to-End Screening Workflow */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                End-to-End Screening Pipeline
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                Upload → Analyze → Explain → Review
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                Every retinal image passes through quality validation, prototype inference, spatial attention mapping, and human-in-the-loop verification.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {[
                { step: '01', title: 'Upload', desc: 'JPG/PNG fundus or demo case + 3-tier pixel quality gate' },
                { step: '02', title: 'Analyze', desc: 'Prototype 5-class severity & uncalibrated confidence check' },
                { step: '03', title: 'Explain', desc: '4-panel XAI grid, sobel vessel contrast & overlay slider' },
                { step: '04', title: 'Review', desc: 'Agree / review / disagree sign-off & JSON/PDF report' },
              ].map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-3.5"
                >
                  <p className="text-[11px] font-mono text-cyan-700 dark:text-cyan-400">
                    {item.step} · {item.title.toUpperCase()}
                  </p>
                  <p className="font-display text-sm font-semibold text-slate-900 dark:text-white mt-1">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Truthful 6-Point Checklist */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6">
            <p className="text-xs font-mono text-violet-700 dark:text-violet-400">
              Prototype Capabilities Summary
            </p>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1 mb-4">
              What Makes IRIDEON Different?
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {[
                'Explainable prediction — structured “Why This Result?” reasoning breakdown',
                'Image-quality validation — rejects blurry, dark, or non-retinal images',
                'Confidence-aware results — explicit uncertainty alerts on low confidence',
                'Visual model evidence — 4-panel grid & downloadable PNG heatmap overlay',
                'Human-in-the-loop review — specialist agree / needs review / disagree workflow',
                'Structured screening report — printable PDF & JSON export with disclaimer',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <CheckCircle2
                    className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Four Core Feature Cards */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Designed for Transparency at Every Layer
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Move beyond single-number scores with structured feature decomposition, interactive spatial overlays, and calibrated uncertainty reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 transition-colors hover:border-cyan-500/50"
              >
                <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/70 dark:border-cyan-900/60 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-cyan-700 dark:text-cyan-400" aria-hidden="true" />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* From Prediction -> Explanation */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-10">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-mono text-violet-700 dark:text-violet-400 mb-1">
              Paradigm Comparison
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              From Prediction → Explanation
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-6">
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-3">
                Traditional Black-Box AI
              </p>
              <div className="flex flex-wrap items-center gap-3 font-mono text-sm">
                <span className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  Image
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                  Opaque Hidden Layers
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  Prediction
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-4">
                Outputs a grade without revealing whether quality artifacts, optic disc glare, or true microvascular features influenced the score.
              </p>
            </div>

            <div className="rounded-xl border border-cyan-200 dark:border-cyan-900/60 bg-cyan-50/40 dark:bg-cyan-950/20 p-6">
              <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400 mb-3">
                IRIDEON Reasoning Architecture
              </p>
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs sm:text-sm">
                {['Image', 'Features', 'Evidence', 'Explanation', 'Prediction'].map((step, i, arr) => (
                  <React.Fragment key={step}>
                    <span className="px-2.5 py-1.5 rounded-md border border-cyan-200 dark:border-cyan-800/70 bg-white dark:bg-[#0D1322] text-slate-900 dark:text-cyan-100 font-medium">
                      {step}
                    </span>
                    {i < arr.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-4">
                Links image quality checks, spatial heatmaps, clickable evidence trails, and uncertainty factors directly to the final educational summary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Explainability Matters */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Why Explainability Matters
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            High-stakes medical imaging research requires verifiable reasoning rather than blind confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {WHY_XAI_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6"
              >
                <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400 mb-3" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Synthetic Demo Mode Quick-Launch */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-mono text-amber-700 dark:text-amber-400 mb-1">
                DEMO / EDUCATIONAL DATA
              </p>
              <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Explore Synthetic Reference Cases
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analyze')}
              className="text-sm font-medium text-cyan-700 dark:text-cyan-400 hover:underline whitespace-nowrap"
            >
              Or upload your own fundus image →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                id: 'demo-a' as DemoCaseId,
                label: 'Demo Case A',
                grade: 'No apparent DR · Level 1',
                desc: 'Uniform vascular arcades, crisp optic disc, and clean macula reference.',
              },
              {
                id: 'demo-b' as DemoCaseId,
                label: 'Demo Case B',
                grade: 'Mild/Moderate pattern · Level 2',
                desc: 'Synthetic punctate red dots, bright parafoveal specks, and focal blot region.',
              },
              {
                id: 'demo-c' as DemoCaseId,
                label: 'Demo Case C',
                grade: 'Advanced DR-like pattern · Level 3',
                desc: 'Multi-quadrant blot patterns, exudate ring, cotton-wool patch, and tortuous veins.',
              },
            ].map((demo) => (
              <div
                key={demo.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span>{demo.label}</span>
                    <span>Synthetic</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-slate-900 dark:text-white mt-2">
                    {demo.grade}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5">
                    {demo.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRunDemoCase(demo.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-cyan-500 text-slate-900 dark:text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
                  <span>Load in IRIDEON Lens</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
