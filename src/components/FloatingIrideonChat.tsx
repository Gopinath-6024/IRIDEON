import React, { useEffect, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { RetinaExplainChat } from './RetinaExplainChat';
import type { ChatMessage, ExplainMode, RetinaAnalysisResult } from '../types/retina';

interface FloatingIrideonChatProps {
  analysis: RetinaAnalysisResult | null;
  defaultExplainMode: ExplainMode;
  messages: ChatMessage[];
  isLoading: boolean;
  onSendQuestion: (question: string, mode: ExplainMode) => void;
  onClearMessages: () => void;
}

export const FloatingIrideonChat: React.FC<FloatingIrideonChatProps> = ({
  analysis,
  defaultExplainMode,
  messages,
  isLoading,
  onSendQuestion,
  onClearMessages,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <div className="no-print fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-[60]">
      {open ? (
        <div
          role="dialog"
          aria-label="IRIDEON Doubt Clarifier Assistant"
          className="w-[calc(100vw-2rem)] sm:w-[430px] h-[min(560px,calc(100vh-5rem))] rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1322] shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A]">
            <span className="font-display text-xs font-bold text-slate-900 dark:text-white">
              IRIDEON Assistant · Fast Doubt Clarifier
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close IRIDEON Doubt Clarifier"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <RetinaExplainChat
              analysis={analysis}
              defaultMode={defaultExplainMode}
              messages={messages}
              isLoading={isLoading}
              onSendQuestion={onSendQuestion}
              onClearMessages={onClearMessages}
              compact
              autoFocusInput
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2.5 px-4 py-3 rounded-xl bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-sm font-semibold shadow-lg transition-transform active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-label="Ask IRIDEON"
        >
          <MessageSquare className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Ask IRIDEON</span>
        </button>
      )}
    </div>
  );
};
