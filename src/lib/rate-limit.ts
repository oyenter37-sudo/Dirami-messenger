import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_USER_LIMITS, type UserLimits } from "@/lib/limit-config";

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

function bucketData(
  subject: string,
  action: string,
  windowMs: number,
  now = Date.now(),
) {
  const subjectHash = digest(subject);
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  return {
    id: digest(`${subjectHash}:${action}:${windowStartMs}`),
    subject: subjectHash,
    action,
    windowStart: new Date(windowStartMs),
    expiresAt: new Date(windowStartMs + windowMs * 2),
    resetAt: windowStartMs + windowMs,
  };
}

export async function getUserLimits(userId: string): Promise<UserLimits> {
  const row = await prisma.userLimit.findUnique({ where: { userId } });
  if (!row) return { ...DEFAULT_USER_LIMITS };
  return {
    messagesPerMinute: row.messagesPerMinute,
    pendingRequests: row.pendingRequests,
    chatRequestsPerHour: row.chatRequestsPerHour,
    requestActionsPerMinute: row.requestActionsPerMinute,
    reactionsPerMinute: row.reactionsPerMinute,
    chatListReadsPerMinute: row.chatListReadsPerMinute,
    messageReadsPerMinute: row.messageReadsPerMinute,
    searchesPerMinute: row.searchesPerMinute,
    profileViewsPerMinute: row.profileViewsPerMinute,
    profileUpdatesPerHour: row.profileUpdatesPerHour,
    passwordChangesPerHour: row.passwordChangesPerHour,
    nftTransfersPerHour: row.nftTransfersPerHour,
    nftMintsPerHour: row.nftMintsPerHour,
  };
}

export async function consumeRateLimit({
  subject,
  action,
  limit,
  windowMs,
}: {
  subject: string;
  action: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const data = bucketData(subject, action, windowMs, now);
  const bucket = await prisma.rateLimitBucket.upsert({
    where: { id: data.id },
    create: {
      id: data.id,
      subject: data.subject,
      action: data.action,
      windowStart: data.windowStart,
      expiresAt: data.expiresAt,
      count: 1,
    },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  if (bucket.count === 1) {
    await prisma.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: new Date(now) }, id: { not: data.id } },
    });
  }

  return {
    allowed: limit > 0 && bucket.count <= limit,
    limit,
    used: bucket.count,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: data.resetAt,
    retryAfter: Math.max(1, Math.ceil((data.resetAt - now) / 1000)),
  };
}

export async function readRateLimitUsage({
  subject,
  action,
  windowMs,
}: {
  subject: string;
  action: string;
  windowMs: number;
}) {
  const data = bucketData(subject, action, windowMs);
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { id: data.id },
    select: { count: true },
  });
  return { used: bucket?.count ?? 0, resetAt: data.resetAt };
}

export function rateLimitResponse(
  result: {
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfter: number;
  },
  message = "Слишком много действий. Попробуйте позже",
) {
  return NextResponse.json(
    { error: message, retryAfter: result.retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}

export function requestAddress(request: Request) {
  const vercel = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  const address = vercel || forwarded || real;
  return address && isIP(address) ? `ip:${address}` : "ip:unknown";
}

export function mutationGuard(request: Request, maxBytes = 16_384) {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json(
      { error: "Запрос слишком большой" },
      { status: 413 },
    );
  }

  return null;
}
