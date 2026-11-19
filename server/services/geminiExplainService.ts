import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { ExplainMode, RetinaAnalysisResult } from '../../src/types/retina.ts';

export interface ExplainRequest {
  question: string;
  mode: ExplainMode;
  analysis?: RetinaAnalysisResult | null;
  history?: { role: 'user' | 'assistant'; content: string }[];
}

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;
let primaryFlashLiteUnavailable = false;

// Bounded short-TTL cache for identical single-turn doubts on the same scan context
const RESPONSE_CACHE_MAX = 120;
const RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000;
const responseCache = new Map<string, { answer: string; ts: number }>();

function buildCacheKey(req: ExplainRequest): string | null {
  if (req.history && req.history.length > 0) return null;
  const caseKey = req.analysis
    ? `${req.analysis.caseId}:${req.analysis.prediction}:${req.analysis.proliferationGrading.level}`
    : 'none';
  return `${req.mode}|${caseKey}|${req.question.trim().toLowerCase()}`;
}

function getCachedAnswer(key: string | null): string | null {
  if (!key) return null;
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > RESPONSE_CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return entry.answer;
}

function setCachedAnswer(key: string | null, answer: string): void {
  if (!key || !answer.trim()) return;
  if (responseCache.size >= RESPONSE_CACHE_MAX) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { answer, ts: Date.now() });
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedAiClient;
}

function buildExplainPromptAndConfig(req: ExplainRequest) {
  const modeInstructions =
    req.mode === 'beginner'
      ? 'Use warm, crystal-clear everyday words. Answer directly in 2–4 short sentences or 3 crisp bullets (~60–95 words max).'
      : 'Use concise clinical ML and ophthalmology terms (~75–120 words max). Reference spatial attribution, AV ratio cues, and uncertainty.';

  const analysisContext = req.analysis
    ? `Active Scan (Educational Simulation — NOT diagnosis):
Case ${req.analysis.caseId} | Prediction: ${req.analysis.prediction} (${req.analysis.confidence}%, Uncertainty: ${req.analysis.uncertainty})
Proliferation: Level ${req.analysis.proliferationGrading.level}/4 (${req.analysis.proliferationGrading.overallPercent}% — ${req.analysis.proliferationGrading.label})
Sugar Est: ${req.analysis.systemicEstimates.bloodSugar.estimatedRangeMgDl} (${req.analysis.systemicEstimates.bloodSugar.status}) | BP Est: ${req.analysis.systemicEstimates.bloodPressure.estimatedRangeMmHg} (${req.analysis.systemicEstimates.bloodPressure.status})
Quality: ${req.analysis.imageQuality.overall} | Features: ${req.analysis.detectedFeatures
        .filter((f) => f.detected)
        .map((f) => `${f.name} (${f.importance})`)
        .join(', ')}
Inside Signs: ${req.analysis.symptoms.insideRetina.map((s) => s.title).join(', ')} | Outside: ${req.analysis.symptoms.outsidePerson.map((s) => s.title).join(', ')}`
    : 'No scan loaded yet. Answer clearly about IRIDEON, Proliferation Grades 1–4, retinal sugar/BP cues, or eye symptoms.';

  const systemInstruction = `You are IRIDEON, a fast, accurate Explainable AI doubt-clarifier assistant.
Rules:
- Never diagnose or prescribe; state briefly it is educational and needs an eye doctor for diagnosis.
- Sugar/BP estimates are educational retinal pattern cues, not glucometer/cuff tests.
- Early diabetic retinopathy is usually painless; actual eye pain or sudden floaters need prompt ophthalmologist care.
- Start answering immediately with zero greeting or filler.
Style: ${modeInstructions}`;

  const historyText = (req.history ?? [])
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'User' : 'IRIDEON'}: ${m.content}`)
    .join('\n');

  const prompt = `${analysisContext}
${historyText ? `\nRecent:\n${historyText}\n` : ''}
Doubt: ${req.question}`;

  return { prompt, systemInstruction };
}

export async function generateRetinaExplanation(req: ExplainRequest): Promise<string> {
  const cacheKey = buildCacheKey(req);
  const cached = getCachedAnswer(cacheKey);
  if (cached) return cached;

  const ai = getAiClient();
  const { prompt, systemInstruction } = buildExplainPromptAndConfig(req);

  if (!primaryFlashLiteUnavailable) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      const text = response.text?.trim();
      if (text) {
        setCachedAnswer(cacheKey, text);
        return text;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('404') && !msg.includes('NOT_FOUND')) {
        throw err;
      }
      primaryFlashLiteUnavailable = true;
    }
  }

  const fallback = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const text = fallback.text?.trim();
  if (!text) {
    throw new Error('EMPTY_MODEL_RESPONSE');
  }
  setCachedAnswer(cacheKey, text);
  return text;
}

export async function* streamRetinaExplanation(
  req: ExplainRequest
): AsyncGenerator<string, void, unknown> {
  const cacheKey = buildCacheKey(req);
  const cached = getCachedAnswer(cacheKey);
  if (cached) {
    yield cached;
    return;
  }

  const ai = getAiClient();
  const { prompt, systemInstruction } = buildExplainPromptAndConfig(req);
  let collected = '';

  if (!primaryFlashLiteUnavailable) {
    let emitted = false;
    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });

      for await (const chunk of stream) {
        const piece = chunk.text;
        if (piece) {
          emitted = true;
          collected += piece;
          yield piece;
        }
      }
      if (emitted) {
        setCachedAnswer(cacheKey, collected.trim());
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (emitted || (!msg.includes('404') && !msg.includes('NOT_FOUND'))) {
        throw err;
      }
      primaryFlashLiteUnavailable = true;
    }
  }

  const fallbackStream = await ai.models.generateContentStream({
    model: 'gemini-4-hydrogen',
    contents: prompt,
    config: {
      systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  for await (const chunk of fallbackStream) {
    const piece = chunk.text;
    if (piece) {
      collected += piece;
      yield piece;
    }
  }
  if (collected.trim()) {
    setCachedAnswer(cacheKey, collected.trim());
  }
}
