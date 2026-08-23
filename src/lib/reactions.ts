export const STANDARD_REACTIONS = [
  "✌️",
  "🥀",
  "☠️",
  "🪤",
  "🕊️",
  "😁",
  "❤️",
] as const;

export const HYPER_REACTIONS = [
  "🪐",
  "🫠",
  "💲",
  "✨",
  "🤡",
  "🦼",
  "🪬",
] as const;

// Kept as the ordinary picker set for compatibility with existing callers.
export const REACTIONS = STANDARD_REACTIONS;
export const ALL_REACTIONS = [
  ...STANDARD_REACTIONS,
  ...HYPER_REACTIONS,
] as const;

export type ReactionEmoji = (typeof ALL_REACTIONS)[number];
export type HyperReactionEmoji = (typeof HYPER_REACTIONS)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (ALL_REACTIONS as readonly string[]).includes(value);
}

export function isHyperReactionEmoji(
  value: string,
): value is HyperReactionEmoji {
  return (HYPER_REACTIONS as readonly string[]).includes(value);
}
