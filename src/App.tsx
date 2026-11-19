import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { AnalysisWorkspace } from './components/AnalysisWorkspace';
import { FeatureExplorerPage } from './components/FeatureExplorerPage';
import { ComparisonPage } from './components/ComparisonPage';
import { CaseReportPage } from './components/CaseReportPage';
import { LearnPage } from './components/LearnPage';
import { AboutPage } from './components/AboutPage';
import { SettingsPage, PrivacyPage } from './components/SettingsAndPrivacyPages';
import { ResearcherDashboardPage } from './components/ResearcherDashboardPage';
import { ResearcherAuthModal } from './components/ResearcherAuthModal';
import { FloatingIrideonChat } from './components/FloatingIrideonChat';
import {
  computeClientPixelStats,
  generateSyntheticFundusDataUrl,
} from './utils/fundusGenerator';
import type {
  AppPage,
  ChatMessage,
  ClientPixelStats,
  DemoCaseId,
  ExplainMode,
  ImageQualityMetrics,
  ResearcherSession,
  RetinaAnalysisResult,
  ThemeMode,
} from './types/retina';

interface SessionCaseEntry {
  analysis: RetinaAnalysisResult;
  imageUrl: string;
}

const THEME_STORAGE_KEY = 'retina-xai-theme';
const MAX_CLIENT_FILE_BYTES = 10 * 1024 * 1024;

