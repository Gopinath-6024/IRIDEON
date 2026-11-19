import React, { useState } from 'react';
import { RETINAL_ANATOMY_FEATURES } from '../data/retinalKnowledge';
import { Brain, AlertCircle, Eye } from 'lucide-react';

export const FeatureExplorerPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('microaneurysms');
  const activeFeature =
    RETINAL_ANATOMY_FEATURES.find((f) => f.id === selectedId) ?? RETINAL_ANATOMY_FEATURES[0];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
          Interactive Retinal Anatomy & Pathology Atlas
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          Retinal Feature Explorer
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
          Select any anatomical landmark or lesion pattern on the stylized retina diagram to examine how it appears in fundus photography and how explainable AI models detect it.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Interactive Stylized Retina Diagram */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#050912] p-5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
              <span>STYLIZED RETINAL TOPOLOGY MAP</span>
              <span>Click any region</span>
            </div>

            <div className="relative aspect-square max-w-[460px] mx-auto">
              <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                role="img"
                aria-label="Interactive stylized retina diagram with clickable features"
              >
                <defs>
                  <radialGradient id="explorerBg" cx="54%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#6b2116" />
                    <stop offset="60%" stopColor="#3b120e" />
                    <stop offset="100%" stopColor="#090d16" />
                  </radialGradient>
                </defs>

                {/* Fundus Circle */}
                <circle cx="50" cy="50" r="46" fill="url(#explorerBg)" stroke="#1e293b" strokeWidth="0.6" />

                {/* Macula */}
                <circle cx="46" cy="50" r="9" fill="#230808" opacity="0.65" />

                {/* Optic Disc */}
                <ellipse cx="74" cy="50" rx="5.8" ry="6.5" fill="#fde68a" opacity="0.88" />
                <circle cx="73" cy="50" r="2.6" fill="#fef9c3" opacity="0.9" />

                {/* Vascular Arcades */}
                <g fill="none" strokeLinecap="round">
                  <path d="M 73 48 Q 58 26 28 35" stroke="#dc2626" strokeWidth="1.2" opacity="0.85" />
                  <path d="M 55 31 Q 45 20 31 24" stroke="#b91c1c" strokeWidth="0.8" opacity="0.8" />
                  <path d="M 73 52 Q 57 74 27 65" stroke="#dc2626" strokeWidth="1.2" opacity="0.85" />
                  <path d="M 54 69 Q 43 80 30 76" stroke="#b91c1c" strokeWidth="0.8" opacity="0.8" />
                  <path d="M 75 48 Q 84 36 89 27" stroke="#b91c1c" strokeWidth="0.8" opacity="0.75" />
                  <path d="M 75 52 Q 84 64 89 73" stroke="#b91c1c" strokeWidth="0.8" opacity="0.75" />
                </g>

                {/* Synthetic visual markers for lesion classes */}
                <circle cx="37" cy="38" r="0.9" fill="#991b1b" />
                <circle cx="39" cy="39.5" r="0.7" fill="#991b1b" />
                <ellipse cx="34" cy="63" rx="2.3" ry="1.6" fill="#7f1d1d" />
                <circle cx="54" cy="57" r="0.8" fill="#fef08a" />
                <circle cx="55.5" cy="58" r="0.65" fill="#fef08a" />
                <ellipse cx="56" cy="31" rx="3.2" ry="1.9" fill="#e2e8f0" opacity="0.55" />
                <path d="M 71 45 Q 68 42 69 48 Q 72 47 71 45" fill="none" stroke="#ef4444" strokeWidth="0.45" />

                {/* Interactive Clickable Hotspots */}
                {RETINAL_ANATOMY_FEATURES.map((feat) => {
                  const isActive = feat.id === activeFeature.id;
                  const ringColor =
                    feat.category === 'Lesion'
                      ? '#f59e0b'
                      : feat.category === 'Vascular'
                        ? '#22d3ee'
                        : '#a78bfa';

                  return (
                    <g
                      key={feat.id}
                      onClick={() => setSelectedId(feat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(feat.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select ${feat.name}`}
                      className="cursor-pointer focus:outline-none"
                    >
                      <circle
                        cx={feat.coordinates.x}
                        cy={feat.coordinates.y}
                        r={isActive ? 5.6 : 4.2}
                        fill={isActive ? 'rgba(6, 182, 212, 0.24)' : 'rgba(15, 23, 42, 0.35)'}
                        stroke={isActive ? '#22d3ee' : ringColor}
                        strokeWidth={isActive ? '0.85' : '0.45'}
                      />
                      <circle
                        cx={feat.coordinates.x}
                        cy={feat.coordinates.y}
                        r="1.15"
                        fill={isActive ? '#22d3ee' : ringColor}
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Clickable Region Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {RETINAL_ANATOMY_FEATURES.map((feat) => {
              const active = feat.id === activeFeature.id;
              return (
                <button
                  key={feat.id}
                  type="button"
                  onClick={() => setSelectedId(feat.id)}
                  className={`px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                    active
                      ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-900 dark:text-cyan-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {feat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detailed Educational Breakdown */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 space-y-5">
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
                  {activeFeature.category} Feature · Coordinates ({activeFeature.coordinates.x}%, {activeFeature.coordinates.y}%)
                </p>
                <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {activeFeature.name}
                </h2>
              </div>
              <Eye className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white">
                  What is it?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeFeature.whatIsIt}
                </p>
              </div>

              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white">
                  Why can it matter?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeFeature.whyItMatters}
                </p>
              </div>

              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white">
                  How might it appear in fundus imaging?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeFeature.fundusAppearance}
                </p>
              </div>

              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white">
                  How could an AI model detect it?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeFeature.howAiDetectsIt}
                </p>
              </div>

              <div>
                <h3 className="font-display font-semibold text-slate-900 dark:text-white">
                  What are the limitations?
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeFeature.limitations}
                </p>
              </div>
            </div>

            {/* AI Perspective Callout */}
            <div className="rounded-xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/60 dark:bg-violet-950/25 p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-violet-800 dark:text-violet-300">
                <Brain className="w-4 h-4" aria-hidden="true" />
                <span>AI Perspective</span>
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {activeFeature.aiPerspective}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Educational summary only. Visual inspection by a qualified eye care specialist is required for clinical assessment.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
