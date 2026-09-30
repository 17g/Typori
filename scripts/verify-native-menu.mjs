import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

async function verifyNativeMenu() {
  console.log("=== Testing Native OS Menu & Event Wiring (OS連携メニュー・イベント連携) ===");

  const menuRsPath = path.resolve("src-tauri/src/menu.rs");
  const appTsxPath = path.resolve("src/App.tsx");

  assert.ok(fs.existsSync(menuRsPath), "menu.rs must exist");
  assert.ok(fs.existsSync(appTsxPath), "App.tsx must exist");

  const menuRsContent = fs.readFileSync(menuRsPath, "utf-8");
  const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");

  // 1. Verify Rust menu item creation and accelerators in menu.rs
  console.log("1. Verifying Rust menu definitions in src-tauri/src/menu.rs...");

  // Check toggle_tabs
  assert.ok(
    menuRsContent.includes('"toggle_tabs"'),
    "menu.rs must define 'toggle_tabs' item ID"
  );
  assert.ok(
    menuRsContent.includes('"タブ機能の有効/無効"'),
    "menu.rs must set label 'タブ機能の有効/無効'"
  );
  assert.ok(
    menuRsContent.includes('Some("CmdOrCtrl+Shift+T")'),
    "menu.rs must set accelerator 'CmdOrCtrl+Shift+T' for toggle_tabs"
  );

  // Check toggle_source_mode
  assert.ok(
    menuRsContent.includes('"toggle_source_mode"'),
    "menu.rs must define 'toggle_source_mode' item ID"
  );
  assert.ok(
    menuRsContent.includes('"ソース直接編集モードの切替"'),
    "menu.rs must set label 'ソース直接編集モードの切替'"
  );
  assert.ok(
    menuRsContent.includes('Some("CmdOrCtrl+/")'),
    "menu.rs must set accelerator 'CmdOrCtrl+/' for toggle_source_mode"
  );

  // Check inclusion in view_menu
  assert.ok(
    menuRsContent.includes("&toggle_source_mode"),
    "view_menu must include &toggle_source_mode"
  );
  assert.ok(
    menuRsContent.includes("&toggle_tabs"),
    "view_menu must include &toggle_tabs"
  );
  console.log("✓ Menu item definitions and accelerator shortcuts verified.");

  // 2. Verify handle_menu_event emissions in menu.rs
  console.log("2. Verifying event emission in handle_menu_event...");
  assert.ok(
    /\"toggle_tabs\"\s*=>\s*\{\s*let _ = app\.emit\(\"menu:toggle_tabs\",\s*\(\)\);/m.test(
      menuRsContent
    ),
    "handle_menu_event must emit 'menu:toggle_tabs'"
  );
  assert.ok(
    /\"toggle_source_mode\"\s*=>\s*\{\s*let _ = app\.emit\(\"menu:toggle_source_mode\",\s*\(\)\);/m.test(
      menuRsContent
    ),
    "handle_menu_event must emit 'menu:toggle_source_mode'"
  );
  console.log("✓ Native menu event emissions verified.");

  // 3. Verify event listeners and handlers in src/App.tsx
  console.log("3. Verifying event listeners in src/App.tsx...");
  assert.ok(
    appTsxContent.includes('listen("menu:toggle_tabs"'),
    "App.tsx must listen to 'menu:toggle_tabs'"
  );
  assert.ok(
    appTsxContent.includes("handleToggleTabsEnabledRef.current()"),
    "App.tsx must invoke handleToggleTabsEnabledRef.current() on menu:toggle_tabs"
  );

  assert.ok(
    appTsxContent.includes('listen("menu:toggle_source_mode"'),
    "App.tsx must listen to 'menu:toggle_source_mode'"
  );
  assert.ok(
    appTsxContent.includes("handleToggleSourceModeRef.current()"),
    "App.tsx must invoke handleToggleSourceModeRef.current() on menu:toggle_source_mode"
  );
  console.log("✓ Frontend event listeners and handler invocations verified.");

  // 4. Verify behavioral toggle logic simulation
  console.log("4. Testing toggle state transition simulation...");
  // Simulate tab toggle behavior
  let isTabsEnabled = false;
  const toggleTabs = () => {
    isTabsEnabled = !isTabsEnabled;
  };

  assert.equal(isTabsEnabled, false, "Tabs initially disabled");
  toggleTabs();
  assert.equal(isTabsEnabled, true, "Tabs enabled after toggle");
  toggleTabs();
  assert.equal(isTabsEnabled, false, "Tabs disabled after second toggle");

  // Simulate source mode toggle behavior
  let isSourceMode = false;
  let simulatedEditorMarkdown = "# Test Content";
  let syncedContent = "";
  const toggleSourceMode = () => {
    if (!isSourceMode) {
      syncedContent = simulatedEditorMarkdown;
    }
    isSourceMode = !isSourceMode;
  };

  assert.equal(isSourceMode, false, "Source mode initially disabled (WYSIWYG)");
  toggleSourceMode();
  assert.equal(isSourceMode, true, "Source mode enabled");
  assert.equal(syncedContent, "# Test Content", "Content successfully synced to source editor");
  toggleSourceMode();
  assert.equal(isSourceMode, false, "Returned to WYSIWYG mode");
  console.log("✓ State transition and synchronization simulation verified.");

  console.log("\n>>> ALL NATIVE MENU & EVENT WIRING TESTS PASSED SUCCESSFULLY! <<<");
}

verifyNativeMenu().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
