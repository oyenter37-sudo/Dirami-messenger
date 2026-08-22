import { isProfileBackground } from "@/lib/profile-customization";

const NICKNAME_RE = /^[\p{L}\p{N}_]{3,24}$/u;

export function parseNickname(value: unknown) {
  if (typeof value !== "string") return null;
  const nickname = value.trim();
  if (!NICKNAME_RE.test(nickname)) return null;
  return nickname;
}

export function parsePassword(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.length < 6 || value.length > 72) return null;
  return value;
}

export function parseBio(value: unknown) {
  if (typeof value !== "string") return null;
  const bio = value.trim();
  if (bio.length > 280) return null;
  return bio;
}

export function parseMessageContent(value: unknown) {
  if (typeof value !== "string") return null;
  const content = value.trim();
  if (content.length < 1 || content.length > 2000) return null;
  return content;
}

export function parseHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function parseOptionalHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.trim()) return "";
  return parseHttpUrl(value);
}

export function parseProfileAccent(value: unknown) {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value)) return null;
  return value.toLowerCase();
}

export function parseProfileBackground(value: unknown) {
  if (typeof value !== "string" || !isProfileBackground(value)) return null;
  return value;
}
