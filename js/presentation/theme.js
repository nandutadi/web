import { THEME } from "../core/constants.js";

export function applyTheme(t) {
  const themeBtn = document.getElementById("theme");
  document.documentElement.dataset.theme = t;
  if (themeBtn) {
    themeBtn.textContent = t === "dark" ? "☀" : "☾";
    themeBtn.title = t === "dark" ? "Switch to light theme" : "Switch to dark theme";
  }
  localStorage.setItem(THEME, t);
}

export function initTheme() {
  const themeBtn = document.getElementById("theme");
  const initial =
    localStorage.getItem(THEME) ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initial);
  if (themeBtn) {
    themeBtn.onclick = () => {
      applyTheme(
        document.documentElement.dataset.theme === "dark" ? "light" : "dark"
      );
    };
  }
}
