import { NextResponse } from "next/server";
import { jsonError, requireSession } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  const user = await prisma.user.findUnique({
    where: { id: auth.session.userId },
    select: {
      passwordHash: true,
      googleAccount: {
        select: { email: true, name: true, pictureUrl: true },
      },
    },
  });
  if (!user) return jsonError("Нужно войти", 401);

  return NextResponse.json({
    linked: Boolean(user.googleAccount),
    hasPassword: Boolean(user.passwordHash),
    googleProfile: user.googleAccount
      ? {
          email: user.googleAccount.email,
          name: user.googleAccount.name,
          pictureUrl: user.googleAccount.pictureUrl,
        }
      : null,
  });
}
