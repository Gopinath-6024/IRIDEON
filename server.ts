import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { validateFundusImageDataUrl } from './server/services/imageValidation.ts';
import {
  analyzeRetinalImage,
  evaluateImageQuality,
  SAFETY_DISCLAIMER,
} from './server/services/modelService.ts';
import {
  generateRetinaExplanation,
  streamRetinaExplanation,
} from './server/services/geminiExplainService.ts';
import type {
  ClientPixelStats,
  DemoCaseId,
  ExplainMode,
  ResearcherSession,
  RetinaAnalysisResult,
} from './src/types/retina.ts';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '15mb' }));

// Ephemeral in-memory researcher sessions (no persistent storage of medical data)
const sessions = new Map<string, ResearcherSession>();

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    modelAdapter: process.env.ML_BACKEND_URL ? 'EXTERNAL_ML_ENDPOINT' : 'DEMO_EDUCATIONAL',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  });
});

// Researcher session auth (in-memory only, respects non-persistent privacy contract)
app.post('/api/auth/login', (req, res) => {
  try {
    const { researcherId, displayName, role, institution } = req.body ?? {};
    const cleanId =
      typeof researcherId === 'string' && researcherId.trim().length >= 2
        ? researcherId.trim().slice(0, 40)
        : 'RES-DEMO-01';
    const cleanName =
      typeof displayName === 'string' && displayName.trim().length >= 2
        ? displayName.trim().slice(0, 60)
        : 'Dr. Elena Vance (Demo)';
    const cleanRole =
      typeof role === 'string' && role.trim().length >= 2
        ? role.trim().slice(0, 50)
        : 'Ophthalmology XAI Researcher';
    const cleanInst =
      typeof institution === 'string' && institution.trim().length >= 2
        ? institution.trim().slice(0, 80)
        : 'Academic Retinal Imaging Lab';

    const token = crypto.randomBytes(24).toString('hex');
    const session: ResearcherSession = {
      token,
      researcherId: cleanId,
      displayName: cleanName,
      role: cleanRole,
      institution: cleanInst,
      signedInAt: new Date().toISOString(),
    };
    sessions.set(token, session);
    res.json({ session });
  } catch {
    res.status(400).json({ error: 'Unable to initialize researcher session.' });
  }
});

app.get('/api/auth/session', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || !sessions.has(token)) {
    res.status(401).json({ error: 'No active researcher session.' });
    return;
  }
  res.json({ session: sessions.get(token) });
});

app.post('/api/auth/logout', (req, res) => {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (token) {
    sessions.delete(token);
  }
  res.json({ ok: true });
});

// Image Quality Assessment endpoint
app.post('/api/image-quality', (req, res) => {
  try {
    const { imageDataUrl, pixelStats } = (req.body ?? {}) as {
      imageDataUrl?: string;
      pixelStats?: ClientPixelStats;
    };

    if (!imageDataUrl) {
      res.status(400).json({ error: 'No image was provided for quality assessment.' });
      return;
    }

    const validation = validateFundusImageDataUrl(imageDataUrl);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const quality = evaluateImageQuality(validation.info, pixelStats);
    res.json({ imageQuality: quality });
  } catch (err) {
    console.error('[IRIDEON] /api/image-quality error:', err);
    res.status(500).json({ error: 'IRIDEON could not assess image quality. Please try again.' });
  }
});

// Retinal Analysis endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const { sourceType, demoCaseId, imageDataUrl, pixelStats } = (req.body ?? {}) as {
      sourceType?: 'demo' | 'upload';
      demoCaseId?: DemoCaseId;
      imageDataUrl?: string;
      pixelStats?: ClientPixelStats;
    };

    if (sourceType === 'demo') {
      const allowedDemoIds: DemoCaseId[] = ['demo-a', 'demo-b', 'demo-c'];
      const chosenDemo: DemoCaseId =
        demoCaseId && allowedDemoIds.includes(demoCaseId) ? demoCaseId : 'demo-b';
      const result = await analyzeRetinalImage({
        sourceType: 'demo',
        demoCaseId: chosenDemo,
      });
      res.json(result);
      return;
    }

    if (!imageDataUrl) {
      res.status(400).json({ error: 'Please upload a retinal fundus image or select a demo case.' });
      return;
    }

    const validation = validateFundusImageDataUrl(imageDataUrl);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const preQuality = evaluateImageQuality(validation.info, pixelStats);
    if (!preQuality.suitable) {
      res.status(422).json({
        error: preQuality.suitabilityMessage,
        imageQuality: preQuality,
      });
      return;
    }

    const result = await analyzeRetinalImage({
      sourceType: 'upload',
      imageInfo: validation.info,
      pixelStats,
      imageDataUrl,
    });
    res.json(result);
  } catch (err) {
    console.error('[IRIDEON] /api/analyze error:', err);
    const message =
      err instanceof Error && err.name === 'AbortError'
        ? 'Analysis timed out while waiting for the inference service.'
        : 'IRIDEON could not complete the analysis. Please try again.';
    res.status(502).json({ error: message });
  }
});

// Prototype Offline Record Synchronization endpoint (ephemeral in-memory acknowledgment; no real cloud clinical DB)
const syncedPrototypeRegistry = new Map<string, { syncedAt: string; patientDemoId: string }>();

