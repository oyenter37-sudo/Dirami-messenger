import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { DEFAULT_USER_LIMITS } from "@/lib/limit-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const query = (new URL(request.url).searchParams.get("q") ?? "")
    .trim()
    .replace(/^@/, "");
  if (!query) return NextResponse.json({ users: [] });

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { nickname: { contains: query.slice(0, 40), mode: "insensitive" } },
        { displayName: { contains: query.slice(0, 40), mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      nickname: true,
      displayName: true,
      avatarUrl: true,
      isAdmin: true,
      isVerified: true,
      isHyperVerified: true,
      createdAt: true,
      limits: true,
    },
    orderBy: { nickname: "asc" },
    take: 20,
  });

  return NextResponse.json({
    users: users.map((user) => ({
      ...user,
      limits: user.limits
        ? {
            messagesPerMinute: user.limits.messagesPerMinute,
            pendingRequests: user.limits.pendingRequests,
            chatRequestsPerHour: user.limits.chatRequestsPerHour,
            requestActionsPerMinute: user.limits.requestActionsPerMinute,
            reactionsPerMinute: user.limits.reactionsPerMinute,
            chatListReadsPerMinute: user.limits.chatListReadsPerMinute,
            messageReadsPerMinute: user.limits.messageReadsPerMinute,
            searchesPerMinute: user.limits.searchesPerMinute,
            profileViewsPerMinute: user.limits.profileViewsPerMinute,
            profileUpdatesPerHour: user.limits.profileUpdatesPerHour,
            passwordChangesPerHour: user.limits.passwordChangesPerHour,
            nftTransfersPerHour: user.limits.nftTransfersPerHour,
            nftMintsPerHour: user.limits.nftMintsPerHour,
          }
        : { ...DEFAULT_USER_LIMITS },
    })),
  });
}
