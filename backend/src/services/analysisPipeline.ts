// ═══════════════════════════════════════════════════════════════
// Analysis pipeline — the heart of VORTEX.
//   PROCESSING row (already in DB) → AI provider → disease match →
//   AIResult + TreatmentGuidance persisted → confidence/threshold
//   routing → EXPERT_REVIEW_PENDING (review row + notifications)
//   or AI_COMPLETED (final for farmer). Every failure is recorded.
// ═══════════════════════════════════════════════════════════════
import fs from 'node:fs/promises';
import type { AnalysisStatus, Severity } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { aiProvider } from '../ai/registry.js';
import { matchDiseaseLabel } from '../ai/diseaseMatcher.js';
import type { SeverityLevel } from '../ai/types.js';
import { storage } from '../storage/local.provider.js';
import { logger } from '../utils/logger.js';
import { notify, notifyAllExperts } from './notificationService.js';
import { logActivity } from './activityService.js';
import { getExpertReviewThreshold } from './settingsService.js';
import { STALE_PROCESSING_MINUTES } from '../config/constants.js';

const running = new Set<string>();

/** Kick off analysis without blocking the HTTP response. */
export function scheduleAnalysis(analysisId: string) {
  setImmediate(() => {
    runAnalysis(analysisId).catch((err) =>
      logger.error('pipeline', `unhandled pipeline error for ${analysisId}`, err),
    );
  });
}

export async function runAnalysis(analysisId: string): Promise<void> {
  if (running.has(analysisId)) return; // idempotency guard
  running.add(analysisId);

  try {
    const analysis = await prisma.cropAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        cropType: { include: { diseases: { where: { isActive: true } } } },
        image: true,
        farmer: { select: { id: true, fullName: true } },
      },
    });

    if (!analysis) return logger.warn('pipeline', `analysis ${analysisId} vanished before processing`);
    if (analysis.status !== 'PROCESSING') {
      return logger.info('pipeline', `analysis ${analysisId} already ${analysis.status} — skipping`);
    }

    // ── Load the stored image ──
    const imagePath = storage.getLocalPath(analysis.image.storageKey);
    if (!imagePath) throw new Error('Stored image file is missing');
    const imageBuffer = await fs.readFile(imagePath);

    // ── Call the AI provider (mock or real — same contract) ──
    const aiOut = await aiProvider.analyze({
      imageBuffer,
      mimeType: analysis.image.mimeType,
      crop: {
        cropName: analysis.cropType.name,
        scientificName: analysis.cropType.scientificName,
        diseases: analysis.cropType.diseases.map((d) => ({
          name: d.name,
          symptoms: d.symptoms,
          visibleSigns: d.visibleSigns,
          pathogenType: d.pathogenType,
          defaultSeverity: d.defaultSeverity as SeverityLevel,
        })),
      },
      symptomsText: analysis.symptoms,
      locationText: analysis.locationText,
    });

    // ── Match label against the disease catalogue for this crop ──
    const match = aiOut.healthy
      ? { diseaseId: null, matchedBy: 'none' as const }
      : matchDiseaseLabel(
          aiOut.predictedLabel,
          analysis.cropType.diseases.map((d) => ({ id: d.id, name: d.name })),
        );
    const matchedDisease = analysis.cropType.diseases.find((d) => d.id === match.diseaseId) ?? null;

    // ── Routing decision ──
    const threshold = await getExpertReviewThreshold();
    const needsExpertReview =
      !aiOut.healthy &&
      (aiOut.confidence < threshold || !matchedDisease);

    const nextStatus: AnalysisStatus = needsExpertReview ? 'EXPERT_REVIEW_PENDING' : 'AI_COMPLETED';

    // ── Persist AI result + AI guidance in one transaction ──
    const aiGuidanceSteps = buildAIGuidance(aiOut.healthy, matchedDisease);

    await prisma.$transaction([
      prisma.aIResult.create({
        data: {
          analysisId: analysis.id,
          provider: aiOut.provider,
          isMock: aiOut.isMock,
          predictedDiseaseId: matchedDisease?.id ?? null,
          predictedLabel: aiOut.predictedLabel,
          confidence: aiOut.confidence,
          severity: aiOut.severity as Severity,
          healthy: aiOut.healthy,
          indicators: aiOut.indicators as unknown as object[],
          reasoning: aiOut.reasoning ?? null,
          needsExpertReview,
          processingTimeMs: aiOut.processingTimeMs,
          modelVersion: aiOut.modelVersion ?? null,
          rawResponse: aiOut.raw ?? null,
        },
      }),
      prisma.treatmentGuidance.create({
        data: { analysisId: analysis.id, source: 'AI', title: aiOut.healthy ? 'Preventive care plan' : 'AI treatment guidance', steps: aiGuidanceSteps },
      }),
      prisma.cropAnalysis.update({ where: { id: analysis.id }, data: { status: nextStatus } }),
      ...(needsExpertReview
        ? [
            prisma.expertReview.create({
              data: {
                analysisId: analysis.id,
                status: 'PENDING',
                // If the AI matched a disease but confidence is low, keep AI's
                // pick as the suggested final disease for the expert.
                finalDiseaseId: matchedDisease?.id ?? null,
                finalSeverity: aiOut.severity as Severity,
                confidenceNote: matchedDisease
                  ? `AI confidence ${(aiOut.confidence * 100).toFixed(0)}% is below the ${Math.round(threshold * 100)}% review threshold.`
                  : `AI label "${aiOut.predictedLabel}" could not be matched to the ${analysis.cropType.name} disease catalogue.`,
              },
            }),
          ]
        : []),
    ]);

    // ── Notifications ──
    if (needsExpertReview) {
      await notify(
        analysis.farmerId,
        'EXPERT_REVIEW_NEEDED',
        'Expert review in progress',
        `VORTEX AI flagged your ${analysis.cropType.name} analysis for expert validation (confidence ${(aiOut.confidence * 100).toFixed(0)}%). You will be notified when a plant pathology expert completes the review.`,
        analysis.id,
      );
      await notifyAllExperts(
        'EXPERT_REVIEW_ASSIGNED',
        'New case awaiting review',
        `${analysis.cropType.name} — AI suggests "${aiOut.predictedLabel}" at ${(aiOut.confidence * 100).toFixed(0)}% confidence. Open the expert queue to claim it.`,
        analysis.id,
      );
    } else {
      await notify(
        analysis.farmerId,
        'ANALYSIS_COMPLETE',
        aiOut.healthy ? 'Good news — crop looks healthy' : 'Analysis complete',
        aiOut.healthy
          ? `Your ${analysis.cropType.name} sample shows no signs of disease (${(aiOut.confidence * 100).toFixed(0)}% confidence).`
          : `Detected: ${matchedDisease?.name ?? aiOut.predictedLabel} — severity ${aiOut.severity}. View guidance now.`,
        analysis.id,
      );
    }

    await logActivity(null, 'ANALYSIS_COMPLETED', 'CropAnalysis', analysis.id, {
      provider: aiOut.provider,
      isMock: aiOut.isMock,
      label: aiOut.predictedLabel,
      confidence: aiOut.confidence,
      needsExpertReview,
    });

    logger.info(
      'pipeline',
      `analysis ${analysis.id} → ${nextStatus} (${aiOut.provider}${aiOut.isMock ? ', MOCK' : ''}: "${aiOut.predictedLabel}" @ ${(aiOut.confidence * 100).toFixed(1)}%)`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('pipeline', `analysis ${analysisId} FAILED: ${message}`);
    await prisma.$transaction([
      prisma.cropAnalysis.update({
        where: { id: analysisId },
        data: { status: 'FAILED', failureReason: message.slice(0, 500) },
      }),
    ]).catch(() => undefined);
    const analysis = await prisma.cropAnalysis.findUnique({ where: { id: analysisId } });
    if (analysis) {
      await notify(
        analysis.farmerId,
        'ANALYSIS_FAILED',
        'Analysis failed',
        `We could not complete the AI analysis of your crop image (${message.slice(0, 120)}). Your image is safe — please try submitting again.`,
        analysis.id,
      ).catch(() => undefined);
    }
    await logActivity(null, 'ANALYSIS_FAILED', 'CropAnalysis', analysisId, { error: message.slice(0, 300) });
  } finally {
    running.delete(analysisId);
  }
}

