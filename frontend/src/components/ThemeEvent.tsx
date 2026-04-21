"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Theme enum values (matching backend ThemePreference enum)
type Theme = "LIGHT" | "DARK" | "SYSTEM";

const themeListeners: Set<(theme: Theme) => void> = new Set();

export const themeEvents = {
  subscribe: (listener: (theme: Theme) => void) => {
    themeListeners.add(listener);
    return () => {
      themeListeners.delete(listener);
    };
  },
  publish: (theme: Theme) => {
    themeListeners.forEach((listener) => listener(theme));
  },
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert theme to lowercase for CSS classes
const themeToCss = (theme: Theme): "light" | "dark" | "system" => {
  return theme.toLowerCase() as "light" | "dark" | "system";
};

// Helper to get resolved theme for display
const getResolvedTheme = (theme: Theme): "light" | "dark" => {
  if (theme === "SYSTEM") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme.toLowerCase() as "light" | "dark";
};

export function ThemeProvider({ 
  children, 
}: { 
  children: ReactNode; 
}) {
  const [theme, setThemeState] = useState<Theme>("SYSTEM");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Function to apply theme from storage
  const applyThemeFromStorage = () => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored && ["LIGHT", "DARK", "SYSTEM"].includes(stored)) {
      setThemeState(stored);
      setResolvedTheme(getResolvedTheme(stored));
    }
  };

  // Set theme with event publishing
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    setResolvedTheme(getResolvedTheme(newTheme));
    themeEvents.publish(newTheme);
  };

  // Initial load
  useEffect(() => {
    setMounted(true);
    applyThemeFromStorage();
  }, []);

  // Subscribe to theme events (for login/logout)
  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = themeEvents.subscribe((newTheme) => {
      if (["LIGHT", "DARK", "SYSTEM"].includes(newTheme)) {
        setThemeState(newTheme);
        setResolvedTheme(getResolvedTheme(newTheme));
      }
    });

    return unsubscribe;
  }, [mounted]);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    const cssTheme = themeToCss(theme);
    root.classList.add(cssTheme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  // Watch for system theme changes when in SYSTEM mode
  useEffect(() => {
    if (!mounted || theme !== "SYSTEM") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(resolved);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <div style={{ visibility: "hidden" }}>
        {children}
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// Export theme types for use in other components
export { type Theme };
