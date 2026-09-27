// Shared analysis payload builder — one consistent shape for farmer result
// pages, expert case pages and admin monitors. Enforces viewer-based access
// and embeds signed media URLs (so keys never leak to the client).
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { signMediaUrl } from './mediaSigner.js';
import type { AuthUser } from '../middleware/auth.js';

export const analysisFullInclude = {
  farmer: { select: { id: true, fullName: true, email: true, phone: true, farmerProfile: true } },
  cropType: true,
  image: true,
  aiResult: { include: { predictedDisease: true } },
  expertReview: {
    include: {
      expert: { select: { id: true, fullName: true, expertProfile: true } },
      finalDisease: true,
    },
  },
  guidances: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.CropAnalysisInclude;

export type AnalysisFull = Prisma.CropAnalysisGetPayload<{ include: typeof analysisFullInclude }>;

export function canViewAnalysis(analysis: AnalysisFull, viewer: AuthUser): boolean {
  if (viewer.role === 'ADMIN') return true;
  if (viewer.role === 'FARMER') return analysis.farmerId === viewer.id;
  // Experts may view any case that entered the review system
  return viewer.role === 'EXPERT' && analysis.expertReview !== null;
}

export function buildAnalysisPayload(analysis: AnalysisFull, viewer: AuthUser) {
  if (!canViewAnalysis(analysis, viewer)) {
    throw ApiError.forbidden('ANALYSIS_FORBIDDEN', 'You do not have access to this analysis');
  }

  const timeline = [
    { key: 'submitted', label: 'Image submitted', at: analysis.createdAt.toISOString(), done: true },
    {
      key: 'ai',
      label: analysis.aiResult ? 'AI analysis complete' : 'AI analysis',
      at: analysis.aiResult?.createdAt.toISOString() ?? null,
      done: Boolean(analysis.aiResult),
    },
    {
      key: 'review',
      label:
        analysis.expertReview?.status === 'COMPLETED'
          ? 'Expert review completed'
          : analysis.expertReview
            ? 'Expert review in progress'
            : 'Expert review',
      at: analysis.expertReview?.completedAt?.toISOString() ?? analysis.expertReview?.createdAt.toISOString() ?? null,
      done: analysis.expertReview?.status === 'COMPLETED',
      active: Boolean(analysis.expertReview && analysis.expertReview.status !== 'COMPLETED'),
    },
    {
      key: 'final',
      label: 'Final guidance delivered',
      at:
        analysis.status === 'EXPERT_REVIEWED'
          ? analysis.expertReview?.completedAt?.toISOString() ?? null
          : analysis.status === 'AI_COMPLETED'
            ? analysis.aiResult?.createdAt.toISOString() ?? null
            : null,
      done: analysis.status === 'EXPERT_REVIEWED' || analysis.status === 'AI_COMPLETED',
    },
  ];

  return {
    id: analysis.id,
    status: analysis.status,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
    symptoms: analysis.symptoms,
    locationText: analysis.locationText,
    latitude: analysis.latitude,
    longitude: analysis.longitude,
    notes: analysis.notes,
    failureReason: analysis.failureReason,
    cropType: {
      id: analysis.cropType.id,
      name: analysis.cropType.name,
      scientificName: analysis.cropType.scientificName,
      emoji: analysis.cropType.emoji,
    },
    image: {
      url: signMediaUrl(analysis.image.storageKey),
      thumbUrl: analysis.image.thumbKey ? signMediaUrl(analysis.image.thumbKey) : signMediaUrl(analysis.image.storageKey),
      originalName: analysis.image.originalName,
      width: analysis.image.width,
      height: analysis.image.height,
    },
    farmer:
      viewer.role === 'FARMER'
        ? undefined
        : {
            id: analysis.farmer.id,
            fullName: analysis.farmer.fullName,
            location: analysis.farmer.farmerProfile
              ? [analysis.farmer.farmerProfile.village, analysis.farmer.farmerProfile.district, analysis.farmer.farmerProfile.state]
                  .filter(Boolean)
                  .join(', ') || null
              : null,
          },
    aiResult: analysis.aiResult
      ? {
          provider: analysis.aiResult.provider,
          isMock: analysis.aiResult.isMock,
          modelVersion: analysis.aiResult.modelVersion,
          predictedLabel: analysis.aiResult.predictedLabel,
          confidence: analysis.aiResult.confidence,
          severity: analysis.aiResult.severity,
          healthy: analysis.aiResult.healthy,
          indicators: (analysis.aiResult.indicators as string[] | null) ?? [],
          reasoning: analysis.aiResult.reasoning,
          needsExpertReview: analysis.aiResult.needsExpertReview,
          processingTimeMs: analysis.aiResult.processingTimeMs,
          createdAt: analysis.aiResult.createdAt,
          disease: analysis.aiResult.predictedDisease
            ? publicDisease(analysis.aiResult.predictedDisease)
            : null,
        }
      : null,
    expertReview: analysis.expertReview
      ? {
          id: analysis.expertReview.id,
          status: analysis.expertReview.status,
          decision: analysis.expertReview.decision,
          requestedByFarmer: analysis.expertReview.requestedByFarmer,
          confidenceNote: analysis.expertReview.confidenceNote,
          treatmentGuidance: analysis.expertReview.treatmentGuidance,
          preventiveAdvice: analysis.expertReview.preventiveAdvice,
          comments: analysis.expertReview.comments,
          finalSeverity: analysis.expertReview.finalSeverity,
          finalDisease: analysis.expertReview.finalDisease ? publicDisease(analysis.expertReview.finalDisease) : null,
          expert: analysis.expertReview.expert
            ? {
                id: analysis.expertReview.expert.id,
                fullName: analysis.expertReview.expert.fullName,
                specialization: analysis.expertReview.expert.expertProfile?.specialization ?? null,
              }
            : null,
          claimedAt: analysis.expertReview.claimedAt,
          completedAt: analysis.expertReview.completedAt,
          createdAt: analysis.expertReview.createdAt,
        }
      : null,
    guidances: analysis.guidances.map((g) => ({
      id: g.id,
      source: g.source,
      title: g.title,
      steps: g.steps,
      createdAt: g.createdAt,
    })),
    timeline,
  };
}

export function publicDisease(d: {
  id: string;
  name: string;
  pathogenType: string;
  description: string;
  symptoms: string;
  visibleSigns: string | null;
  defaultSeverity: string;
  treatmentSummary: string;
  preventiveSummary: string;
}) {
  return {
    id: d.id,
    name: d.name,
    pathogenType: d.pathogenType,
    description: d.description,
    symptoms: d.symptoms,
    visibleSigns: d.visibleSigns,
    defaultSeverity: d.defaultSeverity,
    treatmentSummary: d.treatmentSummary,
    preventiveSummary: d.preventiveSummary,
  };
}

export async function getAnalysisOr404(id: string): Promise<AnalysisFull> {
  const analysis = await prisma.cropAnalysis.findUnique({ where: { id }, include: analysisFullInclude });
  if (!analysis) throw ApiError.notFound('ANALYSIS_NOT_FOUND', 'Analysis not found');
  return analysis;
}
