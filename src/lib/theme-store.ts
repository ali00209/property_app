"use client";

export type ThemeMode = "system" | "light" | "dark";

export interface ThemePrefs {
  theme: string;
  mode: ThemeMode;
}

export const STORAGE_KEY = "theme-store";

export const THEME_OPTIONS = [
  { value: "butter", label: "Butter" },
  { value: "neutral", label: "Neutral" },
  { value: "matcha", label: "Matcha" },
  { value: "gothic", label: "Gothic" },
  { value: "stone", label: "Stone" },
  { value: "y2k", label: "Y2K" },
];

export const MODE_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const DEFAULT_PREFS: ThemePrefs = { theme: "butter", mode: "system" };

let cache: ThemePrefs | null = null;
const listeners = new Set<() => void>();

function read(): ThemePrefs {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
      cache = {
        theme:
          typeof parsed.theme === "string" && parsed.theme.length
            ? parsed.theme
            : DEFAULT_PREFS.theme,
        mode:
          parsed.mode === "light" || parsed.mode === "dark" || parsed.mode === "system"
            ? parsed.mode
            : DEFAULT_PREFS.mode,
      };
      return cache;
    }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_PREFS;
}

export function getThemePrefs(): ThemePrefs {
  return read();
}

export function subscribeThemePrefs(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setThemePrefs(prefs: ThemePrefs): void {
  cache = prefs;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage may be unavailable
  }
  listeners.forEach((listener) => listener());
}