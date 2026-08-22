import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/constants";

async function hasSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  const encodedSecret = secret ? new TextEncoder().encode(secret) : null;
  if (!token || !encodedSecret || encodedSecret.byteLength < 32) return false;

  try {
    await jwtVerify(token, encodedSecret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const loggedIn = await hasSession(request);
  const path = request.nextUrl.pathname;
  const isChat = path === "/chat" || path.startsWith("/chat/");

  if (isChat && !loggedIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*"],
};
