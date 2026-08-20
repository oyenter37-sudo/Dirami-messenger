import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api";
import type { ChatPreview } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const me = auth.session.userId;

  const [users, messages, unreadGroups] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: me } },
      select: { id: true, nickname: true, bio: true },
      orderBy: { nickname: "asc" },
    }),
    prisma.message.findMany({
      where: {
        OR: [{ senderId: me }, { receiverId: me }],
      },
      orderBy: { createdAt: "desc" },
      take: 800,
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderId: true,
        receiverId: true,
      },
    }),
    prisma.message.groupBy({
      by: ["senderId"],
      where: { receiverId: me, readAt: null },
      _count: { _all: true },
    }),
  ]);

  const lastByPeer = new Map<
    string,
    { id: string; content: string; createdAt: Date; senderId: string }
  >();

  for (const message of messages) {
    const peerId = message.senderId === me ? message.receiverId : message.senderId;
    if (!lastByPeer.has(peerId)) {
      lastByPeer.set(peerId, message);
    }
  }

  const unreadByPeer = new Map(
    unreadGroups.map((row) => [row.senderId, row._count._all]),
  );

  const chats: ChatPreview[] = users
    .map((user) => {
      const last = lastByPeer.get(user.id) ?? null;
      return {
        user,
        lastMessage: last
          ? {
              id: last.id,
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              senderId: last.senderId,
            }
          : null,
        unread: unreadByPeer.get(user.id) ?? 0,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? "";
      const bTime = b.lastMessage?.createdAt ?? "";
      if (aTime !== bTime) return bTime.localeCompare(aTime);
      return a.user.nickname.localeCompare(b.user.nickname, "ru");
    });

  return NextResponse.json({ chats });
}
