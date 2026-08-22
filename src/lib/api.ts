import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/types";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireSession(): Promise<
  | { session: SessionUser; error?: undefined }
  | { session?: undefined; error: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { error: jsonError("Нужно войти", 401) };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { sessionVersion: true },
  });
  if (!user || user.sessionVersion !== session.sessionVersion) {
    return { error: jsonError("Сессия завершена. Войдите снова", 401) };
  }

  return { session };
}

export async function requireAdmin(): Promise<
  | {
      session: SessionUser;
      admin: { id: string; nickname: string; displayName: string };
      error?: undefined;
    }
  | { session?: undefined; admin?: undefined; error: NextResponse }
> {
  const auth = await requireSession();
  if (auth.error) return auth;

  const admin = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: { id: true, nickname: true, displayName: true, isAdmin: true },
  });
  if (!admin?.isAdmin) {
    return { error: jsonError("Доступно только администратору", 403) };
  }

  return { session: auth.session, admin };
}
