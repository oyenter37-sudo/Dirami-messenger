import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const me = auth.session.userId;
  const actionLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "news_mark_read",
    limit: 30,
    windowMs: MINUTE,
  });
  if (!actionLimit.allowed) {
    return rateLimitResponse(actionLimit, "Слишком много отметок новостей");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const rawIds = (body as { newsIds?: unknown }).newsIds;
  if (!Array.isArray(rawIds)) return jsonError("Некорректные новости", 400);
  const newsIds = [...new Set(rawIds)].filter(
    (id): id is string =>
      typeof id === "string" && id.length > 0 && id.length <= 64,
  );
  if (
    newsIds.length === 0 ||
    newsIds.length > 50 ||
    newsIds.length !== rawIds.length
  ) {
    return jsonError("Можно отметить от одной до пятидесяти новостей", 400);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const existing = await prisma.news.findMany({
      where: { id: { in: newsIds } },
      select: { id: true },
    });
    if (existing.length === 0) break;
    try {
      await prisma.newsRead.createMany({
        data: existing.map((item) => ({ userId: me, newsId: item.id })),
        skipDuplicates: true,
      });
      break;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }

  return NextResponse.json({ ok: true });
}
