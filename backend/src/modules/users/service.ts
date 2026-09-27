import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { revokeAllForUser } from '../../services/tokenService.js';
import { logActivity } from '../../services/activityService.js';
import { sanitizeUser } from '../auth/service.js';
import type { updateProfileSchema } from './dto.js';
import type { z } from 'zod';

type ProfileInput = z.infer<typeof updateProfileSchema>;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { farmerProfile: true, expertProfile: true },
  });
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found');
  return sanitizeUser(user);
}

export async function updateProfile(userId: string, input: ProfileInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found');

  const userData: Record<string, unknown> = {};
  if (input.fullName !== undefined) userData.fullName = input.fullName;
  if (input.phone !== undefined) userData.phone = input.phone || null;

  const farmerData: Record<string, unknown> = {};
  for (const k of ['village', 'district', 'state', 'farmSizeAcres', 'preferredLanguage', 'bio'] as const) {
    if (input[k] !== undefined) farmerData[k] = input[k];
  }
  const expertData: Record<string, unknown> = {};
  for (const k of ['specialization', 'qualification', 'licenseNumber', 'yearsExperience', 'bio'] as const) {
    if (input[k] !== undefined) expertData[k] = input[k];
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...userData,
      ...(user.role === 'FARMER' && Object.keys(farmerData).length
        ? { farmerProfile: { upsert: { create: farmerData, update: farmerData } } }
        : {}),
      ...(user.role === 'EXPERT' && Object.keys(expertData).length
        ? { expertProfile: { update: expertData } }
        : {}),
    },
    include: { farmerProfile: true, expertProfile: true },
  });

  await logActivity(userId, 'PROFILE_UPDATED', 'User', userId);
  return sanitizeUser(updated);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found');

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('PASSWORD_INCORRECT', 'Current password is incorrect');

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS) },
  });
  await revokeAllForUser(userId); // force re-login everywhere
  await logActivity(userId, 'PASSWORD_CHANGED', 'User', userId);
  return { message: 'Password changed — all other sessions were signed out' };
}
