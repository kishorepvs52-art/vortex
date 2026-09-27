import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { logActivity } from '../../services/activityService.js';
import { notify } from '../../services/notificationService.js';
import { setSetting as persistSetting } from '../../services/settingsService.js';
import { signMediaUrl } from '../../services/mediaSigner.js';
import type { AuthUser } from '../../middleware/auth.js';

// ─────────────────────────── Dashboard stats ───────────────────────────

export async function getStats() {
  const [
    totalUsers,
    farmers,
    experts,
    admins,
    pendingExperts,
    totalAnalyses,
    processing,
    aiCompleted,
    reviewPending,
    reviewDone,
    failed,
    reviewsPending,
    reviewsClaimed,
    reviewsCompleted,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'FARMER' } }),
    prisma.user.count({ where: { role: 'EXPERT', isActive: true } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'EXPERT', isActive: false } }),
    prisma.cropAnalysis.count(),
    prisma.cropAnalysis.count({ where: { status: 'PROCESSING' } }),
    prisma.cropAnalysis.count({ where: { status: 'AI_COMPLETED' } }),
    prisma.cropAnalysis.count({ where: { status: 'EXPERT_REVIEW_PENDING' } }),
    prisma.cropAnalysis.count({ where: { status: 'EXPERT_REVIEWED' } }),
    prisma.cropAnalysis.count({ where: { status: 'FAILED' } }),
    prisma.expertReview.count({ where: { status: 'PENDING' } }),
    prisma.expertReview.count({ where: { status: 'CLAIMED' } }),
    prisma.expertReview.count({ where: { status: 'COMPLETED' } }),
  ]);

  // Disease distribution (top 8 by AI-predicted disease)
  const diseaseGroups = await prisma.aIResult.groupBy({
    by: ['predictedDiseaseId'],
    _count: { _all: true },
    where: { predictedDiseaseId: { not: null } },
    orderBy: { _count: { predictedDiseaseId: 'desc' } },
    take: 8,
  });
  const diseaseIds = diseaseGroups.map((g) => g.predictedDiseaseId!).filter(Boolean);
  const diseases = await prisma.disease.findMany({
    where: { id: { in: diseaseIds } },
    select: { id: true, name: true, cropType: { select: { name: true, emoji: true } } },
  });
  const diseaseStats = diseaseGroups
    .map((g) => {
      const d = diseases.find((x) => x.id === g.predictedDiseaseId);
      return d ? { id: d.id, name: d.name, cropName: d.cropType.name, emoji: d.cropType.emoji, count: g._count._all } : null;
    })
    .filter(Boolean);

  // Analyses per day — last 14 days
  const since = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);
  const recentAnalyses = await prisma.cropAnalysis.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const perDay: { date: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    perDay.push({ date: key, count: 0 });
  }
  for (const a of recentAnalyses) {
    const key = a.createdAt.toISOString().slice(0, 10);
    const slot = perDay.find((p) => p.date === key);
    if (slot) slot.count++;
  }

  // Provider split (mock vs real)
  const mockCount = await prisma.aIResult.count({ where: { isMock: true } });
  const realCount = await prisma.aIResult.count({ where: { isMock: false } });

  return {
    users: { total: totalUsers, farmers, experts, admins, pendingExperts },
    analyses: { total: totalAnalyses, processing, aiCompleted, reviewPending, reviewDone, failed },
    reviews: { pending: reviewsPending, claimed: reviewsClaimed, completed: reviewsCompleted },
    diseaseStats,
    analysesPerDay: perDay,
    aiProviders: { mock: mockCount, real: realCount },
  };
}

export async function getActivity(limit = 30) {
  const rows = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 100),
    include: { actor: { select: { fullName: true, role: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    meta: r.meta,
    actor: r.actor ? { fullName: r.actor.fullName, role: r.actor.role } : null,
    createdAt: r.createdAt,
  }));
}

// ─────────────────────────── User management ───────────────────────────

