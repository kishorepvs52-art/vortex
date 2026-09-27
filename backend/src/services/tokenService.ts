// JWT access tokens (short-lived) + opaque refresh tokens
// (random, SHA-256-hashed at rest, rotated on every use, revocable).
import jwt from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { env } from '../config/env.js';
import { REFRESH_COOKIE } from '../config/constants.js';
import { prisma } from '../lib/prisma.js';
import { randomToken, sha256 } from '../utils/crypto.js';
import { ApiError } from '../utils/apiError.js';
import type { AccessTokenPayload } from '../middleware/auth.js';

const REFRESH_MS = env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

export function signAccessToken(user: Pick<User, 'id' | 'role' | 'email'>): string {
  const payload: AccessTokenPayload = { sub: user.id, role: user.role, email: user.email, typ: 'access' };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m` });
}

export async function issueRefreshToken(userId: string, userAgent?: string): Promise<string> {
  const token = randomToken(48);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(token),
      userAgent: userAgent?.slice(0, 200) ?? null,
      expiresAt: new Date(Date.now() + REFRESH_MS),
    },
  });
  return token;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export async function createSession(
  user: Pick<User, 'id' | 'role' | 'email'>,
  userAgent?: string,
): Promise<SessionTokens> {
  return {
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user.id, userAgent),
  };
}

/** Validate + rotate a refresh token. Returns the user or throws 401. */
export async function rotateRefreshToken(rawToken: string, userAgent?: string) {
  const tokenHash = sha256(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    // Possible token reuse/theft → revoke the whole family for safety
    if (stored?.userId) await revokeAllForUser(stored.userId);
    throw ApiError.unauthorized('REFRESH_INVALID', 'Session expired — please sign in again');
  }
  if (!stored.user.isActive) {
    throw ApiError.forbidden('ACCOUNT_INACTIVE', 'Account is inactive or pending approval');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const tokens = await createSession(stored.user, userAgent);
  return { user: stored.user, tokens };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await prisma.refreshToken
    .updateMany({ where: { tokenHash: sha256(rawToken), revokedAt: null }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}

export async function revokeAllForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.isProd,
    path: '/api/v1/auth',
    maxAge: REFRESH_MS,
  });
}

export function clearRefreshCookie(res: import('express').Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth', httpOnly: true, sameSite: 'strict', secure: env.isProd });
}

export type { Role };
