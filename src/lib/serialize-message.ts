import type { ChatMessage } from "@/lib/types";

export type RawMessage = {
  id: string;
  content: string;
  createdAt: Date;
  senderId: string;
  receiverId: string;
  replyTo: {
    id: string;
    content: string;
    senderId: string;
    sender: { nickname: string };
  } | null;
  reactions: { emoji: string; userId: string }[];
};

export function serializeMessage(message: RawMessage, me: string): ChatMessage {
  const grouped = new Map<string, { count: number; mine: boolean }>();
  for (const reaction of message.reactions) {
    const current = grouped.get(reaction.emoji) ?? { count: 0, mine: false };
    current.count += 1;
    if (reaction.userId === me) current.mine = true;
    grouped.set(reaction.emoji, current);
  }

  return {
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderId: message.senderId,
    receiverId: message.receiverId,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.content,
          senderId: message.replyTo.senderId,
          nickname: message.replyTo.sender.nickname,
        }
      : null,
    reactions: [...grouped.entries()].map(([emoji, value]) => ({
      emoji,
      count: value.count,
      mine: value.mine,
    })),
  };
}