export async function listUsers(query: { page: number; pageSize: number; role?: string; active?: string; q?: string }) {
  const where = {
    ...(query.role ? { role: query.role as 'FARMER' | 'EXPERT' | 'ADMIN' } : {}),
    ...(query.active ? { isActive: query.active === 'true' } : {}),
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' as const } },
            { email: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        farmerProfile: { select: { village: true, district: true, state: true } },
        expertProfile: { select: { specialization: true } },
        _count: { select: { analyses: true, reviewsGiven: true } },
      },
    }),
  ]);
  return {
    total,
    items: rows.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      phone: u.phone,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      location: u.farmerProfile
        ? [u.farmerProfile.village, u.farmerProfile.district, u.farmerProfile.state].filter(Boolean).join(', ') || null
        : null,
      specialization: u.expertProfile?.specialization ?? null,
      analysesCount: u._count.analyses,
      reviewsCount: u._count.reviewsGiven,
    })),
  };
}

export async function updateUser(
  id: string,
  admin: AuthUser,
  data: { role?: string; isActive?: boolean; fullName?: string; phone?: string | null },
) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw ApiError.notFound('USER_NOT_FOUND', 'User not found');
  if (target.id === admin.id) {
    if (data.role && data.role !== target.role)
      throw ApiError.badRequest('SELF_ROLE_CHANGE', 'You cannot change your own role');
    if (data.isActive === false) throw ApiError.badRequest('SELF_DEACTIVATE', 'You cannot deactivate your own account');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.role ? { role: data.role as 'FARMER' | 'EXPERT' | 'ADMIN' } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.fullName ? { fullName: data.fullName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
    },
    select: { id: true, fullName: true, email: true, role: true, isActive: true },
  });
  await logActivity(admin.id, 'ADMIN_USER_UPDATED', 'User', id, data);
  return updated;
}

// ─────────────────────────── Expert approvals ──────────────────────────

export async function listExperts(statusFilter: 'pending' | 'active' | 'all') {
  const where = {
    role: 'EXPERT' as const,
    ...(statusFilter === 'pending' ? { isActive: false } : {}),
    ...(statusFilter === 'active' ? { isActive: true } : {}),
  };
  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      expertProfile: true,
      _count: { select: { reviewsGiven: true } },
    },
  });
  return rows.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    isActive: u.isActive,
    createdAt: u.createdAt,
    reviewsCompleted: u._count.reviewsGiven,
    profile: u.expertProfile
      ? {
          specialization: u.expertProfile.specialization,
          qualification: u.expertProfile.qualification,
          licenseNumber: u.expertProfile.licenseNumber,
          yearsExperience: u.expertProfile.yearsExperience,
          bio: u.expertProfile.bio,
          rating: u.expertProfile.rating,
        }
      : null,
  }));
}

export async function setExpertApproval(id: string, admin: AuthUser, approve: boolean) {
  const expert = await prisma.user.findUnique({ where: { id } });
  if (!expert || expert.role !== 'EXPERT') throw ApiError.notFound('EXPERT_NOT_FOUND', 'Expert not found');

  const updated = await prisma.user.update({ where: { id }, data: { isActive: approve } });
  await notify(
    id,
    'SYSTEM',
    approve ? 'Expert account approved' : 'Expert account deactivated',
    approve
      ? 'Your VORTEX expert account has been approved. You can now sign in and review cases.'
      : 'Your VORTEX expert account has been deactivated by an administrator.',
  ).catch(() => undefined);
  await logActivity(admin.id, approve ? 'EXPERT_APPROVED' : 'EXPERT_DEACTIVATED', 'User', id);
  return { id, isActive: updated.isActive };
}

// ─────────────────────────── Catalogue CRUD ────────────────────────────

export async function listCropsAdmin() {
  const crops = await prisma.cropType.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { diseases: true, analyses: true } } },
  });
  return crops.map((c) => ({ ...c, diseaseCount: c._count.diseases, analysisCount: c._count.analyses }));
}

export async function createCrop(admin: AuthUser, data: Record<string, unknown>) {
  const crop = await prisma.cropType.create({ data: data as never });
  await logActivity(admin.id, 'CROP_CREATED', 'CropType', crop.id, { name: crop.name });
  return crop;
}

export async function updateCrop(id: string, admin: AuthUser, data: Record<string, unknown>) {
  const crop = await prisma.cropType.update({ where: { id }, data: data as never }).catch(() => {
    throw ApiError.notFound('CROP_NOT_FOUND', 'Crop not found');
  });
  await logActivity(admin.id, 'CROP_UPDATED', 'CropType', id);
  return crop;
}

