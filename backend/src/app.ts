// Express app assembly — middleware stack, routes, error handling.
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { z } from 'zod';
import { env } from './config/env.js';
import { API_PREFIX } from './config/constants.js';
import { prisma } from './lib/prisma.js';
import { globalLimiter, contactLimiter } from './middleware/rateLimit.js';
import { validate } from './middleware/validate.js';
import { asyncHandler } from './utils/asyncHandler.js';
import { ok, created } from './utils/respond.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { aiProviderStatus } from './ai/registry.js';
import { logActivity } from './services/activityService.js';
import { notify } from './services/notificationService.js';

import { authRoutes } from './modules/auth/routes.js';
import { userRoutes } from './modules/users/routes.js';
import { cropRoutes } from './modules/crops/routes.js';
import { diseaseRoutes } from './modules/diseases/routes.js';
import { analysisRoutes } from './modules/analyses/routes.js';
import { reviewRoutes } from './modules/reviews/routes.js';
import { notificationRoutes } from './modules/notifications/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { mediaRoutes } from './modules/media/routes.js';
import { contactSchema } from './modules/admin/dto.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      // Images are consumed by the frontend origin → allow cross-origin reads
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // API serves JSON only; frontend has its own CSP
    }),
  );
  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev', { skip: (req) => req.path === `${API_PREFIX}/health` }));

  // ── Friendly root — this process is the JSON API only; the actual
  // website is the separate frontend dev server (Vite, port 5173).
  // Without this, hitting :4000/ directly returns a bare 404 that looks
  // like a broken deployment rather than "wrong port".
  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        service: 'vortex-api',
        message: 'This is the VORTEX backend API only. The website is served separately by the frontend dev server.',
        frontendHint: 'Open the frontend preview (Vite, default port 5173) to use the actual VORTEX website.',
        health: `${API_PREFIX}/health`,
        docs: '/docs/API.md (in the repository)',
      },
    });
  });

  // ── Health ──
  app.get(`${API_PREFIX}/health`, async (_req, res) => {
    let db = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    res.status(db ? 200 : 503).json({
      success: db,
      data: {
        status: db ? 'ok' : 'degraded',
        service: 'vortex-api',
        version: '1.0.0',
        database: db ? 'connected' : 'unreachable',
        ai: aiProviderStatus(),
        uptimeSec: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ── Public contact form (landing page) ──
  app.post(
    `${API_PREFIX}/contact`,
    contactLimiter,
    validate({ body: contactSchema }),
    asyncHandler(async (req, res) => {
      const { name, email, message } = req.body as z.infer<typeof contactSchema>;
      await logActivity(null, 'CONTACT_MESSAGE', 'Contact', undefined, { name, email, preview: message.slice(0, 120) });
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
      for (const a of admins) {
        await notify(a.id, 'SYSTEM', `Contact form: ${name}`, `${email}: ${message.slice(0, 300)}`).catch(() => undefined);
      }
      created(res, { message: 'Thank you — your message has been delivered to the VORTEX team.' });
    }),
  );

  // ── API modules ──
  app.use(API_PREFIX, globalLimiter);
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/users`, userRoutes);
  app.use(`${API_PREFIX}/crops`, cropRoutes);
  app.use(`${API_PREFIX}/diseases`, diseaseRoutes);
  app.use(`${API_PREFIX}/analyses`, analysisRoutes);
  app.use(`${API_PREFIX}/expert/reviews`, reviewRoutes);
  app.use(`${API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX}/admin`, adminRoutes);
  app.use(`${API_PREFIX}/media`, mediaRoutes);

  // ── Errors ──
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
