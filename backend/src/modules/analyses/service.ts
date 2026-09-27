import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { storage } from '../../storage/local.provider.js';
import { scheduleAnalysis } from '../../services/analysisPipeline.js';
import { logActivity } from '../../services/activityService.js';
import { notify, notifyAllExperts } from '../../services/notificationService.js';
import { signMediaUrl } from '../../services/mediaSigner.js';
import {
  analysisFullInclude,
  buildAnalysisPayload,
  getAnalysisOr404,
} from '../../services/analysisPayload.js';
import type { AuthUser } from '../../middleware/auth.js';
import type { CreateAnalysisInput } from './dto.js';

export async function createAnalysis(
  farmerId: string,
  file: Express.Multer.File,
  input: CreateAnalysisInput,
) {
  const crop = await prisma.cropType.findFirst({ where: { id: input.cropTypeId, isActive: true } });
  if (!crop) throw ApiError.unprocessable('CROP_NOT_FOUND', 'Selected crop type does not exist');

  // Validate + normalise + persist the image (real storage, real metadata)
  const stored = await storage.saveImage({
    buffer: file.buffer,
    originalName: file.originalname,
    declaredMimeType: file.mimetype,
  });

  const image = await prisma.uploadedImage.create({
    data: {
      userId: farmerId,
      storageKey: stored.storageKey,
      thumbKey: stored.thumbKey,
      originalName: file.originalname.slice(0, 200),
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
      width: stored.width,
      height: stored.height,
      sha256: stored.sha256,
    },
  });

  const analysis = await prisma.cropAnalysis.create({
    data: {
      farmerId,
      cropTypeId: crop.id,
      imageId: image.id,
      status: 'PROCESSING',
      symptoms: input.symptoms || null,
      locationText: input.locationText || null,
      latitude: typeof input.latitude === 'number' ? input.latitude : null,
      longitude: typeof input.longitude === 'number' ? input.longitude : null,
      notes: input.notes || null,
    },
    select: { id: true, status: true, createdAt: true },
  });

  await logActivity(farmerId, 'ANALYSIS_CREATED', 'CropAnalysis', analysis.id, {
    crop: crop.name,
    requestExpertReview: input.requestExpertReview,
  });

  // Fire the AI pipeline asynchronously — the farmer sees the processing scene
  // and the client polls for status. If they pre-requested expert review, the
  // pipeline result will be routed to an expert regardless of confidence.
  scheduleAnalysis(analysis.id);
  if (input.requestExpertReview) markFarmerRequestedReview(analysis.id, farmerId).catch(() => undefined);

  return { id: analysis.id, status: analysis.status, createdAt: analysis.createdAt };
}

async function markFarmerRequestedReview(analysisId: string, farmerId: string) {
  // Runs after the pipeline creates its review row (if any); if the AI was
  // confident, requestReview() below handles it. This flag only annotates.
  await prisma.expertReview
    .updateMany({ where: { analysisId, status: 'PENDING' }, data: { requestedByFarmer: true } })
    .catch(() => undefined);
  void farmerId;
}

export async function listForFarmer(
  farmerId: string,
  query: { page: number; pageSize: number; status?: string; cropTypeId?: string },
) {
  const where = {
    farmerId,
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.cropTypeId ? { cropTypeId: query.cropTypeId } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.cropAnalysis.count({ where }),
    prisma.cropAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        cropType: { select: { id: true, name: true, emoji: true } },
        image: { select: { storageKey: true, thumbKey: true } },
        aiResult: {
          select: {
            predictedLabel: true,
            confidence: true,
            severity: true,
            healthy: true,
            isMock: true,
            needsExpertReview: true,
          },
        },
        expertReview: { select: { status: true, decision: true } },
      },
    }),
  ]);

  return {
    total,
    items: rows.map((a) => ({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      cropType: a.cropType,
      thumbUrl: signMediaUrl(a.image.thumbKey ?? a.image.storageKey),
      aiSummary: a.aiResult
        ? {
            predictedLabel: a.aiResult.predictedLabel,
            confidence: a.aiResult.confidence,
            severity: a.aiResult.severity,
            healthy: a.aiResult.healthy,
            isMock: a.aiResult.isMock,
          }
        : null,
      reviewStatus: a.expertReview?.status ?? null,
    })),
  };
}

export async function getForViewer(id: string, viewer: AuthUser) {
  const analysis = await getAnalysisOr404(id);
  return buildAnalysisPayload(analysis, viewer);
}

export async function requestReview(id: string, farmerId: string) {
  const analysis = await prisma.cropAnalysis.findUnique({
    where: { id },
    include: { cropType: true, aiResult: true, expertReview: true },
  });
  if (!analysis) throw ApiError.notFound('ANALYSIS_NOT_FOUND', 'Analysis not found');
  if (analysis.farmerId !== farmerId)
    throw ApiError.forbidden('ANALYSIS_FORBIDDEN', 'You can only request reviews for your own analyses');
  if (analysis.status === 'PROCESSING')
    throw ApiError.conflict('ANALYSIS_PROCESSING', 'Analysis is still processing — wait for the AI result first');
  if (analysis.status === 'FAILED')
    throw ApiError.conflict('ANALYSIS_FAILED', 'This analysis failed — please submit the image again');
  if (analysis.expertReview && analysis.expertReview.status !== 'COMPLETED')
    throw ApiError.conflict('REVIEW_ALREADY_EXISTS', 'An expert review is already in progress for this analysis');
  if (analysis.status === 'EXPERT_REVIEWED')
    throw ApiError.conflict('ALREADY_REVIEWED', 'This analysis has already been expert-reviewed');

  const review = await prisma.expertReview.create({
    data: {
      analysisId: analysis.id,
      status: 'PENDING',
      requestedByFarmer: true,
      finalDiseaseId: analysis.aiResult?.predictedDiseaseId ?? null,
      finalSeverity: analysis.aiResult?.severity ?? null,
      confidenceNote: 'Farmer requested expert validation of the AI result.',
    },
  });
  await prisma.cropAnalysis.update({
    where: { id: analysis.id },
    data: { status: 'EXPERT_REVIEW_PENDING' },
  });

  await notifyAllExperts(
    'EXPERT_REVIEW_ASSIGNED',
    'Farmer-requested review',
    `${analysis.cropType.name} case awaits expert validation (farmer request).`,
    analysis.id,
  );
  await logActivity(farmerId, 'REVIEW_REQUESTED', 'ExpertReview', review.id, { analysisId: analysis.id });

  return { reviewId: review.id, status: 'EXPERT_REVIEW_PENDING' };
}

export { analysisFullInclude };
