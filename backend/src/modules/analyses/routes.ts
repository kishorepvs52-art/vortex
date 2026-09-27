import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { imageUpload } from '../../middleware/upload.js';
import { analysisLimiter } from '../../middleware/rateLimit.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, accepted, paginated, created } from '../../utils/respond.js';
import { ApiError } from '../../utils/apiError.js';
import * as analysisService from './service.js';
import { createAnalysisSchema, idParamSchema, listAnalysesQuerySchema } from './dto.js';

export const analysisRoutes = Router();

analysisRoutes.use(requireAuth, requireRole('FARMER'));

// POST /analyses — multipart: image + cropTypeId + symptoms + location
analysisRoutes.post(
  '/',
  analysisLimiter,
  imageUpload,
  validate({ body: createAnalysisSchema }),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw ApiError.unprocessable(
        'IMAGE_REQUIRED',
        'A crop/leaf image is required (field name: "image")',
      );
    }
    const result = await analysisService.createAnalysis(req.user!.id, req.file, req.body);
    accepted(res, result);
  }),
);

// GET /analyses — own history (paginated + filters)
analysisRoutes.get(
  '/',
  validate({ query: listAnalysesQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { page: number; pageSize: number; status?: string; cropTypeId?: string };
    const { total, items } = await analysisService.listForFarmer(req.user!.id, q);
    paginated(res, items, {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    });
  }),
);

// GET /analyses/:id — full result payload (owner only)
analysisRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await analysisService.getForViewer(req.params.id, req.user!));
  }),
);

// POST /analyses/:id/request-review — farmer-initiated expert validation
analysisRoutes.post(
  '/:id/request-review',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    created(res, await analysisService.requestReview(req.params.id, req.user!.id));
  }),
);
