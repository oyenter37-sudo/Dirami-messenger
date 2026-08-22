import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import {
  consumeRateLimit,
  getUserLimits,
  MINUTE,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const limits = await getUserLimits(auth.session.userId);
  const viewLimit = await consumeRateLimit({
    subject: `user:${auth.session.userId}`,
    action: "profile_view",
    limit: limits.profileViewsPerMinute,
    windowMs: MINUTE,
  });
  if (!viewLimit.allowed) {
    return rateLimitResponse(
      viewLimit,
      `Можно открыть не более ${limits.profileViewsPerMinute} профилей в минуту`,
    );
  }

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
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
  });
  if (!user) {
    return jsonError("Пользователь не найден", 404);
  }

  return NextResponse.json({ user });
}
