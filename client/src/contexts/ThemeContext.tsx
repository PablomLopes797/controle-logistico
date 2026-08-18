import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
  setPreferenceUser?: (user: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({ children, defaultTheme = "light", switchable = false }: ThemeProviderProps) {
  const [preferenceKey, setPreferenceKey] = useState("theme");
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = switchable ? (localStorage.getItem("theme") as Theme | null) : null;
    return stored === "light" || stored === "dark" ? stored : defaultTheme;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    if (switchable) localStorage.setItem(preferenceKey, theme);
  }, [preferenceKey, switchable, theme]);

  const toggleTheme = useCallback(() => {
    if (switchable) setTheme(previous => (previous === "light" ? "dark" : "light"));
  }, [switchable]);

  const setPreferenceUser = useCallback((user: string) => {
    if (!switchable) return;
    const key = `controle-logistico:theme:${user}`;
    const stored = localStorage.getItem(key) as Theme | null;
    const nextTheme = stored === "dark" || stored === "light" ? stored : defaultTheme;
    setPreferenceKey(previous => (previous === key ? previous : key));
    setTheme(previous => (previous === nextTheme ? previous : nextTheme));
  }, [defaultTheme, switchable]);

  return <ThemeContext.Provider value={{ theme, toggleTheme, switchable, setPreferenceUser }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
