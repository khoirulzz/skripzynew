"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
});

function applyTheme(theme) {
  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(theme);

  if (theme === "dark") {
    document.body.classList.add("dark-mode");
  } else {
    document.body.classList.remove("dark-mode");
  }
}

export function ThemeProvider({ children }) {
  // Always start with "light" on server to avoid hydration mismatch.
  // The real theme is resolved client-side in useEffect.
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Resolve real theme from localStorage or system preference
    const savedTheme = localStorage.getItem("skripzy-theme");
    let resolvedTheme = "light";
    if (savedTheme === "light" || savedTheme === "dark") {
      resolvedTheme = savedTheme;
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      resolvedTheme = "dark";
    }
    setTheme(resolvedTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem("skripzy-theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
