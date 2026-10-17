import { useState, useCallback } from "react";

export const LINE_NUMBERS_STORAGE_KEY = "typori:line_numbers_enabled";

export interface LineNumberSettings {
  /** 行番号表示が有効かどうか（デフォルト: true） */
  isLineNumbersEnabled: boolean;
  /** 行番号表示の有効/無効を設定する */
  setIsLineNumbersEnabled: (value: boolean | ((prev: boolean) => boolean)) => void;
  /** 行番号表示の有効/無効を切り替える */
  toggleLineNumbers: () => void;
}

/**
 * 行番号表示機能のグローバル設定と localStorage 永続化を管理するカスタムフック
 * - デフォルト値: true（行番号表示有効）
 */
export function useLineNumberSettings(): LineNumberSettings {
  const [isLineNumbersEnabled, setIsLineNumbersEnabledState] = useState<boolean>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem(LINE_NUMBERS_STORAGE_KEY);
        if (stored !== null) {
          return stored === "true";
        }
      }
    } catch (e) {
      console.warn("Failed to read line number settings from localStorage:", e);
    }
    // 仕様要件: デフォルトは有効 (true)
    return true;
  });

  const setIsLineNumbersEnabled = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setIsLineNumbersEnabledState((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem(LINE_NUMBERS_STORAGE_KEY, String(next));
          }
        } catch (e) {
          console.warn("Failed to save line number settings to localStorage:", e);
        }
        return next;
      });
    },
    []
  );

  const toggleLineNumbers = useCallback(() => {
    setIsLineNumbersEnabled((prev) => !prev);
  }, [setIsLineNumbersEnabled]);

  return {
    isLineNumbersEnabled,
    setIsLineNumbersEnabled,
    toggleLineNumbers,
  };
}

export default useLineNumberSettings;
