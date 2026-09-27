// Shared test helpers — real Express app + real PostgreSQL (via the same
// Prisma client / driver adapter used at runtime). No mocking of the DB.
import request from 'supertest';
import sharp from 'sharp';
import { createApp } from '../src/app.js';

export const app = createApp();

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@vortex-test.app`;
}

export async function registerFarmer(overrides: Partial<Record<string, string>> = {}) {
  const email = overrides.email ?? uniqueEmail('farmer');
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      fullName: 'Test Farmer',
      email,
      password: 'TestPass123',
      role: 'FARMER',
      village: 'Sulur',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      ...overrides,
    });
  return { res, email };
}

/** Log in with a seeded development account (see prisma/seed.ts). */
export async function loginSeeded(email: string, password: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Seeded login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken as string;
}

/** A small real JPEG buffer (not a stub/fake) generated on the fly via sharp. */
export async function testLeafImage(): Promise<Buffer> {
  return sharp({
    create: { width: 256, height: 256, channels: 3, background: { r: 60, g: 130, b: 55 } },
  })
    .jpeg()
    .toBuffer();
}

export const SEEDED = {
  farmer: { email: 'farmer@vortex.app', password: 'Farmer@1234' },
  expert: { email: 'expert@vortex.app', password: 'Expert@1234' },
  admin: { email: 'admin@vortex.app', password: 'Admin@1234' },
};
