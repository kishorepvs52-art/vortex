// Shared constants for the VORTEX API
export const API_PREFIX = '/api/v1';

export const REFRESH_COOKIE = 'vortex_refresh';

export const ROLES = {
  FARMER: 'FARMER',
  EXPERT: 'EXPERT',
  ADMIN: 'ADMIN',
} as const;

export const ANALYSIS_STATUS = {
  PROCESSING: 'PROCESSING',
  AI_COMPLETED: 'AI_COMPLETED',
  EXPERT_REVIEW_PENDING: 'EXPERT_REVIEW_PENDING',
  EXPERT_REVIEWED: 'EXPERT_REVIEWED',
  FAILED: 'FAILED',
} as const;

/** Analyses stuck in PROCESSING longer than this (server crash) are swept to FAILED on boot. */
export const STALE_PROCESSING_MINUTES = 10;

export const MEDIA_URL_TTL_SEC = 60 * 60 * 6; // signed image URLs valid 6 h

export const IMAGE_MAX_EDGE_PX = 1600;
export const IMAGE_THUMB_PX = 320;
export const IMAGE_JPEG_QUALITY = 82;
