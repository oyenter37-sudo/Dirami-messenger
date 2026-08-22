import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { chatPair, chatStateFor } from "@/lib/chat-state";
import {
  consumeRateLimit,
  getUserLimits,
  HOUR,
  MINUTE,
  rateLimitResponse,
  readRateLimitUsage,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const me = auth.session.userId;
  const panelLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "limits_panel",
    limit: 20,
    windowMs: MINUTE,
  });
  if (!panelLimit.allowed) {
    return rateLimitResponse(
      panelLimit,
      "Слишком много обновлений Dirami Limits",
    );
  }

  const [limits, pendingRequests, currentUser, administrator, usageValues] =
    await Promise.all([
      getUserLimits(me),
      prisma.chat.count({ where: { initiatorId: me, status: "PENDING" } }),
      prisma.user.findUnique({ where: { id: me }, select: { isAdmin: true } }),
      prisma.user.findFirst({
        where: { isAdmin: true },
        select: {
          id: true,
          nickname: true,
          displayName: true,
          bio: true,
          avatarUrl: true,
          profileAccent: true,
          profileBackground: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      Promise.all([
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "message_v2",
          windowMs: MINUTE,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "chat_request_v2",
          windowMs: HOUR,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "request_action",
          windowMs: MINUTE,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "reaction",
          windowMs: MINUTE,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "chat_list",
          windowMs: MINUTE,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "message_read",
          windowMs: MINUTE,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "search",
          windowMs: MINUTE,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "profile_view",
          windowMs: MINUTE,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "profile_update",
          windowMs: HOUR,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "password_change",
          windowMs: HOUR,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "nft_transfer",
          windowMs: HOUR,
        }),
        readRateLimitUsage({
          subject: `user:${me}`,
          action: "nft_mint",
          windowMs: HOUR,
        }),
      ]),
    ]);

  let admin = null;
  if (administrator && administrator.id !== me) {
    const connection = await prisma.chat.findUnique({
      where: { userAId_userBId: chatPair(me, administrator.id) },
      select: { status: true, initiatorId: true },
    });
    admin = { user: administrator, state: chatStateFor(connection, me) };
  }

  const [
    message,
    chatRequest,
    requestAction,
    reaction,
    chatListRead,
    messageRead,
    search,
    profileView,
    profileUpdate,
    passwordChange,
    nftTransfer,
    nftMint,
  ] = usageValues;

  return NextResponse.json({
    limits,
    usage: {
      messagesPerMinute: message,
      pendingRequests: { used: pendingRequests, resetAt: null },
      chatRequestsPerHour: chatRequest,
      requestActionsPerMinute: requestAction,
      reactionsPerMinute: reaction,
      chatListReadsPerMinute: chatListRead,
      messageReadsPerMinute: messageRead,
      searchesPerMinute: search,
      profileViewsPerMinute: profileView,
      profileUpdatesPerHour: profileUpdate,
      passwordChangesPerHour: passwordChange,
      nftTransfersPerHour: nftTransfer,
      nftMintsPerHour: nftMint,
    },
    system: { registrationsPerMinute: 3 },
    isAdmin: currentUser?.isAdmin ?? false,
    admin,
  });
}
