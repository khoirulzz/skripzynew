"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-ghost"
      aria-label="Toggle theme"
      title={mounted ? (theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode") : "Toggle theme"}
      style={{ padding: '0.5rem', borderRadius: '50%' }}
    >
      {/* Only render theme-dependent icon after client mounts to prevent hydration mismatch */}
      {mounted ? (
        theme === "dark" ? (
          <PremiumIcon name="sun" size={20} />
        ) : (
          <PremiumIcon name="moon" size={20} />
        )
      ) : (
        // Neutral placeholder during SSR – same size, invisible
        <span style={{ display: "inline-block", width: 20, height: 20 }} />
      )}
    </button>
  );
}
