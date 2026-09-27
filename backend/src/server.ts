// VORTEX API bootstrap
import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';
import { logger } from './utils/logger.js';
import { aiProviderStatus } from './ai/registry.js';
import { sweepStaleAnalyses } from './services/analysisPipeline.js';

async function main() {
  // Fail fast if the database is unreachable
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    logger.error('boot', 'Database unreachable — is PostgreSQL running? (bash scripts/db-setup.sh)');
    logger.error('boot', String(e));
    process.exit(1);
  }

  await sweepStaleAnalyses();

  const app = createApp();
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    const ai = aiProviderStatus();
    logger.info('boot', '═══════════════════════════════════════════════════');
    logger.info('boot', `  VORTEX API listening on http://0.0.0.0:${env.PORT}`);
    logger.info('boot', `  Environment : ${env.NODE_ENV}`);
    logger.info('boot', `  Database    : PostgreSQL connected`);
    logger.info(
      'boot',
      ai.isMock
        ? `  AI provider : ${ai.provider.toUpperCase()} ⚠ development fallback — results labelled as simulated`
        : `  AI provider : ${ai.provider} (${ai.configured})`,
    );
    logger.info('boot', '═══════════════════════════════════════════════════');
  });

  const shutdown = async (signal: string) => {
    logger.info('boot', `${signal} received — shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((e) => {
  logger.error('boot', 'Fatal startup error', e);
  process.exit(1);
});
