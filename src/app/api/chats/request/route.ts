import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { chatPair } from "@/lib/chat-state";

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

  const payload = body as { peerId?: unknown; action?: unknown };
  const peerId = typeof payload.peerId === "string" ? payload.peerId : "";
  const action = payload.action === "accept" || payload.action === "decline"
    ? payload.action
    : null;
  const me = auth.session.userId;

  if (!peerId || peerId === me || !action) {
    return jsonError("Некорректный запрос", 400);
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

  const updated = await prisma.chat.update({
    where: { id: chat.id },
    data: { status: action === "accept" ? "ACCEPTED" : "DECLINED" },
    select: { status: true },
  });

  if (action === "decline") {
    await prisma.message.updateMany({
      where: { senderId: peerId, receiverId: me, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    state: updated.status === "ACCEPTED" ? "accepted" : "none",
  });
}
