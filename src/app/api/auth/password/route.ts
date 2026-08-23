import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachSession, hashPassword, verifyPassword } from "@/lib/auth";
import { jsonError, requireSession } from "@/lib/api";
import { parseNewPassword, parsePassword } from "@/lib/validators";
import {
  consumeRateLimit,
  getUserLimits,
  HOUR,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { passwordHash: true },
  });
  if (!user) return jsonError("Нужно войти", 401);

  return NextResponse.json({ hasPassword: Boolean(user.passwordHash) });
}

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const limits = await getUserLimits(auth.session.userId);
  const passwordLimit = await consumeRateLimit({
    subject: `user:${auth.session.userId}`,
    action: "password_change",
    limit: limits.passwordChangesPerHour,
    windowMs: HOUR,
  });
  if (!passwordLimit.allowed) {
    return rateLimitResponse(
      passwordLimit,
      `Можно менять пароль не более ${limits.passwordChangesPerHour} раз в час`,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as { currentPassword?: unknown; newPassword?: unknown };
  const currentPassword = parsePassword(payload.currentPassword);
  const newPassword = parseNewPassword(payload.newPassword);

  if (!newPassword) {
    return jsonError("Новый пароль: минимум 8 символов", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { id: true, nickname: true, passwordHash: true },
  });
  if (!user) return jsonError("Нужно войти", 401);

  if (user.passwordHash) {
    if (
      !currentPassword ||
      !(await verifyPassword(currentPassword, user.passwordHash))
    ) {
      return jsonError("Текущий пароль неверный", 401);
    }
    if (currentPassword === newPassword) {
      return jsonError("Новый пароль совпадает со старым", 400);
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
      sessionVersion: { increment: 1 },
    },
    select: { nickname: true, sessionVersion: true },
  });

  return attachSession(NextResponse.json({ ok: true, hasPassword: true }), {
    userId: user.id,
    nickname: updated.nickname,
    sessionVersion: updated.sessionVersion,
  });
}
