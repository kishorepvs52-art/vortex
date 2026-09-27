// Prisma client singleton — uses the @prisma/adapter-pg driver adapter so
// the app talks to PostgreSQL over `pg` directly (no native Rust query
// engine binary required; see prisma.config.ts + schema.prisma engineType).
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import type { Pool as PgPool } from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; pgPool?: PgPool };

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
  });

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.isProd ? ['error'] : ['error', 'warn'],
  });

if (!env.isProd) {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