function buildAIGuidance(
  healthy: boolean,
  disease: { name: string; treatmentSummary: string; preventiveSummary: string; pathogenType: string } | null,
) {
  if (healthy || !disease) {
    return {
      treatment: ['No treatment required — no disease detected at this time.'],
      prevention: [
        'Continue weekly field scouting (underside of leaves too).',
        'Maintain balanced fertilisation and avoid waterlogging.',
        'Remove and destroy any plant debris after harvest.',
      ],
      safety: [],
      disclaimer: disease ? null : 'Awaiting expert validation for a confirmed treatment plan.',
    };
  }
  const bullets = (text: string) =>
    text
      .split(/\n|•|\|/)
      .map((s) => s.replace(/^[-*\s]+/, '').trim())
      .filter(Boolean);
  return {
    treatment: bullets(disease.treatmentSummary),
    prevention: bullets(disease.preventiveSummary),
    safety: [
      'Wear protective gloves and mask when applying any spray.',
      'Follow the pre-harvest interval stated on the product label.',
      'Prefer evening application; avoid spraying during rain or high wind.',
    ],
    disclaimer: 'AI-generated guidance — consult your local agricultural officer before large-scale application.',
  };
}

/** On boot: any row stuck in PROCESSING (server crashed mid-analysis) → FAILED. */
export async function sweepStaleAnalyses(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000);
  const res = await prisma.cropAnalysis.updateMany({
    where: { status: 'PROCESSING', updatedAt: { lt: cutoff } },
    data: { status: 'FAILED', failureReason: 'Analysis was interrupted by a server restart — please resubmit.' },
  });
  if (res.count > 0) logger.warn('pipeline', `swept ${res.count} stale PROCESSING analyses to FAILED`);
  return res.count;
}
