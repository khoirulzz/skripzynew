"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost"
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{ padding: '0.5rem', borderRadius: '50%' }}
    >
      {theme === "dark" ? (
        <PremiumIcon name="sun" size={20} />
      ) : (
        <PremiumIcon name="moon" size={20} />
      )}
    </button>
  );
}
