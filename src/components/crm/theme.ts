import { crmThemeStorageKey } from "./constants";
import type { CrmTheme } from "./types";

export function getStoredCrmTheme(): CrmTheme {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(crmThemeStorageKey) === "dark" ? "dark" : "light";
}

export function applyCrmTheme(theme: CrmTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.crmTheme = theme;
}

export function toggleStoredCrmTheme() {
  if (typeof window === "undefined") return;
  const currentTheme = document.documentElement.dataset.crmTheme === "dark" ? "dark" : "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  window.localStorage.setItem(crmThemeStorageKey, nextTheme);
  applyCrmTheme(nextTheme);
}
