import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { chatStateFor } from "@/lib/chat-state";
import type { UserSearchResult } from "@/lib/types";
import {
  consumeRateLimit,
  getUserLimits,
  MINUTE,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "")
    .trim()
    .replace(/^@/, "")
    .slice(0, 24);
  if (!query) return NextResponse.json({ users: [] });

  const me = auth.session.userId;
  const limits = await getUserLimits(me);
  const searchLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "search",
    limit: limits.searchesPerMinute,
    windowMs: MINUTE,
  });
  if (!searchLimit.allowed) {
    return rateLimitResponse(
      searchLimit,
      `Можно выполнять не более ${limits.searchesPerMinute} поисков в минуту`,
    );
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: me },
      OR: [
        { nickname: { contains: query, mode: "insensitive" } },
        { displayName: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      nickname: true,
      displayName: true,
      isVerified: true,
      isHyperVerified: true,
      bio: true,
      extraProfile: true,
      avatarUrl: true,
      profileAccent: true,
      profileBackground: true,
    },
    orderBy: { nickname: "asc" },
    take: 20,
  });

  const ids = users.map((user) => user.id);
  const connections = ids.length
    ? await prisma.chat.findMany({
        where: {
          OR: [
            { userAId: me, userBId: { in: ids } },
            { userBId: me, userAId: { in: ids } },
          ],
        },
        select: {
          userAId: true,
          userBId: true,
          initiatorId: true,
          status: true,
        },
      })
    : [];

  const connectionByPeer = new Map(
    connections.map((chat) => [
      chat.userAId === me ? chat.userBId : chat.userAId,
      chat,
    ]),
  );

  const results: UserSearchResult[] = users.map((user) => ({
    user,
    state: chatStateFor(connectionByPeer.get(user.id), me),
  }));

  return NextResponse.json({ users: results });
}
