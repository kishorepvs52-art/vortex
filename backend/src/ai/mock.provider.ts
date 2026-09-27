// ═══════════════════════════════════════════════════════════════
// ⚠️  MOCK AI PROVIDER — DEVELOPMENT FALLBACK ONLY  ⚠️
//
// Used when no real AI API key is configured. Every output carries
// isMock=true and provider="mock" so the API, database and UI can
// (and do) label results as SIMULATED — never presented as a real
// diagnosis. Replace by setting AI_PROVIDER + GEMINI_API_KEY /
// OPENAI_API_KEY; no other code changes required.
//
// It is deterministic per image (hash-seeded) and grounded in REAL
// image statistics computed with sharp (discoloured-pixel ratios)
// plus symptom keyword matching against the seeded disease catalogue.
// ═══════════════════════════════════════════════════════════════
import sharp from 'sharp';
import { hashFloat } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';
import type { AIAnalysisInput, AIAnalysisOutput, AIProvider, AIDiseaseContext, SeverityLevel } from './types.js';

interface ImageStats {
  lesionRatio: number; // brown/yellow non-green pixels (stress proxy)
  yellowRatio: number; // chlorosis proxy
  brownRatio: number; // necrosis proxy
  greenRatio: number; // healthy tissue proxy
  meanR: number;
  meanG: number;
  meanB: number;
}

