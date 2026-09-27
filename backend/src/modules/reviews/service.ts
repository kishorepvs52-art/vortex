import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { signMediaUrl } from '../../services/mediaSigner.js';
import { notify } from '../../services/notificationService.js';
import { logActivity } from '../../services/activityService.js';
import { buildAnalysisPayload, getAnalysisOr404 } from '../../services/analysisPayload.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { SubmitReviewInput } from './dto.js';

const reviewInclude = {
  analysis: {
    include: {
      cropType: { select: { id: true, name: true, emoji: true } },
      farmer: { select: { id: true, fullName: true } },
      image: { select: { storageKey: true, thumbKey: true } },
      aiResult: {
        select: {
          predictedLabel: true,
          confidence: true,
          severity: true,
          healthy: true,
          isMock: true,
          provider: true,
          indicators: true,
          reasoning: true,
          predictedDiseaseId: true,
        },
      },
    },
  },
  expert: { select: { id: true, fullName: true, expertProfile: { select: { specialization: true } } } },
  finalDisease: { select: { id: true, name: true } },
} as const;

export async function listReviews(
  expertId: string,
  query: { status: string; page: number; pageSize: number; mine: boolean },
) {
  const where = {
    ...(query.status !== 'ALL' ? { status: query.status as 'PENDING' | 'CLAIMED' | 'COMPLETED' } : {}),
    ...(query.mine ? { expertId } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.expertReview.count({ where }),
    prisma.expertReview.findMany({
      where,
      include: reviewInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    total,
    items: rows.map((r) => ({
      id: r.id,
      status: r.status,
      decision: r.decision,
      requestedByFarmer: r.requestedByFarmer,
      createdAt: r.createdAt,
      claimedAt: r.claimedAt,
      completedAt: r.completedAt,
      expert: r.expert
        ? { id: r.expert.id, fullName: r.expert.fullName, specialization: r.expert.expertProfile?.specialization ?? null }
        : null,
      isMine: r.expertId === expertId,
      analysis: {
        id: r.analysis.id,
        status: r.analysis.status,
        createdAt: r.analysis.createdAt,
        cropType: r.analysis.cropType,
        farmerName: r.analysis.farmer.fullName,
        symptoms: r.analysis.symptoms,
        locationText: r.analysis.locationText,
        thumbUrl: signMediaUrl(r.analysis.image.thumbKey ?? r.analysis.image.storageKey),
        ai: r.analysis.aiResult
          ? {
              predictedLabel: r.analysis.aiResult.predictedLabel,
              confidence: r.analysis.aiResult.confidence,
              severity: r.analysis.aiResult.severity,
              isMock: r.analysis.aiResult.isMock,
              provider: r.analysis.aiResult.provider,
            }
          : null,
      },
      finalDisease: r.finalDisease,
    })),
  };
}

export async function getCase(id: string, viewer: AuthUser) {
  const review = await prisma.expertReview.findUnique({ where: { id }, include: reviewInclude });
  if (!review) throw ApiError.notFound('REVIEW_NOT_FOUND', 'Review case not found');
  const analysis = await getAnalysisOr404(review.analysisId);
  return {
    review: {
      id: review.id,
      status: review.status,
      decision: review.decision,
      requestedByFarmer: review.requestedByFarmer,
      confidenceNote: review.confidenceNote,
      treatmentGuidance: review.treatmentGuidance,
      preventiveAdvice: review.preventiveAdvice,
      comments: review.comments,
      finalSeverity: review.finalSeverity,
      finalDisease: review.finalDisease,
      isMine: review.expertId === viewer.id,
      claimedAt: review.claimedAt,
      completedAt: review.completedAt,
      createdAt: review.createdAt,
    },
    analysis: buildAnalysisPayload(analysis, viewer),
  };
}

/** Race-safe claim: only one expert can win a PENDING case. */
export async function claimCase(id: string, expertId: string) {
  const review = await prisma.expertReview.findUnique({ where: { id } });
  if (!review) throw ApiError.notFound('REVIEW_NOT_FOUND', 'Review case not found');
  if (review.status === 'COMPLETED')
    throw ApiError.conflict('REVIEW_COMPLETED', 'This case has already been reviewed');
  if (review.status === 'CLAIMED' && review.expertId === expertId) {
    return { id, status: 'CLAIMED', alreadyMine: true };
  }

  const result = await prisma.expertReview.updateMany({
    where: { id, status: 'PENDING' },
    data: { status: 'CLAIMED', expertId, claimedAt: new Date() },
  });
  if (result.count === 0) throw ApiError.conflict('ALREADY_CLAIMED', 'Another expert claimed this case first');

  await logActivity(expertId, 'REVIEW_CLAIMED', 'ExpertReview', id);
  return { id, status: 'CLAIMED', alreadyMine: false };
}

export async function submitReview(id: string, expertId: string, input: SubmitReviewInput) {
  const review = await prisma.expertReview.findUnique({
    where: { id },
    include: { analysis: { include: { cropType: true } } },
  });
  if (!review) throw ApiError.notFound('REVIEW_NOT_FOUND', 'Review case not found');
  if (review.status === 'COMPLETED')
    throw ApiError.conflict('REVIEW_COMPLETED', 'This case has already been reviewed');
  if (review.status === 'PENDING')
    throw ApiError.conflict('NOT_CLAIMED', 'Claim the case before submitting a review');
  if (review.expertId !== expertId)
    throw ApiError.forbidden('NOT_YOUR_CASE', 'This case was claimed by another expert');

  // CORRECTED decisions must reference a disease of the SAME crop
  let finalDiseaseId: string | null = review.finalDiseaseId;
  if (input.decision === 'CORRECTED') {
    const disease = await prisma.disease.findFirst({
      where: { id: input.finalDiseaseId!, isActive: true, cropTypeId: review.analysis.cropTypeId },
    });
    if (!disease)
      throw ApiError.unprocessable(
        'DISEASE_MISMATCH',
        'Selected disease does not belong to this crop — pick a valid disease or add it via admin',
      );
    finalDiseaseId = disease.id;
  }

  const guidanceSteps = {
    treatment: splitBullets(input.treatmentGuidance),
    prevention: splitBullets(input.preventiveAdvice),
    expertComments: input.comments ? splitBullets(input.comments) : [],
  };

  await prisma.$transaction([
    prisma.expertReview.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        decision: input.decision,
        finalDiseaseId,
        finalSeverity: input.finalSeverity ?? review.finalSeverity,
        treatmentGuidance: input.treatmentGuidance ?? review.treatmentGuidance,
        preventiveAdvice: input.preventiveAdvice ?? review.preventiveAdvice,
        comments: input.comments ?? null,
        confidenceNote: input.confidenceNote ?? review.confidenceNote,
        completedAt: new Date(),
      },
    }),
    prisma.cropAnalysis.update({
      where: { id: review.analysisId },
      data: { status: 'EXPERT_REVIEWED' },
    }),
    prisma.treatmentGuidance.create({
      data: {
        analysisId: review.analysisId,
        source: 'EXPERT',
        title: 'Expert-validated guidance',
        steps: guidanceSteps,
      },
    }),
  ]);

  const expert = await prisma.user.findUnique({ where: { id: expertId }, select: { fullName: true } });
  await notify(
    review.analysis.farmerId,
    'EXPERT_REVIEW_COMPLETED',
    'Expert review completed',
    `${expert?.fullName ?? 'A plant pathology expert'} has reviewed your ${review.analysis.cropType.name} analysis. Open it to see the validated diagnosis and treatment plan.`,
    review.analysisId,
  );
  await logActivity(expertId, 'REVIEW_COMPLETED', 'ExpertReview', id, {
    decision: input.decision,
    analysisId: review.analysisId,
  });

  return { id, status: 'COMPLETED', decision: input.decision };
}

export async function expertStats(expertId: string) {
  const [pending, claimedMine, completedMine, completedTotal] = await prisma.$transaction([
    prisma.expertReview.count({ where: { status: 'PENDING' } }),
    prisma.expertReview.count({ where: { status: 'CLAIMED', expertId } }),
    prisma.expertReview.count({ where: { status: 'COMPLETED', expertId } }),
    prisma.expertReview.count({ where: { status: 'COMPLETED' } }),
  ]);
  const recent = await prisma.expertReview.findMany({
    where: { status: 'COMPLETED', expertId },
    orderBy: { completedAt: 'desc' },
    take: 5,
    include: { analysis: { include: { cropType: { select: { name: true, emoji: true } } } } },
  });
  return {
    pending,
    claimedMine,
    completedMine,
    completedTotal,
    recent: recent.map((r) => ({
      id: r.id,
      analysisId: r.analysisId,
      decision: r.decision,
      cropName: r.analysis.cropType.name,
      emoji: r.analysis.cropType.emoji,
      completedAt: r.completedAt,
    })),
  };
}

function splitBullets(text?: string | null): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n|•/)
    .map((s) => s.replace(/^[-*\s]+/, '').trim())
    .filter(Boolean);
}
