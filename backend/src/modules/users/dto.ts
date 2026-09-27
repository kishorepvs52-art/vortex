import { z } from 'zod';
import { passwordSchema } from '../auth/dto.js';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  // farmer profile
  village: z.string().trim().max(80).optional().nullable(),
  district: z.string().trim().max(80).optional().nullable(),
  state: z.string().trim().max(80).optional().nullable(),
  farmSizeAcres: z.coerce.number().positive().max(100000).optional().nullable(),
  preferredLanguage: z.enum(['en', 'ta', 'hi']).optional(),
  // expert profile
  specialization: z.string().trim().max(120).optional(),
  qualification: z.string().trim().max(160).optional().nullable(),
  licenseNumber: z.string().trim().max(60).optional().nullable(),
  yearsExperience: z.coerce.number().int().min(0).max(70).optional().nullable(),
  bio: z.string().trim().max(600).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});
