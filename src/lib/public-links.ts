import "server-only";

import { parseNickname } from "@/lib/validators";

export function decodePublicUsername(rawUsername: string) {
  let decoded = rawUsername;
  try {
    decoded = decodeURIComponent(rawUsername);
  } catch {
    return null;
  }
  return parseNickname(decoded.replace(/^@/, ""));
}

export function userPublicPath(nickname: string) {
  return `/u/u/@${encodeURIComponent(nickname)}`;
}

export function nftPublicPath(id: string) {
  return `/u/nft/${encodeURIComponent(id)}`;
}
