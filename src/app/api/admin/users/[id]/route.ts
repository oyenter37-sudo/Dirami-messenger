import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, requireAdmin } from "@/lib/api";
import {
  DEFAULT_USER_LIMITS,
  USER_LIMIT_DEFINITIONS,
  type UserLimitKey,
  type UserLimits,
} from "@/lib/limit-config";
import { mutationGuard } from "@/lib/rate-limit";
import { parseDisplayName, parseNickname } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as {
    nickname?: unknown;
    displayName?: unknown;
    limits?: Partial<Record<UserLimitKey, unknown>>;
  };
  const nickname = parseNickname(payload.nickname);
  const displayName = parseDisplayName(payload.displayName);
  if (!nickname)
    return jsonError("Юзернейм: 3–24 символа, буквы, цифры или _", 400);
  if (!displayName) return jsonError("Имя: 1–40 символов", 400);

  const limits = { ...DEFAULT_USER_LIMITS } as UserLimits;
  for (const definition of USER_LIMIT_DEFINITIONS) {
    const value = Number(payload.limits?.[definition.key]);
    if (!Number.isInteger(value) || value < 0 || value > definition.max) {
      return jsonError(
        `${definition.shortLabel}: целое число от 0 до ${definition.max}`,
        400,
      );
    }
    limits[definition.key] = value;
  }

  const { id } = await context.params;
  const [target, duplicate] = await Promise.all([
    prisma.user.findUnique({ where: { id }, select: { id: true } }),
    prisma.user.findFirst({
      where: {
        id: { not: id },
        nickname: { equals: nickname, mode: "insensitive" },
      },
      select: { id: true },
    }),
  ]);
  if (!target) return jsonError("Пользователь не найден", 404);
  if (duplicate) return jsonError("Этот юзернейм уже занят", 409);

  try {
    const [user] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { nickname, displayName },
        select: {
          id: true,
          nickname: true,
          displayName: true,
          avatarUrl: true,
          isAdmin: true,
          createdAt: true,
        },
      }),
      prisma.userLimit.upsert({
        where: { userId: id },
        create: { userId: id, ...limits },
        update: limits,
      }),
    ]);

    return NextResponse.json({ user: { ...user, limits } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return jsonError("Этот юзернейм уже занят", 409);
    }
    throw error;
  }
}
