import type { Response } from 'express';

// Consistent success envelope: { success, data, meta? }
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function ok<T>(res: Response, data: T, meta?: unknown) {
  res.json({ success: true, data, ...(meta !== undefined ? { meta } : {}) });
}

export function created<T>(res: Response, data: T) {
  res.status(201).json({ success: true, data });
}

export function accepted<T>(res: Response, data: T) {
  res.status(202).json({ success: true, data });
}

export function paginated<T>(res: Response, data: T[], meta: PaginationMeta) {
  res.json({ success: true, data, meta });
}
