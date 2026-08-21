"use client";

import { useMemo, useState } from "react";
import { appleEmojiUrl, emojiFilenames } from "@/lib/apple-emoji";

type Props = {
  emoji: string;
  className?: string;
};

export function AppleEmoji({ emoji, className }: Props) {
  const files = useMemo(() => emojiFilenames(emoji), [emoji]);
  const [index, setIndex] = useState(0);

  if (index >= files.length) {
    return <span>{emoji}</span>;
  }

  return (
    <img
      alt={emoji}
      className={`apple-emoji ${className ?? ""}`}
      draggable={false}
      onError={() => setIndex((current) => current + 1)}
      src={appleEmojiUrl(files[index])}
    />
  );
}
