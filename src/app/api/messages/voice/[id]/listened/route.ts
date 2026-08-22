import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { mutationGuard } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!id || id.length > 64) return jsonError("Некорректное сообщение", 400);

  const voice = await prisma.voiceMessage.findUnique({
    where: { messageId: id },
    select: {
      listenedAt: true,
      message: { select: { receiverId: true } },
    },
  });
  if (!voice) return jsonError("Голосовое сообщение не найдено", 404);
  if (voice.message.receiverId !== auth.session.userId) {
    return jsonError(
      "Только получатель может отметить запись прослушанной",
      403,
    );
  }
  if (voice.listenedAt) {
    return NextResponse.json({
      listenedAt: voice.listenedAt.toISOString(),
      available: false,
    });
  }

  const listenedAt = new Date();
  await prisma.$transaction([
    prisma.voiceMessage.updateMany({
      where: { messageId: id, listenedAt: null },
      data: { data: null, listenedAt },
    }),
    prisma.message.updateMany({
      where: { id, receiverId: auth.session.userId, readAt: null },
      data: { readAt: listenedAt },
    }),
  ]);

  const current = await prisma.voiceMessage.findUnique({
    where: { messageId: id },
    select: { listenedAt: true },
  });
  if (!current?.listenedAt) {
    return jsonError("Не удалось отметить запись прослушанной", 409);
  }

  return NextResponse.json({
    listenedAt: current.listenedAt.toISOString(),
    available: false,
  });
}
