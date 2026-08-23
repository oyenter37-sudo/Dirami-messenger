import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import { chatStateFor } from "@/lib/chat-state";
import type { ChatPreview } from "@/lib/types";
import {
  MINUTE,
  consumeRateLimit,
  getUserLimits,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const me = auth.session.userId;
  const limits = await getUserLimits(me);
  const readLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "chat_list",
    limit: limits.chatListReadsPerMinute,
    windowMs: MINUTE,
  });
  if (!readLimit.allowed) {
    return rateLimitResponse(
      readLimit,
      "Слишком много обновлений списка чатов",
    );
  }

  const connections = await prisma.chat.findMany({
    where: {
      AND: [
        { OR: [{ userAId: me }, { userBId: me }] },
        { status: { in: ["PENDING", "ACCEPTED"] } },
      ],
    },
    include: {
      userA: {
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
      },
      userB: {
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
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (connections.length === 0) {
    return NextResponse.json({ chats: [] });
  }

  const peers = new Set(
    connections.map((chat) =>
      chat.userAId === me ? chat.userBId : chat.userAId,
    ),
  );

  const [messages, unreadGroups] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [
          { senderId: me, receiverId: { in: [...peers] } },
          { receiverId: me, senderId: { in: [...peers] } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 800,
      select: {
        id: true,
        kind: true,
        content: true,
        createdAt: true,
        senderId: true,
        receiverId: true,
        voice: {
          select: { durationMs: true, listenedAt: true },
        },
      },
    }),
    prisma.message.groupBy({
      by: ["senderId"],
      where: { receiverId: me, senderId: { in: [...peers] }, readAt: null },
      _count: { _all: true },
    }),
  ]);

  const lastByPeer = new Map<string, (typeof messages)[number]>();

  for (const message of messages) {
    const peerId =
      message.senderId === me ? message.receiverId : message.senderId;
    if (!lastByPeer.has(peerId)) lastByPeer.set(peerId, message);
  }

  const unreadByPeer = new Map(
    unreadGroups.map((row) => [row.senderId, row._count._all]),
  );

  const chats: ChatPreview[] = connections
    .map((connection) => {
      const user =
        connection.userAId === me ? connection.userB : connection.userA;
      const last = lastByPeer.get(user.id) ?? null;
      const state = chatStateFor(connection, me);

      // The query above guarantees one of these three states.
      if (state === "none" || state === "blocked") return null;

      return {
        user,
        state,
        lastMessage: last
          ? {
              id: last.id,
              kind: last.kind === "VOICE" ? "voice" : "text",
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
              voiceDurationMs: last.voice?.durationMs ?? null,
              voiceListenedAt: last.voice?.listenedAt?.toISOString() ?? null,
            }
          : null,
        unread: unreadByPeer.get(user.id) ?? 0,
      };
    })
    .filter((chat): chat is ChatPreview => chat !== null)
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? "";
      const bTime = b.lastMessage?.createdAt ?? "";
      if (aTime !== bTime) return bTime.localeCompare(aTime);
      return a.user.nickname.localeCompare(b.user.nickname, "ru");
    });

  return NextResponse.json({ chats });
}
