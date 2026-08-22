import { NextResponse } from "next/server";
import { jsonError, requireAdmin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  HOUR,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { parseNewsContent, parseNewsTitle } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as { title?: unknown; content?: unknown };
  const title = parseNewsTitle(payload.title);
  const content = parseNewsContent(payload.content);
  if (!title) return jsonError("Заголовок: от 1 до 100 символов", 400);
  if (!content) return jsonError("Текст новости: от 1 до 3000 символов", 400);

  const publishLimit = await consumeRateLimit({
    subject: `user:${auth.session.userId}`,
    action: "news_publish",
    limit: 20,
    windowMs: HOUR,
  });
  if (!publishLimit.allowed) {
    return rateLimitResponse(publishLimit, "Слишком много публикаций новостей");
  }

  const news = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      WITH transaction_lock AS (
        SELECT pg_advisory_xact_lock(hashtext(${"dirami:news-publish"}::text))
      )
      SELECT 1::int AS "locked" FROM transaction_lock
    `;
    const stale = await tx.news.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 49,
      select: { id: true },
    });
    if (stale.length > 0) {
      await tx.news.deleteMany({
        where: { id: { in: stale.map((item) => item.id) } },
      });
    }

    return tx.news.create({
      data: { title, content, authorId: auth.session.userId },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: { select: { nickname: true, displayName: true } },
      },
    });
  });

  return NextResponse.json({ news });
}