export async function deleteCrop(id: string, admin: AuthUser) {
  const usage = await prisma.cropAnalysis.count({ where: { cropTypeId: id } });
  if (usage > 0) {
    // Soft-delete to preserve history integrity
    await prisma.cropType.update({ where: { id }, data: { isActive: false } });
    await logActivity(admin.id, 'CROP_DEACTIVATED', 'CropType', id, { reason: `${usage} analyses reference it` });
    return { id, deactivated: true, message: `Crop has ${usage} analyses — deactivated instead of deleted` };
  }
  await prisma.cropType.delete({ where: { id } }).catch(() => {
    throw ApiError.notFound('CROP_NOT_FOUND', 'Crop not found');
  });
  await logActivity(admin.id, 'CROP_DELETED', 'CropType', id);
  return { id, deactivated: false, deleted: true };
}

export async function listDiseasesAdmin(cropTypeId?: string) {
  return prisma.disease.findMany({
    where: cropTypeId ? { cropTypeId } : undefined,
    orderBy: [{ cropTypeId: 'asc' }, { name: 'asc' }],
    include: { cropType: { select: { id: true, name: true, emoji: true } } },
  });
}

export async function createDisease(admin: AuthUser, data: Record<string, unknown>) {
  const crop = await prisma.cropType.findUnique({ where: { id: (data as { cropTypeId: string }).cropTypeId } });
  if (!crop) throw ApiError.unprocessable('CROP_NOT_FOUND', 'Selected crop does not exist');
  const disease = await prisma.disease.create({ data: data as never });
  await logActivity(admin.id, 'DISEASE_CREATED', 'Disease', disease.id, { name: disease.name });
  return disease;
}

export async function updateDisease(id: string, admin: AuthUser, data: Record<string, unknown>) {
  const disease = await prisma.disease.update({ where: { id }, data: data as never }).catch(() => {
    throw ApiError.notFound('DISEASE_NOT_FOUND', 'Disease not found');
  });
  await logActivity(admin.id, 'DISEASE_UPDATED', 'Disease', id);
  return disease;
}

export async function deleteDisease(id: string, admin: AuthUser) {
  const usage = await prisma.aIResult.count({ where: { predictedDiseaseId: id } });
  if (usage > 0) {
    await prisma.disease.update({ where: { id }, data: { isActive: false } });
    await logActivity(admin.id, 'DISEASE_DEACTIVATED', 'Disease', id);
    return { id, deactivated: true, message: `Disease referenced by ${usage} AI results — deactivated` };
  }
  await prisma.disease.delete({ where: { id } }).catch(() => {
    throw ApiError.notFound('DISEASE_NOT_FOUND', 'Disease not found');
  });
  await logActivity(admin.id, 'DISEASE_DELETED', 'Disease', id);
  return { id, deactivated: false, deleted: true };
}

// ─────────────────────────── Monitors & reports ────────────────────────

export async function listAnalysesAdmin(query: { page: number; pageSize: number; status?: string; provider?: string }) {
  const where = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.provider === 'mock' ? { aiResult: { isMock: true } } : {}),
    ...(query.provider === 'real' ? { aiResult: { isMock: false } } : {}),
  };
  const [total, rows] = await prisma.$transaction([
    prisma.cropAnalysis.count({ where }),
    prisma.cropAnalysis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        farmer: { select: { fullName: true, email: true } },
        cropType: { select: { name: true, emoji: true } },
        image: { select: { thumbKey: true, storageKey: true } },
        aiResult: { select: { predictedLabel: true, confidence: true, severity: true, provider: true, isMock: true } },
        expertReview: { select: { status: true } },
      },
    }),
  ]);
  return {
    total,
    items: rows.map((a) => ({
      id: a.id,
      status: a.status,
      createdAt: a.createdAt,
      farmer: a.farmer,
      cropType: a.cropType,
      thumbUrl: signMediaUrl(a.image.thumbKey ?? a.image.storageKey),
      ai: a.aiResult,
      reviewStatus: a.expertReview?.status ?? null,
    })),
  };
}

