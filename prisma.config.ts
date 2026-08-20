import "dotenv/config";
import { defineConfig } from "prisma/config";

function migrationUrl() {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;

  const url = process.env.DATABASE_URL;
  if (!url) return url;

  // Neon pooler cannot take Postgres advisory locks used by migrate.
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
