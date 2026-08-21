import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { jsonError, requireSession } from "@/lib/api";
import { parsePassword } from "@/lib/validators";

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

  const payload = body as { currentPassword?: unknown; newPassword?: unknown };
  const currentPassword = parsePassword(payload.currentPassword);
  const newPassword = parsePassword(payload.newPassword);

  if (!currentPassword || !newPassword) {
    return jsonError("Пароль: минимум 6 символов", 400);
  }
  if (currentPassword === newPassword) {
    return jsonError("Новый пароль совпадает со старым", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
  });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return jsonError("Текущий пароль неверный", 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  return NextResponse.json({ ok: true });
}
