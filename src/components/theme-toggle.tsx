"use client";

import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const storageKey = "laserfix-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(storageKey, theme);
}

export function ThemeToggle() {
  function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }

  return (
    <button
      aria-label="Alternar tema claro e escuro"
      className="theme-toggle"
      onClick={toggleTheme}
      title="Alternar tema"
      type="button"
    >
      <Sun className="theme-toggle-sun" aria-hidden="true" />
      <Moon className="theme-toggle-moon" aria-hidden="true" />
      <span className="theme-toggle-light-label">Claro</span>
      <span className="theme-toggle-dark-label">Escuro</span>
    </button>
  );
}
