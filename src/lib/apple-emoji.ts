const CDN = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64";

export function emojiFilenames(emoji: string) {
  const points: number[] = [];
  for (const char of emoji) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    points.push(code);
  }

  const hex = (list: number[]) =>
    list.map((code) => code.toString(16)).join("-");

  const full = hex(points);
  const stripped = hex(points.filter((code) => code !== 0xfe0f));
  const files = [`${full}.png`];
  if (stripped !== full) files.push(`${stripped}.png`);
  return files;
}

export function appleEmojiUrl(file: string) {
  return `${CDN}/${file}`;
}

export function matchEmojiAt(text: string, index: number) {
  const slice = text.slice(index);
  const match = slice.match(
    /^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F)?)*)/u,
  );
  return match?.[0] ?? null;
}
