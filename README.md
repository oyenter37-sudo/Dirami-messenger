# Dirami messenger

Мессенджер на Next.js 16: ник + пароль, чаты со всеми пользователями, сообщения через **polling**, бэкенд — **Vercel Functions** (Route Handlers).

## Стек

- Next.js 16 / React 19 / Tailwind CSS 4
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- JWT-сессия в httpOnly cookie (`jose` + `bcryptjs`)

## Как устроено

1. `/` — окно входа и регистрации (ник, пароль).
2. `/chat` — список всех пользователей и переписка.
3. `GET /api/chats` — список чатов, клиент опрашивает каждые 4 сек.
4. `GET /api/messages?peerId=&after=` — новые сообщения, опрос каждые 2 сек.
5. `POST /api/messages` — отправка.

## Переменные окружения

Скопируй `.env.example` в `.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="длинная-случайная-строка"
```

`AUTH_SECRET` можно сгенерировать так: `openssl rand -base64 32`.

Для Neon: `DATABASE_URL` — pooled (с `-pooler`), `DIRECT_URL` — прямой хост без `-pooler`. Миграции идут по прямому адресу, иначе Vercel ловит `P1002` (advisory lock timeout).

## База

Нужен PostgreSQL (Neon, Supabase, Vercel Postgres — любой).

```bash
npm install
npx prisma migrate deploy
npm run db:seed
```

Демо-аккаунты после сида: `mara`, `leo`, `nika` / пароль `password123`.

## Деплой на Vercel

1. Репозиторий → Import в Vercel.
2. Environment Variables — **обе обязательны**: `DATABASE_URL` и `AUTH_SECRET`.
   Без `AUTH_SECRET` аккаунт создаётся, но войти нельзя.
3. Build command уже в `package.json`: `prisma generate && prisma migrate deploy && next build`.
4. Deploy.

SQLite на Vercel не используется: serverless-функции пишут в Postgres.
