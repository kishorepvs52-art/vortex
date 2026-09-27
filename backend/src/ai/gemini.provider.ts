// Real AI provider — Google Gemini vision models.
// Activated with AI_PROVIDER=gemini|auto + GEMINI_API_KEY. Keys stay server-side.
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { buildSystemPrompt, buildUserText, parseModelJson } from './prompts.js';
import { AIProviderError, type AIAnalysisInput, AIAnalysisOutput, AIProvider, SeverityLevel } from './types.js';

const VALID_SEVERITIES = new Set(['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']);

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export class GeminiVisionProvider implements AIProvider {
  readonly name = 'gemini';
  readonly isMock = false;

  async analyze(input: AIAnalysisInput): Promise<AIAnalysisOutput> {
    const t0 = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent`;

    const body = {
      systemInstruction: { parts: [{ text: buildSystemPrompt(input.crop) }] },
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildUserText(input.symptomsText, input.locationText) },
            { inline_data: { mime_type: input.mimeType || 'image/jpeg', data: input.imageBuffer.toString('base64') } },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json' },
    };

    let res: Response | null = null;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetchWithTimeout(
          url,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
            body: JSON.stringify(body),
          },
          env.AI_TIMEOUT_MS,
        );
        if (res.ok) break;
        lastError = new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 300)}`);
        if (res.status < 500 && res.status !== 429) break; // don't retry client errors
      } catch (e) {
        lastError = e;
      }
      logger.warn('ai:gemini', `Attempt ${attempt + 1} failed — ${String(lastError).slice(0, 200)}`);
    }

    if (!res || !res.ok) {
      throw new AIProviderError(`Gemini analysis failed: ${String(lastError ?? res?.status)}`, lastError);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new AIProviderError('Gemini returned an empty response');

    let parsed: Record<string, unknown>;
    try {
      parsed = parseModelJson(text);
    } catch (e) {
      throw new AIProviderError(`Could not parse Gemini JSON output: ${text.slice(0, 200)}`, e);
    }

    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence ?? 0)));
    const severity = VALID_SEVERITIES.has(String(parsed.severity)) ? (String(parsed.severity) as SeverityLevel) : 'MODERATE';

    return {
      provider: 'gemini',
      isMock: false,
      modelVersion: env.GEMINI_MODEL,
      predictedLabel: String(parsed.predictedLabel ?? 'Unknown'),
      confidence: Number(confidence.toFixed(3)),
      severity,
      healthy: Boolean(parsed.healthy),
      indicators: Array.isArray(parsed.indicators) ? parsed.indicators.map(String).slice(0, 6) : [],
      reasoning: parsed.reasoning ? String(parsed.reasoning) : undefined,
      raw: text.slice(0, 4000),
      processingTimeMs: Date.now() - t0,
    };
  }
}
