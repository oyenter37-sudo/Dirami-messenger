import "dotenv/config";
import { defineConfig } from "prisma/config";

function migrationUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return process.env.DIRECT_URL;

  // Keep the same database name as runtime (neondb). Only drop the pooler host.
  // DIRECT_URL is ignored when it points at a different database (e.g. postgres).
  return url.replace("-pooler.", ".").replace(".pooler.", ".");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl(),
  },
});
