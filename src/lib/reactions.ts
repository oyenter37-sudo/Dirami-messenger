export const REACTIONS = ["✌️", "🥀", "☠️", "🪤", "🕊️", "😁", "❤️"] as const;

export type ReactionEmoji = (typeof REACTIONS)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTIONS as readonly string[]).includes(value);
}
