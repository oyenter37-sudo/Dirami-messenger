import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mutationGuard } from "@/lib/rate-limit";

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

export async function POST(request: Request) {
  const guard = mutationGuard(request, 4096);
  if (guard) return guard;

  const session = await getSession();
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* Older clients may send an empty logout request. */
  }
  const endpoint = parseEndpoint((body as { pushEndpoint?: unknown }).pushEndpoint);
  if (session && endpoint) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.userId },
    });
  }

  return clearSession(NextResponse.json({ ok: true }));
}