const SEVERITIES: SeverityLevel[] = ['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

async function computeStats(buffer: Buffer): Promise<ImageStats> {
  const { data, info } = await sharp(buffer)
    .resize(64, 64, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let lesion = 0, yellow = 0, brown = 0, green = 0;
  let rSum = 0, gSum = 0, bSum = 0;
  const n = info.width * info.height;

  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    rSum += r; gSum += g; bSum += b;
    const isGreenish = g > r && g > b && g > 50;
    const isYellowish = r > 95 && g > 80 && b < 80 && r - b > 35 && Math.abs(r - g) < 70;
    const isBrownish = r > 60 && r < 190 && g < r && g > 25 && b < g && r - b > 45;
    if (isYellowish) yellow++;
    else if (isBrownish) brown++;
    else if (isGreenish) green++;
    if (isYellowish || isBrownish) lesion++;
  }

  return {
    lesionRatio: lesion / n,
    yellowRatio: yellow / n,
    brownRatio: brown / n,
    greenRatio: green / n,
    meanR: rSum / n,
    meanG: gSum / n,
    meanB: bSum / n,
  };
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
}

const STOPWORDS = new Set(['with', 'from', 'this', 'that', 'have', 'has', 'are', 'the', 'and', 'for', 'leaf', 'leaves', 'plant', 'crop', 'since', 'days', 'week']);

function scoreDisease(
  disease: AIDiseaseContext,
  symptomTokens: Set<string>,
  stats: ImageStats,
  jitter: number,
): number {
  const diseaseTokens = tokenize(`${disease.name} ${disease.symptoms} ${disease.visibleSigns ?? ''}`);
  let overlap = 0;
  for (const t of symptomTokens) {
    if (!STOPWORDS.has(t) && diseaseTokens.has(t)) overlap++;
  }
  let score = overlap * 3;

  // Pathogen priors loosely correlated with real image statistics
  switch (disease.pathogenType) {
    case 'FUNGAL':
      score += stats.brownRatio > 0.08 ? 2.5 : stats.lesionRatio > 0.05 ? 1 : 0;
      break;
    case 'BACTERIAL':
      score += stats.yellowRatio > 0.1 ? 2 : 0;
      score += stats.lesionRatio > 0.15 ? 1 : 0;
      break;
    case 'VIRAL':
      score += /curl|mosaic|yellow|stunt/i.test(disease.name + disease.symptoms) && stats.yellowRatio > 0.08 ? 2.5 : 0;
      break;
    case 'NUTRITIONAL':
      score += stats.yellowRatio > 0.2 && stats.brownRatio < 0.05 ? 2.5 : 0;
      break;
    case 'PEST':
      score += overlap > 0 ? 1.5 : 0;
      break;
    case 'HEALTHY':
      score += stats.greenRatio > 0.5 && stats.lesionRatio < 0.03 ? 4 : -2;
      break;
    default:
      score += stats.lesionRatio > 0.1 ? 1 : 0;
  }

  return score + jitter * 0.75; // deterministic tie-breaker
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly isMock = true;

  async analyze(input: AIAnalysisInput): Promise<AIAnalysisOutput> {
    const t0 = Date.now();
    const { imageBuffer, crop, symptomsText } = input;

    const imageHash = `${imageBuffer.length}:${imageBuffer.subarray(0, 4096).toString('base64')}`;
    const jitter = hashFloat(imageHash + crop.cropName);
    const stats = await computeStats(imageBuffer);

    const symptomTokens = tokenize(symptomsText ?? '');
    const candidates = crop.diseases.length
      ? crop.diseases
      : [{ name: 'Healthy', symptoms: '', pathogenType: 'HEALTHY', defaultSeverity: 'NONE' as SeverityLevel }];

    const scored = candidates
      .map((d) => ({ disease: d, score: scoreDisease(d, symptomTokens, stats, jitter) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const healthy =
      best.disease.pathogenType === 'HEALTHY' ||
      (stats.lesionRatio < 0.025 && symptomTokens.size === 0 && best.score < 1.5);

    // Deterministic confidence in [0.55, 0.97]; ~25 % of diseased cases are
    // pushed below the review threshold so the expert flow is exercised.
    let confidence = healthy
      ? 0.86 + jitter * 0.11
      : 0.62 + Math.min(best.score, 6) * 0.055 + jitter * 0.08;
    if (!healthy && jitter > 0.75) confidence = 0.56 + (jitter - 0.75) * 0.72; // 0.56–0.74
    confidence = Math.min(0.97, Math.max(0.55, confidence));

    // Severity from catalogue default, nudged by measured lesion coverage
    let severityIndex = healthy ? 0 : SEVERITIES.indexOf(best.disease.defaultSeverity ?? 'MODERATE');
    if (!healthy && stats.lesionRatio > 0.35) severityIndex = Math.min(4, severityIndex + 1);
    if (!healthy && stats.lesionRatio < 0.06) severityIndex = Math.max(1, severityIndex - 1);
    const severity = healthy ? 'NONE' : SEVERITIES[Math.max(1, severityIndex)];

    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const indicators = healthy
      ? [
          `Healthy green tissue covers ~${pct(stats.greenRatio)} of the sample area`,
          `Discoloured lesion area below detection baseline (${pct(stats.lesionRatio)})`,
          'No chlorotic or necrotic patterns detected in the sampled region',
        ]
      : [
          `Approx. ${pct(stats.lesionRatio)} of the sampled area shows discoloured (non-green) tissue`,
          stats.yellowRatio > stats.brownRatio
            ? `Yellowing (chlorosis) dominant at ~${pct(stats.yellowRatio)} — typical of ${best.disease.pathogenType.toLowerCase()} stress`
            : `Brown/necrotic lesions dominant at ~${pct(stats.brownRatio)} — typical of ${best.disease.pathogenType.toLowerCase()} infection`,
          symptomsText?.trim()
            ? `Farmer-reported symptoms ("${symptomsText.trim().slice(0, 90)}") match the ${best.disease.name} profile`
            : 'No symptom text supplied — visual evidence only',
        ];

    const label = healthy ? 'Healthy' : best.disease.name;
    const reasoning = healthy
      ? `The leaf shows uniform green coloration with no significant lesions, spotting or wilting. Based on the visual sample the plant appears healthy — continue routine monitoring and preventive care.`
      : `Visual analysis found ${pct(stats.lesionRatio)} affected tissue with a ${
          stats.yellowRatio > stats.brownRatio ? 'chlorotic (yellowing)' : 'necrotic (browning)'
        } pattern most consistent with ${best.disease.name} on ${crop.cropName}. ${
          confidence < 0.75
            ? 'Confidence is limited by image conditions — expert review is recommended for confirmation.'
            : 'The evidence reasonably supports this identification.'
        }`;

    const output: AIAnalysisOutput = {
      provider: 'mock',
      isMock: true,
      modelVersion: 'vortex-heuristic-v1',
      predictedLabel: label,
      confidence: Number(confidence.toFixed(3)),
      severity: severity as SeverityLevel,
      healthy,
      indicators,
      reasoning,
      processingTimeMs: Date.now() - t0,
    };

    logger.info(
      'ai:mock',
      `⚠ SIMULATED result (dev fallback): ${label} @ ${(confidence * 100).toFixed(1)}% — not a real AI diagnosis`,
    );
    return output;
  }
}
