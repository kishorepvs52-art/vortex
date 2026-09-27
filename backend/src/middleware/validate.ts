// Zod request validation for body / query / params.
// Invalid input → 422 with per-field details; valid input replaces req[key].
import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { ApiError } from '../utils/apiError.js';

interface Schemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate =
  (schemas: Schemas) => (req: Request, _res: Response, next: NextFunction) => {
    const details: { field: string; message: string }[] = [];

    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        for (const issue of (result.error as z.ZodError).issues) {
          details.push({
            field: [key, ...issue.path.map(String)].join('.'),
            message: issue.message,
          });
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (req as any)[key] = result.data;
      }
    }

    if (details.length > 0) {
      return next(ApiError.unprocessable('VALIDATION_ERROR', 'Request validation failed', details));
    }
    next();
  };
