import crypto from 'node:crypto';

export function sha256(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function hmacSign(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Deterministic float in [0,1) from any string — used by the mock AI provider. */
export function hashFloat(seed: string): number {
  const h = sha256(seed).slice(0, 12);
  return parseInt(h, 16) / 0xffffffffffff;
}
