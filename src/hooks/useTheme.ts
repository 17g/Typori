import { useState, useEffect, useCallback } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "typori-theme";

export interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

/**
 * Typori のテーマ（ライト/ダーク/システム）を管理するカスタムフック
 */
export function useTheme(): UseThemeReturn {
  // 初期テーマの取得 (localStorage または system)
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
    return "system";
  });

  // 実際に画面に適用されているテーマ ('light' | 'dark')
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // DOMへのdarkクラスの適用とresolvedThemeの更新
  const applyTheme = useCallback((currentTheme: Theme) => {
    const isDark =
      currentTheme === "dark" ||
      (currentTheme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      setResolvedTheme("dark");
    } else {
      root.classList.remove("dark");
      setResolvedTheme("light");
    }
  }, []);

  // テーマ変更関数
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch (e) {
        console.warn("Failed to persist theme to localStorage:", e);
      }
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  // ライトとダークのトグル
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // light -> dark -> system のサイクル
  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      let next: Theme;
      if (prev === "light") {
        next = "dark";
      } else if (prev === "dark") {
        next = "system";
      } else {
        next = "light";
      }
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        console.warn("Failed to persist theme to localStorage:", e);
      }
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  // 初期化とOSテーマ変更の監視
  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      // システム連動設定の場合のみOSの変化に追従
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme, applyTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    cycleTheme,
  };
}

export default useTheme;
