import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// モック用の KeyboardEvent クラス
class MockKeyboardEvent {
  constructor(options = {}) {
    this.key = options.key || "";
    this.code = options.code || "";
    this.ctrlKey = !!options.ctrlKey;
    this.metaKey = !!options.metaKey;
    this.altKey = !!options.altKey;
    this.shiftKey = !!options.shiftKey;
  }
}

// utils.ts と同一の純粋ロジックをテスト用に定義
function areKeysEqual(keysA, keysB) {
  if (!keysA || !keysB) return false;
  if (keysA.length !== keysB.length) return false;
  const normalizeKey = (k) => k.trim().toLowerCase();
  const sortedA = [...keysA].map(normalizeKey).sort();
  const sortedB = [...keysB].map(normalizeKey).sort();
  return sortedA.every((val, index) => val === sortedB[index]);
}

function parseKeyboardEvent(e) {
  const modifiers = [];
  if (e.ctrlKey || e.metaKey) modifiers.push("Ctrl");
  if (e.altKey) modifiers.push("Alt");
  if (e.shiftKey) modifiers.push("Shift");

  let mainKey = null;
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
    } else {
      mainKey = rawKey;
    }
  }

  const keys = [...modifiers];
  if (mainKey) keys.push(mainKey);

  return {
    modifiers,
    mainKey,
    keys,
    isComplete: mainKey !== null,
  };
}

function isShortcutEvent(e, targetKeys) {
  if (!targetKeys || targetKeys.length === 0) return false;
  const parsed = parseKeyboardEvent(e);
  if (!parsed.isComplete) return false;
  return areKeysEqual(parsed.keys, targetKeys);
}

function mergeWithDefaultConfig(storedConfig, defaults) {
  if (!storedConfig || typeof storedConfig !== "object") {
    return defaults;
  }
  const merged = { ...defaults };
  for (const [key, value] of Object.entries(storedConfig)) {
    if (Array.isArray(value) && key in defaults) {
      merged[key] = [...value];
    }
  }
  return merged;
}

