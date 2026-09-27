import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Name is too short').max(80),
    email: emailSchema,
    password: passwordSchema,
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number')
      .optional()
      .or(z.literal('')),
    role: z.enum(['FARMER', 'EXPERT']).default('FARMER'),
    // farmer profile (optional at registration)
    village: z.string().trim().max(80).optional(),
    district: z.string().trim().max(80).optional(),
    state: z.string().trim().max(80).optional(),
    farmSizeAcres: z.coerce.number().positive().max(100000).optional(),
    // expert profile (specialization required when role=EXPERT)
    specialization: z.string().trim().max(120).optional(),
    qualification: z.string().trim().max(160).optional(),
    licenseNumber: z.string().trim().max(60).optional(),
    yearsExperience: z.coerce.number().int().min(0).max(70).optional(),
    bio: z.string().trim().max(600).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === 'EXPERT' && !v.specialization) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['specialization'],
        message: 'Specialization is required for expert registration',
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});
