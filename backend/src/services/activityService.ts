// Activity log — powers the admin "recent activity" feed and audit trail.
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export async function logActivity(
  actorId: string | null | undefined,
  action: string,
  entityType?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        entityType: entityType ?? null,
        entityId: entityId ?? null,
        meta: meta as object | undefined,
      },
    });
  } catch (e) {
    logger.error('activity', `failed to log ${action}`, e);
  }
}
