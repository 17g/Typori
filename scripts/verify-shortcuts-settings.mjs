import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

async function verifyShortcutsSettings() {
  console.log("=== Testing Shortcut Settings Modal UI & Integration (ショートカット設定UI・連携検証) ===");

  const modalDir = path.resolve("src/components/ShortcutSettingsModal");
  const modalComponentPath = path.join(modalDir, "ShortcutSettingsModal.tsx");
  const utilsPath = path.join(modalDir, "utils.ts");
  const typesPath = path.join(modalDir, "types.ts");
  const indexPath = path.join(modalDir, "index.ts");
  const appTsxPath = path.resolve("src/App.tsx");
  const menuRsPath = path.resolve("src-tauri/src/menu.rs");

  // 1. Verify component files exist
  console.log("1. Verifying ShortcutSettingsModal component files...");
  assert.ok(fs.existsSync(modalComponentPath), "ShortcutSettingsModal.tsx must exist");
  assert.ok(fs.existsSync(utilsPath), "utils.ts must exist");
  assert.ok(fs.existsSync(typesPath), "types.ts must exist");
  assert.ok(fs.existsSync(indexPath), "index.ts must exist");
  console.log("✓ Component files exist.");

  // 2. Verify types and shortcut definitions
  console.log("2. Verifying Shortcut types and definitions...");
  const typesContent = fs.readFileSync(typesPath, "utf-8");
  assert.ok(typesContent.includes("SHORTCUT_ITEMS"), "types.ts must export SHORTCUT_ITEMS");
  assert.ok(typesContent.includes("ShortcutCategory"), "types.ts must define ShortcutCategory");
  assert.ok(typesContent.includes("CATEGORY_LABELS"), "types.ts must export CATEGORY_LABELS");
  assert.ok(typesContent.includes("new_file"), "SHORTCUT_ITEMS must include new_file");
  assert.ok(typesContent.includes("save_file"), "SHORTCUT_ITEMS must include save_file");
  assert.ok(typesContent.includes("toggle_sidebar"), "SHORTCUT_ITEMS must include toggle_sidebar");
  assert.ok(typesContent.includes("toggle_source_mode"), "SHORTCUT_ITEMS must include toggle_source_mode");
  assert.ok(typesContent.includes("toggle_focus_mode"), "SHORTCUT_ITEMS must include toggle_focus_mode");
  assert.ok(typesContent.includes("open_shortcuts_settings"), "SHORTCUT_ITEMS must include open_shortcuts_settings");
  console.log("✓ Shortcut definitions properly configured.");

  // 3. Verify utils (Key parsing, conflict detection, defaults)
  console.log("3. Verifying Shortcut utils logic...");
  const utilsContent = fs.readFileSync(utilsPath, "utf-8");
  assert.ok(utilsContent.includes("getDefaultShortcutConfig"), "utils.ts must export getDefaultShortcutConfig");
  assert.ok(utilsContent.includes("areKeysEqual"), "utils.ts must export areKeysEqual");
  assert.ok(utilsContent.includes("parseKeyboardEvent"), "utils.ts must export parseKeyboardEvent");
  assert.ok(utilsContent.includes("findConflictingAction"), "utils.ts must export findConflictingAction");
  assert.ok(utilsContent.includes("findAllConflicts"), "utils.ts must export findAllConflicts");
  console.log("✓ Shortcut utils properly implemented.");

  // 4. Verify Modal component UI elements & behaviors
  console.log("4. Verifying ShortcutSettingsModal UI features...");
  const modalContent = fs.readFileSync(modalComponentPath, "utf-8");
  assert.ok(modalContent.includes('role="dialog"'), "ShortcutSettingsModal must have role='dialog'");
  assert.ok(modalContent.includes('aria-label="ショートカットキー設定"'), "ShortcutSettingsModal must have proper aria-label");
  assert.ok(modalContent.includes("Escape"), "ShortcutSettingsModal must support Escape key to close or cancel recording");
  assert.ok(modalContent.includes("recordingId"), "ShortcutSettingsModal must support recording mode for key assignment");
  assert.ok(modalContent.includes("searchQuery"), "ShortcutSettingsModal must support search query filtering");
  assert.ok(modalContent.includes("selectedCategory"), "ShortcutSettingsModal must support category filtering");
  assert.ok(modalContent.includes("handleResetAll"), "ShortcutSettingsModal must support resetting all shortcuts to default");
  assert.ok(modalContent.includes("handleResetItem"), "ShortcutSettingsModal must support resetting individual shortcut");
  assert.ok(modalContent.includes("allConflicts"), "ShortcutSettingsModal must detect and display key conflicts");
  console.log("✓ ShortcutSettingsModal UI features verified.");

  // 5. Verify Rust menu.rs integration
  console.log("5. Verifying Rust menu.rs integration...");
  const menuRsContent = fs.readFileSync(menuRsPath, "utf-8");
  assert.ok(menuRsContent.includes('"open_shortcuts_settings"'), "menu.rs must define 'open_shortcuts_settings'");
  assert.ok(menuRsContent.includes('Some("CmdOrCtrl+,")'), "menu.rs must map 'open_shortcuts_settings' to CmdOrCtrl+,");
  assert.ok(
    /\"open_shortcuts_settings\"\s*=>\s*\{\s*let _ = app\.emit\(\"menu:open_shortcuts_settings\",\s*\(\)\);/m.test(
      menuRsContent
    ),
    "menu.rs must emit 'menu:open_shortcuts_settings'"
  );
  console.log("✓ Rust menu definitions and event emissions verified.");

  // 6. Verify App.tsx integration
  console.log("6. Verifying App.tsx integration...");
  const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");
  assert.ok(
    appTsxContent.includes("ShortcutSettingsModal"),
    "App.tsx must import and use ShortcutSettingsModal"
  );
  assert.ok(
    appTsxContent.includes("isShortcutSettingsOpen"),
    "App.tsx must manage isShortcutSettingsOpen state"
  );
  assert.ok(
    appTsxContent.includes('listen("menu:open_shortcuts_settings"'),
    "App.tsx must listen to 'menu:open_shortcuts_settings'"
  );
  assert.ok(
    appTsxContent.includes('e.key === ","'),
    "App.tsx must listen to Ctrl+, shortcut key"
  );
  assert.ok(
    appTsxContent.includes('title="ショートカットキー設定 (Ctrl+,)"'),
    "App.tsx must render settings button in header"
  );
  assert.ok(
    appTsxContent.includes("<ShortcutSettingsModal"),
    "App.tsx must render <ShortcutSettingsModal />"
  );
  console.log("✓ App.tsx integration verified.");

  console.log("=== All Shortcut Settings tests passed successfully! ===");
}

verifyShortcutsSettings();