function createWelcomeMessage(mode: ExplainMode): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    mode,
    timestamp: new Date().toISOString(),
    content:
      'Hi, I am IRIDEON — your fast doubt-clarifier assistant. Ask me anything about retinal features, Proliferation Grades (1–4), estimated sugar/BP patterns, or eye symptoms like pain or blur.',
  };
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('landing');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // ignore storage errors
    }
    return 'dark';
  });

  const [defaultExplainMode, setDefaultExplainMode] = useState<ExplainMode>('beginner');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [colormap, setColormap] = useState<'thermal' | 'clinical'>('thermal');
  const [hasAcknowledgedFeatures, setHasAcknowledgedFeatures] = useState(false);

  // Active Case State
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [uploadedPixelStats, setUploadedPixelStats] = useState<ClientPixelStats | null>(null);
  const [preQuality, setPreQuality] = useState<ImageQualityMetrics | null>(null);
  const [analysis, setAnalysis] = useState<RetinaAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Shared IRIDEON Chatbot State (synced across Floating button & inline workspace)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage('beginner'),
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Ephemeral Session History & Researcher Session
  const [sessionHistory, setSessionHistory] = useState<SessionCaseEntry[]>([]);
  const [session, setSession] = useState<ResearcherSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Apply Dark / Light / System Theme
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch {
      // ignore
    }

    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const isDark =
        themeMode === 'dark' || (themeMode === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [themeMode]);

  // Apply Reduced Motion class
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [reducedMotion]);

  const navigate = useCallback((page: AppPage) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const toggleQuickTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // High-Speed SSE Streaming Doubt Clarifier Handler
  const handleSendChatQuestion = useCallback(
    async (questionText: string, mode: ExplainMode) => {
      const trimmed = questionText.trim();
      if (!trimmed || chatLoading) return;

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
        mode,
        timestamp: new Date().toISOString(),
      };
      const assistantId = `a-${Date.now() + 1}`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        mode,
        timestamp: new Date().toISOString(),
      };

      const historySnapshot = chatMessages
        .filter((m) => !m.error && m.id !== 'welcome')
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      setChatMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
      setChatLoading(true);

      try {
        const response = await fetch('/api/explain/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            mode,
            analysis,
            history: historySnapshot,
          }),
        });

        if (!response.ok || !response.body) {
          // Clean JSON fallback if stream unavailable
          const fallbackRes = await fetch('/api/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: trimmed,
              mode,
              analysis,
              history: historySnapshot,
            }),
          });
          const fallbackData = (await fallbackRes.json()) as {
            answer?: string;
            error?: string;
          };
          if (!fallbackRes.ok || !fallbackData.answer) {
            throw new Error(
              fallbackData.error ?? 'IRIDEON could not answer right now.'
            );
          }
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fallbackData.answer! } : m
            )
          );
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let receivedAnyText = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const blocks = buffer.split(/\r?\n\r?\n/);
          buffer = blocks.pop() ?? '';

          for (const block of blocks) {
            const dataLine = block
              .split(/\r?\n/)
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
              receivedAnyText = true;
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + payload.delta }
                    : m
                )
              );
            }
          }
        }

        if (buffer.trim()) {
          const dataLine = buffer
            .split(/\r?\n/)
            .find((l) => l.startsWith('data: '));
          if (dataLine) {
            const payload = JSON.parse(dataLine.slice(6)) as {
              delta?: string;
              error?: string;
            };
            if (payload.error) {
              throw new Error(payload.error);
            }
            if (payload.delta) {
              receivedAnyText = true;
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + payload.delta }
                    : m
                )
              );
            }
          }
        }

        if (!receivedAnyText) {
          throw new Error('IRIDEON returned an empty response. Please try again.');
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Unable to reach IRIDEON right now. Please try again.';
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: msg, error: true } : m
          )
        );
      } finally {
        setChatLoading(false);
      }
    },
    [analysis, chatLoading, chatMessages]
  );

  const handleClearChat = useCallback(() => {
    setChatMessages([createWelcomeMessage(defaultExplainMode)]);
  }, [defaultExplainMode]);

  // Handle Upload + Pre-Analysis Image Quality Check
  const handleUploadFile = async (file: File) => {
    setErrorMsg(null);
    setAnalysis(null);
    setPreQuality(null);

    const validMime = file.type === 'image/jpeg' || file.type === 'image/png';
    const validExt = /\.(jpe?g|png)$/i.test(file.name);
    if (!validMime && !validExt) {
      setErrorMsg(
        'Unsupported file type. Please upload a standard JPG, JPEG, or PNG retinal fundus image.'
      );
      return;
    }

    if (file.size > MAX_CLIENT_FILE_BYTES) {
      setErrorMsg(
        'The selected file exceeds the 10 MB limit. Please choose a smaller retinal image.'
      );
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read file.'));
        };
        reader.onerror = () => reject(new Error('Could not read image file.'));
        reader.readAsDataURL(file);
      });

      const stats = await computeClientPixelStats(dataUrl);
      setActiveImageUrl(dataUrl);
      setUploadedPixelStats(stats);

      const qRes = await fetch('/api/image-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, pixelStats: stats }),
      });

      const qData = (await qRes.json()) as {
        imageQuality?: ImageQualityMetrics;
        error?: string;
      };

      if (!qRes.ok || !qData.imageQuality) {
        setActiveImageUrl(null);
        setUploadedPixelStats(null);
        setErrorMsg(
          qData.error ?? 'Image validation failed. Please try a different JPG or PNG image.'
        );
        return;
      }

      setPreQuality(qData.imageQuality);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to decode the uploaded image. Ensure the file is a valid JPG or PNG.'
      );
    }
  };

  // Run Analysis on Uploaded Image
  const handleRunAnalysis = async () => {
    if (!activeImageUrl) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 16000);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'upload',
          imageDataUrl: activeImageUrl,
          pixelStats: uploadedPixelStats ?? undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      const data = (await res.json()) as RetinaAnalysisResult & { error?: string };
      if (!res.ok || !data.prediction) {
        throw new Error(data.error ?? 'Analysis failed to produce an output.');
      }

      setAnalysis(data);
      setSessionHistory((prev) => [{ analysis: data, imageUrl: activeImageUrl }, ...prev]);
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'AbortError'
          ? 'Analysis request timed out. Please try again.'
          : err instanceof Error
            ? err.message
            : 'IRIDEON service unavailable. Please try again shortly.';
      setErrorMsg(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run Synthetic Demo Case
  const handleSelectDemo = async (demoId: DemoCaseId, navigateTarget?: AppPage) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setPreQuality(null);
    setUploadedPixelStats(null);
    setHasAcknowledgedFeatures(true);

    const syntheticUrl = generateSyntheticFundusDataUrl(demoId);
    setActiveImageUrl(syntheticUrl);

    if (navigateTarget) {
      navigate(navigateTarget);
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'demo', demoCaseId: demoId }),
      });
      const data = (await res.json()) as RetinaAnalysisResult & { error?: string };
      if (!res.ok || !data.prediction) {
        throw new Error(data.error ?? 'Unable to load demo case.');
      }

      setAnalysis(data);
      setSessionHistory((prev) => [{ analysis: data, imageUrl: syntheticUrl }, ...prev]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to load demo case.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogout = async () => {
    if (session?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.token}` },
        });
      } catch {
        // ignore logout network errors
      }
    }
    setSession(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070B14] dark:text-slate-100">
      <Navbar
        currentPage={currentPage}
        onNavigate={navigate}
        session={session}
        onOpenAuth={() => setAuthModalOpen(true)}
        themeMode={themeMode}
        onToggleQuickTheme={toggleQuickTheme}
      />

      <main className="flex-1">
        {currentPage === 'landing' && (
          <LandingPage
            onNavigate={navigate}
            onRunDemoCase={(id) => handleSelectDemo(id, 'explainability')}
            onAcknowledgeAndEnter={() => {
              setHasAcknowledgedFeatures(true);
              navigate('analyze');
            }}
          />
        )}

        {currentPage === 'dashboard' && (
          <ResearcherDashboardPage
            session={session}
            onOpenAuth={() => setAuthModalOpen(true)}
            sessionHistory={sessionHistory}
            activeCaseId={analysis?.caseId ?? null}
            onSelectHistoryCase={(entry) => {
              setHasAcknowledgedFeatures(true);
              setAnalysis(entry.analysis);
              setActiveImageUrl(entry.imageUrl);
              setPreQuality(entry.analysis.imageQuality);
            }}
            onRunDemo={(id) => handleSelectDemo(id, 'analyze')}
            onNavigate={navigate}
          />
        )}

        {(currentPage === 'analyze' || currentPage === 'explainability') && (
          <AnalysisWorkspace
            mode={currentPage}
            analysis={analysis}
            imageUrl={activeImageUrl}
            preQuality={preQuality}
            isAnalyzing={isAnalyzing}
            errorMsg={errorMsg}
            defaultExplainMode={defaultExplainMode}
            colormap={colormap}
            hasAcknowledgedFeatures={hasAcknowledgedFeatures}
            onAcknowledgeFeatures={() => setHasAcknowledgedFeatures(true)}
            onUploadFile={handleUploadFile}
            onRunAnalysis={handleRunAnalysis}
            onSelectDemo={(id) => handleSelectDemo(id)}
            onNavigate={navigate}
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            onSendChatQuestion={handleSendChatQuestion}
            onClearChat={handleClearChat}
          />
        )}

        {currentPage === 'feature-explorer' && <FeatureExplorerPage />}

        {currentPage === 'comparison' && (
          <ComparisonPage
            analysis={analysis}
            imageUrl={activeImageUrl}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'reports' && (
          <CaseReportPage
            analysis={analysis}
            imageUrl={activeImageUrl}
            onNavigate={navigate}
          />
        )}

        {currentPage === 'learn' && <LearnPage />}

        {currentPage === 'about' && <AboutPage />}

        {currentPage === 'settings' && (
          <SettingsPage
            themeMode={themeMode}
            onThemeChange={setThemeMode}
            defaultExplainMode={defaultExplainMode}
            onExplainModeChange={setDefaultExplainMode}
            reducedMotion={reducedMotion}
            onReducedMotionChange={setReducedMotion}
            colormap={colormap}
            onColormapChange={setColormap}
          />
        )}

        {currentPage === 'privacy' && <PrivacyPage />}
      </main>

      <Footer onNavigate={navigate} />

      <FloatingIrideonChat
        analysis={analysis}
        defaultExplainMode={defaultExplainMode}
        messages={chatMessages}
        isLoading={chatLoading}
        onSendQuestion={handleSendChatQuestion}
        onClearMessages={handleClearChat}
      />

      <ResearcherAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        session={session}
        onLoginSuccess={(s) => setSession(s)}
        onLogout={handleLogout}
      />
    </div>
  );
}
