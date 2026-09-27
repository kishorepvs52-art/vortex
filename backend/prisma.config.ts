import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  experimental: { adapter: true },
  engine: "js",
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
  adapter: async () => {
    return new PrismaPg({ connectionString: env("DATABASE_URL") });
  },
});
