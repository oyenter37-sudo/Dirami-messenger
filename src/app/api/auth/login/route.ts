import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachSession, hashPassword, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { parseNickname, parsePassword } from "@/lib/validators";
import {
  consumeRateLimit,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
  requestAddress,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DUMMY_PASSWORD_HASH =
  "$2b$12$ZqUYX8d6b.XcBhQ9CDD.yeE6Mrtb0jYUVOEqbqWe3DGWpjYUWHymW";

export async function POST(request: Request) {
  try {
    const guard = mutationGuard(request);
    if (guard) return guard;

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

    const address = requestAddress(request);
    const addressLimit = await consumeRateLimit({
      subject: address,
      action: "login_address_v2",
      limit: 40,
      windowMs: 5 * MINUTE,
    });
    if (!addressLimit.allowed) {
      return rateLimitResponse(
        addressLimit,
        "Слишком много попыток входа с этого адреса",
      );
    }

    const loginLimit = await consumeRateLimit({
      subject: `${address}:login:${nickname.toLowerCase()}`,
      action: "login_attempt_v2",
      limit: 10,
      windowMs: 5 * MINUTE,
    });
    if (!loginLimit.allowed) {
      return rateLimitResponse(
        loginLimit,
        "Слишком много попыток входа. Подождите несколько минут",
      );
    }

    const user = await prisma.user.findFirst({
      where: { nickname: { equals: nickname, mode: "insensitive" } },
    });
    const passwordValid = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !user.passwordHash || !passwordValid) {
      return jsonError("Неверный ник или пароль", 401);
    }

    const passwordCost = Number(user.passwordHash.split("$")[2]);
    if (Number.isFinite(passwordCost) && passwordCost < 12) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(password) },
      });
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
    console.error("login failed", error);
    if (error instanceof Error && error.message === "AUTH_SECRET is not set") {
      return jsonError("На сервере не задан AUTH_SECRET", 500);
    }
    return jsonError("Не получилось войти", 500);
  }
}
