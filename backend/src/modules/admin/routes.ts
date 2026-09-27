// Admin surface — every route requires ADMIN role (farmers/experts → 403).
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, created, paginated } from '../../utils/respond.js';
import { listSettings } from '../../services/settingsService.js';
import { prisma } from '../../lib/prisma.js';
import * as adminService from './service.js';
import {
  adminAnalysisQuerySchema,
  cropUpsertSchema,
  diseaseUpsertSchema,
  idParamSchema,
  settingUpsertSchema,
  updateUserSchema,
  userListQuerySchema,
} from './dto.js';
import { reviewListQuerySchema } from '../reviews/dto.js';
import * as reviewService from '../reviews/service.js';

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireRole('ADMIN'));

// ── Dashboard ──
adminRoutes.get(
  '/stats',
  asyncHandler(async (_req, res) => ok(res, await adminService.getStats())),
);
adminRoutes.get(
  '/activity',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    ok(res, await adminService.getActivity(limit));
  }),
);

// ── Users ──
adminRoutes.get(
  '/users',
  validate({ query: userListQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { page: number; pageSize: number; role?: string; active?: string; q?: string };
    const { total, items } = await adminService.listUsers(q);
    paginated(res, items, { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) });
  }),
);
adminRoutes.patch(
  '/users/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  asyncHandler(async (req, res) => ok(res, await adminService.updateUser(req.params.id, req.user!, req.body))),
);

// ── Experts (approvals) ──
adminRoutes.get(
  '/experts',
  asyncHandler(async (req, res) => {
    const status = (req.query.status as 'pending' | 'active' | 'all') ?? 'all';
    ok(res, await adminService.listExperts(['pending', 'active', 'all'].includes(status) ? status : 'all'));
  }),
);
adminRoutes.post(
  '/experts/:id/approve',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => ok(res, await adminService.setExpertApproval(req.params.id, req.user!, true))),
);
adminRoutes.post(
  '/experts/:id/deactivate',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => ok(res, await adminService.setExpertApproval(req.params.id, req.user!, false))),
);

// ── Crops ──
adminRoutes.get(
  '/crops',
  asyncHandler(async (_req, res) => ok(res, await adminService.listCropsAdmin())),
);
adminRoutes.post(
  '/crops',
  validate({ body: cropUpsertSchema }),
  asyncHandler(async (req, res) => created(res, await adminService.createCrop(req.user!, req.body))),
);
adminRoutes.patch(
  '/crops/:id',
  validate({ params: idParamSchema, body: cropUpsertSchema.partial() }),
  asyncHandler(async (req, res) => ok(res, await adminService.updateCrop(req.params.id, req.user!, req.body))),
);
adminRoutes.delete(
  '/crops/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => ok(res, await adminService.deleteCrop(req.params.id, req.user!))),
);

// ── Diseases ──
adminRoutes.get(
  '/diseases',
  asyncHandler(async (req, res) => {
    const cropTypeId = req.query.cropTypeId as string | undefined;
    ok(res, await adminService.listDiseasesAdmin(cropTypeId));
  }),
);
adminRoutes.post(
  '/diseases',
  validate({ body: diseaseUpsertSchema }),
  asyncHandler(async (req, res) => created(res, await adminService.createDisease(req.user!, req.body))),
);
adminRoutes.patch(
  '/diseases/:id',
  validate({ params: idParamSchema, body: diseaseUpsertSchema.partial().omit({ cropTypeId: true }) }),
  asyncHandler(async (req, res) => ok(res, await adminService.updateDisease(req.params.id, req.user!, req.body))),
);
adminRoutes.delete(
  '/diseases/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => ok(res, await adminService.deleteDisease(req.params.id, req.user!))),
);

// ── Analyses monitor ──
adminRoutes.get(
  '/analyses',
  validate({ query: adminAnalysisQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { page: number; pageSize: number; status?: string; provider?: string };
    const { total, items } = await adminService.listAnalysesAdmin(q);
    paginated(res, items, { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) });
  }),
);

// Full analysis detail for admin monitoring (payload builder grants ADMIN access)
adminRoutes.get(
  '/analyses/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    const { getForViewer } = await import('../analyses/service.js');
    ok(res, await getForViewer(req.params.id, req.user!));
  }),
);

// ── Expert reviews monitor (admin sees the full picture) ──
adminRoutes.get(
  '/reviews',
  validate({ query: reviewListQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { status: string; page: number; pageSize: number; mine: boolean };
    const { total, items } = await reviewService.listReviews(req.user!.id, q);
    paginated(res, items, { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)) });
  }),
);

// ── Reports (CSV) ──
adminRoutes.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const type = (req.query.type as string) ?? 'analyses';
    const parseDate = (v: unknown, endOfDay = false): Date | undefined => {
      if (typeof v !== 'string' || !v) return undefined;
      const d = new Date(endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T23:59:59.999Z` : v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };
    let csv: string;
    if (type === 'diseases') {
      csv = await adminService.buildDiseaseCsv();
    } else if (type === 'users') {
      csv = await adminService.buildUsersCsv();
    } else {
      csv = await adminService.buildAnalysesCsv({
        from: parseDate(req.query.from),
        to: parseDate(req.query.to, true),
      });
    }
    // UTF-8 BOM so Excel opens the CSV with correct encoding.
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="vortex-${type}-report.csv"`);
    res.send(`\uFEFF${csv}`);
  }),
);

// ── Settings ──
adminRoutes.get(
  '/settings',
  asyncHandler(async (_req, res) => ok(res, await listSettings())),
);
adminRoutes.put(
  '/settings',
  validate({ body: settingUpsertSchema }),
  asyncHandler(async (req, res) => {
    const { key, value } = req.body as { key: string; value: string };
    ok(res, await adminService.putSetting(req.user!, key, value));
  }),
);

// ── Recent analyses count for charts (unused placeholder guard) ──
adminRoutes.get(
  '/overview-counts',
  asyncHandler(async (_req, res) => {
    const [crops, diseases] = await prisma.$transaction([
      prisma.cropType.count({ where: { isActive: true } }),
      prisma.disease.count({ where: { isActive: true } }),
    ]);
    ok(res, { crops, diseases });
  }),
);
