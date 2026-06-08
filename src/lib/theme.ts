/**
 * Core utility for initializing and toggling between light and dark themes
 */

export function initTheme() {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem("theme");
  // Default to dark mode if no theme is explicitly saved
  const dark = stored === "dark" || !stored;

  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function toggleTheme(): boolean {
  if (typeof window === "undefined") return false;
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  return isDark;
}

export function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
