export const THEME_KEY = "dirami-theme";
export const DEFAULT_THEME = "lagoon";

export const THEMES = [
  { id: "lagoon", name: "Лагуна", hint: "голубой и зелёный", swatch: ["#38bdf8", "#34d399"] },
  { id: "ember", name: "Эмбер", hint: "оранжевый и чёрный", swatch: ["#fb923c", "#09090b"] },
  { id: "blossom", name: "Сакура", hint: "розовый", swatch: ["#f472b6", "#fb7185"] },
  { id: "aurora", name: "Аврора", hint: "фиолетовый", swatch: ["#a78bfa", "#22d3ee"] },
  { id: "glacier", name: "Ледник", hint: "холодный лёд", swatch: ["#7dd3fc", "#e2e8f0"] },
  { id: "dusk", name: "Закат", hint: "бордо", swatch: ["#f43f5e", "#c084fc"] },
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
