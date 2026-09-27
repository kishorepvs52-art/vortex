// Role-based access control — must run after requireAuth.
// Cross-role access returns a hard 403 (e.g. farmer → /admin/*).
import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/apiError.js';

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          'ROLE_FORBIDDEN',
          `This action requires one of the following roles: ${roles.join(', ')}`,
        ),
      );
    }
    next();
  };
