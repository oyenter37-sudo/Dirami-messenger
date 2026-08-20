import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";
import { parseBio } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { id: true, nickname: true, bio: true },
  });
  if (!user) {
    return jsonError("Нужно войти", 401);
  }

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

  const bio = parseBio((body as { bio?: unknown }).bio);
  if (bio === null) {
    return jsonError("Описание до 280 символов", 400);
  }

  const user = await prisma.user.update({
    where: { id: auth.session.userId },
    data: { bio },
    select: { id: true, nickname: true, bio: true },
  });

  return NextResponse.json({ user });
}
