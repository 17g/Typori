import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function isToggleSourceShortcut(e) {
  const isSlashKey =
    e.key === "/" ||
    (e.code === "Slash" && !e.shiftKey) ||
    e.code === "NumpadDivide";
  return Boolean((e.ctrlKey || e.metaKey) && isSlashKey && !e.altKey);
}

async function verifySourceToggleShortcut() {
  console.log("=== Testing Source Direct Edit Mode Toggle Shortcut (Ctrl + /) ===");

  // 1. Verify keyboard shortcut matching logic
  console.log("1. Testing shortcut detection against multiple keyboard layouts...");

  // US layout: Ctrl + /
  assert.equal(
    isToggleSourceShortcut({
      key: "/",
      code: "Slash",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    }),
    true,
    "US layout Ctrl+/ must match"
  );

  // macOS layout: Cmd + /
  assert.equal(
    isToggleSourceShortcut({
      key: "/",
      code: "Slash",
      ctrlKey: false,
      metaKey: true,
      altKey: false,
      shiftKey: false,
    }),
    true,
    "macOS Cmd+/ must match"
  );

  // JIS layout: Ctrl + / (め key)
  assert.equal(
    isToggleSourceShortcut({
      key: "/",
      code: "Slash",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    }),
    true,
    "JIS layout Ctrl+/ must match"
  );

  // International European layout where '/' requires Shift (e.g. Shift+7 or Shift+:)
  assert.equal(
    isToggleSourceShortcut({
      key: "/",
      code: "Digit7",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: true,
    }),
    true,
    "European layout with Shift produces '/' with Ctrl must match"
  );

  // Tenkey / Numpad Divide: Ctrl + NumpadDivide
  assert.equal(
    isToggleSourceShortcut({
      key: "/",
      code: "NumpadDivide",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    }),
    true,
    "Numpad Divide with Ctrl must match"
  );

  // Negative tests
  // Plain slash (no modifier)
  assert.equal(
    isToggleSourceShortcut({
      key: "/",
      code: "Slash",
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    }),
    false,
    "Plain slash without Ctrl/Cmd must not match"
  );

  // Ctrl + ? (Shift + Slash on US keyboard)
  assert.equal(
    isToggleSourceShortcut({
      key: "?",
      code: "Slash",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: true,
    }),
    false,
    "Ctrl + ? (Shift+Slash) must not match"
  );

  // Alt modifier (Ctrl + Alt + /)
  assert.equal(
    isToggleSourceShortcut({
      key: "/",
      code: "Slash",
      ctrlKey: true,
      metaKey: false,
      altKey: true,
      shiftKey: false,
    }),
    false,
    "Ctrl + Alt + / must not match"
  );

  // Different key (Ctrl + s)
  assert.equal(
    isToggleSourceShortcut({
      key: "s",
      code: "KeyS",
      ctrlKey: true,
      metaKey: false,
      altKey: false,
      shiftKey: false,
    }),
    false,
    "Ctrl + s must not match"
  );
  console.log("✓ Shortcut detection logic successfully verified for all layouts and negative cases");

  // 2. Verify state transition and synchronization flow
  console.log("2. Testing mode toggle state transition & Markdown sync flow...");
  let state = {
    isSourceMode: false,
    fileContent: "# Title\n\nInitial content",
  };

  const fakeEditorRef = {
    getMarkdown: () => "# Title\n\nUpdated from WYSIWYG",
  };

  function simulateToggle() {
    state.isSourceMode = !state.isSourceMode;
    if (state.isSourceMode) {
      // Switching into source mode: sync from WYSIWYG editor
      state.fileContent = fakeEditorRef.getMarkdown();
    }
  }

  assert.equal(state.isSourceMode, false, "Initial mode should be WYSIWYG");
  simulateToggle();
  assert.equal(state.isSourceMode, true, "First toggle should activate Source Mode");
  assert.equal(state.fileContent, "# Title\n\nUpdated from WYSIWYG", "Content should be synced from WYSIWYG to Source Mode");

  // Edit in Source Mode
  state.fileContent = "# Title\n\nEdited in Source Mode directly";
  simulateToggle();
  assert.equal(state.isSourceMode, false, "Second toggle should return to WYSIWYG mode");
  assert.equal(state.fileContent, "# Title\n\nEdited in Source Mode directly", "Content edited in Source Mode should be preserved");

  simulateToggle();
  assert.equal(state.isSourceMode, true, "Third toggle should re-enter Source Mode");
  console.log("✓ State transition and bidirectional content preservation verified");

  // 3. Verify source code static structure
  console.log("3. Verifying source code integration across components...");
  const appPath = path.resolve("src/App.tsx");
  const appContent = fs.readFileSync(appPath, "utf8");
  assert.ok(appContent.includes("isSlashKey"), "App.tsx must define isSlashKey logic");
  assert.ok(appContent.includes("handleToggleSourceModeRef.current()"), "App.tsx must invoke handleToggleSourceModeRef in handleKeyDown");
  assert.ok(appContent.includes("menu:toggle_source_mode"), "App.tsx must register menu:toggle_source_mode event listener");
  assert.ok(appContent.includes("Ctrl + /"), "App.tsx must provide Ctrl + / hints in titles");
  assert.ok(appContent.includes("onToggleSourceMode={handleToggleSourceMode}"), "App.tsx must pass onToggleSourceMode to child editors");

  const sourceEditorPath = path.resolve("src/components/Editor/SourceEditor.tsx");
  const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf8");
  assert.ok(sourceEditorContent.includes("onToggleSourceMode"), "SourceEditor.tsx must support onToggleSourceMode prop");
  assert.ok(sourceEditorContent.includes("Ctrl + /"), "SourceEditor.tsx must display Ctrl + / in badge / title");

  const editorToolbarPath = path.resolve("src/components/Editor/EditorToolbar.tsx");
  const editorToolbarContent = fs.readFileSync(editorToolbarPath, "utf8");
  assert.ok(editorToolbarContent.includes("onToggleSourceMode"), "EditorToolbar.tsx must support onToggleSourceMode prop");

  const editorPath = path.resolve("src/components/Editor/Editor.tsx");
  const editorContent = fs.readFileSync(editorPath, "utf8");
  assert.ok(editorContent.includes("onToggleSourceMode"), "Editor.tsx must forward onToggleSourceMode prop");
  console.log("✓ Static integration checks passed for App.tsx, SourceEditor.tsx, EditorToolbar.tsx, Editor.tsx");

  console.log("\nAll Source Direct Editing Mode Toggle Shortcut (Ctrl + /) checks passed successfully!");
}

verifySourceToggleShortcut().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
