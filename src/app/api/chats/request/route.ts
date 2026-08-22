import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
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

  const payload = body as { peerId?: unknown; action?: unknown };
  const peerId = typeof payload.peerId === "string" ? payload.peerId : "";
  const action =
    payload.action === "accept" || payload.action === "decline"
      ? payload.action
      : null;
  const me = auth.session.userId;

  if (!peerId || peerId === me || !action) {
    return jsonError("Некорректный запрос", 400);
  }

  const limits = await getUserLimits(me);
  const actionLimit = await consumeRateLimit({
    subject: `user:${me}`,
    action: "request_action",
    limit: limits.requestActionsPerMinute,
    windowMs: MINUTE,
  });
  if (!actionLimit.allowed) {
    return rateLimitResponse(actionLimit, "Слишком много действий с запросами");
  }

  const pair = chatPair(me, peerId);
  const chat = await prisma.chat.findUnique({
    where: { userAId_userBId: pair },
    select: { id: true, status: true, initiatorId: true },
  });

  if (!chat || chat.status !== "PENDING") {
    return jsonError("Активный запрос не найден", 404);
  }
  if (chat.initiatorId === me) {
    return jsonError("Нельзя обработать собственный запрос", 403);
  }

  const updated = await prisma.chat.updateMany({
    where: { id: chat.id, status: "PENDING", initiatorId: peerId },
    data: { status: action === "accept" ? "ACCEPTED" : "DECLINED" },
  });
  if (updated.count !== 1) {
    return jsonError("Запрос уже был обработан", 409);
  }

  if (action === "decline") {
    await prisma.message.updateMany({
      where: { senderId: peerId, receiverId: me, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    state: action === "accept" ? "accepted" : "none",
  });
}
