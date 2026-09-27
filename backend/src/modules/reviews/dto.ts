import { z } from 'zod';

export const reviewListQuerySchema = z.object({
  status: z.enum(['PENDING', 'CLAIMED', 'COMPLETED', 'ALL']).default('PENDING'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  mine: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
});

export const idParamSchema = z.object({ id: z.string().min(1) });

export const submitReviewSchema = z
  .object({
    decision: z.enum(['APPROVE_AI', 'CORRECTED'], {
      errorMap: () => ({ message: 'Decision must be APPROVE_AI or CORRECTED' }),
    }),
    finalDiseaseId: z.string().min(1).optional().nullable(),
    finalSeverity: z.enum(['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']).optional().nullable(),
    treatmentGuidance: z.string().trim().max(4000).optional().nullable(),
    preventiveAdvice: z.string().trim().max(4000).optional().nullable(),
    comments: z.string().trim().max(2000).optional().nullable(),
    confidenceNote: z.string().trim().max(1000).optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.decision === 'CORRECTED' && !v.finalDiseaseId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['finalDiseaseId'],
        message: 'Select the correct disease when correcting the AI result',
      });
    }
  });

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
