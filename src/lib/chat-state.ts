import type { ChatState } from "@/lib/types";

type ChatRecord = {
  initiatorId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
};

export function chatPair(firstUserId: string, secondUserId: string) {
  return firstUserId < secondUserId
    ? { userAId: firstUserId, userBId: secondUserId }
    : { userAId: secondUserId, userBId: firstUserId };
}

export function chatStateFor(chat: ChatRecord | null | undefined, me: string): ChatState {
  if (!chat) return "none";
  if (chat.status === "ACCEPTED") return "accepted";
  if (chat.status === "PENDING") {
    return chat.initiatorId === me ? "pending_out" : "pending_in";
  }

  // The user whose request was declined cannot send another request. The other
  // participant may initiate a fresh request in the opposite direction.
  return chat.initiatorId === me ? "blocked" : "none";
}
