import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { parseMessageContent } from "@/lib/validators";
import { messageInclude, serializeMessage } from "@/lib/serialize-message";
import {
  consumeRateLimit,
  getUserLimits,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ID_LENGTH = 64;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id || id.length > MAX_ID_LENGTH) {
    return jsonError("Некорректное сообщение", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const content = parseMessageContent(
    (body as { content?: unknown } | null)?.content,
  );
  if (!content) {
    return jsonError("Сообщение пустое или слишком длинное", 400);
  }

  const me = auth.session.userId;
  const limits = await getUserLimits(me);
  const editLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "message_edit",
    limit: limits.messagesPerMinute,
    windowMs: MINUTE,
  });
  if (!editLimit.allowed) {
    return rateLimitResponse(editLimit, "Слишком много изменений подряд");
  }

  const existing = await prisma.message.findFirst({
    where: { id, senderId: me, deletedAt: null },
    select: { id: true, kind: true },
  });
  if (!existing) return jsonError("Сообщение не найдено", 404);
  if (existing.kind !== "TEXT") {
    return jsonError("Голосовые сообщения нельзя изменять", 400);
  }

  try {
    const message = await prisma.message.update({
      where: { id },
      data: { content, editedAt: new Date() },
      include: messageInclude,
    });
    return NextResponse.json({ message: serializeMessage(message, me) });
  } catch (error) {
    console.error("message edit failed", error);
    return jsonError("Не удалось изменить сообщение", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id || id.length > MAX_ID_LENGTH) {
    return jsonError("Некорректное сообщение", 400);
  }

  const me = auth.session.userId;
  const deleteLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "message_delete",
    limit: 30,
    windowMs: MINUTE,
  });
  if (!deleteLimit.allowed) {
    return rateLimitResponse(deleteLimit, "Слишком много удалений подряд");
  }

  const existing = await prisma.message.findFirst({
    where: { id, senderId: me, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return jsonError("Сообщение не найдено", 404);

  try {
    const message = await prisma.$transaction(async (tx) => {
      const updated = await tx.message.update({
        where: { id },
        data: { deletedAt: new Date(), content: "" },
        include: messageInclude,
      });
      // Soft-deleted text keeps no content, voice loses its audio bytes,
      // reactions have nothing to stick to anymore.
      await tx.voiceMessage.deleteMany({ where: { messageId: id } });
      await tx.reaction.deleteMany({ where: { messageId: id } });
      return updated;
    });
    return NextResponse.json({ message: serializeMessage(message, me) });
  } catch (error) {
    console.error("message delete failed", error);
    return jsonError("Не удалось удалить сообщение", 500);
  }
}
