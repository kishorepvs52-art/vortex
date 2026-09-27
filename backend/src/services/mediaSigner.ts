// HMAC-signed, expiring media URLs — capability-based image access.
// Signed URLs are only embedded in payloads the requester is authorised
// to see (owner / assigned expert / admin), and they work directly in
// <img> tags without exposing raw storage keys.
import { env } from '../config/env.js';
import { API_PREFIX, MEDIA_URL_TTL_SEC } from '../config/constants.js';
import { hmacSign, safeEqual } from '../utils/crypto.js';
import { ApiError } from '../utils/apiError.js';

export function signMediaUrl(storageKey: string, ttlSec = MEDIA_URL_TTL_SEC): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const key64 = Buffer.from(storageKey, 'utf8').toString('base64url');
  const sig = hmacSign(`${key64}.${exp}`, env.MEDIA_SIGNING_SECRET);
  return `${API_PREFIX}/media/${key64}?exp=${exp}&sig=${sig}`;
}

export function verifyMediaSignature(key64: string, expStr: string, sig: string): string {
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    throw ApiError.unauthorized('MEDIA_URL_EXPIRED', 'This image link has expired — reload the page');
  }
  const expected = hmacSign(`${key64}.${exp}`, env.MEDIA_SIGNING_SECRET);
  if (!safeEqual(expected, sig)) {
    throw ApiError.forbidden('MEDIA_SIG_INVALID', 'Invalid image link');
  }
  const storageKey = Buffer.from(key64, 'base64url').toString('utf8');
  if (!storageKey || storageKey.includes('..')) throw ApiError.badRequest('MEDIA_KEY_INVALID', 'Invalid media key');
  return storageKey;
}