app.post('/api/sync-records', (req, res) => {
  try {
    const { records } = (req.body ?? {}) as {
      records?: { recordId?: string; patientDemoId?: string }[];
    };
    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ error: 'No queued records provided for synchronization.' });
      return;
    }

    const syncedAt = new Date().toISOString();
    const syncedIds: string[] = [];
    for (const r of records.slice(0, 50)) {
      if (typeof r?.recordId === 'string' && r.recordId.trim()) {
        const cleanId = r.recordId.trim().slice(0, 64);
        syncedPrototypeRegistry.set(cleanId, {
          syncedAt,
          patientDemoId: typeof r.patientDemoId === 'string' ? r.patientDemoId.slice(0, 40) : 'DEMO',
        });
        syncedIds.push(cleanId);
      }
    }

    res.json({
      ok: true,
      syncedIds,
      syncedAt,
      mode: 'PROTOTYPE_EPHEMERAL_SYNC',
      notice:
        'Prototype synchronization acknowledged in server session memory. No real hospital or cloud EHR database is attached.',
    });
  } catch {
    res.status(500).json({ error: 'Unable to process prototype record synchronization.' });
  }
});

// IRIDEON Doubt Clarifier (Standard JSON)
app.post('/api/explain', async (req, res) => {
  try {
    const { question, mode, analysis, history } = (req.body ?? {}) as {
      question?: string;
      mode?: ExplainMode;
      analysis?: RetinaAnalysisResult | null;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (typeof question !== 'string' || question.trim().length < 1) {
      res.status(400).json({ error: 'Please enter a question for IRIDEON.' });
      return;
    }

    const answer = await generateRetinaExplanation({
      question: question.trim().slice(0, 1200),
      mode: mode === 'technical' ? 'technical' : 'beginner',
      analysis: analysis ?? null,
      history,
    });

    res.json({ answer });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '';
    if (errMsg === 'GEMINI_API_KEY_MISSING') {
      res.status(503).json({
        error:
          'IRIDEON AI service is not configured in this environment. Check Settings > Secrets for GEMINI_API_KEY.',
      });
      return;
    }
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      res.status(429).json({
        error: 'IRIDEON rate limit reached. Please wait a moment and try again.',
      });
      return;
    }
    res.status(502).json({
      error: 'IRIDEON could not generate a response right now. Please try again.',
    });
  }
});

// IRIDEON Doubt Clarifier (High-Speed Real-Time SSE Streaming)
app.post('/api/explain/stream', async (req, res) => {
  const { question, mode, analysis, history } = (req.body ?? {}) as {
    question?: string;
    mode?: ExplainMode;
    analysis?: RetinaAnalysisResult | null;
    history?: { role: 'user' | 'assistant'; content: string }[];
  };

  if (typeof question !== 'string' || question.trim().length < 1) {
    res.status(400).json({ error: 'Please enter a question for IRIDEON.' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const stream = streamRetinaExplanation({
      question: question.trim().slice(0, 1200),
      mode: mode === 'technical' ? 'technical' : 'beginner',
      analysis: analysis ?? null,
      history,
    });

    for await (const delta of stream) {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : '';
    const friendlyError =
      errMsg === 'GEMINI_API_KEY_MISSING'
        ? 'IRIDEON AI service is not configured in this environment. Check Settings > Secrets for GEMINI_API_KEY.'
        : errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')
          ? 'IRIDEON rate limit reached. Please wait a moment and try again.'
          : 'IRIDEON could not generate a response right now. Please try again.';
    res.write(`data: ${JSON.stringify({ error: friendlyError })}\n\n`);
    res.end();
  }
});

// Case Report Generator endpoint
app.post('/api/report', (req, res) => {
  try {
    const { analysis, researcherNotes, patientCaseId, clinicianReview } = (req.body ?? {}) as {
      analysis?: RetinaAnalysisResult;
      researcherNotes?: string;
      patientCaseId?: string;
      clinicianReview?: {
        decision?: string | null;
        reviewStatus?: string;
        notes?: string;
        reviewedAt?: string | null;
      };
    };

    if (!analysis || !analysis.caseId) {
      res.status(400).json({ error: 'No completed analysis was provided to generate a report.' });
      return;
    }

    const sanitizedNotes =
      typeof researcherNotes === 'string' ? researcherNotes.trim().slice(0, 1000) : '';
    const sanitizedCaseTag =
      typeof patientCaseId === 'string' && patientCaseId.trim().length > 0
        ? patientCaseId.trim().slice(0, 48)
        : analysis.caseId;

    res.json({
      reportId: `RPT-${analysis.caseId}`,
      generatedAt: new Date().toISOString(),
      caseId: analysis.caseId,
      patientCaseId: sanitizedCaseTag,
      analyzedAt: analysis.analyzedAt,
      sourceType: analysis.sourceType,
      demoLabel: analysis.demoLabel ?? null,
      imageQuality: analysis.imageQuality,
      prediction: analysis.prediction,
      modelConfidenceEstimate: analysis.confidence,
      confidenceNote: 'Model confidence estimate (prototype score — not a clinically calibrated probability)',
      uncertainty: analysis.uncertainty,
      decisionSupport: analysis.decisionSupport ?? null,
      clinicianReview: clinicianReview ?? null,
      detectedFeatures: analysis.detectedFeatures.filter((f) => f.detected),
      topContributingRegions: analysis.evidenceTrail,
      explanationSummary: analysis.explanation.summary,
      limitations: analysis.explanation.limitations,
      researcherNotes: sanitizedNotes,
      safetyDisclaimer: SAFETY_DISCLAIMER,
      privacyNotice:
        'No personally identifiable patient information or raw fundus imagery is retained on the server.',
    });
  } catch (err) {
    console.error('[IRIDEON] /api/report error:', err);
    res.status(500).json({ error: 'IRIDEON could not compile the case report. Please try again.' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RETINA-XAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
