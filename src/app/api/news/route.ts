import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, MINUTE, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const me = auth.session.userId;
  const readLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "news_read",
    limit: 60,
    windowMs: MINUTE,
  });
  if (!readLimit.allowed) {
    return rateLimitResponse(readLimit, "Слишком много обновлений новостей");
  }

  const summaryOnly = new URL(request.url).searchParams.get("summary") === "1";
  if (summaryOnly) {
    const news = await prisma.news.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
      select: {
        id: true,
        reads: {
          where: { userId: me },
          select: { userId: true },
          take: 1,
        },
      },
    });
    return noStore(
      NextResponse.json({
        unreadCount: news.reduce(
          (count, item) => count + (item.reads.length === 0 ? 1 : 0),
          0,
        ),
      }),
    );
  }

  const news = await prisma.news.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      author: {
        select: {
          nickname: true,
          displayName: true,
          isVerified: true,
          isHyperVerified: true,
        },
      },
      reads: {
        where: { userId: me },
        select: { userId: true },
        take: 1,
      },
    },
  });

  const unreadCount = news.reduce(
    (count, item) => count + (item.reads.length === 0 ? 1 : 0),
    0,
  );
  return noStore(
    NextResponse.json({
      unreadCount,
      news: news.map(({ reads, ...item }) => ({
        ...item,
        unread: reads.length === 0,
      })),
    }),
  );
}
