// Notification service — DB-backed, fan-out to many users.
import type { NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  analysisId?: string | null,
) {
  return prisma.notification.create({
    data: { userId, type, title, message, analysisId: analysisId ?? null },
  });
}

export async function notifyMany(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  analysisId?: string | null,
) {
  if (userIds.length === 0) return [];
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      analysisId: analysisId ?? null,
    })),
  });
}

export async function notifyAllExperts(
  type: NotificationType,
  title: string,
  message: string,
  analysisId?: string | null,
) {
  const experts = await prisma.user.findMany({
    where: { role: 'EXPERT', isActive: true },
    select: { id: true },
  });
  return notifyMany(
    experts.map((e) => e.id),
    type,
    title,
    message,
    analysisId,
  ).catch((e) => logger.error('notifications', 'expert fan-out failed', e));
}
