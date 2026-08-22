import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { getVapidConfig } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import {
  consumeRateLimit,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseEndpoint(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseKey(value: unknown, maxLength: number) {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > maxLength ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return null;
  }
  return value;
}

async function mutationLimit(userId: string) {
  return consumeRateLimit({
    subject: `user:${userId}`,
    action: "push_subscription",
    limit: 12,
    windowMs: MINUTE,
  });
}

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const vapid = getVapidConfig();
  if (!vapid) {
    return NextResponse.json({ enabled: false, publicKey: null });
  }
  return NextResponse.json({ enabled: true, publicKey: vapid.publicKey });
}

export async function POST(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const limit = await mutationLimit(auth.session.userId);
  if (!limit.allowed) {
    return rateLimitResponse(limit, "Слишком много изменений уведомлений");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректная подписка", 400);
  }

  const payload = body as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  const endpoint = parseEndpoint(payload.endpoint);
  const p256dh = parseKey(payload.keys?.p256dh, 512);
  const keyAuth = parseKey(payload.keys?.auth, 256);
  if (!endpoint || !p256dh || !keyAuth) {
    return jsonError("Некорректная push-подписка", 400);
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh,
      auth: keyAuth,
      userId: auth.session.userId,
    },
    update: {
      p256dh,
      auth: keyAuth,
      userId: auth.session.userId,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const limit = await mutationLimit(auth.session.userId);
  if (!limit.allowed) {
    return rateLimitResponse(limit, "Слишком много изменений уведомлений");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректная подписка", 400);
  }
  const endpoint = parseEndpoint((body as { endpoint?: unknown }).endpoint);
  if (!endpoint) return jsonError("Некорректная push-подписка", 400);

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: auth.session.userId },
  });
  return NextResponse.json({ ok: true });
}
