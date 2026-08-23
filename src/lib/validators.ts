import { isIP } from "node:net";
import { isProfileBackground } from "@/lib/profile-customization";

const NICKNAME_RE = /^[\p{L}\p{N}_]{3,24}$/u;
const INLINE_CONTROL_RE = /[\u0000-\u001f\u007f]/;
const TEXT_CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;

export function parseNickname(value: unknown) {
  if (typeof value !== "string") return null;
  const nickname = value.trim();
  if (!NICKNAME_RE.test(nickname)) return null;
  return nickname;
}

export function parseDisplayName(value: unknown) {
  if (typeof value !== "string") return null;
  const displayName = value.trim();
  if (
    displayName.length < 1 ||
    displayName.length > 40 ||
    INLINE_CONTROL_RE.test(displayName)
  )
    return null;
  return displayName;
}

export function parsePassword(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.length < 6 || value.length > 72) return null;
  return value;
}

export function parseNewPassword(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 72) return null;
  return value;
}

export function parseBio(value: unknown) {
  if (typeof value !== "string") return null;
  const bio = value.trim();
  if (bio.length > 280 || TEXT_CONTROL_RE.test(bio)) return null;
  return bio;
}

export function parseExtraProfile(value: unknown) {
  if (typeof value !== "string") return null;
  const extraProfile = value.trim();
  if (extraProfile.length > 1200 || TEXT_CONTROL_RE.test(extraProfile)) {
    return null;
  }
  return extraProfile;
}

export function parseMessageContent(value: unknown) {
  if (typeof value !== "string") return null;
  const content = value.trim();
  if (
    content.length < 1 ||
    content.length > 2000 ||
    TEXT_CONTROL_RE.test(content)
  )
    return null;
  return content;
}

export function parseNewsTitle(value: unknown) {
  if (typeof value !== "string") return null;
  const title = value.trim();
  if (title.length < 1 || title.length > 100 || INLINE_CONTROL_RE.test(title)) {
    return null;
  }
  return title;
}

export function parseNewsContent(value: unknown) {
  if (typeof value !== "string") return null;
  const content = value.trim();
  if (
    content.length < 1 ||
    content.length > 3000 ||
    TEXT_CONTROL_RE.test(content)
  ) {
    return null;
  }
  return content;
}

function isLocalAddress(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  )
    return true;

  if (isIP(host) === 4) {
    const [a, b] = host.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }

  if (isIP(host) === 6) {
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      /^fe[89ab]/.test(host) ||
      host.startsWith("::ffff:")
    );
  }

  return false;
}

export function parseHttpUrl(value: unknown) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || isLocalAddress(url.hostname))
      return null;
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

export function parseHyperBadgeStyle(value: unknown) {
  return value === "special" || value === "hidden" || value === "classic"
    ? value
    : null;
}

export function parseHyperNameStyle(value: unknown) {
  return value === "rainbow" ||
    value === "plain" ||
    value === "verified" ||
    value === "custom"
    ? value
    : null;
}

export function parseProfileBackground(value: unknown) {
  if (typeof value !== "string" || !isProfileBackground(value)) return null;
  return value;
}
