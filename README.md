# Dirami messenger

Starter: **Next.js 16** (App Router, TypeScript) and **Prisma 7** on SQLite.

## Stack

- Next.js 16 / React 19
- Prisma ORM 7 (`prisma-client` + `@prisma/adapter-better-sqlite3`)
- SQLite (`prisma/dev.db`) — no database server required

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Home lists users from the database, `/posts` lists posts with authors.

## Prisma

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:seed` | Seed sample users and posts |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:push` | Push schema without a migration |

- Schema: `prisma/schema.prisma`
- Client singleton: `src/lib/prisma.ts`
- Seed: `prisma/seed.ts`
- Config: `prisma.config.ts`

## Switch to PostgreSQL

1. Install `@prisma/adapter-pg` and `pg`
2. Set `provider = "postgresql"` in `prisma/schema.prisma`
3. Point `DATABASE_URL` at Postgres
4. Use `PrismaPg` instead of `PrismaBetterSqlite3` in `src/lib/prisma.ts` and `prisma/seed.ts`
