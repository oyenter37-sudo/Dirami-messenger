import { cookies } from "next/headers";
import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import type { SessionUser } from "@/lib/types";

export { SESSION_COOKIE };

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}

export async function signSession(user: SessionUser) {
  return new SignJWT({ userId: user.userId, nickname: user.nickname })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string" || typeof payload.nickname !== "string") {
      return null;
    }
    return { userId: payload.userId, nickname: payload.nickname };
  } catch {
    return null;
  }
}

function cookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function attachSession(response: NextResponse, user: SessionUser) {
  const token = await signSession(user);
  response.cookies.set(SESSION_COOKIE, token, cookieOptions());
  return response;
}

export function clearSession(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  return response;
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
