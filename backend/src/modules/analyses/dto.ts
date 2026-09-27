import { z } from 'zod';

// multipart/form-data arrives as strings → coerce where needed.
export const createAnalysisSchema = z.object({
  cropTypeId: z.string().min(1, 'Select the crop type'),
  symptoms: z.string().trim().max(1200, 'Symptom description is too long (max 1200 chars)').optional().or(z.literal('')),
  locationText: z.string().trim().max(200).optional().or(z.literal('')),
  latitude: z.coerce.number().min(-90).max(90).optional().or(z.literal('')),
  longitude: z.coerce.number().min(-180).max(180).optional().or(z.literal('')),
  notes: z.string().trim().max(600).optional().or(z.literal('')),
  requestExpertReview: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

export const listAnalysesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  status: z
    .enum(['PROCESSING', 'AI_COMPLETED', 'EXPERT_REVIEW_PENDING', 'EXPERT_REVIEWED', 'FAILED'])
    .optional(),
  cropTypeId: z.string().min(1).optional(),
});

export const idParamSchema = z.object({ id: z.string().min(1) });
