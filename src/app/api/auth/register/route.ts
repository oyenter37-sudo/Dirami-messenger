import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { attachSession, hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { parseNewPassword, parseNickname } from "@/lib/validators";
import {
  consumeRateLimit,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
  requestAddress,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const guard = mutationGuard(request);
    if (guard) return guard;

    const address = requestAddress(request);
    const attemptLimit = await consumeRateLimit({
      subject: address,
      action: "registration_attempt",
      limit: 10,
      windowMs: MINUTE,
    });
    if (!attemptLimit.allowed) {
      return rateLimitResponse(
        attemptLimit,
        "Слишком много попыток регистрации",
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Некорректный запрос", 400);
    }

    const payload = body as { nickname?: unknown; password?: unknown };
    const nickname = parseNickname(payload.nickname);
    const password = parseNewPassword(payload.password);

    if (!nickname) {
      return jsonError("Ник: 3–24 символа, буквы, цифры или _", 400);
    }
    if (!password) {
      return jsonError("Пароль: минимум 8 символов", 400);
    }

    const existing = await prisma.user.findFirst({
      where: { nickname: { equals: nickname, mode: "insensitive" } },
    });
    if (existing) {
      return jsonError("Этот ник уже занят", 409);
    }

    const registrationLimit = await consumeRateLimit({
      subject: address,
      action: "registration",
      limit: 3,
      windowMs: MINUTE,
    });
    if (!registrationLimit.allowed) {
      return rateLimitResponse(
        registrationLimit,
        "С этого адреса можно создать не более 3 аккаунтов в минуту",
      );
    }

    let user;
    try {
      user = await prisma.user.create({
        data: {
          nickname,
          displayName: nickname,
          passwordHash: await hashPassword(password),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return jsonError("Этот ник уже занят", 409);
      }
      throw error;
    }

    const response = NextResponse.json({
      user: { id: user.id, nickname: user.nickname },
    });
    return await attachSession(response, {
      userId: user.id,
      nickname: user.nickname,
      sessionVersion: user.sessionVersion,
    });
  } catch (error) {
    console.error("register failed", error);
    if (error instanceof Error && error.message.startsWith("AUTH_SECRET")) {
      return jsonError("AUTH_SECRET сервера не настроен безопасно", 500);
    }
    return jsonError("Не получилось зарегистрироваться", 500);
  }
}
