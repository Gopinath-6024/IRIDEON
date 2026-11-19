import React, { useState } from 'react';
import {
  Eye,
  Menu,
  X,
  ShieldAlert,
  UserCheck,
  LogIn,
  Settings as SettingsIcon,
  Sun,
  Moon,
} from 'lucide-react';
import type { AppPage, ResearcherSession, ThemeMode } from '../types/retina';

interface NavbarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  session: ResearcherSession | null;
  onOpenAuth: () => void;
  themeMode: ThemeMode;
  onToggleQuickTheme: () => void;
}

const PRIMARY_NAV: { id: AppPage; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analyze', label: 'Analyze' },
  { id: 'explainability', label: 'Explainability' },
  { id: 'feature-explorer', label: 'Feature Explorer' },
  { id: 'reports', label: 'Reports' },
  { id: 'learn', label: 'Learn' },
  { id: 'about', label: 'About' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  session,
  onOpenAuth,
  themeMode,
  onToggleQuickTheme,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (page: AppPage) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <div className="no-print sticky top-0 z-40">
      <header className="border-b border-slate-200 dark:border-slate-800/90 bg-white/95 dark:bg-[#070B14]/95 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNav('landing')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md py-1"
            aria-label="IRIDEON Home"
          >
            <Eye className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              IRIDEON
            </span>
          </button>

          {/* Zone 2: Clean Typography Nav Links */}
          <nav
            className="hidden lg:flex items-center gap-5 text-sm font-medium"
            aria-label="Primary Navigation"
          >
            {PRIMARY_NAV.map((item) => {
              const active =
                currentPage === item.id ||
                (item.id === 'explainability' && currentPage === 'comparison');
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-t-sm ${
                    active
                      ? 'border-cyan-600 dark:border-cyan-400 text-slate-900 dark:text-white font-semibold'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action + Utility */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onToggleQuickTheme}
              className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              aria-label={`Switch color theme (current: ${themeMode})`}
              title={`Theme: ${themeMode}`}
            >
              {themeMode === 'dark' ? (
                <Moon className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Sun className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleNav('settings')}
              className={`hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                currentPage === 'settings'
                  ? 'border-cyan-500 text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
              aria-label="Settings"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-900 dark:bg-cyan-600 text-white hover:bg-slate-800 dark:hover:bg-cyan-500 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {session ? (
                <>
                  <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="max-w-[130px] truncate">{session.researcherId}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Researcher Sign In</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <nav
            className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] px-4 py-3 space-y-1"
            aria-label="Mobile Navigation"
          >
            {PRIMARY_NAV.map((item) => {
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-200 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNav('comparison')}
                className="flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Image Comparison
              </button>
              <button
                type="button"
                onClick={() => handleNav('settings')}
                className="flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={() => handleNav('privacy')}
                className="flex-1 text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Privacy
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* Always-visible Medical Safety Banner */}
      <div
        role="note"
        aria-label="Medical Safety Disclaimer"
        className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-900/60 px-4 py-1.5"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-center gap-2 text-[11px] sm:text-xs text-amber-900 dark:text-amber-200 text-center">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            Research and educational use only. This AI output is not a medical diagnosis and should not replace evaluation by a qualified ophthalmologist.
          </span>
        </div>
      </div>
    </div>
  );
};
