import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import {
  parseBio,
  parseExtraProfile,
  parseHyperBadgeStyle,
  parseHyperNameStyle,
  parseOptionalHttpUrl,
  parseProfileAccent,
  parseProfileBackground,
} from "@/lib/validators";
import {
  consumeRateLimit,
  getUserLimits,
  HOUR,
  MINUTE,
  mutationGuard,
  rateLimitResponse,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicProfileSelect = {
  id: true,
  nickname: true,
  displayName: true,
  isVerified: true,
  isHyperVerified: true,
  hyperBadgeStyle: true,
  hyperBadgeColor: true,
  hyperNameStyle: true,
  hyperNameColor: true,
  hyperNameGlow: true,
  bio: true,
  extraProfile: true,
  avatarUrl: true,
  profileAccent: true,
  profileBackground: true,
  createdAt: true,
  nfts: {
    orderBy: { createdAt: "desc" as const },
    select: { id: true, name: true, imageUrl: true, valueRub: true },
  },
} as const;

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const limits = await getUserLimits(auth.session.userId);
  const viewLimit = await consumeRateLimit({
    subject: `user:${auth.session.userId}`,
    action: "profile_view",
    limit: limits.profileViewsPerMinute,
    windowMs: MINUTE,
  });
  if (!viewLimit.allowed) {
    return rateLimitResponse(viewLimit, "Слишком много открытий профиля");
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: publicProfileSelect,
  });
  if (!user) return jsonError("Нужно войти", 401);

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const guard = mutationGuard(request);
  if (guard) return guard;

  const auth = await requireSession();
  if (auth.error) return auth.error;

  const limits = await getUserLimits(auth.session.userId);
  const updateLimit = await consumeRateLimit({
    subject: `user:${auth.session.userId}`,
    action: "profile_update",
    limit: limits.profileUpdatesPerHour,
    windowMs: HOUR,
  });
  if (!updateLimit.allowed) {
    return rateLimitResponse(
      updateLimit,
      `Можно изменять профиль не более ${limits.profileUpdatesPerHour} раз в час`,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as {
    bio?: unknown;
    extraProfile?: unknown;
    hyperBadgeStyle?: unknown;
    hyperBadgeColor?: unknown;
    hyperNameStyle?: unknown;
    hyperNameColor?: unknown;
    hyperNameGlow?: unknown;
    avatarUrl?: unknown;
    profileAccent?: unknown;
    profileBackground?: unknown;
  };
  const data: {
    bio?: string;
    extraProfile?: string;
    hyperBadgeStyle?: string;
    hyperBadgeColor?: string;
    hyperNameStyle?: string;
    hyperNameColor?: string;
    hyperNameGlow?: string;
    avatarUrl?: string;
    profileAccent?: string;
    profileBackground?: string;
  } = {};

  const hyperFields = [
    "extraProfile",
    "hyperBadgeStyle",
    "hyperBadgeColor",
    "hyperNameStyle",
    "hyperNameColor",
    "hyperNameGlow",
  ] as const;
  if (hyperFields.some((field) => Object.hasOwn(payload, field))) {
    const owner = await prisma.user.findUnique({
      where: { id: auth.session.userId },
      select: { isHyperVerified: true },
    });
    if (!owner) return jsonError("Нужно войти", 401);
    if (!owner.isHyperVerified) {
      return jsonError(
        "Настройки гиперподтверждения доступны только гиперподтверждённым пользователям",
        403,
      );
    }
  }

  if (Object.hasOwn(payload, "bio")) {
    const bio = parseBio(payload.bio);
    if (bio === null) return jsonError("Описание до 280 символов", 400);
    data.bio = bio;
  }

  if (Object.hasOwn(payload, "extraProfile")) {
    const extraProfile = parseExtraProfile(payload.extraProfile);
    if (extraProfile === null) {
      return jsonError("Дополнительный текст — до 1200 символов", 400);
    }
    data.extraProfile = extraProfile;
  }

  if (Object.hasOwn(payload, "hyperBadgeStyle")) {
    const value = parseHyperBadgeStyle(payload.hyperBadgeStyle);
    if (!value) return jsonError("Некорректный вид гипергалочки", 400);
    data.hyperBadgeStyle = value;
  }

  if (Object.hasOwn(payload, "hyperNameStyle")) {
    const value = parseHyperNameStyle(payload.hyperNameStyle);
    if (!value) return jsonError("Некорректный вид имени", 400);
    data.hyperNameStyle = value;
  }

  for (const [field, label] of [
    ["hyperBadgeColor", "цвет гипергалочки"],
    ["hyperNameColor", "цвет имени"],
    ["hyperNameGlow", "цвет свечения"],
  ] as const) {
    if (!Object.hasOwn(payload, field)) continue;
    const value = parseProfileAccent(payload[field]);
    if (!value) return jsonError(`Некорректный ${label}`, 400);
    data[field] = value;
  }

  if (Object.hasOwn(payload, "avatarUrl")) {
    const avatarUrl = parseOptionalHttpUrl(payload.avatarUrl);
    if (avatarUrl === null)
      return jsonError("Нужна корректная http/https-ссылка на аватар", 400);
    data.avatarUrl = avatarUrl;
  }

  if (Object.hasOwn(payload, "profileAccent")) {
    const profileAccent = parseProfileAccent(payload.profileAccent);
    if (!profileAccent) return jsonError("Некорректный цвет профиля", 400);
    data.profileAccent = profileAccent;
  }

  if (Object.hasOwn(payload, "profileBackground")) {
    const profileBackground = parseProfileBackground(payload.profileBackground);
    if (!profileBackground) return jsonError("Некорректный фон профиля", 400);
    data.profileBackground = profileBackground;
  }

  if (Object.keys(data).length === 0) return jsonError("Нет изменений", 400);

  const user = await prisma.user.update({
    where: { id: auth.session.userId },
    data,
    select: publicProfileSelect,
  });

  return NextResponse.json({ user });
}