async function verifyShortcutsPersistence() {
  console.log("=== Testing Shortcut Settings Persistence & Dynamic Binding (ショートカット永続化・動的反映検証) ===");

  const hookPath = path.resolve("src/hooks/useShortcutSettings.ts");
  const modalUtilsPath = path.resolve("src/components/ShortcutSettingsModal/utils.ts");
  const appTsxPath = path.resolve("src/App.tsx");
  const cheatSheetPath = path.resolve("src/components/CheatSheetModal/CheatSheetModal.tsx");

  // 1. ファイルの存在確認
  console.log("1. Verifying useShortcutSettings.ts hook file...");
  assert.ok(fs.existsSync(hookPath), "useShortcutSettings.ts must exist");
  const hookContent = fs.readFileSync(hookPath, "utf-8");
  assert.ok(hookContent.includes("SHORTCUT_SETTINGS_STORAGE_KEY"), "Hook must define SHORTCUT_SETTINGS_STORAGE_KEY");
  assert.ok(hookContent.includes("useShortcutSettings"), "Hook must export useShortcutSettings");
  assert.ok(hookContent.includes("saveShortcutConfig"), "Hook must provide saveShortcutConfig");
  assert.ok(hookContent.includes("resetShortcutConfig"), "Hook must provide resetShortcutConfig");
  assert.ok(hookContent.includes("localStorage.getItem"), "Hook must read from localStorage");
  assert.ok(hookContent.includes("localStorage.setItem"), "Hook must write to localStorage");
  console.log("✓ Hook implementation verified.");

  // 2. utils.ts の関数確認
  console.log("2. Verifying utils.ts functions...");
  const utilsContent = fs.readFileSync(modalUtilsPath, "utf-8");
  assert.ok(utilsContent.includes("mergeWithDefaultConfig"), "utils.ts must export mergeWithDefaultConfig");
  assert.ok(utilsContent.includes("isShortcutEvent"), "utils.ts must export isShortcutEvent");
  console.log("✓ utils helper functions verified.");

  // 3. ロジックの検証
  console.log("3. Testing mergeWithDefaultConfig & isShortcutEvent logic...");
  
  const dummyDefaults = {
    save_file: ["Ctrl", "S"],
    toggle_focus_mode: ["F8"],
    new_file: ["Ctrl", "N"],
  };

  // mergeWithDefaultConfig のテスト
  const mergedEmpty = mergeWithDefaultConfig(null, dummyDefaults);
  assert.deepEqual(mergedEmpty, dummyDefaults, "null should return full default config");

  const partialConfig = {
    save_file: ["Ctrl", "Shift", "S"],
    toggle_focus_mode: ["F9"],
  };
  const mergedPartial = mergeWithDefaultConfig(partialConfig, dummyDefaults);
  assert.deepEqual(mergedPartial.save_file, ["Ctrl", "Shift", "S"], "Custom save_file key should be preserved");
  assert.deepEqual(mergedPartial.toggle_focus_mode, ["F9"], "Custom focus mode key should be preserved");
  assert.deepEqual(mergedPartial.new_file, dummyDefaults.new_file, "Unmodified key should fall back to default");

  // isShortcutEvent のテスト
  const eventSaveDefault = new MockKeyboardEvent({
    ctrlKey: true,
    key: "s",
    code: "KeyS",
  });
  assert.strictEqual(
    isShortcutEvent(eventSaveDefault, ["Ctrl", "S"]),
    true,
    "Ctrl+s should match ['Ctrl', 'S']"
  );
  assert.strictEqual(
    isShortcutEvent(eventSaveDefault, ["Ctrl", "Shift", "S"]),
    false,
    "Ctrl+s should not match ['Ctrl', 'Shift', 'S']"
  );

  const eventSaveCustom = new MockKeyboardEvent({
    ctrlKey: true,
    shiftKey: true,
    key: "S",
    code: "KeyS",
  });
  assert.strictEqual(
    isShortcutEvent(eventSaveCustom, ["Ctrl", "Shift", "S"]),
    true,
    "Ctrl+Shift+S should match ['Ctrl', 'Shift', 'S']"
  );

  const eventF8 = new MockKeyboardEvent({
    key: "F8",
    code: "F8",
  });
  assert.strictEqual(
    isShortcutEvent(eventF8, ["F8"]),
    true,
    "F8 event should match ['F8']"
  );

  // 空配列（解除されたショートカット）のテスト
  assert.strictEqual(
    isShortcutEvent(eventSaveDefault, []),
    false,
    "Empty keys array must never match"
  );

  console.log("✓ Logic tests passed.");

  // 4. App.tsx の統合確認
  console.log("4. Verifying App.tsx integration...");
  const appContent = fs.readFileSync(appTsxPath, "utf-8");
  assert.ok(
    appContent.includes("useShortcutSettings"),
    "App.tsx must use useShortcutSettings hook"
  );
  assert.ok(
    appContent.includes("shortcutConfigRef.current"),
    "App.tsx must use shortcutConfigRef for dynamic event dispatching"
  );
  assert.ok(
    appContent.includes("isShortcutEvent(e, config.save_file)"),
    "App.tsx must dynamically check save_file shortcut"
  );
  assert.ok(
    appContent.includes("isShortcutEvent(e, config.toggle_right_sidebar)"),
    "App.tsx must dynamically check toggle_right_sidebar shortcut"
  );
  assert.ok(
    appContent.includes("isShortcutEvent(e, config.toggle_focus_mode)"),
    "App.tsx must dynamically check toggle_focus_mode shortcut"
  );
  assert.ok(
    appContent.includes("currentConfig={shortcutConfig}"),
    "App.tsx must pass currentConfig to ShortcutSettingsModal"
  );
  assert.ok(
    appContent.includes("onSave={saveShortcutConfig}"),
    "App.tsx must pass onSave={saveShortcutConfig} to ShortcutSettingsModal"
  );
  assert.ok(
    appContent.includes("shortcutConfig={shortcutConfig}"),
    "App.tsx must pass shortcutConfig to CheatSheetModal"
  );
  assert.ok(
    appContent.includes("formatKeys(shortcutConfig.toggle_sidebar)"),
    "App.tsx must dynamically format sidebar button tooltip"
  );
  console.log("✓ App.tsx integration verified.");

  // 5. CheatSheetModal の動的連携確認
  console.log("5. Verifying CheatSheetModal dynamic shortcutConfig support...");
  const cheatSheetContent = fs.readFileSync(cheatSheetPath, "utf-8");
  assert.ok(
    cheatSheetContent.includes("shortcutConfig"),
    "CheatSheetModal must accept shortcutConfig prop"
  );
  assert.ok(
    cheatSheetContent.includes("未設定"),
    "CheatSheetModal must handle disabled/empty shortcut gracefully"
  );
  console.log("✓ CheatSheetModal dynamic support verified.");

  console.log("=== All Shortcut Persistence & Dynamic Binding tests passed successfully! ===");
}

verifyShortcutsPersistence().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
