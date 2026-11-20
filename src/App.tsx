import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { DoctorReviewPage } from './components/DoctorReviewPage';
import { SmartReferralPage } from './components/SmartReferralPage';
import { RetinaTimeMachinePage } from './components/RetinaTimeMachinePage';
import { FairEyePage } from './components/FairEyePage';
import { WebcamEyeScanPage } from './components/WebcamEyeScanPage';
import {
  computeClientPixelStats,
  generateSyntheticFundusDataUrl,
} from './utils/fundusGenerator';
import {
  computePixelSaliencyMap,
  createCompactThumbnail,
  evaluateClientQualityGate,
  generateUnsuitableTestImageDataUrl,
  runOfflineLocalScreening,
} from './utils/retinalSaliency';
import {
  buildLocalRecordFromAnalysis,
  loadLocalRecords,
  loadLocalReferrals,
  saveLocalRecords,
  saveLocalReferrals,
} from './utils/localRecordsStore';
import type {
  AcquisitionSource,
  AppPage,
  ChatMessage,
  ClientPixelStats,
  ClinicianDecision,
  DemoCaseId,
  DoctorReviewData,
  ExplainMode,
  EyeLaterality,
  ImageQualityMetrics,
  LocalScreeningRecord,
  ReferralRecord,
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

  // Offline / Online Detection + Local Persistence Queue (Feature 4, 5, 6)
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const isOffline = !browserOnline || simulatedOffline;

  const [localRecords, setLocalRecords] = useState<LocalScreeningRecord[]>(() =>
    loadLocalRecords()
  );
  const [referrals, setReferrals] = useState<ReferralRecord[]>(() => loadLocalReferrals());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const [selectedReviewRecordId, setSelectedReviewRecordId] = useState<string | null>(null);
  const [referralDraftRecord, setReferralDraftRecord] = useState<LocalScreeningRecord | null>(null);

  // Active Case State
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [uploadedPixelStats, setUploadedPixelStats] = useState<ClientPixelStats | null>(null);
  const [preQuality, setPreQuality] = useState<ImageQualityMetrics | null>(null);
  const [analysis, setAnalysis] = useState<RetinaAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStageLabel, setAnalysisStageLabel] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const analysisAbortRef = useRef<AbortController | null>(null);

  // Shared IRIDEON Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage('beginner'),
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  // Ephemeral Session History & Researcher Session
  const [sessionHistory, setSessionHistory] = useState<SessionCaseEntry[]>([]);
  const [session, setSession] = useState<ResearcherSession | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Listen to browser online/offline transitions
  useEffect(() => {
    const onOnline = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Persist local records and referrals to localStorage
  useEffect(() => {
    saveLocalRecords(localRecords);
  }, [localRecords]);

  useEffect(() => {
    saveLocalReferrals(referrals);
  }, [referrals]);

  const queuedCount = useMemo(
    () => localRecords.filter((r) => r.syncStatus === 'pending_sync').length,
    [localRecords]
  );

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

  // Record a completed analysis into Local Records store
  const recordCompletedAnalysis = useCallback(
    async (result: RetinaAnalysisResult, imageUrl: string, offlineFlag: boolean) => {
      const thumb = await createCompactThumbnail(imageUrl);
      const newRec = buildLocalRecordFromAnalysis({
        analysis: result,
        thumbnailUrl: thumb,
        offlineCaptured: offlineFlag,
      });
      setLocalRecords((prev) => [newRec, ...prev.filter((p) => p.recordId !== newRec.recordId)]);
      setSelectedReviewRecordId(newRec.recordId);
      setSessionHistory((prev) => [{ analysis: result, imageUrl }, ...prev]);
      return newRec;
    },
    []
  );

  // Synchronize pending local records to prototype backend endpoint
  const handleSyncQueuedRecords = useCallback(async () => {
    if (isOffline || isSyncing) return;
    const pending = localRecords.filter((r) => r.syncStatus === 'pending_sync');
    if (pending.length === 0) {
      setSyncBanner('✓ Record synchronized · No pending items in queue');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: pending.map((p) => ({
            recordId: p.recordId,
            patientDemoId: p.patientDemoId,
          })),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; syncedIds?: string[]; syncedAt?: string };
      if (!res.ok || !data.ok) {
        throw new Error('Synchronization endpoint did not confirm upload.');
      }

      const syncedSet = new Set(data.syncedIds ?? pending.map((p) => p.recordId));
      const syncedAt = data.syncedAt ?? new Date().toISOString();

      setLocalRecords((prev) =>
        prev.map((rec) =>
          syncedSet.has(rec.recordId)
            ? { ...rec, syncStatus: 'synced', syncedAt }
            : rec
        )
      );
      setReferrals((prev) =>
        prev.map((ref) =>
          ref.syncStatus === 'pending_sync' ? { ...ref, syncStatus: 'synced' } : ref
        )
      );
      setSyncBanner(`✓ Record synchronized (${syncedSet.size} record(s) acknowledged)`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to synchronize queued records right now.'
      );
    } finally {
      setIsSyncing(false);
    }
  }, [isOffline, isSyncing, localRecords]);

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

      if (isOffline) {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    'You are currently in Offline Mode. The live IRIDEON cloud AI clarifier requires connectivity, while on-device retinal screening, quality gating, pixel saliency maps, and local record queuing remain fully functional.',
                }
              : m
          )
        );
        setChatLoading(false);
        return;
      }

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
    [analysis, chatLoading, chatMessages, isOffline]
  );

  const handleClearChat = useCallback(() => {
    setChatMessages([createWelcomeMessage(defaultExplainMode)]);
  }, [defaultExplainMode]);

  // Handle Upload + Pre-Analysis Smart Retinal Image Quality Gate (Feature 1)
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
      setAnalysisStageLabel('Validating image...');
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Could not read file.'));
        };
        reader.onerror = () => reject(new Error('Could not read image file.'));
        reader.readAsDataURL(file);
      });

      setAnalysisStageLabel('Assessing image quality...');
      const stats = await computeClientPixelStats(dataUrl);
      setActiveImageUrl(dataUrl);
      setUploadedPixelStats(stats);

      if (isOffline) {
        setPreQuality(evaluateClientQualityGate(stats, file.type || 'image/png'));
        return;
      }

      try {
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
        console.error('Image quality endpoint fallback:', err);
        setPreQuality(evaluateClientQualityGate(stats, file.type || 'image/png'));
      }
    } catch (err) {
      console.error('Image upload error:', err);
      setErrorMsg('Unable to decode the uploaded image. Ensure the file is a valid JPG or PNG.');
    } finally {
      setAnalysisStageLabel(null);
    }
  };

  // Test Quality Gate Rejection with an authentic dark/blurry canvas sample
  const handleTestUnsuitableImage = async () => {
    setErrorMsg(null);
    setAnalysis(null);
    const badUrl = generateUnsuitableTestImageDataUrl();
    if (!badUrl) return;
    const stats = await computeClientPixelStats(badUrl);
    setActiveImageUrl(badUrl);
    setUploadedPixelStats(stats);
    setPreQuality(evaluateClientQualityGate(stats, 'image/png'));
  };

  const handleCancelAnalysis = useCallback(() => {
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    setIsAnalyzing(false);
    setAnalysisStageLabel(null);
    setErrorMsg('Analysis canceled by user.');
  }, []);

  const handleResetWorkspace = useCallback(() => {
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
      analysisAbortRef.current = null;
    }
    setIsAnalyzing(false);
    setAnalysisStageLabel(null);
    setActiveImageUrl(null);
    setUploadedPixelStats(null);
    setPreQuality(null);
    setAnalysis(null);
    setErrorMsg(null);
  }, []);

  // Unified Shared Fundus Inference Pipeline (reused by both Add Retina and Webcam Eye Scan)
  const executeFundusInferencePipeline = useCallback(
    async (params: {
      fundusImageUrl: string;
      stats?: ClientPixelStats;
      patientId?: string;
      eyeLaterality?: EyeLaterality;
      acquisitionSource?: AcquisitionSource;
      deviceLabel?: string;
      externalEyeReference?: RetinaAnalysisResult['externalEyeReference'];
    }) => {
      if (analysisAbortRef.current) {
        analysisAbortRef.current.abort();
      }
      const userController = new AbortController();
      analysisAbortRef.current = userController;

      setActiveImageUrl(params.fundusImageUrl);
      if (params.stats) setUploadedPixelStats(params.stats);
      setIsAnalyzing(true);
      setErrorMsg(null);
      setAnalysisStageLabel('Validating image...');

      try {
        setAnalysisStageLabel('Assessing image quality...');
        const stats = params.stats ?? (await computeClientPixelStats(params.fundusImageUrl));
        if (userController.signal.aborted) return;

        setAnalysisStageLabel('Running DR analysis...');
        let result: RetinaAnalysisResult;
        let ranOffline = isOffline;

        if (isOffline) {
          result = await runOfflineLocalScreening({
            sourceType: 'upload',
            imageDataUrl: params.fundusImageUrl,
            stats,
          });
        } else {
          try {
            const timer = setTimeout(() => userController.abort(), 16000);

            const res = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sourceType: 'upload',
                imageRole: 'retinal_fundus',
                imageDataUrl: params.fundusImageUrl,
                pixelStats: stats,
                patientId: params.patientId,
                eyeLaterality: params.eyeLaterality,
                acquisitionSource: params.acquisitionSource ?? 'fundus_upload',
                deviceLabel: params.deviceLabel,
                externalEyeReference: params.externalEyeReference,
              }),
              signal: userController.signal,
            });
            clearTimeout(timer);

            const data = (await res.json()) as RetinaAnalysisResult & {
              error?: string;
              imageQuality?: ImageQualityMetrics;
            };

            if (res.status === 422) {
              if (data.imageQuality) setPreQuality(data.imageQuality);
              throw new Error(
                data.error ??
                  'Image quality is insufficient. Please capture/upload another retinal image.'
              );
            }

            if (!res.ok || !data.prediction) {
              throw new Error(data.error ?? 'Analysis failed to produce an output.');
            }
            result = data;
          } catch (networkErr) {
            if (userController.signal.aborted) {
              throw networkErr;
            }
            if (
              networkErr instanceof Error &&
              networkErr.message.includes('Image quality is insufficient')
            ) {
              throw networkErr;
            }
            console.error('Server analyze fallback to offline local screening:', networkErr);
            ranOffline = true;
            result = await runOfflineLocalScreening({
              sourceType: 'upload',
              imageDataUrl: params.fundusImageUrl,
              stats,
            });
          }
        }

        if (userController.signal.aborted) return;
        setAnalysisStageLabel('Generating explanation...');
        const saliency = await computePixelSaliencyMap(params.fundusImageUrl);
        if (userController.signal.aborted) return;

        // Attach computed 24x24 pixel saliency grid + operator acquisition metadata
        result = {
          ...result,
          patientId: params.patientId ?? result.patientId,
          eyeLaterality: params.eyeLaterality ?? result.eyeLaterality,
          acquisitionSource:
            params.acquisitionSource ?? result.acquisitionSource ?? 'fundus_upload',
          imageMetadata: result.imageMetadata
            ? {
                ...result.imageMetadata,
                deviceLabel: params.deviceLabel ?? result.imageMetadata.deviceLabel,
              }
            : undefined,
          externalEyeReference: params.externalEyeReference ?? result.externalEyeReference,
          heatmapData: {
            ...result.heatmapData,
            pixelGrid: saliency.grid.length > 0 ? saliency.grid : result.heatmapData.pixelGrid,
            regions:
              saliency.peaks.length > 0 ? saliency.peaks : result.heatmapData.regions,
          },
        };

        setPreQuality(result.imageQuality);
        setAnalysis(result);
        await recordCompletedAnalysis(result, params.fundusImageUrl, ranOffline);
        setAnalysisStageLabel('Analysis complete');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setErrorMsg('Analysis stopped or timed out. Please try again.');
        } else if (
          err instanceof Error &&
          err.message.includes('Image quality is insufficient')
        ) {
          setErrorMsg(err.message);
        } else {
          console.error('Fundus analysis error:', err);
          setErrorMsg('IRIDEON could not complete the analysis. Please try again.');
        }
      } finally {
        if (analysisAbortRef.current === userController) {
          analysisAbortRef.current = null;
        }
        setIsAnalyzing(false);
        setTimeout(() => setAnalysisStageLabel(null), 1200);
      }
    },
    [isOffline, recordCompletedAnalysis]
  );

  // Run Analysis on Uploaded Image (Hard Quality Gate + Shared Inference Pipeline)
  const handleRunAnalysis = async () => {
    if (!activeImageUrl) return;
    if (preQuality && !preQuality.suitable) {
      setErrorMsg(
        'Image quality is insufficient. Please capture/upload another retinal image.'
      );
      return;
    }

    await executeFundusInferencePipeline({
      fundusImageUrl: activeImageUrl,
      stats: uploadedPixelStats ?? undefined,
      acquisitionSource: 'fundus_upload',
    });
  };

  // Run Synthetic Demo Case
  const handleSelectDemo = async (demoId: DemoCaseId, navigateTarget?: AppPage) => {
    if (analysisAbortRef.current) {
      analysisAbortRef.current.abort();
    }
    const userController = new AbortController();
    analysisAbortRef.current = userController;

    setIsAnalyzing(true);
    setAnalysisStageLabel('Validating image...');
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
      setAnalysisStageLabel('Assessing image quality...');
      const stats = await computeClientPixelStats(syntheticUrl);
      if (userController.signal.aborted) return;

      setAnalysisStageLabel('Running DR analysis...');
      let result: RetinaAnalysisResult;
      let ranOffline = isOffline;

      if (isOffline) {
        result = await runOfflineLocalScreening({
          sourceType: 'demo',
          demoCaseId: demoId,
          imageDataUrl: syntheticUrl,
          stats,
        });
      } else {
        try {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceType: 'demo', demoCaseId: demoId }),
            signal: userController.signal,
          });
          const data = (await res.json()) as RetinaAnalysisResult & { error?: string };
          if (!res.ok || !data.prediction) {
            throw new Error(data.error ?? 'Unable to load demo case.');
          }
          result = data;
        } catch (networkErr) {
          if (userController.signal.aborted) {
            throw networkErr;
          }
          console.error('Demo analyze fallback to offline:', networkErr);
          ranOffline = true;
          result = await runOfflineLocalScreening({
            sourceType: 'demo',
            demoCaseId: demoId,
            imageDataUrl: syntheticUrl,
            stats,
          });
        }
      }

      if (userController.signal.aborted) return;
      setAnalysisStageLabel('Generating explanation...');
      const saliency = await computePixelSaliencyMap(syntheticUrl);
      if (userController.signal.aborted) return;

      result = {
        ...result,
        heatmapData: {
          ...result.heatmapData,
          pixelGrid: saliency.grid.length > 0 ? saliency.grid : result.heatmapData.pixelGrid,
        },
      };

      setAnalysis(result);
      await recordCompletedAnalysis(result, syntheticUrl, ranOffline);
      setAnalysisStageLabel('Analysis complete');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setErrorMsg('Demo analysis canceled.');
      } else {
        console.error('Demo analysis error:', err);
        setErrorMsg('Unable to load demo case. Please try again.');
      }
    } finally {
      if (analysisAbortRef.current === userController) {
        analysisAbortRef.current = null;
      }
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisStageLabel(null), 1200);
    }
  };

  const handleUpdateDoctorReview = (recordId: string, review: DoctorReviewData) => {
    setLocalRecords((prev) =>
      prev.map((rec) =>
        rec.recordId === recordId ? { ...rec, doctorReview: review } : rec
      )
    );
  };

  const handleCreateReferral = (newReferral: ReferralRecord) => {
    setReferrals((prev) => [newReferral, ...prev]);
    if (newReferral.recordId) {
      setLocalRecords((prev) =>
        prev.map((rec) =>
          rec.recordId === newReferral.recordId
            ? {
                ...rec,
                doctorReview: {
                  ...rec.doctorReview,
                  reviewStatus: 'Referral Recommended',
                  referralReason: newReferral.referralReason,
                },
              }
            : rec
        )
      );
    }
  };

  const handleUpdateReferral = (
    referralId: string,
    updates: Partial<Pick<ReferralRecord, 'referralStatus' | 'followUpStatus' | 'notes'>>
  ) => {
    setReferrals((prev) =>
      prev.map((ref) => (ref.referralId === referralId ? { ...ref, ...updates } : ref))
    );
  };

  const activeLocalRecord = useMemo(
    () =>
      analysis
        ? localRecords.find((r) => r.analysis.caseId === analysis.caseId) ?? null
        : null,
    [analysis, localRecords]
  );

  const handleSaveClinicianDecision = useCallback(
    (decision: ClinicianDecision, notes: string) => {
      if (!analysis) return;
      const mappedStatus: DoctorReviewData['reviewStatus'] =
        decision === 'Agree with AI'
          ? 'Reviewed'
          : decision === 'Needs review'
            ? 'Under Review'
            : 'Follow-up Required';
      const reviewedAt = new Date().toISOString();

      setLocalRecords((prev) =>
        prev.map((rec) =>
          rec.analysis.caseId === analysis.caseId
            ? {
                ...rec,
                doctorReview: {
                  ...rec.doctorReview,
                  clinicianDecision: decision,
                  reviewStatus: mappedStatus,
                  reviewNotes: notes.trim() || rec.doctorReview.reviewNotes,
                  reviewedAt,
                  reviewerName:
                    session?.displayName || rec.doctorReview.reviewerName || 'Clinician / Reviewer',
                },
              }
            : rec
        )
      );
    },
    [analysis, session]
  );

  const handleDeleteHistoryCase = useCallback(
    (caseId: string) => {
      setSessionHistory((prev) => prev.filter((item) => item.analysis.caseId !== caseId));
      setLocalRecords((prev) => prev.filter((rec) => rec.analysis.caseId !== caseId));
      if (analysis?.caseId === caseId) {
        setAnalysis(null);
      }
    },
    [analysis]
  );

  const openCurrentAnalysisInDoctorReview = () => {
    if (analysis) {
      const match = localRecords.find((r) => r.analysis.caseId === analysis.caseId);
      if (match) setSelectedReviewRecordId(match.recordId);
    }
    navigate('doctor-review');
  };

  const openCurrentAnalysisInReferral = () => {
    if (analysis) {
      const match = localRecords.find((r) => r.analysis.caseId === analysis.caseId) ?? null;
      setReferralDraftRecord(match);
    }
    navigate('referrals');
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
        isOffline={isOffline}
        queuedCount={queuedCount}
        onSyncQueuedRecords={handleSyncQueuedRecords}
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
            localRecords={localRecords}
            activeCaseId={analysis?.caseId ?? null}
            onSelectHistoryCase={(entry) => {
              setHasAcknowledgedFeatures(true);
              setAnalysis(entry.analysis);
              setActiveImageUrl(entry.imageUrl);
              setPreQuality(entry.analysis.imageQuality);
            }}
            onDeleteHistoryCase={handleDeleteHistoryCase}
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
            analysisStageLabel={analysisStageLabel}
            errorMsg={errorMsg}
            defaultExplainMode={defaultExplainMode}
            colormap={colormap}
            hasAcknowledgedFeatures={hasAcknowledgedFeatures}
            onAcknowledgeFeatures={() => setHasAcknowledgedFeatures(true)}
            onUploadFile={handleUploadFile}
            onRunAnalysis={handleRunAnalysis}
            onCancelAnalysis={handleCancelAnalysis}
            onResetWorkspace={handleResetWorkspace}
            onSelectDemo={(id) => handleSelectDemo(id)}
            onTestUnsuitableImage={handleTestUnsuitableImage}
            onNavigate={navigate}
            onSendToDoctorReview={openCurrentAnalysisInDoctorReview}
            onCreateReferral={openCurrentAnalysisInReferral}
            activeDoctorReview={activeLocalRecord?.doctorReview ?? null}
            onSaveClinicianDecision={handleSaveClinicianDecision}
            isOffline={isOffline}
            simulatedOffline={simulatedOffline}
            onToggleSimulatedOffline={() => setSimulatedOffline((v) => !v)}
            queuedCount={queuedCount}
            isSyncing={isSyncing}
            syncBanner={syncBanner}
            onSyncQueuedRecords={handleSyncQueuedRecords}
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            onSendChatQuestion={handleSendChatQuestion}
            onClearChat={handleClearChat}
          />
        )}

        {currentPage === 'webcam-scan' && (
          <WebcamEyeScanPage
            localRecords={localRecords}
            analysis={analysis}
            activeFundusImageUrl={activeImageUrl}
            isAnalyzing={isAnalyzing}
            analysisStageLabel={analysisStageLabel}
            errorMsg={errorMsg}
            isOffline={isOffline}
            defaultExplainMode={defaultExplainMode}
            colormap={colormap}
            activeDoctorReview={activeLocalRecord?.doctorReview ?? null}
            onSaveClinicianDecision={handleSaveClinicianDecision}
            onAnalyzeWebcamWorkflowFundus={async ({
              fundusImageUrl,
              pixelStats,
              patientId,
              eyeLaterality,
              deviceLabel,
              externalEyeReference,
            }) => {
              await executeFundusInferencePipeline({
                fundusImageUrl,
                stats: pixelStats,
                patientId,
                eyeLaterality,
                acquisitionSource: 'webcam_assisted_device_import',
                deviceLabel,
                externalEyeReference,
              });
            }}
            onCancelAnalysis={handleCancelAnalysis}
            onNavigate={navigate}
            onSendToDoctorReview={openCurrentAnalysisInDoctorReview}
            onCreateReferral={openCurrentAnalysisInReferral}
            chatMessages={chatMessages}
            chatLoading={chatLoading}
            onSendChatQuestion={handleSendChatQuestion}
            onClearChat={handleClearChat}
          />
        )}

        {currentPage === 'time-machine' && (
          <RetinaTimeMachinePage records={localRecords} />
        )}

        {currentPage === 'doctor-review' && (
          <DoctorReviewPage
            records={localRecords}
            initialRecordId={selectedReviewRecordId}
            onUpdateReview={handleUpdateDoctorReview}
            onCreateReferralFromRecord={(rec) => {
              setReferralDraftRecord(rec);
              navigate('referrals');
            }}
          />
        )}

        {currentPage === 'referrals' && (
          <SmartReferralPage
            records={localRecords}
            referrals={referrals}
            draftRecord={referralDraftRecord}
            onCreateReferral={handleCreateReferral}
            onUpdateReferral={handleUpdateReferral}
          />
        )}

        {currentPage === 'fair-eye' && <FairEyePage records={localRecords} />}

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
            doctorReview={activeLocalRecord?.doctorReview ?? null}
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

