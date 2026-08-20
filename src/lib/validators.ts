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

export function parseMessageContent(value: unknown) {
  if (typeof value !== "string") return null;
  const content = value.trim();
  if (content.length < 1 || content.length > 2000) return null;
  return content;
}
