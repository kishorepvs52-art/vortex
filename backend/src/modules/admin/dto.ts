import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1) });

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['FARMER', 'EXPERT', 'ADMIN']).optional(),
  active: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(120).optional(),
});

export const updateUserSchema = z
  .object({
    role: z.enum(['FARMER', 'EXPERT', 'ADMIN']).optional(),
    isActive: z.boolean().optional(),
    fullName: z.string().trim().min(2).max(80).optional(),
    phone: z.string().trim().max(20).optional().nullable(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No changes provided' });

export const cropUpsertSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scientificName: z.string().trim().max(120).optional().nullable(),
  family: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(600).optional().nullable(),
  emoji: z.string().trim().max(8).optional().nullable(),
  imageUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
  isActive: z.boolean().optional(),
});

export const diseaseUpsertSchema = z.object({
  cropTypeId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  pathogenType: z
    .enum(['FUNGAL', 'BACTERIAL', 'VIRAL', 'NUTRITIONAL', 'PEST', 'PHYSIOLOGICAL', 'HEALTHY', 'UNKNOWN'])
    .default('UNKNOWN'),
  description: z.string().trim().min(10).max(1200),
  symptoms: z.string().trim().min(10).max(1200),
  visibleSigns: z.string().trim().max(1200).optional().nullable(),
  defaultSeverity: z.enum(['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']).default('MODERATE'),
  treatmentSummary: z.string().trim().min(10).max(2400),
  preventiveSummary: z.string().trim().min(10).max(2400),
  isCommon: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const adminAnalysisQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['PROCESSING', 'AI_COMPLETED', 'EXPERT_REVIEW_PENDING', 'EXPERT_REVIEWED', 'FAILED'])
    .optional(),
  provider: z.enum(['mock', 'real']).optional(),
});

export const settingUpsertSchema = z.object({
  key: z.enum(['expert_review_threshold', 'platform_announcement', 'maintenance_mode']),
  value: z.string().max(500),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  message: z.string().trim().min(10).max(2000),
});
