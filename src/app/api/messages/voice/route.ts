import { after, NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { chatPair, chatStateFor } from "@/lib/chat-state";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import {
  consumeRateLimit,
  getUserLimits,
  HOUR,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { messageInclude, serializeMessage } from "@/lib/serialize-message";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 1_500_000;
const MAX_REQUEST_BYTES = 1_650_000;
const MAX_DURATION_MS = 60_000;
const VOICE_CONTENT = "Голосовое сообщение";
const ALLOWED_MIME_TYPES = new Set(["audio/webm", "audio/mp4", "audio/ogg"]);

class PendingRequestLimitError extends Error {}
class ChatStateChangedError extends Error {}

function hasSupportedSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "audio/webm") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    );
  }
  if (mimeType === "audio/ogg") {
    return (
      bytes.length >= 4 &&
      bytes[0] === 0x4f &&
      bytes[1] === 0x67 &&
      bytes[2] === 0x67 &&
      bytes[3] === 0x53
    );
  }
  return (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}

export async function POST(request: Request) {
  const guard = mutationGuard(request, MAX_REQUEST_BYTES);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Некорректная запись", 400);
  }

  const peerIdValue = form.get("peerId");
  const replyToIdValue = form.get("replyToId");
  const durationValue = form.get("durationMs");
  const audio = form.get("audio");
  const peerId = typeof peerIdValue === "string" ? peerIdValue : "";
  const replyToId =
    typeof replyToIdValue === "string" && replyToIdValue
      ? replyToIdValue
      : null;
  const durationMs =
    typeof durationValue === "string" ? Number(durationValue) : Number.NaN;

  if (!peerId) return jsonError("Не указан собеседник", 400);
  if (!(audio instanceof Blob)) return jsonError("Нет аудиозаписи", 400);
  if (
    !Number.isInteger(durationMs) ||
    durationMs < 300 ||
    durationMs > MAX_DURATION_MS
  ) {
    return jsonError("Голосовое сообщение должно длиться не более минуты", 400);
  }
  if (audio.size < 100 || audio.size > MAX_AUDIO_BYTES) {
    return jsonError("Аудиозапись пустая или слишком большая", 413);
  }

  const mimeType = audio.type.toLowerCase().split(";", 1)[0];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return jsonError("Этот формат аудио не поддерживается", 415);
  }

  const audioBytes = new Uint8Array(await audio.arrayBuffer());
  if (!hasSupportedSignature(audioBytes, mimeType)) {
    return jsonError("Файл не похож на аудиозапись", 415);
  }

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

  const messageData = {
    kind: "VOICE" as const,
    content: VOICE_CONTENT,
    senderId: me,
    receiverId: peerId,
    voice: {
      create: {
        data: audioBytes,
        mimeType,
        sizeBytes: audioBytes.byteLength,
        durationMs,
      },
    },
  };

  let message;
  let nextState: "accepted" | "pending_out";

  if (state === "accepted") {
    message = await prisma.message.create({
      data: { ...messageData, replyToId },
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
          data: messageData,
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
      console.error("creating voice chat request failed", error);
      return jsonError("Не удалось создать запрос. Попробуйте ещё раз", 500);
    }
    nextState = "pending_out";
  }

  after(async () => {
    try {
      await sendPushToUser(peerId, {
        title:
          nextState === "pending_out"
            ? `Новый запрос от @${auth.session.nickname}`
            : `@${auth.session.nickname} · Dirami`,
        body: "🎤 Голосовое сообщение",
        url: `/chat?peer=${encodeURIComponent(me)}`,
        tag: `dirami-chat-${me}`,
      });
    } catch (error) {
      console.error("voice message push failed", error);
    }
  });

  return NextResponse.json({
    message: serializeMessage(message, me),
    state: nextState,
  });
}
