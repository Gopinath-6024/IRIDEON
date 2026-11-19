import React from 'react';
import { Sun, Moon, Monitor, Shield, Lock, EyeOff } from 'lucide-react';
import type { ExplainMode, ThemeMode } from '../types/retina';

interface SettingsPageProps {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  defaultExplainMode: ExplainMode;
  onExplainModeChange: (mode: ExplainMode) => void;
  reducedMotion: boolean;
  onReducedMotionChange: (val: boolean) => void;
  colormap: 'thermal' | 'clinical';
  onColormapChange: (map: 'thermal' | 'clinical') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  themeMode,
  onThemeChange,
  defaultExplainMode,
  onExplainModeChange,
  reducedMotion,
  onReducedMotionChange,
  colormap,
  onColormapChange,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
          Interface & Accessibility Preferences
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          Settings
        </h1>
      </div>

      {/* Theme Mode */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Appearance Theme
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Preference is persisted locally in your browser.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light' as ThemeMode, label: 'Light Mode', icon: Sun },
            { id: 'dark' as ThemeMode, label: 'Dark Mode', icon: Moon },
            { id: 'system' as ThemeMode, label: 'System Mode', icon: Monitor },
          ].map((opt) => {
            const Icon = opt.icon;
            const active = themeMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onThemeChange(opt.id)}
                className={`p-3.5 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-colors ${
                  active
                    ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-950/35 text-cyan-900 dark:text-cyan-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Retina Explain Default Mode */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Default Retina Explain Depth
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose whether explanations start in Beginner or Technical terminology.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['beginner', 'technical'] as ExplainMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onExplainModeChange(m)}
              className={`px-4 py-3 rounded-xl border text-left text-xs sm:text-sm font-medium capitalize transition-colors ${
                defaultExplainMode === m
                  ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-950/35 text-cyan-900 dark:text-cyan-200'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] text-slate-700 dark:text-slate-300'
              }`}
            >
              {m} Mode
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap Colormap & Reduced Motion */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 space-y-5">
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Heatmap Colormap Palette
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'thermal' as const, label: 'Thermal Saliency (Cyan → Amber → Red)' },
              { id: 'clinical' as const, label: 'High-Contrast Cyan-Amber (Color-Blind Friendly)' },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onColormapChange(c.id)}
                className={`p-3 rounded-xl border text-left text-xs font-medium transition-colors ${
                  colormap === c.id
                    ? 'border-cyan-600 dark:border-cyan-400 bg-cyan-50 dark:bg-cyan-950/35 text-cyan-900 dark:text-cyan-200'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] text-slate-700 dark:text-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Reduced Motion
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Disables scanning animations and smooth viewer transitions.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={reducedMotion}
            onClick={() => onReducedMotionChange(!reducedMotion)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              reducedMotion
                ? 'border-cyan-600 bg-cyan-700 text-white'
                : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {reducedMotion ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PrivacyPage: React.FC = () => {
  const privacyPoints = [
    {
      icon: Lock,
      title: 'Images are sensitive medical data',
      text: 'Retinal fundus photographs are biometric-grade health imagery and should always be handled under strict privacy governance.',
    },
    {
      icon: EyeOff,
      title: 'Do not upload personally identifiable information',
      text: 'Never upload images containing patient names, medical record numbers, timestamps, or embedded EXIF metadata identifying an individual.',
    },
    {
      icon: Shield,
      title: 'Demo mode uses synthetic data',
      text: 'Demo Case A, Demo Case B, and Demo Case C are generated synthetically for educational and research demonstration only.',
    },
    {
      icon: Lock,
      title: 'No persistent server storage',
      text: 'This prototype avoids persistent storage of uploaded imagery unless an external storage backend is explicitly configured by an administrator.',
    },
    {
      icon: Shield,
      title: 'Server-side API key isolation',
      text: 'All AI explanation API keys are kept strictly on the backend server via environment variables and are never exposed in frontend code.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800">
        <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
          Data Governance & Medical Safety
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
          Privacy & Disclaimer
        </h1>
      </div>

      <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/35 p-6 space-y-2">
        <h2 className="font-display text-lg font-bold text-amber-950 dark:text-amber-200">
          Medical Safety Disclaimer
        </h2>
        <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
          Research and educational use only. This AI output is not a medical diagnosis and should not replace evaluation by a qualified ophthalmologist.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {privacyPoints.map((pt) => {
          const Icon = pt.icon;
          return (
            <div
              key={pt.title}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-5 space-y-2"
            >
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                <Icon className="w-4 h-4 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {pt.title}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {pt.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
