import { create } from "zustand";
import { persist } from "zustand/middleware";
import React from "react";
import { useEffect } from "react";

export type Theme = "dark" | "light" | "theme-midnight" | "theme-cyber" | "theme-terminal";

export const THEMES: { id: Theme; label: string; description: string; color: string }[] = [
  { id: "dark", label: "Default Dark", description: "Standard premium dark mode", color: "hsl(211, 100%, 50%)" },
  { id: "light", label: "Light", description: "High contrast light mode", color: "hsl(211, 100%, 50%)" },
  { id: "theme-midnight", label: "Midnight Cobalt", description: "Deep blue with high-contrast amber for long-term focus", color: "hsl(35, 100%, 55%)" },
  { id: "theme-cyber", label: "Cyber Matrix", description: "Pitch black with neon cyan and magenta accents", color: "hsl(180, 100%, 50%)" },
  { id: "theme-terminal", label: "Terminal Green", description: "Classic high-contrast phosphor green", color: "hsl(120, 100%, 50%)" }
];

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
    }),
    {
      name: "app-theme",
    }
  )
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all theme classes
    root.classList.remove("light", "dark", "theme-midnight", "theme-cyber", "theme-terminal");
    
    // For specific themes that should be treated as "dark" mode in tailwind
    if (theme !== "light") {
      root.classList.add("dark");
    }
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}
