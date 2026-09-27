// ═══════════════════════════════════════════════════════════════
// VORTEX API — environment configuration (zod-validated at boot)
// The server refuses to start with missing/invalid configuration.
// ═══════════════════════════════════════════════════════════════
import 'dotenv/config';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const BACKEND_ROOT = path.resolve(__dirname, '../..');

const boolish = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 chars'),
  MEDIA_SIGNING_SECRET: z.string().min(16, 'MEDIA_SIGNING_SECRET must be at least 16 chars'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

  STORAGE_DRIVER: z.enum(['local']).default('local'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().max(25).default(8),
  ALLOWED_MIME: z.string().default('image/jpeg,image/png,image/webp'),

  AI_PROVIDER: z.enum(['auto', 'mock', 'gemini', 'openai']).default('auto'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  EXPERT_REVIEW_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),

  SEED_DEMO: boolish,
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n[VORTEX] ✗ Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy .env.example → backend/.env and run scripts/setup.sh\n');
  process.exit(1);
}

const e = parsed.data;

export const env = {
  ...e,
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  allowedOrigins: e.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  allowedMimeTypes: e.ALLOWED_MIME.split(',').map((s) => s.trim()).filter(Boolean),
  uploadDir: path.isAbsolute(e.UPLOAD_DIR) ? e.UPLOAD_DIR : path.resolve(BACKEND_ROOT, e.UPLOAD_DIR),
} as const;

export type Env = typeof env;