export async function buildAnalysesCsv(range?: { from?: Date; to?: Date }) {
  const rows = await prisma.cropAnalysis.findMany({
    where:
      range?.from || range?.to
        ? {
            createdAt: {
              ...(range.from ? { gte: range.from } : {}),
              ...(range.to ? { lte: range.to } : {}),
            },
          }
        : undefined,
    orderBy: { createdAt: 'desc' },
    take: 2000,
    include: {
      farmer: { select: { fullName: true, email: true } },
      cropType: { select: { name: true } },
      aiResult: { select: { predictedLabel: true, confidence: true, severity: true, provider: true, isMock: true } },
      expertReview: { select: { status: true, decision: true, finalDisease: { select: { name: true } } } },
    },
  });
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['id', 'created_at', 'farmer', 'email', 'crop', 'status', 'ai_label', 'ai_confidence', 'ai_severity', 'ai_provider', 'is_mock', 'review_status', 'review_decision', 'final_disease'];
  const lines = rows.map((r) =>
    [
      r.id,
      r.createdAt.toISOString(),
      r.farmer.fullName,
      r.farmer.email,
      r.cropType.name,
      r.status,
      r.aiResult?.predictedLabel ?? '',
      r.aiResult ? r.aiResult.confidence.toFixed(3) : '',
      r.aiResult?.severity ?? '',
      r.aiResult?.provider ?? '',
      r.aiResult?.isMock ?? '',
      r.expertReview?.status ?? '',
      r.expertReview?.decision ?? '',
      // Only report the disease once the expert has actually decided —
      // before that, finalDiseaseId holds the AI's *suggested* pick.
      r.expertReview?.status === 'COMPLETED' ? r.expertReview?.finalDisease?.name ?? '' : '',
    ]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export async function buildUsersCsv() {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5000,
    include: {
      farmerProfile: { select: { village: true, district: true, state: true } },
      expertProfile: { select: { specialization: true, qualification: true } },
      _count: { select: { analyses: true, reviewsGiven: true } },
    },
  });
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['id', 'full_name', 'email', 'phone', 'role', 'is_active', 'region', 'specialization', 'analyses', 'reviews', 'last_login_at', 'created_at'];
  const lines = rows.map((u) =>
    [
      u.id,
      u.fullName,
      u.email,
      u.phone ?? '',
      u.role,
      u.isActive,
      u.farmerProfile
        ? [u.farmerProfile.village, u.farmerProfile.district, u.farmerProfile.state].filter(Boolean).join(', ')
        : '',
      u.expertProfile?.specialization ?? '',
      u._count.analyses,
      u._count.reviewsGiven,
      u.lastLoginAt ? u.lastLoginAt.toISOString() : '',
      u.createdAt.toISOString(),
    ]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

export async function buildDiseaseCsv() {
  const rows = await prisma.disease.findMany({
    orderBy: [{ cropTypeId: 'asc' }, { name: 'asc' }],
    include: {
      cropType: { select: { name: true } },
      _count: { select: { aiResults: true } },
    },
  });
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['crop', 'disease', 'pathogen_type', 'default_severity', 'common', 'active', 'times_predicted'];
  const lines = rows.map((d) =>
    [d.cropType.name, d.name, d.pathogenType, d.defaultSeverity, d.isCommon, d.isActive, d._count.aiResults]
      .map(esc)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

// ─────────────────────────── Settings ──────────────────────────────────

const SETTING_VALIDATORS: Record<string, (v: string) => boolean> = {
  expert_review_threshold: (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1,
  platform_announcement: (v) => v.length <= 500,
  maintenance_mode: (v) => ['true', 'false'].includes(v),
};

export async function putSetting(admin: AuthUser, key: string, value: string) {
  const validator = SETTING_VALIDATORS[key];
  if (!validator) throw ApiError.badRequest('SETTING_UNKNOWN', `Setting "${key}" is not editable`);
  if (!validator(value)) throw ApiError.unprocessable('SETTING_INVALID', `Invalid value for "${key}"`);
  const setting = await persistSetting(key, value, admin.id);
  await logActivity(admin.id, 'SETTING_UPDATED', 'SystemSetting', key, { value });
  return setting;
}
