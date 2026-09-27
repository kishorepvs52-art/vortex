// Public catalogue: crop types + their diseases (read-only).
import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ok } from '../../utils/respond.js';
import { ApiError } from '../../utils/apiError.js';
import { publicDisease } from '../../services/analysisPayload.js';

export const cropRoutes = Router();

cropRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const crops = await prisma.cropType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { diseases: { where: { isActive: true } } } } },
    });
    ok(
      res,
      crops.map((c) => ({
        id: c.id,
        name: c.name,
        scientificName: c.scientificName,
        family: c.family,
        description: c.description,
        emoji: c.emoji,
        imageUrl: c.imageUrl,
        diseaseCount: c._count.diseases,
      })),
    );
  }),
);

cropRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const crop = await prisma.cropType.findFirst({
      where: { id: req.params.id, isActive: true },
      include: { diseases: { where: { isActive: true }, orderBy: { name: 'asc' } } },
    });
    if (!crop) throw ApiError.notFound('CROP_NOT_FOUND', 'Crop type not found');
    ok(res, {
      id: crop.id,
      name: crop.name,
      scientificName: crop.scientificName,
      family: crop.family,
      description: crop.description,
      emoji: crop.emoji,
      diseases: crop.diseases.map(publicDisease),
    });
  }),
);

cropRoutes.get(
  '/:id/diseases',
  asyncHandler(async (req, res) => {
    const diseases = await prisma.disease.findMany({
      where: { cropTypeId: req.params.id, isActive: true },
      orderBy: { name: 'asc' },
    });
    ok(res, diseases.map(publicDisease));
  }),
);
