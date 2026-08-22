import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import {
  parseBio,
  parseOptionalHttpUrl,
  parseProfileAccent,
  parseProfileBackground,
} from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicProfileSelect = {
  id: true,
  nickname: true,
  bio: true,
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

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: publicProfileSelect,
  });
  if (!user) return jsonError("Нужно войти", 401);

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  const payload = body as {
    bio?: unknown;
    avatarUrl?: unknown;
    profileAccent?: unknown;
    profileBackground?: unknown;
  };
  const data: {
    bio?: string;
    avatarUrl?: string;
    profileAccent?: string;
    profileBackground?: string;
  } = {};

  if (Object.hasOwn(payload, "bio")) {
    const bio = parseBio(payload.bio);
    if (bio === null) return jsonError("Описание до 280 символов", 400);
    data.bio = bio;
  }

  if (Object.hasOwn(payload, "avatarUrl")) {
    const avatarUrl = parseOptionalHttpUrl(payload.avatarUrl);
    if (avatarUrl === null) return jsonError("Нужна корректная http/https-ссылка на аватар", 400);
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
