import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { chatPair, chatStateFor } from "@/lib/chat-state";
import {
  consumeRateLimit,
  getUserLimits,
  MINUTE,
  rateLimitResponse,
  requestAddress,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  const session = auth.error ? null : auth.session;
  const limits = session ? await getUserLimits(session.userId) : null;
  const profileLimit = limits?.profileViewsPerMinute ?? 60;
  const viewLimit = await consumeRateLimit({
    subject: session ? `user:${session.userId}` : requestAddress(request),
    action: "profile_view",
    limit: profileLimit,
    windowMs: MINUTE,
  });
  if (!viewLimit.allowed) {
    return rateLimitResponse(
      viewLimit,
      `Можно открыть не более ${profileLimit} профилей в минуту`,
    );
  }

  const { id } = await context.params;
  if (!id || id.length > 64) return jsonError("Некорректный профиль", 400);

  const pair = session ? chatPair(session.userId, id) : null;
  const [user, chat] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nickname: true,
        displayName: true,
        isVerified: true,
        bio: true,
        avatarUrl: true,
        profileAccent: true,
        profileBackground: true,
        createdAt: true,
        nfts: {
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, imageUrl: true, valueRub: true },
        },
      },
    }),
    pair
      ? prisma.chat.findUnique({
          where: { userAId_userBId: pair },
          select: { status: true, initiatorId: true },
        })
      : Promise.resolve(null),
  ]);
  if (!user) {
    return jsonError("Пользователь не найден", 404);
  }

  return NextResponse.json({
    user,
    state: session ? chatStateFor(chat, session.userId) : "none",
  });
}
