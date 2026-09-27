// Crop analysis pipeline — real image upload/storage, real DB persistence,
// real (mock-labelled) AI provider, and real per-farmer data isolation.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, loginSeeded, registerFarmer, testLeafImage, SEEDED } from './helpers.js';

let farmerToken: string;
let cropTypeId: string;

async function waitForTerminalStatus(id: string, token: string, timeoutMs = 8000) {
  const start = Date.now();
  for (;;) {
    const res = await request(app).get(`/api/v1/analyses/${id}`).set('Authorization', `Bearer ${token}`);
    const status = res.body.data.status;
    if (status !== 'PROCESSING') return res.body.data;
    if (Date.now() - start > timeoutMs) throw new Error('Analysis pipeline did not finish in time');
    await new Promise((r) => setTimeout(r, 200));
  }
}

beforeAll(async () => {
  farmerToken = await loginSeeded(SEEDED.farmer.email, SEEDED.farmer.password);
  const crops = await request(app).get('/api/v1/crops');
  cropTypeId = crops.body.data[0].id;
});

describe('POST /api/v1/analyses (upload + create, real pipeline)', () => {
  it('rejects a request with no image (422)', async () => {
    const res = await request(app)
      .post('/api/v1/analyses')
      .set('Authorization', `Bearer ${farmerToken}`)
      .field('cropTypeId', cropTypeId)
      .field('symptoms', 'no image attached');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('IMAGE_REQUIRED');
  });

  it('rejects an unknown cropTypeId (422)', async () => {
    const img = await testLeafImage();
    const res = await request(app)
      .post('/api/v1/analyses')
      .set('Authorization', `Bearer ${farmerToken}`)
      .attach('image', img, { filename: 'leaf.jpg', contentType: 'image/jpeg' })
      .field('cropTypeId', 'not-a-real-crop-id')
      .field('symptoms', 'test');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CROP_NOT_FOUND');
  });

  it('rejects a non-image file', async () => {
    const res = await request(app)
      .post('/api/v1/analyses')
      .set('Authorization', `Bearer ${farmerToken}`)
      .attach('image', Buffer.from('not an image, just text'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      })
      .field('cropTypeId', cropTypeId);
    expect([415, 422]).toContain(res.status);
  });

  it('creates a real analysis, runs the AI pipeline, and stores a labelled result', async () => {
    const img = await testLeafImage();
    const create = await request(app)
      .post('/api/v1/analyses')
      .set('Authorization', `Bearer ${farmerToken}`)
      .attach('image', img, { filename: 'leaf.jpg', contentType: 'image/jpeg' })
      .field('cropTypeId', cropTypeId)
      .field('symptoms', 'yellowing leaves with brown spots')
      .field('locationText', 'Coimbatore');

    expect(create.status).toBe(202);
    expect(create.body.data.status).toBe('PROCESSING');
    const analysisId = create.body.data.id;

    const finalState = await waitForTerminalStatus(analysisId, farmerToken);
    expect(['AI_COMPLETED', 'EXPERT_REVIEW_PENDING']).toContain(finalState.status);
    expect(finalState.aiResult).toBeTruthy();
    // The AI result must always be honestly labelled — never hidden as real.
    expect(typeof finalState.aiResult.isMock).toBe('boolean');
    expect(finalState.aiResult.provider).toBeTruthy();
    expect(typeof finalState.aiResult.confidence).toBe('number');
  });

  it('appears in the farmer history list', async () => {
    const res = await request(app)
      .get('/api/v1/analyses?page=1&pageSize=50')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe('Per-farmer data isolation', () => {
  it('a farmer cannot view another farmer\'s analysis', async () => {
    // Farmer A creates an analysis
    const img = await testLeafImage();
    const create = await request(app)
      .post('/api/v1/analyses')
      .set('Authorization', `Bearer ${farmerToken}`)
      .attach('image', img, { filename: 'leaf.jpg', contentType: 'image/jpeg' })
      .field('cropTypeId', cropTypeId);
    const analysisId = create.body.data.id;

    // Farmer B (freshly registered) tries to read it
    const { res: regRes } = await registerFarmer();
    const farmerBToken = regRes.body.data.accessToken as string;

    const res = await request(app)
      .get(`/api/v1/analyses/${analysisId}`)
      .set('Authorization', `Bearer ${farmerBToken}`);
    expect(res.status).toBe(403);
  });
});
