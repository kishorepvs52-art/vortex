// Public disease catalogue (read-only, filterable by crop).
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/respond.js';
import { ApiError } from '../../utils/apiError.js';
import { publicDisease } from '../../services/analysisPayload.js';

export const diseaseRoutes = Router();

const querySchema = z.object({
  cropId: z.string().min(1).optional(),
});

diseaseRoutes.get(
  '/',
  validate({ query: querySchema }),
  asyncHandler(async (req, res) => {
    const { cropId } = req.query as z.infer<typeof querySchema>;
    const diseases = await prisma.disease.findMany({
      where: { isActive: true, ...(cropId ? { cropTypeId: cropId } : {}) },
      orderBy: [{ cropTypeId: 'asc' }, { name: 'asc' }],
      include: { cropType: { select: { name: true, emoji: true } } },
    });
    ok(
      res,
      diseases.map((d) => ({ ...publicDisease(d), cropName: d.cropType.name, cropEmoji: d.cropType.emoji })),
    );
  }),
);

diseaseRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const disease = await prisma.disease.findFirst({
      where: { id: req.params.id, isActive: true },
      include: { cropType: { select: { id: true, name: true, emoji: true } } },
    });
    if (!disease) throw ApiError.notFound('DISEASE_NOT_FOUND', 'Disease not found');
    ok(res, { ...publicDisease(disease), cropType: disease.cropType });
  }),
);
