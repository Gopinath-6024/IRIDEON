import React, { useEffect, useId, useRef, useState } from 'react';
import { MessageSquare, Send, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import type { ChatMessage, ExplainMode, RetinaAnalysisResult } from '../types/retina';

interface RetinaExplainChatProps {
  analysis: RetinaAnalysisResult | null;
  defaultMode: ExplainMode;
  messages?: ChatMessage[];
  isLoading?: boolean;
  onSendQuestion?: (question: string, mode: ExplainMode) => void;
  onClearMessages?: () => void;
  compact?: boolean;
  autoFocusInput?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'Explain my Proliferation Level (1–4) simply',
  'How do blood sugar & BP relate to the retina?',
  'What symptoms happen inside vs outside?',
  'Why might eye pain happen?',
  'What does the heatmap mean?',
];

export const RetinaExplainChat: React.FC<RetinaExplainChatProps> = ({
  analysis,
  defaultMode,
  messages: controlledMessages,
  isLoading: controlledLoading,
  onSendQuestion,
  onClearMessages,
  compact = false,
  autoFocusInput = false,
}) => {
  const [mode, setMode] = useState<ExplainMode>(defaultMode);
  const [input, setInput] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      mode: defaultMode,
      timestamp: new Date().toISOString(),
      content:
        'Hi, I am IRIDEON — your fast doubt-clarifier assistant. Ask me anything about retinal features, Proliferation Grades (1–4), estimated sugar/BP patterns, or eye symptoms like pain or blur.',
    },
  ]);

  const headingId = useId();
  const messages = controlledMessages ?? localMessages;
  const isLoading = controlledLoading ?? localLoading;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    if (autoFocusInput) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [autoFocusInput]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleLocalStreamAsk = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || localLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
      mode,
      timestamp: new Date().toISOString(),
    };
    const assistantId = `a-${Date.now() + 1}`;
    const placeholderAssistant: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      mode,
      timestamp: new Date().toISOString(),
    };

    const historySnapshot = [...localMessages, userMsg]
      .filter((m) => !m.error && m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    setLocalMessages((prev) => [...prev, userMsg, placeholderAssistant]);
    setInput('');
    setLocalLoading(true);

    try {
      const response = await fetch('/api/explain/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          mode,
          analysis,
          history: historySnapshot.slice(0, -1),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming unavailable');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const block of lines) {
          const dataLine = block
            .split('\n')
            .find((l) => l.startsWith('data: '));
          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(6)) as {
            delta?: string;
            done?: boolean;
            error?: string;
          };
          if (payload.error) {
            throw new Error(payload.error);
          }
          if (payload.delta) {
            setLocalMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + payload.delta }
                  : m
              )
            );
          }
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to reach IRIDEON right now. Please try again.';
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: msg, error: true }
            : m
        )
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const askQuestion = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (onSendQuestion) {
      setInput('');
      onSendQuestion(trimmed, mode);
    } else {
      void handleLocalStreamAsk(trimmed);
    }
  };

  return (
    <section
      aria-labelledby={headingId}
      className={`${
        compact
          ? 'bg-white dark:bg-[#0D1322] flex-1 flex flex-col min-h-0'
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1322] flex flex-col'
      } overflow-hidden`}
    >
      {/* Header + Mode Toggle */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" aria-hidden="true" />
          <div>
            <h3
              id={headingId}
              className="font-display text-sm font-semibold text-slate-900 dark:text-white"
            >
              IRIDEON Doubt Clarifier
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              High-speed simple AI replies · Non-diagnostic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClearMessages && messages.length > 1 && (
            <button
              type="button"
              onClick={onClearMessages}
              title="Reset conversation"
              aria-label="Reset conversation"
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <div
            className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#090E1A]"
            role="group"
            aria-label="Explanation Complexity Mode"
          >
            <button
              type="button"
              onClick={() => setMode('beginner')}
              aria-pressed={mode === 'beginner'}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'beginner'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Simple
            </button>
            <button
              type="button"
              onClick={() => setMode('technical')}
              aria-pressed={mode === 'technical'}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'technical'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Technical
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Doubt Prompts */}
      <div
        className={`shrink-0 px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#090E1A] flex gap-1.5 ${
          compact ? 'overflow-x-auto flex-nowrap' : 'flex-wrap'
        }`}
      >
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            disabled={isLoading}
            onClick={() => askQuestion(q)}
            className="shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] text-slate-700 dark:text-slate-300 hover:border-cyan-500 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors disabled:opacity-50 text-left cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Scrollable Message History */}
      <div
        ref={scrollContainerRef}
        className={`p-4 space-y-3 overflow-y-auto ${
          compact ? 'flex-1 min-h-0' : 'max-h-80'
        }`}
        aria-live="polite"
      >
        {messages.map((m) => {
          const isStreamingPlaceholder =
            m.role === 'assistant' && m.content.length === 0 && isLoading;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[92%] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-cyan-700 text-white'
                    : m.error
                      ? 'border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200'
                      : 'border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090E1A] text-slate-800 dark:text-slate-200'
                }`}
              >
                {m.error && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold mb-1">
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Service Notice</span>
                  </div>
                )}
                {isStreamingPlaceholder ? (
                  <span className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                    <span>IRIDEON is replying...</span>
                  </span>
                ) : (
                  m.content
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400 mt-1 px-1">
                {m.role === 'user'
                  ? 'You'
                  : `IRIDEON · ${m.mode === 'beginner' ? 'Simple' : 'Technical'}`}
              </span>
            </div>
          );
        })}
        <div aria-hidden="true" />
      </div>

      {/* Pinned Bottom Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          askQuestion(input);
        }}
        className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-3 flex items-center gap-2 bg-white dark:bg-[#0D1322]"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask IRIDEON any doubt in simple words..."
          aria-label="Ask IRIDEON a doubt"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#090E1A] text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
        <button
          type="submit"
          disabled={isLoading || input.trim().length < 1}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-700 hover:bg-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs sm:text-sm font-medium disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer transition-colors whitespace-nowrap shrink-0"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ask</span>
        </button>
      </form>
    </section>
  );
};
