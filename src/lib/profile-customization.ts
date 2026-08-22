export const DEFAULT_PROFILE_ACCENT = "#4fbfa8";
export const DEFAULT_PROFILE_BACKGROUND = "aurora";

export const PROFILE_ACCENTS = [
  "#4fbfa8",
  "#5aa7ff",
  "#8b82e8",
  "#d4899c",
  "#ee8c4a",
  "#e65f6f",
  "#b6d45a",
  "#d9b75c",
] as const;

export const PROFILE_BACKGROUNDS = [
  {
    id: "aurora",
    name: "Аврора",
    background:
      "radial-gradient(circle at 18% 18%, rgba(93, 231, 193, .72), transparent 34%), radial-gradient(circle at 82% 30%, rgba(92, 140, 255, .7), transparent 38%), linear-gradient(135deg, #11252d 0%, #172137 52%, #0d171d 100%)",
  },
  {
    id: "ocean",
    name: "Океан",
    background:
      "radial-gradient(circle at 72% 12%, rgba(78, 206, 255, .72), transparent 34%), radial-gradient(circle at 16% 78%, rgba(40, 106, 206, .72), transparent 38%), linear-gradient(140deg, #071826 0%, #0d3550 48%, #101d36 100%)",
  },
  {
    id: "sunset",
    name: "Закат",
    background:
      "radial-gradient(circle at 18% 22%, rgba(255, 189, 92, .82), transparent 34%), radial-gradient(circle at 80% 70%, rgba(210, 74, 138, .75), transparent 42%), linear-gradient(135deg, #402033 0%, #5a2d3e 45%, #24182b 100%)",
  },
  {
    id: "violet",
    name: "Неон",
    background:
      "radial-gradient(circle at 76% 18%, rgba(172, 109, 255, .82), transparent 34%), radial-gradient(circle at 15% 70%, rgba(68, 117, 255, .68), transparent 40%), linear-gradient(135deg, #1a1532 0%, #2d1f4b 48%, #10162a 100%)",
  },
  {
    id: "rose",
    name: "Сакура",
    background:
      "radial-gradient(circle at 16% 20%, rgba(255, 172, 198, .78), transparent 34%), radial-gradient(circle at 86% 68%, rgba(181, 97, 155, .72), transparent 40%), linear-gradient(135deg, #351e2b 0%, #4b2739 48%, #211821 100%)",
  },
  {
    id: "graphite",
    name: "Графит",
    background:
      "radial-gradient(circle at 78% 15%, rgba(176, 194, 207, .32), transparent 34%), radial-gradient(circle at 18% 78%, rgba(91, 115, 130, .34), transparent 38%), linear-gradient(135deg, #11161a 0%, #283038 48%, #101316 100%)",
  },
] as const;

export type ProfileBackgroundId = (typeof PROFILE_BACKGROUNDS)[number]["id"];

export function isProfileBackground(value: string): value is ProfileBackgroundId {
  return PROFILE_BACKGROUNDS.some((item) => item.id === value);
}

export function normalizeProfileAccent(value: string | null | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : DEFAULT_PROFILE_ACCENT;
}

export function normalizeProfileBackground(value: string | null | undefined) {
  return value && isProfileBackground(value) ? value : DEFAULT_PROFILE_BACKGROUND;
}

export function profileBackgroundCss(value: string | null | undefined, accent?: string) {
  const id = normalizeProfileBackground(value);
  const selected = PROFILE_BACKGROUNDS.find((item) => item.id === id)!;
  const color = normalizeProfileAccent(accent);
  return `radial-gradient(circle at 50% 120%, ${color}66, transparent 46%), ${selected.background}`;
}
