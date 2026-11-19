import React from 'react';
import { Server, Cpu, ShieldAlert } from 'lucide-react';

const MODEL_CARD_FIELDS = [
  {
    field: 'Model name',
    value: 'Prototype / Demonstration Model (Modular XAI Adapter)',
  },
  {
    field: 'Task',
    value:
      'Educational demonstration of 5-grade Diabetic Retinopathy severity estimation and spatial visual attribution from retinal fundus images.',
  },
  {
    field: 'Input',
    value: '2D RGB retinal fundus image (JPG, JPEG, PNG; validated 128×128 to 8192×8192 px, max 10 MB).',
  },
  {
    field: 'Output',
    value:
      'Estimated severity category, confidence concentration %, uncertainty tier, 6-metric image quality assessment, feature list, Evidence Trail, and simulated heatmap coordinates.',
  },
  {
    field: 'Training data',
    value:
      'Not applicable in Prototype / Demonstration Mode — no clinical dataset weights or fabricated validation metrics are bundled. External PyTorch/TensorFlow models can be connected via ML_BACKEND_URL.',
  },
  {
    field: 'Limitations',
    value:
      'Demonstrates Explainable AI workflow logic using synthetic reference presets and pixel-level image quality checks; cannot detect clinical pathology on real patient photographs.',
  },
  {
    field: 'Known biases',
    value:
      'Retinal AI systems commonly face domain shift across camera manufacturers, pupil dilation, fundus pigmentation, media opacity, and image compression.',
  },
  {
    field: 'Intended use',
    value:
      'Academic research demonstrations, medical-AI education, HCI explainability studies, and technical prototyping.',
  },
  {
    field: 'Non-intended use',
    value:
      'Clinical screening, medical diagnosis, triage, treatment planning, or unsupervised patient care.',
  },
  {
    field: 'Explainability method',
    value:
      'Simulated spatial saliency & feature decomposition in Prototype Mode; supports external Grad-CAM / attention rollout attribution payloads when ML_BACKEND_URL is configured.',
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

      {/* Model Card */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Model Card — IRIDEON Prototype / Demonstration Model
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-700 dark:text-amber-400">
            No fabricated clinical metrics
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
          IRIDEON separates visual inspection from model execution via a clean TypeScript service abstraction (<code className="font-mono text-cyan-700 dark:text-cyan-400">analyzeRetinalImage()</code>) backed by Express API routes. Setting <code className="font-mono text-cyan-700 dark:text-cyan-400">ML_BACKEND_URL</code> connects a Python PyTorch/FastAPI Grad-CAM service without modifying frontend components.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {[
            {
              ep: 'POST /api/image-quality',
              desc: 'Magic-byte, dimension & pixel quality verification',
            },
            {
              ep: 'POST /api/analyze',
              desc: 'Modular RetinalModelAdapter inference & XAI payload',
            },
            {
              ep: 'POST /api/explain',
              desc: 'Server-side Gemini Retina Explain assistant',
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
