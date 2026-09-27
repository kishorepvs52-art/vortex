// System settings (key/value, live-editable from Admin → Settings).
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export async function getSetting(key: string, fallback: string): Promise<string> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
}

export async function getNumberSetting(key: string, fallback: number): Promise<number> {
  const raw = await getSetting(key, String(fallback));
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Threshold below which AI results are routed to expert review. */
export async function getExpertReviewThreshold(): Promise<number> {
  return getNumberSetting('expert_review_threshold', env.EXPERT_REVIEW_THRESHOLD);
}

export async function setSetting(key: string, value: string, updatedById?: string, description?: string) {
  return prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, description, updatedById },
    update: { value, updatedById },
  });
}

export async function listSettings() {
  return prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
    include: { updatedBy: { select: { fullName: true } } },
  });
}
