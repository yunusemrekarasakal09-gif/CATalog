
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ThemeContextType = {
  darkMode: boolean;
  themeReady: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const savedTheme = window.localStorage.getItem("catalog-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setDarkMode(savedTheme === "dark");
    } else {
      setDarkMode(media.matches);
    }

    setThemeReady(true);

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      const saved = window.localStorage.getItem("catalog-theme");

      if (saved !== "dark" && saved !== "light") {
        setDarkMode(event.matches);
      }
    };

    media.addEventListener("change", handleSystemThemeChange);

    return () => {
      media.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    if (!themeReady) return;

    window.localStorage.setItem(
      "catalog-theme",
      darkMode ? "dark" : "light"
    );

    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode, themeReady]);

  const toggleTheme = useCallback(() => {
    setDarkMode((current) => !current);
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, themeReady, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme, ThemeProvider içinde kullanılmalıdır.");
  }

  return context;
}
