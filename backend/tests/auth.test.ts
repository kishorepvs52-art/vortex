// Authentication — real bcrypt hashing, real JWT issuance, real DB rows.
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerFarmer, uniqueEmail, SEEDED } from './helpers.js';

describe('POST /api/v1/auth/register', () => {
  it('creates a real farmer account and returns tokens', async () => {
    const { res, email } = await registerFarmer();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.passwordHash).toBeUndefined(); // never leaked
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.pendingApproval).toBe(false);
  });

  it('rejects duplicate emails (409)', async () => {
    const { email } = await registerFarmer();
    const dup = await registerFarmer({ email });
    expect(dup.res.status).toBe(409);
    expect(dup.res.body.success).toBe(false);
    expect(dup.res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('rejects a weak password with 422 VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Weak Password',
      email: uniqueEmail('weak'),
      password: 'short',
      role: 'FARMER',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('expert registration is pending approval and cannot log in yet', async () => {
    const email = uniqueEmail('expert');
    const res = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Pending Expert',
      email,
      password: 'TestPass123',
      role: 'EXPERT',
      specialization: 'Plant Pathology',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.pendingApproval).toBe(true);
    expect(res.body.data.accessToken).toBeUndefined();

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'TestPass123' });
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_PENDING_APPROVAL');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with correct seeded credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send(SEEDED.farmer);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('FARMER');
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('rejects an invalid password with 401 (no account enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: SEEDED.farmer.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('CREDENTIALS_INVALID');
  });

  it('rejects an unknown email with the same 401 error', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail('nobody'), password: 'WrongPassword1' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('CREDENTIALS_INVALID');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send(SEEDED.farmer);
    const token = login.body.data.accessToken as string;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(SEEDED.farmer.email);
  });

  it('rejects a garbage token with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
