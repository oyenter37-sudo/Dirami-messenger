import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { parseNickname, parsePassword } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as { nickname?: unknown; password?: unknown };
  const nickname = parseNickname(payload.nickname);
  const password = parsePassword(payload.password);

  if (!nickname) {
    return jsonError("Ник: 3–24 символа, буквы, цифры или _", 400);
  }
  if (!password) {
    return jsonError("Пароль: минимум 6 символов", 400);
  }

  const existing = await prisma.user.findUnique({ where: { nickname } });
  if (existing) {
    return jsonError("Этот ник уже занят", 409);
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        nickname,
        passwordHash: await hashPassword(password),
      },
    });
  } catch {
    return jsonError("Этот ник уже занят", 409);
  }

  await setSessionCookie({ userId: user.id, nickname: user.nickname });

  return NextResponse.json({
    user: { id: user.id, nickname: user.nickname },
  });
}
