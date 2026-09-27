// Notifications — own inbox, mark read.
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok, paginated } from '../../utils/respond.js';
import { ApiError } from '../../utils/apiError.js';

export const notificationRoutes = Router();

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

notificationRoutes.use(requireAuth);

notificationRoutes.get(
  '/',
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as z.infer<typeof listQuery>;
    const where = { userId: req.user!.id, ...(q.unreadOnly ? { read: false } : {}) };
    const [total, unreadCount, items] = await prisma.$transaction([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.id, read: false } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    paginated(
      res,
      items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        analysisId: n.analysisId,
        read: n.read,
        createdAt: n.createdAt,
      })),
      { page: q.page, pageSize: q.pageSize, total, totalPages: Math.max(1, Math.ceil(total / q.pageSize)), unreadCount } as never,
    );
  }),
);

notificationRoutes.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await prisma.notification.count({ where: { userId: req.user!.id, read: false } });
    ok(res, { count });
  }),
);

const idParam = z.object({ id: z.string().min(1) });

notificationRoutes.patch(
  '/:id/read',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: { read: true },
    });
    if (result.count === 0) throw ApiError.notFound('NOTIFICATION_NOT_FOUND', 'Notification not found');
    ok(res, { id: req.params.id, read: true });
  }),
);

notificationRoutes.patch(
  '/read-all',
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, read: false },
      data: { read: true },
    });
    ok(res, { markedRead: result.count });
  }),
);
