import { useState, useCallback } from "react";

export const TAB_SETTINGS_STORAGE_KEY = "typori:tabs_enabled";

export interface TabSettings {
  /** タブ機能が有効かどうか（デフォルト: false） */
  isTabsEnabled: boolean;
  /** タブ機能の有効/無効を設定する */
  setIsTabsEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
  /** タブ機能の有効/無効を切り替える */
  toggleTabsEnabled: () => void;
}

/**
 * タブ機能のグローバル設定と localStorage 永続化を管理するカスタムフック
 * - デフォルト値: false（タブ機能無効 = 単一ドキュメントモード）
 */
export function useTabSettings(): TabSettings {
  const [isTabsEnabled, setIsTabsEnabledState] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem(TAB_SETTINGS_STORAGE_KEY);
        if (stored !== null) {
          return stored === "true";
        }
      }
    } catch (e) {
      console.warn("Failed to read tab settings from localStorage:", e);
    }
    // 仕様要件: デフォルトは無効 (false)
    return false;
  });

  const setIsTabsEnabled = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsTabsEnabledState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem(TAB_SETTINGS_STORAGE_KEY, String(next));
          }
        } catch (e) {
          console.warn("Failed to save tab settings to localStorage:", e);
        }
        return next;
      });
    },
    []
  );

  const toggleTabsEnabled = useCallback(() => {
    setIsTabsEnabled((prev) => !prev);
  }, [setIsTabsEnabled]);

  return {
    isTabsEnabled,
    setIsTabsEnabled,
    toggleTabsEnabled,
  };
}

export default useTabSettings;
