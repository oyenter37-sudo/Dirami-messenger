import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { isReactionEmoji } from "@/lib/reactions";
import { serializeMessage } from "@/lib/serialize-message";
import { chatPair } from "@/lib/chat-state";
import {
  consumeRateLimit,
  getUserLimits,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as { messageId?: unknown; emoji?: unknown };
  const messageId =
    typeof payload.messageId === "string" ? payload.messageId : "";
  const emoji = typeof payload.emoji === "string" ? payload.emoji : "";

  if (!messageId || !isReactionEmoji(emoji)) {
    return jsonError("Некорректная реакция", 400);
  }

  const me = auth.session.userId;
  const limits = await getUserLimits(me);
  const reactionLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "reaction",
    limit: limits.reactionsPerMinute,
    windowMs: MINUTE,
  });
  if (!reactionLimit.allowed) {
    return rateLimitResponse(
      reactionLimit,
      `Можно поставить не более ${limits.reactionsPerMinute} реакций в минуту`,
    );
  }

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      OR: [{ senderId: me }, { receiverId: me }],
    },
    select: { id: true, senderId: true, receiverId: true },
  });
  if (!message) {
    return jsonError("Сообщение не найдено", 404);
  }

  const peerId =
    message.senderId === me ? message.receiverId : message.senderId;
  const chat = await prisma.chat.findUnique({
    where: { userAId_userBId: chatPair(me, peerId) },
    select: { status: true },
  });
  if (chat?.status !== "ACCEPTED") {
    return jsonError("Реакции доступны только в принятом чате", 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`reaction:${me}:${messageId}`}))`;
    const existing = await tx.reaction.findUnique({
      where: { userId_messageId: { userId: me, messageId } },
    });

    if (existing?.emoji === emoji) {
      await tx.reaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await tx.reaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
    } else {
      await tx.reaction.create({
        data: { emoji, userId: me, messageId },
      });
    }
  });

  const next = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      replyTo: {
        select: {
          id: true,
          content: true,
          senderId: true,
          sender: { select: { nickname: true, displayName: true } },
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
