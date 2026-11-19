import React from 'react';
import { Eye } from 'lucide-react';
import type { AppPage } from '../types/retina';

interface FooterProps {
  onNavigate: (page: AppPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="no-print border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070B14] mt-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
              <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-white">
                IRIDEON
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Explainable Retinal AI · “Don’t just trust the prediction. Understand it.”
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300" aria-label="Footer Links">
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => onNavigate('learn')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              XAI
            </button>
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              Disclaimer
            </button>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              Documentation
            </button>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              Settings
            </button>
          </nav>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <p>
            This project is intended for educational and research demonstration purposes only and is not a medical diagnostic device.
          </p>
          <p className="font-mono tabular-nums whitespace-nowrap">
            IRIDEON Research Interface
          </p>
        </div>
      </div>
    </footer>
  );
};
