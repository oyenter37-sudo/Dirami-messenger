# Dirami messenger

Мессенджер на Next.js 16: ник + пароль, приватный список чатов, запросы на общение, сообщения через **polling**, бэкенд — **Vercel Functions** (Route Handlers).

## Стек

- Next.js 16 / React 19 / Tailwind CSS 4
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- JWT-сессия в httpOnly cookie (`jose` + `bcryptjs`)

## Как устроено

1. `/` — окно входа и регистрации (ник, пароль).
2. `/chat` — только принятые чаты и входящие/исходящие запросы. У нового аккаунта список пуст.
3. Поиск по нику работает через `GET /api/users/search?q=`.
4. Первое сообщение создаёт запрос. До принятия отправитель не может написать второе сообщение.
5. Входящий запрос можно принять или отклонить через `POST /api/chats/request`.
6. `GET /api/chats` — список активных чатов и запросов, клиент опрашивает каждые 4 сек.
7. `GET /api/messages?peerId=&after=` — новые сообщения, опрос каждые 2 сек.
8. `POST /api/messages` — отправка; в интерфейсе есть отдельные звуки отправки и получения.
9. Одинаковые NFT в любом профиле объединяются в одну карточку; «Подробнее >» открывает список всех экземпляров, цен и ID.
10. Профили публичны даже до отправки/принятия запроса. Пользователь может бесплатно выбрать цвет и фон профиля, добавить описание и установить аватар по http/https-ссылке.

## Переменные окружения

Скопируй `.env.example` в `.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="длинная-случайная-строка"
```

`AUTH_SECRET` можно сгенерировать так: `openssl rand -base64 32`.

Для Neon в `DATABASE_URL` должен быть pooled-хост (`-pooler`) и база **neondb**.
Миграции сами уберут `-pooler`, но имя базы не меняют. `DIRECT_URL` не обязателен.

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
