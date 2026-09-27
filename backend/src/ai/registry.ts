// AI provider registry — env-driven selection with safe fallback.
//   AI_PROVIDER=auto    → gemini if GEMINI_API_KEY, else openai if OPENAI_API_KEY, else mock
//   AI_PROVIDER=gemini  → gemini (falls back to mock WITH a loud warning if key missing)
//   AI_PROVIDER=mock    → always the clearly-labelled dev fallback
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { GeminiVisionProvider } from './gemini.provider.js';
import { MockAIProvider } from './mock.provider.js';
import { OpenAIVisionProvider } from './openai.provider.js';
import type { AIProvider } from './types.js';

function resolveProvider(): AIProvider {
  const choice = env.AI_PROVIDER;

  if (choice === 'gemini' || choice === 'auto') {
    if (env.GEMINI_API_KEY) {
      logger.info('ai', `Using Gemini vision provider (model: ${env.GEMINI_MODEL})`);
      return new GeminiVisionProvider();
    }
    if (choice === 'gemini') {
      logger.warn('ai', 'AI_PROVIDER=gemini but GEMINI_API_KEY is missing → falling back to MOCK (dev only)');
    }
  }

  if (choice === 'openai' || choice === 'auto') {
    if (env.OPENAI_API_KEY) {
      logger.info('ai', `Using OpenAI vision provider (model: ${env.OPENAI_MODEL})`);
      return new OpenAIVisionProvider();
    }
    if (choice === 'openai') {
      logger.warn('ai', 'AI_PROVIDER=openai but OPENAI_API_KEY is missing → falling back to MOCK (dev only)');
    }
  }

  logger.warn(
    'ai',
    '⚠ No real AI provider configured — using MOCK provider (development fallback). ' +
      'All results are labelled isMock=true. Set GEMINI_API_KEY or OPENAI_API_KEY for real analysis.',
  );
  return new MockAIProvider();
}

export const aiProvider: AIProvider = resolveProvider();

export function aiProviderStatus() {
  return {
    provider: aiProvider.name,
    isMock: aiProvider.isMock,
    configured: env.AI_PROVIDER,
  };
}
