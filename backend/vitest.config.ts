import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    // Isolate each test file (own module registry) so rate limiters and
    // in-memory singletons (Prisma client, AI provider) don't leak state
    // across files — mirrors how separate server processes would behave.
    isolate: true,
    fileParallelism: false,
  },
});
