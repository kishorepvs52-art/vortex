// 404 catcher + central error handler. Produces the standard error envelope:
// { success:false, error:{ code, message, details? } } — never leaks stacks
// or driver internals outside development.
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound('ROUTE_NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // Multer file-size / unexpected-field errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Image exceeds the ${env.MAX_UPLOAD_MB} MB limit`,
        },
      });
    }
    return res
      .status(422)
      .json({ success: false, error: { code: 'UPLOAD_ERROR', message: err.message } });
  }

  // Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `A record with this ${target} already exists` },
      });
    }
    if (err.code === 'P2025') {
      return res
        .status(404)
        .json({ success: false, error: { code: 'NOT_FOUND', message: 'Record not found' } });
    }
    logger.error('prisma', `Known request error ${err.code}`, err.meta);
    return res
      .status(400)
      .json({ success: false, error: { code: 'DATABASE_ERROR', message: 'Invalid database operation' } });
  }

  if (err instanceof ApiError) {
    if (err.status >= 500) logger.error('api', `${err.code}: ${err.message}`);
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  if (err instanceof Error) {
    logger.error('unhandled', err.message, env.isProd ? undefined : err.stack);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL',
        message: env.isProd ? 'Internal server error' : err.message,
      },
    });
  }

  logger.error('unhandled', String(err));
  res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Internal server error' } });
}
