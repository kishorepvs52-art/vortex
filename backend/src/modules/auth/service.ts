import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/apiError.js';
import { createSession, revokeRefreshToken } from '../../services/tokenService.js';
import { logActivity } from '../../services/activityService.js';
import { notify } from '../../services/notificationService.js';
import type { RegisterInput } from './dto.js';

export type SanitizedUser = Omit<User, 'passwordHash'> & {
  farmerProfile?: unknown;
  expertProfile?: unknown;
};

const userInclude = {
  farmerProfile: true,
  expertProfile: true,
} as const;

export function sanitizeUser(u: User & { farmerProfile?: unknown; expertProfile?: unknown }): SanitizedUser {
  const { passwordHash: _ignored, ...rest } = u;
  return rest as SanitizedUser;
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('EMAIL_EXISTS', 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const isExpert = input.role === 'EXPERT';

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone || null,
      role: input.role,
      // Experts require admin approval before they can access the platform
      isActive: !isExpert,
      farmerProfile: !isExpert
        ? {
            create: {
              village: input.village ?? null,
              district: input.district ?? null,
              state: input.state ?? null,
              farmSizeAcres: input.farmSizeAcres ?? null,
            },
          }
        : undefined,
      expertProfile: isExpert
        ? {
            create: {
              specialization: input.specialization!,
              qualification: input.qualification ?? null,
              licenseNumber: input.licenseNumber ?? null,
              yearsExperience: input.yearsExperience ?? null,
              bio: input.bio ?? null,
            },
          }
        : undefined,
    },
    include: userInclude,
  });

  await logActivity(user.id, 'USER_REGISTERED', 'User', user.id, { role: user.role });

  if (isExpert) {
    // Notify admins about the pending approval
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    for (const admin of admins) {
      await notify(
        admin.id,
        'SYSTEM',
        'New expert registration',
        `${user.fullName} (${input.specialization}) registered as an expert and awaits approval.`,
      ).catch(() => undefined);
    }
    return { user: sanitizeUser(user), pendingApproval: true as const };
  }

  const tokens = await createSession(user);
  return { user: sanitizeUser(user), pendingApproval: false as const, tokens };
}

export async function login(email: string, password: string, userAgent?: string) {
  const user = await prisma.user.findUnique({ where: { email }, include: userInclude });
  // Same error for unknown email / wrong password (no account enumeration)
  const invalid = ApiError.unauthorized('CREDENTIALS_INVALID', 'Invalid email or password');
  if (!user) throw invalid;

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw invalid;

  if (!user.isActive) {
    const pending = user.role === 'EXPERT';
    throw ApiError.forbidden(
      pending ? 'ACCOUNT_PENDING_APPROVAL' : 'ACCOUNT_INACTIVE',
      pending
        ? 'Your expert account is awaiting admin approval. You will be able to sign in once approved.'
        : 'This account has been deactivated. Contact the platform administrator.',
    );
  }

  const tokens = await createSession(user, userAgent);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logActivity(user.id, 'USER_LOGIN', 'User', user.id);

  return { user: sanitizeUser(user), tokens };
}

export async function logout(rawToken: string | undefined) {
  if (rawToken) await revokeRefreshToken(rawToken);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw ApiError.notFound('USER_NOT_FOUND', 'Account not found');
  return sanitizeUser(user);
}
