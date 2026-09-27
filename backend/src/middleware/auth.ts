// JWT authentication middleware — verifies Bearer access token,
// loads the user from the DB (fresh role/active checks every request).
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import type { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
  fullName: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  email: string;
  typ: 'access';
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.typ !== 'access') throw new Error('wrong token type');
    return payload;
  } catch {
    throw ApiError.unauthorized('TOKEN_INVALID', 'Session expired or invalid — please sign in again');
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = extractBearer(req);
  if (!token) throw ApiError.unauthorized();

  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, email: true, fullName: true, isActive: true },
  });

  if (!user) throw ApiError.unauthorized('USER_NOT_FOUND', 'Account no longer exists');
  if (!user.isActive)
    throw ApiError.forbidden('ACCOUNT_INACTIVE', 'Account is inactive or pending approval');

  req.user = { id: user.id, role: user.role, email: user.email, fullName: user.fullName };
  next();
});
