import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { chatPair, chatStateFor } from "@/lib/chat-state";
import { parseMessageContent } from "@/lib/validators";
import { serializeMessage } from "@/lib/serialize-message";
import {
  consumeRateLimit,
  getUserLimits,
  HOUR,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class PendingRequestLimitError extends Error {}
class ChatStateChangedError extends Error {}

const messageInclude = {
  replyTo: {
    select: {
      id: true,
      content: true,
      senderId: true,
      sender: { select: { nickname: true, displayName: true } },
    },
  },
  reactions: {
    select: { emoji: true, userId: true },
  },
} as const;

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const peerId = url.searchParams.get("peerId");
  const after = url.searchParams.get("after");

  if (!peerId) return jsonError("Не указан собеседник", 400);

  const me = auth.session.userId;
  if (peerId === me) return jsonError("Нельзя открыть чат с собой", 400);

  const limits = await getUserLimits(me);
  const readLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "message_read",
    limit: limits.messageReadsPerMinute,
    windowMs: MINUTE,
  });
  if (!readLimit.allowed) {
    return rateLimitResponse(
      readLimit,
      "Слишком много проверок новых сообщений",
    );
  }

  const [peer, chat] = await Promise.all([
    prisma.user.findUnique({
      where: { id: peerId },
      select: { id: true, nickname: true, displayName: true },
    }),
    prisma.chat.findUnique({
      where: { userAId_userBId: chatPair(me, peerId) },
      select: { status: true, initiatorId: true },
    }),
  ]);
  if (!peer) return jsonError("Пользователь не найден", 404);

  const state = chatStateFor(chat, me);
  if (state === "none" || state === "blocked") {
    return NextResponse.json({ peer, state, messages: [] });
  }

  const afterDate = after ? new Date(after) : null;
  const validAfter =
    afterDate && !Number.isNaN(afterDate.getTime()) ? afterDate : null;

  const messages = await prisma.message.findMany({
    where: {
      AND: [
        {
          OR: [
            { senderId: me, receiverId: peerId },
            { senderId: peerId, receiverId: me },
          ],
        },
        validAfter ? { createdAt: { gt: validAfter } } : {},
      ],
    },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  if (state === "accepted" || state === "pending_in") {
    await prisma.message.updateMany({
      where: { senderId: peerId, receiverId: me, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({
    peer,
    state,
    messages: messages.map((message) => serializeMessage(message, me)),
  });
}

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

  const payload = body as {
    peerId?: unknown;
    content?: unknown;
    replyToId?: unknown;
  };
  const peerId = typeof payload.peerId === "string" ? payload.peerId : "";
  const content = parseMessageContent(payload.content);
  const replyToId =
    typeof payload.replyToId === "string" ? payload.replyToId : null;

  if (!peerId) return jsonError("Не указан собеседник", 400);
  if (!content) return jsonError("Сообщение пустое или слишком длинное", 400);

  const me = auth.session.userId;
  if (peerId === me) return jsonError("Нельзя написать себе", 400);

  const limits = await getUserLimits(me);
  const messageLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "message_v2",
    limit: limits.messagesPerMinute,
    windowMs: MINUTE,
  });
  if (!messageLimit.allowed) {
    return rateLimitResponse(
      messageLimit,
      `Можно отправить не более ${limits.messagesPerMinute} сообщений в минуту`,
    );
  }

  const [peer, chat] = await Promise.all([
    prisma.user.findUnique({ where: { id: peerId }, select: { id: true } }),
    prisma.chat.findUnique({
      where: { userAId_userBId: chatPair(me, peerId) },
      select: { id: true, status: true, initiatorId: true },
    }),
  ]);
  if (!peer) return jsonError("Пользователь не найден", 404);

  const state = chatStateFor(chat, me);
  if (state === "pending_out") {
    return jsonError("Запрос уже отправлен. Дождитесь ответа", 403);
  }
  if (state === "pending_in") {
    return jsonError("Сначала примите или отклоните запрос", 403);
  }
  if (state === "blocked") {
    return jsonError(
      "Пользователь отклонил запрос. Теперь он может написать первым",
      403,
    );
  }

  if (replyToId && state !== "accepted") {
    return jsonError("В запросе нельзя отвечать на сообщение", 400);
  }

  if (replyToId) {
    const quoted = await prisma.message.findFirst({
      where: {
        id: replyToId,
        OR: [
          { senderId: me, receiverId: peerId },
          { senderId: peerId, receiverId: me },
        ],
      },
      select: { id: true },
    });
    if (!quoted) return jsonError("Сообщение для ответа не найдено", 400);
  }

  let message;
  let nextState: "accepted" | "pending_out";

  if (state === "accepted") {
    message = await prisma.message.create({
      data: { content, senderId: me, receiverId: peerId, replyToId },
      include: messageInclude,
    });
    nextState = "accepted";
  } else {
    const requestLimit = await consumeRateLimit({
      subject: `user:${me}`,
      action: "chat_request_v2",
      limit: limits.chatRequestsPerHour,
      windowMs: HOUR,
    });
    if (!requestLimit.allowed) {
      return rateLimitResponse(
        requestLimit,
        `Можно создать не более ${limits.chatRequestsPerHour} новых запросов в час`,
      );
    }

    const pair = chatPair(me, peerId);
    try {
      message = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`
          WITH transaction_lock AS (
            SELECT pg_advisory_xact_lock(hashtext(${`chat-pair:${pair.userAId}:${pair.userBId}`}::text))
          )
          SELECT 1::int AS "locked" FROM transaction_lock
        `;
        await tx.$queryRaw`
          WITH transaction_lock AS (
            SELECT pg_advisory_xact_lock(hashtext(${`pending-request:${me}`}::text))
          )
          SELECT 1::int AS "locked" FROM transaction_lock
        `;

        const currentChat = await tx.chat.findUnique({
          where: { userAId_userBId: pair },
          select: { id: true, status: true, initiatorId: true },
        });
        if (chatStateFor(currentChat, me) !== "none") {
          throw new ChatStateChangedError();
        }

        const activeRequests = await tx.chat.count({
          where: { initiatorId: me, status: "PENDING" },
        });
        if (activeRequests >= limits.pendingRequests) {
          throw new PendingRequestLimitError();
        }

        if (currentChat?.status === "DECLINED") {
          await tx.chat.update({
            where: { id: currentChat.id },
            data: { initiatorId: me, status: "PENDING" },
          });
        } else {
          await tx.chat.create({
            data: { ...pair, initiatorId: me, status: "PENDING" },
          });
        }

        return tx.message.create({
          data: { content, senderId: me, receiverId: peerId },
          include: messageInclude,
        });
      });
    } catch (error) {
      if (error instanceof PendingRequestLimitError) {
        return jsonError(
          `Можно иметь не более ${limits.pendingRequests} одновременных исходящих запросов`,
          429,
        );
      }
      if (error instanceof ChatStateChangedError) {
        return jsonError("Состояние чата изменилось. Обновите чат", 409);
      }
      console.error("creating chat request failed", error);
      return jsonError("Не удалось создать запрос. Попробуйте ещё раз", 500);
    }
    nextState = "pending_out";
  }

  return NextResponse.json({
    message: serializeMessage(message, me),
    state: nextState,
  });
}
