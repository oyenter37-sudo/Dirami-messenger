export const THEME_KEY = "dirami-theme";
export const DEFAULT_THEME = "lagoon";

export const THEMES = [
  { id: "lagoon", name: "Лагуна", hint: "бирюза и графит", swatch: ["#4fbfa8", "#7eb8c9"] },
  { id: "ember", name: "Эмбер", hint: "тёплый уголь", swatch: ["#e08a3c", "#161618"] },
  { id: "blossom", name: "Сакура", hint: "пыльная роза", swatch: ["#d4899c", "#1d161c"] },
  { id: "aurora", name: "Аврора", hint: "приглушённый индиго", swatch: ["#8b82c4", "#181522"] },
  { id: "glacier", name: "Ледник", hint: "стальной синий", swatch: ["#6a9ec2", "#151c24"] },
  { id: "dusk", name: "Закат", hint: "терракота", swatch: ["#c46e6a", "#1c1618"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  localStorage.setItem(THEME_KEY, id);
}

export function readTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = localStorage.getItem(THEME_KEY);
  return isThemeId(stored) ? stored : DEFAULT_THEME;
}
