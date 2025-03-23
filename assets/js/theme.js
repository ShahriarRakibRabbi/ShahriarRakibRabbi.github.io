/**
 * Theme Module
 * Handles theme switching and persistence
 * @author: SRR
 * @version: 1.0
 */

const ThemeModule = (function () {
  const THEME_KEY = "theme_preference";

  function init() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      enableDarkMode();
    }

    // Listen for system theme changes
    window.matchMedia("(prefers-color-scheme: dark)").addListener((e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        e.matches ? enableDarkMode() : disableDarkMode();
      }
    });
  }

  function enableDarkMode() {
    document.documentElement.classList.add("dark-mode");
    localStorage.setItem(THEME_KEY, "dark");
    updateThemeIcons(true);
  }

  function disableDarkMode() {
    document.documentElement.classList.remove("dark-mode");
    localStorage.setItem(THEME_KEY, "light");
    updateThemeIcons(false);
  }

  function toggleTheme() {
    if (document.documentElement.classList.contains("dark-mode")) {
      disableDarkMode();
    } else {
      enableDarkMode();
    }
  }

  function updateThemeIcons(isDark) {
    document.querySelectorAll(".theme-toggle").forEach((toggle) => {
      const icon = toggle.querySelector("i");
      if (icon) {
        icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
      }
    });
  }

  return {
    init,
    toggleTheme,
  };
})();
