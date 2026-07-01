import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { C, DARK, LIGHT, type Theme, type Palette } from "./palette";

export type { Theme } from "./palette";

interface ThemeCtx {
  palette: Palette;
  theme: Theme;
  setTheme: (t: Theme) => void;
  clipboardClearMs: number;
  setClipboardClearMs: (ms: number) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  palette: C,
  theme: "dark",
  setTheme: () => {},
  clipboardClearMs: 30000,
  setClipboardClearMs: () => {},
});

function applyTheme(theme: Theme) {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const src = isDark ? DARK : LIGHT;
  Object.assign(C, src);
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [clipboardClearMs, setClipboardClearMsState] = useState(30000);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    browser.storage.local.get(["theme", "clipboardClearMs"]).then(d => {
      const t = (d.theme as Theme) || "dark";
      setThemeState(t);
      applyTheme(t);
      if (d.clipboardClearMs) setClipboardClearMsState(d.clipboardClearMs as number);
    });
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { applyTheme(theme); forceUpdate(n => n + 1); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    browser.storage.local.set({ theme: t });
    forceUpdate(n => n + 1);
  }, []);

  const setClipboardClearMs = useCallback((ms: number) => {
    setClipboardClearMsState(ms);
    browser.storage.local.set({ clipboardClearMs: ms });
  }, []);

  return (
    <ThemeContext.Provider value={{ palette: { ...C }, theme, setTheme, clipboardClearMs, setClipboardClearMs }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
