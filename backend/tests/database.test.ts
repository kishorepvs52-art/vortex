// Database layer — real Prisma Client against real PostgreSQL.
// Verifies relationships (User↔FarmerProfile, CropType↔Disease, cascade
// deletes) and basic CRUD, independent of the HTTP layer.
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

describe('Prisma models & relationships', () => {
  it('creates a User with a nested FarmerProfile (1:1 relation)', async () => {
    const email = `db-test-${Date.now()}@vortex-test.app`;
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash('irrelevant', 4),
        fullName: 'DB Relation Test',
        role: 'FARMER',
        farmerProfile: { create: { village: 'Test Village', district: 'Test District' } },
      },
      include: { farmerProfile: true },
    });
    expect(user.farmerProfile?.village).toBe('Test Village');

    const fetched = await prisma.user.findUnique({ where: { id: user.id }, include: { farmerProfile: true } });
    expect(fetched?.farmerProfile?.userId).toBe(user.id);

    // Cascade delete: removing the user removes the linked profile too.
    await prisma.user.delete({ where: { id: user.id } });
    const orphan = await prisma.farmerProfile.findUnique({ where: { userId: user.id } });
    expect(orphan).toBeNull();
  });

  it('every Disease belongs to a real, existing CropType', async () => {
    const diseases = await prisma.disease.findMany({ take: 25, include: { cropType: true } });
    expect(diseases.length).toBeGreaterThan(0);
    for (const d of diseases) {
      expect(d.cropType).toBeTruthy();
      expect(d.cropType.id).toBe(d.cropTypeId);
    }
  });

  it('CropAnalysis → AIResult is a real 1:1 relation persisted in Postgres', async () => {
    const analysis = await prisma.cropAnalysis.findFirst({
      where: { aiResult: { isNot: null } },
      include: { aiResult: true, farmer: true, cropType: true },
    });
    expect(analysis).toBeTruthy();
    expect(analysis?.aiResult?.analysisId).toBe(analysis?.id);
    expect(analysis?.farmer.id).toBe(analysis?.farmerId);
  });

  it('supports basic CRUD on CropType (admin catalogue management)', async () => {
    const crop = await prisma.cropType.create({
      data: { name: `TestCrop-${Date.now()}`, scientificName: 'Testus cropus', description: 'temp' },
    });
    const updated = await prisma.cropType.update({ where: { id: crop.id }, data: { description: 'updated' } });
    expect(updated.description).toBe('updated');
    await prisma.cropType.delete({ where: { id: crop.id } });
    const gone = await prisma.cropType.findUnique({ where: { id: crop.id } });
    expect(gone).toBeNull();
  });

  it('password hashes are never plaintext', async () => {
    const anyUser = await prisma.user.findFirst();
    expect(anyUser?.passwordHash).toBeTruthy();
    expect(anyUser?.passwordHash).not.toContain('Farmer@1234');
    expect(anyUser?.passwordHash).not.toContain('Expert@1234');
    expect(anyUser?.passwordHash).not.toContain('Admin@1234');
    // bcrypt hashes have a recognisable prefix
    expect(anyUser?.passwordHash.startsWith('$2')).toBe(true);
  });
});
