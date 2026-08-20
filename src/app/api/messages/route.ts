import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { parseMessageContent } from "@/lib/validators";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const replyInclude = {
  replyTo: {
    select: {
      id: true,
      content: true,
      senderId: true,
      sender: { select: { nickname: true } },
    },
  },
} as const;

function serialize(message: {
  id: string;
  content: string;
  createdAt: Date;
  senderId: string;
  receiverId: string;
  replyTo: {
    id: string;
    content: string;
    senderId: string;
    sender: { nickname: string };
  } | null;
}): ChatMessage {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderId: message.senderId,
    receiverId: message.receiverId,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderId: message.replyTo.senderId,
          nickname: message.replyTo.sender.nickname,
        }
      : null,
  };
}

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const peerId = url.searchParams.get("peerId");
  const after = url.searchParams.get("after");

  if (!peerId) {
    return jsonError("Не указан собеседник", 400);
  }

  const me = auth.session.userId;
  if (peerId === me) {
    return jsonError("Нельзя открыть чат с собой", 400);
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true, nickname: true },
  });
  if (!peer) {
    return jsonError("Пользователь не найден", 404);
  }

  const afterDate = after ? new Date(after) : null;
  const validAfter = afterDate && !Number.isNaN(afterDate.getTime()) ? afterDate : null;

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
    include: replyInclude,
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  await prisma.message.updateMany({
    where: {
      senderId: peerId,
      receiverId: me,
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    peer,
    messages: messages.map(serialize),
  });
}

export async function POST(request: Request) {
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
  const replyToId = typeof payload.replyToId === "string" ? payload.replyToId : null;

  if (!peerId) {
    return jsonError("Не указан собеседник", 400);
  }
  if (!content) {
    return jsonError("Сообщение пустое или слишком длинное", 400);
  }

  const me = auth.session.userId;
  if (peerId === me) {
    return jsonError("Нельзя написать себе", 400);
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true },
  });
  if (!peer) {
    return jsonError("Пользователь не найден", 404);
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
    if (!quoted) {
      return jsonError("Сообщение для ответа не найдено", 400);
    }
  }

  const message = await prisma.message.create({
    data: {
      content,
      senderId: me,
      receiverId: peerId,
      replyToId,
    },
    include: replyInclude,
  });

  return NextResponse.json({ message: serialize(message) });
}
