import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { jsonError, requireSession } from "@/lib/api";
import { attachSession } from "@/lib/auth";
import {
  type VerifiedGoogleIdentity,
  verifyGoogleCredential,
} from "@/lib/google-auth";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
  requestAddress,
} from "@/lib/rate-limit";
import { parseNickname } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleAction = "login" | "register" | "link_session";

function isGoogleAction(value: unknown): value is GoogleAction {
  return value === "login" || value === "register" || value === "link_session";
}

function googleProfile(identity: VerifiedGoogleIdentity) {
  return {
    email: identity.email,
    name: identity.name,
    pictureUrl: identity.pictureUrl,
  };
}

function sessionResponse(user: {
  id: string;
  nickname: string;
  sessionVersion: number;
}) {
  return attachSession(
    NextResponse.json({
      ok: true,
      user: { id: user.id, nickname: user.nickname },
    }),
    {
      userId: user.id,
      nickname: user.nickname,
      sessionVersion: user.sessionVersion,
    },
  );
}

function googleAccountData(identity: VerifiedGoogleIdentity) {
  return {
    email: identity.email,
    name: identity.name,
    pictureUrl: identity.pictureUrl,
  };
}

function googleLinkConflict() {
  return NextResponse.json(
    {
      error: "Этот Google-аккаунт уже привязан к другому профилю Dirami",
      code: "GOOGLE_ALREADY_LINKED",
    },
    { status: 409 },
  );
}

async function handleGoogleAuth(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as {
    action?: unknown;
    credential?: unknown;
    nickname?: unknown;
  };
  if (!isGoogleAction(payload.action)) {
    return jsonError("Некорректное действие Google", 400);
  }
  const credential =
    typeof payload.credential === "string" ? payload.credential : "";
  const address = requestAddress(request);
  const authLimit = await consumeRateLimit({
    subject: address,
    action: "google_auth",
    limit: 40,
    windowMs: 5 * MINUTE,
  });
  if (!authLimit.allowed) {
    return rateLimitResponse(
      authLimit,
      "Слишком много попыток входа через Google",
    );
  }

  const identity = await verifyGoogleCredential(credential);
  if (!identity) {
    return NextResponse.json(
      {
        error: "Не удалось подтвердить Google-аккаунт. Попробуйте ещё раз",
        code: "GOOGLE_CREDENTIAL_INVALID",
      },
      { status: 401 },
    );
  }

  if (payload.action === "login") {
    const linked = await prisma.googleAccount.findUnique({
      where: { googleSubject: identity.subject },
      include: { user: true },
    });
    if (!linked) {
      return NextResponse.json(
        {
          error: "Этот Google-аккаунт ещё не связан с Dirami",
          code: "GOOGLE_NOT_LINKED",
          googleProfile: googleProfile(identity),
        },
        { status: 409 },
      );
    }

    await prisma.googleAccount.update({
      where: { googleSubject: identity.subject },
      data: googleAccountData(identity),
    });
    return sessionResponse(linked.user);
  }

  if (payload.action === "link_session") {
    const auth = await requireSession();
    if (auth.error) return auth.error;

    const [linkedGoogle, user] = await Promise.all([
      prisma.googleAccount.findUnique({
        where: { googleSubject: identity.subject },
        select: { userId: true },
      }),
      prisma.user.findUnique({
        where: { id: auth.session.userId },
        select: {
          id: true,
          nickname: true,
          sessionVersion: true,
          googleAccount: { select: { googleSubject: true } },
        },
      }),
    ]);
    if (!user) return jsonError("Нужно войти", 401);
    if (linkedGoogle && linkedGoogle.userId !== user.id) {
      return googleLinkConflict();
    }
    if (
      user.googleAccount &&
      user.googleAccount.googleSubject !== identity.subject
    ) {
      return jsonError(
        "К этому профилю уже привязан другой Google-аккаунт",
        409,
      );
    }

    try {
      await prisma.googleAccount.upsert({
        where: { googleSubject: identity.subject },
        create: {
          googleSubject: identity.subject,
          userId: user.id,
          ...googleAccountData(identity),
        },
        update: googleAccountData(identity),
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return jsonError("Google уже привязан к другому профилю", 409);
      }
      throw error;
    }
    return NextResponse.json({
      ok: true,
      linked: true,
      googleProfile: googleProfile(identity),
    });
  }

  if (payload.action === "register") {
    const nickname = parseNickname(payload.nickname);
    if (!nickname) {
      return jsonError("Ник: 3–24 символа, буквы, цифры или _", 400);
    }

    const [linkedGoogle, existingNickname] = await Promise.all([
      prisma.googleAccount.findUnique({
        where: { googleSubject: identity.subject },
        select: { userId: true },
      }),
      prisma.user.findFirst({
        where: { nickname: { equals: nickname, mode: "insensitive" } },
        select: { id: true },
      }),
    ]);
    if (linkedGoogle) return googleLinkConflict();
    if (existingNickname) {
      return jsonError("Этот юз уже занят. Выберите другой", 409);
    }

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

    try {
      const user = await prisma.user.create({
        data: {
          nickname,
          displayName: identity.displayName || nickname,
          passwordHash: null,
          avatarUrl: identity.pictureUrl,
          googleAccount: {
            create: {
              googleSubject: identity.subject,
              ...googleAccountData(identity),
            },
          },
        },
      });
      return sessionResponse(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return jsonError("Ник или Google-аккаунт уже используется", 409);
      }
      throw error;
    }
  }

  return jsonError("Некорректное действие Google", 400);
}

export async function POST(request: Request) {
  try {
    return await handleGoogleAuth(request);
  } catch (error) {
    console.error("google auth failed", error);
    return jsonError("Не удалось выполнить вход через Google", 500);
  }
}
