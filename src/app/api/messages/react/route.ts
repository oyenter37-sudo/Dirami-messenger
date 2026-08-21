import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { isReactionEmoji } from "@/lib/reactions";
import { serializeMessage } from "@/lib/serialize-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as { messageId?: unknown; emoji?: unknown };
  const messageId = typeof payload.messageId === "string" ? payload.messageId : "";
  const emoji = typeof payload.emoji === "string" ? payload.emoji : "";

  if (!messageId || !isReactionEmoji(emoji)) {
    return jsonError("Некорректная реакция", 400);
  }

  const me = auth.session.userId;
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [{ senderId: me }, { receiverId: me }],
    },
    select: { id: true },
  });
  if (!message) {
    return jsonError("Сообщение не найдено", 404);
  }

  const existing = await prisma.reaction.findUnique({
    where: { userId_messageId: { userId: me, messageId } },
  });

  if (existing?.emoji === emoji) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.reaction.update({
      where: { id: existing.id },
      data: { emoji },
    });
  } else {
    await prisma.reaction.create({
      data: { emoji, userId: me, messageId },
    });
  }

  const next = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
          sender: { select: { nickname: true } },
        },
      },
      reactions: { select: { emoji: true, userId: true } },
    },
  });
  if (!next) {
    return jsonError("Сообщение не найдено", 404);
  }

  return NextResponse.json({ message: serializeMessage(next, me) });
}
