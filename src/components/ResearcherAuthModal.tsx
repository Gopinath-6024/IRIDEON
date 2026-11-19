import React, { useState } from 'react';
import { X, ShieldCheck, LogOut } from 'lucide-react';
import type { ResearcherSession } from '../types/retina';

interface ResearcherAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ResearcherSession | null;
  onLoginSuccess: (session: ResearcherSession) => void;
  onLogout: () => void;
}

export const ResearcherAuthModal: React.FC<ResearcherAuthModalProps> = ({
  isOpen,
  onClose,
  session,
  onLoginSuccess,
  onLogout,
}) => {
  const [researcherId, setResearcherId] = useState('RES-LAB-01');
  const [displayName, setDisplayName] = useState('Dr. Elena Vance');
  const [role, setRole] = useState('Ophthalmology XAI Researcher');
  const [institution, setInstitution] = useState('Academic Retinal Imaging Lab');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researcherId, displayName, role, institution }),
      });
      const data = await res.json();
      if (!res.ok || !data.session) {
        throw new Error(data.error ?? 'Unable to create researcher session.');
      }
      onLoginSuccess(data.session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="researcher-auth-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-cyan-700 dark:text-cyan-400">
              Ephemeral Session Workspace
            </p>
            <h2
              id="researcher-auth-title"
              className="font-display text-xl font-bold text-slate-900 dark:text-white mt-0.5"
            >
              {session ? 'Active Researcher Session' : 'Researcher Sign In'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close researcher dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {session ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Authenticated Session Active</span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{session.displayName}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {session.role} · {session.institution}
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                ID: {session.researcherId}
              </p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Session tokens are stored in memory only. No medical imagery or personally identifiable information is persisted.
            </p>

            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-300 dark:border-red-900/70 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>End Researcher Session</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Sign in to unlock the authenticated Researcher Dashboard and session case log. Sessions remain ephemeral in compliance with the privacy policy.
            </p>

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Researcher ID
                </label>
                <input
                  type="text"
                  required
                  value={researcherId}
                  onChange={(e) => setResearcherId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Research Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-sm text-slate-900 dark:text-white"
                >
                  <option>Ophthalmology XAI Researcher</option>
                  <option>Machine Learning Engineer</option>
                  <option>Medical Educator / Student</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Lab / Institution (Non-clinical)
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Starting Session...' : 'Start Authenticated Session'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
