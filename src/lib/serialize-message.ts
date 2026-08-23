import type { ChatMessage } from "@/lib/types";

export const messageInclude = {
  voice: {
    select: {
      durationMs: true,
      mimeType: true,
      sizeBytes: true,
      listenedAt: true,
    },
  },
  replyTo: {
    select: {
      id: true,
      kind: true,
      content: true,
      senderId: true,
      sender: {
        select: {
          nickname: true,
          displayName: true,
          isVerified: true,
          isHyperVerified: true,
        },
      },
      voice: {
        select: { durationMs: true },
      },
    },
  },
  reactions: {
    select: { emoji: true, userId: true },
  },
} as const;

export type RawMessage = {
  id: string;
  kind: "TEXT" | "VOICE";
  content: string;
  createdAt: Date;
  senderId: string;
  receiverId: string;
  voice: {
    durationMs: number;
    mimeType: string;
    sizeBytes: number;
    listenedAt: Date | null;
  } | null;
  replyTo: {
    id: string;
    kind: "TEXT" | "VOICE";
    content: string;
    senderId: string;
    sender: {
      nickname: string;
      displayName: string;
      isVerified: boolean;
      isHyperVerified: boolean;
    };
    voice: { durationMs: number } | null;
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
    kind: message.kind === "VOICE" ? "voice" : "text",
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderId: message.senderId,
    receiverId: message.receiverId,
    voice: message.voice
      ? {
          durationMs: message.voice.durationMs,
          mimeType: message.voice.mimeType,
          sizeBytes: message.voice.sizeBytes,
          listenedAt: message.voice.listenedAt?.toISOString() ?? null,
          available: message.voice.listenedAt === null,
        }
      : null,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          kind: message.replyTo.kind === "VOICE" ? "voice" : "text",
          content: message.replyTo.content,
          senderId: message.replyTo.senderId,
          nickname:
            message.replyTo.sender.displayName ||
            message.replyTo.sender.nickname,
          isVerified: message.replyTo.sender.isVerified,
          isHyperVerified: message.replyTo.sender.isHyperVerified,
          voiceDurationMs: message.replyTo.voice?.durationMs ?? null,
        }
      : null,
    reactions: [...grouped.entries()].map(([emoji, value]) => ({
      emoji,
      count: value.count,
      mine: value.mine,
    })),
  };
}
