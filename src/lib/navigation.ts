export function safeInternalPath(value: unknown, fallback = "/chat") {
  if (typeof value !== "string") return fallback;
  const path = value.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path) ||
    path.length > 500
  ) {
    return fallback;
  }
  return path;
}
