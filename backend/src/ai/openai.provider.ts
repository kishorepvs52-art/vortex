// Real AI provider — OpenAI vision models (gpt-4o family).
// Activated with AI_PROVIDER=openai|auto + OPENAI_API_KEY. Keys stay server-side.
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { buildSystemPrompt, buildUserText, parseModelJson } from './prompts.js';
import { AIProviderError, type AIAnalysisInput, AIAnalysisOutput, AIProvider, SeverityLevel } from './types.js';

const VALID_SEVERITIES = new Set(['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']);

export class OpenAIVisionProvider implements AIProvider {
  readonly name = 'openai';
  readonly isMock = false;

  async analyze(input: AIAnalysisInput): Promise<AIAnalysisOutput> {
    const t0 = Date.now();

    const body = {
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt(input.crop) },
        {
          role: 'user',
          content: [
            { type: 'text', text: buildUserText(input.symptomsText, input.locationText) },
            {
              type: 'image_url',
              image_url: {
                url: `data:${input.mimeType || 'image/jpeg'};base64,${input.imageBuffer.toString('base64')}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
    };

    let res: Response | null = null;
    let lastError: unknown;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (res.ok) break;
        lastError = new Error(`OpenAI API ${res.status}: ${(await res.text()).slice(0, 300)}`);
        if (res.status < 500 && res.status !== 429) break;
      } catch (e) {
        lastError = e;
      }
      logger.warn('ai:openai', `Attempt ${attempt + 1} failed — ${String(lastError).slice(0, 200)}`);
    }
    clearTimeout(timer);

    if (!res || !res.ok) {
      throw new AIProviderError(`OpenAI analysis failed: ${String(lastError ?? res?.status)}`, lastError);
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? '';
    if (!text) throw new AIProviderError('OpenAI returned an empty response');

    let parsed: Record<string, unknown>;
    try {
      parsed = parseModelJson(text);
    } catch (e) {
      throw new AIProviderError(`Could not parse OpenAI JSON output: ${text.slice(0, 200)}`, e);
    }

    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence ?? 0)));
    const severity = VALID_SEVERITIES.has(String(parsed.severity)) ? (String(parsed.severity) as SeverityLevel) : 'MODERATE';

    return {
      provider: 'openai',
      isMock: false,
      modelVersion: env.OPENAI_MODEL,
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
