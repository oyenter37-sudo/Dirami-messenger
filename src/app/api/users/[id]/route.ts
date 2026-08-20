import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError, requireSession } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nickname: true, bio: true },
  });
  if (!user) {
    return jsonError("Пользователь не найден", 404);
  }

  return NextResponse.json({ user });
}
