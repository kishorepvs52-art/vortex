// Authorization (RBAC) — same middleware stack the real app uses.
// Cross-role access must be a hard 403; missing auth must be 401.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, loginSeeded, SEEDED } from './helpers.js';

let farmerToken: string;
let expertToken: string;
let adminToken: string;

beforeAll(async () => {
  farmerToken = await loginSeeded(SEEDED.farmer.email, SEEDED.farmer.password);
  expertToken = await loginSeeded(SEEDED.expert.email, SEEDED.expert.password);
  adminToken = await loginSeeded(SEEDED.admin.email, SEEDED.admin.password);
});

describe('Role-based access control', () => {
  it('unauthenticated request to admin surface → 401', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  it('farmer → /admin/* → 403', async () => {
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${farmerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ROLE_FORBIDDEN');
  });

  it('farmer → /expert/reviews → 403', async () => {
    const res = await request(app).get('/api/v1/expert/reviews').set('Authorization', `Bearer ${farmerToken}`);
    expect(res.status).toBe(403);
  });

  it('expert → /admin/* → 403', async () => {
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${expertToken}`);
    expect(res.status).toBe(403);
  });

  it('admin → /admin/stats → 200 with real DB aggregates', async () => {
    const res = await request(app).get('/api/v1/admin/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.users.total).toBe('number');
    expect(res.body.data.users.total).toBeGreaterThan(0);
  });

  it('admin → /expert/reviews → 403 (admin is not an expert)', async () => {
    const res = await request(app).get('/api/v1/expert/reviews').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('expert can access the expert reviews queue', async () => {
    const res = await request(app).get('/api/v1/expert/reviews').set('Authorization', `Bearer ${expertToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
