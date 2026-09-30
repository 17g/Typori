import { SHORTCUT_ITEMS, ShortcutConfig, ShortcutConflict } from "./types";

/**
 * デフォルトのショートカット設定オブジェクトを取得
 */
export function getDefaultShortcutConfig(): ShortcutConfig {
  const config: ShortcutConfig = {};
  for (const item of SHORTCUT_ITEMS) {
    config[item.id] = [...item.defaultKeys];
  }
  return config;
}

/**
 * 2つのキー配列が同一キーバインドかどうかを判定
 */
export function areKeysEqual(keysA?: string[], keysB?: string[]): boolean {
  if (!keysA || !keysB) return false;
  if (keysA.length !== keysB.length) return false;

  const normalizeKey = (k: string) => k.trim().toLowerCase();
  const sortedA = [...keysA].map(normalizeKey).sort();
  const sortedB = [...keysB].map(normalizeKey).sort();

  return sortedA.every((val, index) => val === sortedB[index]);
}

/**
 * キー配列を可読な文字列（例: "Ctrl + Shift + S"）にフォーマット
 */
export function formatKeys(keys?: string[]): string {
  if (!keys || keys.length === 0) return "未設定";
  return keys.join(" + ");
}

/**
 * KeyboardEvent からキーバインド配列を抽出・正規化
 */
export function parseKeyboardEvent(e: KeyboardEvent): {
  modifiers: string[];
  mainKey: string | null;
  keys: string[];
  isComplete: boolean;
} {
  const modifiers: string[] = [];

  // 修飾キーの判定（Windows/Linux/Mac共通表記として "Ctrl" "Alt" "Shift" "Cmd/Win"）
  if (e.ctrlKey || e.metaKey) {
    modifiers.push("Ctrl");
  }
  if (e.altKey) {
    modifiers.push("Alt");
  }
  if (e.shiftKey) {
    modifiers.push("Shift");
  }

  // 主キーの判定
  let mainKey: string | null = null;
  const rawKey = e.key;
  const rawCode = e.code;

  const isModifierKey =
    rawKey === "Control" ||
    rawKey === "Shift" ||
    rawKey === "Alt" ||
    rawKey === "Meta" ||
    rawKey === "OS";

  if (!isModifierKey) {
    if (rawKey === " ") {
      mainKey = "Space";
    } else if (rawKey === "Escape") {
      mainKey = "Esc";
    } else if (rawKey.length === 1) {
      if (rawCode === "Slash" || rawKey === "/") {
        mainKey = "/";
      } else if (rawCode === "Backslash" || rawKey === "\\" || rawKey === "¥") {
        mainKey = "\\";
      } else if (rawKey === ",") {
        mainKey = ",";
      } else if (rawKey === ".") {
        mainKey = ".";
      } else if (rawKey >= "a" && rawKey <= "z") {
        mainKey = rawKey.toUpperCase();
      } else {
        mainKey = rawKey.toUpperCase();
      }
    } else if (/^F\d{1,2}$/i.test(rawKey)) {
      mainKey = rawKey.toUpperCase();
    } else if (
      [
        "Enter",
        "Tab",
        "Backspace",
        "Delete",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
        "PageUp",
        "PageDown",
      ].includes(rawKey)
    ) {
      mainKey = rawKey;
    } else {
      mainKey = rawKey;
    }
  }

  const keys: string[] = [...modifiers];
  if (mainKey) {
    keys.push(mainKey);
  }

  return {
    modifiers,
    mainKey,
    keys,
    isComplete: mainKey !== null,
  };
}

/**
 * 候補キーが現在の設定内の他のアクションと重複していないかチェック
 */
export function findConflictingAction(
  targetActionId: string,
  candidateKeys: string[],
  currentConfig: ShortcutConfig
): string | null {
  if (!candidateKeys || candidateKeys.length === 0) return null;

  for (const [actionId, keys] of Object.entries(currentConfig)) {
    if (actionId === targetActionId) continue;
    if (areKeysEqual(keys, candidateKeys)) {
      return actionId;
    }
  }

  return null;
}

/**
 * 設定全体の競合（重複キーバインド）をすべてリストアップ
 */
export function findAllConflicts(config: ShortcutConfig): ShortcutConflict[] {
  const conflicts: ShortcutConflict[] = [];
  const entries = Object.entries(config);

  for (let i = 0; i < entries.length; i++) {
    const [actionIdA, keysA] = entries[i];
    if (!keysA || keysA.length === 0) continue;

    for (let j = i + 1; j < entries.length; j++) {
      const [actionIdB, keysB] = entries[j];
      if (!keysB || keysB.length === 0) continue;

      if (areKeysEqual(keysA, keysB)) {
        conflicts.push({
          actionId: actionIdA,
          conflictingActionId: actionIdB,
          keys: keysA,
        });
      }
    }
  }

  return conflicts;
}

/**
 * 保存された設定とデフォルト設定を安全にマージする
 */
export function mergeWithDefaultConfig(
  storedConfig?: Partial<ShortcutConfig> | null
): ShortcutConfig {
  const defaults = getDefaultShortcutConfig();
  if (!storedConfig || typeof storedConfig !== "object") {
    return defaults;
  }

  const merged: ShortcutConfig = { ...defaults };
  for (const [key, value] of Object.entries(storedConfig)) {
    if (Array.isArray(value) && key in defaults) {
      merged[key] = [...value];
    }
  }

  return merged;
}

/**
 * KeyboardEvent が指定されたショートカットキー配列と一致するかを判定
 */
export function isShortcutEvent(
  e: KeyboardEvent,
  targetKeys?: string[]
): boolean {
  if (!targetKeys || targetKeys.length === 0) return false;

  const parsed = parseKeyboardEvent(e);
  if (!parsed.isComplete) return false;

  return areKeysEqual(parsed.keys, targetKeys);
}

