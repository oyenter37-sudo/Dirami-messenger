import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachSession, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { parseNickname, parsePassword } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный запрос", 400);
    }

    const payload = body as { nickname?: unknown; password?: unknown };
    const nickname = parseNickname(payload.nickname);
    const password = parsePassword(payload.password);

    if (!nickname || !password) {
      return jsonError("Неверный ник или пароль", 400);
    }

    const user = await prisma.user.findUnique({ where: { nickname } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return jsonError("Неверный ник или пароль", 401);
    }

    const response = NextResponse.json({
      user: { id: user.id, nickname: user.nickname },
    });
    return await attachSession(response, {
      userId: user.id,
      nickname: user.nickname,
    });
  } catch (error) {
    console.error("login failed", error);
    if (error instanceof Error && error.message === "AUTH_SECRET is not set") {
      return jsonError("На сервере не задан AUTH_SECRET", 500);
    }
    return jsonError("Не получилось войти", 500);
  }
}
