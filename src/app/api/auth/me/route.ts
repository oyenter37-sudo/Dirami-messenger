import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;

  return NextResponse.json({
    user: { id: auth.session.userId, nickname: auth.session.nickname },
  });
}
