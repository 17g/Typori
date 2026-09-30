import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

async function verifyCheatSheet() {
  console.log("=== Testing CheatSheet Modal UI & Shortcut Integration (チートシートUI・ショートカット検証) ===");

  const modalDir = path.resolve("src/components/CheatSheetModal");
  const modalComponentPath = path.join(modalDir, "CheatSheetModal.tsx");
  const dataPath = path.join(modalDir, "data.ts");
  const typesPath = path.join(modalDir, "types.ts");
  const indexPath = path.join(modalDir, "index.ts");
  const appTsxPath = path.resolve("src/App.tsx");
  const menuRsPath = path.resolve("src-tauri/src/menu.rs");

  // 1. Verify component files exist
  console.log("1. Verifying CheatSheet component files...");
  assert.ok(fs.existsSync(modalComponentPath), "CheatSheetModal.tsx must exist");
  assert.ok(fs.existsSync(dataPath), "data.ts must exist");
  assert.ok(fs.existsSync(typesPath), "types.ts must exist");
  assert.ok(fs.existsSync(indexPath), "index.ts must exist");
  console.log("✓ Component files exist.");

  // 2. Verify CheatSheet data
  console.log("2. Verifying CheatSheet data definition...");
  const dataContent = fs.readFileSync(dataPath, "utf-8");
  assert.ok(dataContent.includes("SHORTCUT_ITEMS"), "data.ts must define SHORTCUT_ITEMS");
  assert.ok(dataContent.includes("MARKDOWN_SYNTAX_ITEMS"), "data.ts must define MARKDOWN_SYNTAX_ITEMS");
  assert.ok(dataContent.includes("open_cheatsheet"), "SHORTCUT_ITEMS must include open_cheatsheet");
  assert.ok(dataContent.includes("toggle_source_mode"), "SHORTCUT_ITEMS must include toggle_source_mode");
  assert.ok(dataContent.includes("toggle_focus_mode"), "SHORTCUT_ITEMS must include toggle_focus_mode");
  assert.ok(dataContent.includes("heading_1"), "MARKDOWN_SYNTAX_ITEMS must include headings");
  assert.ok(dataContent.includes("task_list"), "MARKDOWN_SYNTAX_ITEMS must include task list");
  assert.ok(dataContent.includes("table"), "MARKDOWN_SYNTAX_ITEMS must include table");
  console.log("✓ CheatSheet items properly defined.");

  // 3. Verify Modal component UI elements & behaviors
  console.log("3. Verifying CheatSheetModal UI features...");
  const modalContent = fs.readFileSync(modalComponentPath, "utf-8");
  assert.ok(modalContent.includes("role=\"dialog\""), "CheatSheetModal must have role='dialog'");
  assert.ok(modalContent.includes('e.key === "Escape"'), "CheatSheetModal must support Escape key to close");
  assert.ok(modalContent.includes("activeTab"), "CheatSheetModal must support tab switching");
  assert.ok(modalContent.includes("searchQuery"), "CheatSheetModal must support search query");
  assert.ok(modalContent.includes("selectedCategory"), "CheatSheetModal must support category filtering");
  assert.ok(modalContent.includes("navigator.clipboard.writeText"), "CheatSheetModal must support copy to clipboard");
  console.log("✓ CheatSheetModal UI features verified.");

  // 4. Verify Rust menu item and event emission
  console.log("4. Verifying Rust menu.rs integration...");
  const menuRsContent = fs.readFileSync(menuRsPath, "utf-8");
  assert.ok(menuRsContent.includes('"open_cheatsheet"'), "menu.rs must define 'open_cheatsheet'");
  assert.ok(menuRsContent.includes('Some("F1")'), "menu.rs must map 'open_cheatsheet' to F1");
  assert.ok(
    /\"open_cheatsheet\"\s*=>\s*\{\s*let _ = app\.emit\(\"menu:open_cheatsheet\",\s*\(\)\);/m.test(
      menuRsContent
    ),
    "menu.rs must emit 'menu:open_cheatsheet'"
  );
  console.log("✓ Rust menu definitions and event emissions verified.");

  // 5. Verify App.tsx integration
  console.log("5. Verifying App.tsx integration...");
  const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");
  assert.ok(
    appTsxContent.includes("CheatSheetModal"),
    "App.tsx must import and use CheatSheetModal"
  );
  assert.ok(
    appTsxContent.includes("isCheatSheetOpen"),
    "App.tsx must manage isCheatSheetOpen state"
  );
  assert.ok(
    appTsxContent.includes('listen("menu:open_cheatsheet"'),
    "App.tsx must listen to 'menu:open_cheatsheet'"
  );
  assert.ok(
    appTsxContent.includes('e.key === "F1"'),
    "App.tsx must listen to F1 shortcut key"
  );
  assert.ok(
    appTsxContent.includes("title=\"チートシート (Markdown & ショートカット) (F1)\""),
    "App.tsx must render cheatsheet button in header"
  );
  assert.ok(
    appTsxContent.includes("<CheatSheetModal"),
    "App.tsx must render <CheatSheetModal />"
  );
  console.log("✓ App.tsx integration verified.");

  console.log("=== All CheatSheet tests passed successfully! ===");
}

verifyCheatSheet();
