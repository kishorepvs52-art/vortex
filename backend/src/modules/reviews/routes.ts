import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginated, created } from '../../utils/respond.js';
import * as reviewService from './service.js';
import { idParamSchema, reviewListQuerySchema, submitReviewSchema } from './dto.js';

export const reviewRoutes = Router();

// Expert-only surface — farmers and unauthenticated users get 401/403 here.
reviewRoutes.use(requireAuth, requireRole('EXPERT'));

reviewRoutes.get(
  '/',
  validate({ query: reviewListQuerySchema }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as { status: string; page: number; pageSize: number; mine: boolean };
    const { total, items } = await reviewService.listReviews(req.user!.id, q);
    paginated(res, items, {
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    });
  }),
);

reviewRoutes.get(
  '/stats',
  asyncHandler(async (req, res) => {
    ok(res, await reviewService.expertStats(req.user!.id));
  }),
);

reviewRoutes.get(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await reviewService.getCase(req.params.id, req.user!));
  }),
);

reviewRoutes.post(
  '/:id/claim',
  validate({ params: idParamSchema }),
  asyncHandler(async (req, res) => {
    created(res, await reviewService.claimCase(req.params.id, req.user!.id));
  }),
);

reviewRoutes.put(
  '/:id',
  validate({ params: idParamSchema, body: submitReviewSchema }),
  asyncHandler(async (req, res) => {
    ok(res, await reviewService.submitReview(req.params.id, req.user!.id, req.body));
  }),
);
