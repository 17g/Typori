import { useState, useCallback, useEffect } from "react";
import {
  ShortcutConfig,
  getDefaultShortcutConfig,
  mergeWithDefaultConfig,
  SHORTCUT_ITEMS,
} from "../components/ShortcutSettingsModal";

export const SHORTCUT_SETTINGS_STORAGE_KEY = "typori:shortcuts_config";
export const SHORTCUTS_CHANGED_EVENT = "typori:shortcuts_changed";

export interface ShortcutSettingsState {
  /** 現在有効なショートカット設定 */
  shortcutConfig: ShortcutConfig;
  /** ショートカット設定全体を保存・永続化する */
  saveShortcutConfig: (newConfig: ShortcutConfig) => void;
  /** すべてのショートカット設定をデフォルトに戻す */
  resetShortcutConfig: () => void;
  /** 単一のショートカット設定をデフォルトに戻す */
  resetShortcutItem: (actionId: string) => void;
  /** 単一のショートカットキーを更新して保存する */
  updateShortcutItem: (actionId: string, keys: string[]) => void;
}

/**
 * localStorage から保存済みショートカット設定を読み込み
 */
export function loadStoredShortcutConfig(): ShortcutConfig {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = localStorage.getItem(SHORTCUT_SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return mergeWithDefaultConfig(parsed);
      }
    }
  } catch (e) {
    console.warn("Failed to load shortcut settings from localStorage:", e);
  }
  return getDefaultShortcutConfig();
}

/**
 * ショートカット設定の永続化（localStorage）と動的状態管理を提供するカスタムフック
 */
export function useShortcutSettings(): ShortcutSettingsState {
  const [shortcutConfig, setShortcutConfig] = useState<ShortcutConfig>(() => {
    return loadStoredShortcutConfig();
  });

  // 設定の保存と永続化
  const saveShortcutConfig = useCallback((newConfig: ShortcutConfig) => {
    const validated = mergeWithDefaultConfig(newConfig);
    setShortcutConfig(validated);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(
          SHORTCUT_SETTINGS_STORAGE_KEY,
          JSON.stringify(validated)
        );
        // 同一ウィンドウ内のリスナーへ通知
        window.dispatchEvent(
          new CustomEvent(SHORTCUTS_CHANGED_EVENT, { detail: validated })
        );
      }
    } catch (e) {
      console.warn("Failed to save shortcut settings to localStorage:", e);
    }
  }, []);

  // すべての設定を初期設定に戻す
  const resetShortcutConfig = useCallback(() => {
    const defaults = getDefaultShortcutConfig();
    setShortcutConfig(defaults);

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(SHORTCUT_SETTINGS_STORAGE_KEY);
        window.dispatchEvent(
          new CustomEvent(SHORTCUTS_CHANGED_EVENT, { detail: defaults })
        );
      }
    } catch (e) {
      console.warn("Failed to reset shortcut settings in localStorage:", e);
    }
  }, []);

  // 単一のショートカットを初期設定に戻す
  const resetShortcutItem = useCallback(
    (actionId: string) => {
      const item = SHORTCUT_ITEMS.find((i) => i.id === actionId);
      if (!item) return;

      setShortcutConfig((prev) => {
        const next = {
          ...prev,
          [actionId]: [...item.defaultKeys],
        };
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem(
              SHORTCUT_SETTINGS_STORAGE_KEY,
              JSON.stringify(next)
            );
            window.dispatchEvent(
              new CustomEvent(SHORTCUTS_CHANGED_EVENT, { detail: next })
            );
          }
        } catch (e) {
          console.warn("Failed to update shortcut item in localStorage:", e);
        }
        return next;
      });
    },
    []
  );

  // 単一のショートカットキーを更新
  const updateShortcutItem = useCallback(
    (actionId: string, keys: string[]) => {
      setShortcutConfig((prev) => {
        const next = {
          ...prev,
          [actionId]: [...keys],
        };
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem(
              SHORTCUT_SETTINGS_STORAGE_KEY,
              JSON.stringify(next)
            );
            window.dispatchEvent(
              new CustomEvent(SHORTCUTS_CHANGED_EVENT, { detail: next })
            );
          }
        } catch (e) {
          console.warn("Failed to update shortcut item in localStorage:", e);
        }
        return next;
      });
    },
    []
  );

  // 他のタブや外部からの変更通知を購読
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SHORTCUT_SETTINGS_STORAGE_KEY) {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setShortcutConfig(mergeWithDefaultConfig(parsed));
          } catch (err) {
            console.warn("Failed to parse updated shortcuts from storage event:", err);
          }
        } else {
          setShortcutConfig(getDefaultShortcutConfig());
        }
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<ShortcutConfig>;
      if (customEvent.detail) {
        setShortcutConfig(customEvent.detail);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(SHORTCUTS_CHANGED_EVENT, handleCustomChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(SHORTCUTS_CHANGED_EVENT, handleCustomChange);
    };
  }, []);

  return {
    shortcutConfig,
    saveShortcutConfig,
    resetShortcutConfig,
    resetShortcutItem,
    updateShortcutItem,
  };
}

export default useShortcutSettings;
