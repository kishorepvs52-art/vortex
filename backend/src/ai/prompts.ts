// Shared prompt construction for real vision providers (Gemini / OpenAI).
import { AI_JSON_CONTRACT, type AICropContext } from './types.js';

export function buildSystemPrompt(crop: AICropContext): string {
  const labels = crop.diseases.map((d) => `- ${d.name} (${d.pathogenType})`).join('\n');
  return `You are VORTEX-AI, an expert plant pathologist assisting farmers in India.
You receive ONE photo of a ${crop.cropName} plant/leaf${crop.scientificName ? ` (${crop.scientificName})` : ''}, the farmer's reported symptoms, and optionally their location.

Diagnose the most likely condition. You MUST choose predictedLabel from this list (or "Healthy" if no disease is evident):
${labels}

Rules:
- Base confidence on how clearly visual signs match. Use < 0.75 when the image is ambiguous, the leaf is unhealthy but the disease is unclear, or the best match is weak.
- severity: NONE (healthy), LOW (early/localised), MODERATE (clear spread), HIGH (heavy infection), CRITICAL (crop-loss risk).
- indicators: 2-5 concrete visual findings (lesion colour/shape, coverage %, patterns, chlorosis, wilting, necrosis, sporulation).
- reasoning: 2-3 calm, practical sentences for a farmer.
- Never invent diseases outside the list. If unsure between several, pick the closest and lower confidence.

Respond with STRICT JSON only, exactly this schema:
${AI_JSON_CONTRACT}`;
}

export function buildUserText(symptomsText?: string | null, locationText?: string | null): string {
  const parts = ['Analyse this crop image.'];
  if (symptomsText?.trim()) parts.push(`Farmer-reported symptoms: "${symptomsText.trim()}"`);
  if (locationText?.trim()) parts.push(`Farm location: ${locationText.trim()}`);
  parts.push('Return only the JSON object.');
  return parts.join('\n');
}

/** Robust JSON extraction — models occasionally wrap JSON in code fences. */
export function parseModelJson(text: string): Record<string, unknown> {
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in model response');
  return JSON.parse(cleaned.slice(start, end + 1));
}
