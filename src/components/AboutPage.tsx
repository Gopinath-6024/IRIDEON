import React from 'react';
import { Server, Cpu, ShieldAlert } from 'lucide-react';

const MODEL_CARD_FIELDS = [
  {
    field: 'Model architecture',
    value:
      'Not specified in the current implementation (Modular inference adapter; prototype mode uses pixel-level contrast & green-channel heuristics until ML_BACKEND_URL connects an external CNN/ViT).',
  },
  {
    field: 'Framework',
    value:
      'Node.js + Express + TypeScript backend; React 19 + HTML5 Canvas client preprocessing (supports external FastAPI / PyTorch / TensorFlow services via ML_BACKEND_URL).',
  },
  {
    field: 'Input resolution',
    value:
      'Validated JPG/JPEG/PNG inputs from 128×128 to 8192×8192 px (max 10 MB); sampled at 192×192 px for quality checks and 24×24 spatial grid for saliency.',
  },
  {
    field: 'Number of classes',
    value:
      '5 DR educational classes (0: No apparent DR, 1: Mild, 2: Moderate, 3: Severe, 4: Proliferative); uploaded images in Prototype Mode map to 3 exploratory contrast tiers unless an external 5-class model is connected.',
  },
  {
    field: 'Training dataset',
    value:
      'Not specified in the current implementation — no pretrained clinical dataset weights or proprietary patient images are bundled.',
  },
  {
    field: 'Validation dataset',
    value:
      'Not specified in the current implementation — clinical accuracy, sensitivity, specificity, and ROC-AUC metrics remain unvalidated in this prototype.',
  },
  {
    field: 'XAI method',
    value:
      'On-device 24×24 green-channel gradient & contrast pixel saliency (Model Attention Regions) + Sobel vessel contrast map; accepts genuine CNN Grad-CAM heatmaps when ML_BACKEND_URL is configured.',
  },
  {
    field: 'Preprocessing',
    value:
      'Magic-byte & MIME signature validation, resolution gating, center-to-rim illumination ratio calculation, green-channel Sobel edge extraction, and circular ROI masking.',
  },
  {
    field: 'Limitations',
    value:
      'Prototype outputs, Model confidence estimates (uncalibrated), Proliferation 1–4 indices, and systemic sugar/BP biomarkers are educational/exploratory aids — never a clinical diagnosis.',
  },
];

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
          Model Transparency & System Architecture
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          About IRIDEON & Model Card
        </h1>
      </div>

      {/* Model & XAI Information Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              MODEL &amp; XAI INFORMATION
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-700 dark:text-amber-400">
            Truthful Prototype Specification · No Fabricated Metrics
          </span>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {MODEL_CARD_FIELDS.map((item) => (
            <div
              key={item.field}
              className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 text-sm"
            >
              <dt className="md:col-span-3 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide pt-0.5">
                {item.field}
              </dt>
              <dd className="md:col-span-9 text-slate-800 dark:text-slate-200 leading-relaxed">
                {item.value}
              </dd>
            </div>
          ))}
        </div>
      </section>

      {/* Modular Technical Architecture */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-2.5">
          <Server className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Modular Inference & API Architecture
          </h2>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
          IRIDEON separates visual inspection from model execution via a clean TypeScript service abstraction (<code className="font-mono text-cyan-700 dark:text-cyan-400">analyzeRetinalImage()</code>) backed by Express API routes. Setting <code className="font-mono text-cyan-700 dark:text-cyan-400">ML_BACKEND_URL</code> connects a Python PyTorch/FastAPI Grad-CAM service without modifying frontend components, while offline browser screening persists records in local storage until synchronized.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-mono">
          {[
            {
              ep: 'POST /api/image-quality',
              desc: 'Quality gate & pixel suitability verification',
            },
            {
              ep: 'POST /api/analyze',
              desc: 'Quality-gated inference, entropy & XAI payload',
            },
            {
              ep: 'POST /api/sync-records',
              desc: 'Prototype offline queue sync acknowledgment',
            },
            {
              ep: 'POST /api/explain',
              desc: 'Server-side Gemini IRIDEON Doubt Clarifier',
            },
            {
              ep: 'POST /api/report',
              desc: 'Non-persistent structured educational case report',
            },
          ].map((route) => (
            <div
              key={route.ep}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-1.5"
            >
              <p className="font-semibold text-cyan-700 dark:text-cyan-400">{route.ep}</p>
              <p className="font-sans text-slate-600 dark:text-slate-400">{route.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Research and educational use only. This AI output is not a medical diagnosis and should not replace evaluation by a qualified ophthalmologist.
          </span>
        </div>
      </section>
    </div>
  );
};
