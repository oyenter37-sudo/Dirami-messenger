import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";
import { mutationGuard } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = mutationGuard(request, 1024);
  if (guard) return guard;
  return clearSession(NextResponse.json({ ok: true }));
}
