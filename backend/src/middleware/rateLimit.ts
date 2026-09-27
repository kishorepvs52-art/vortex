// Tiered rate limiting (IP-based; analysis creation is per-user).
import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/apiError.js';

const handler = (_req: unknown, _res: unknown, next: (e: unknown) => void, options: { message: string }) =>
  next(ApiError.tooMany(options.message));

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  message: 'Too many requests — please try again later',
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  message: 'Too many authentication attempts — please try again in 15 minutes',
});

export const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `${req.user?.id ?? req.ip}`,
  handler,
  message: 'Analysis limit reached — please try again in an hour',
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
  message: 'Too many contact submissions — please try again later',
});
