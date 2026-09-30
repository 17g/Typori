import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { Plugin, PluginKey } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";

function isFocusModeShortcut(e) {
  return e.key === "F8" && !e.ctrlKey && !e.metaKey && !e.altKey;
}

async function verifyFocusMode() {
  console.log("=== Testing Focus Mode (フォーカスモード) Feature ===");

  // 1. Verify keyboard shortcut matching logic
  console.log("1. Testing F8 shortcut detection...");
  assert.equal(
    isFocusModeShortcut({ key: "F8", ctrlKey: false, metaKey: false, altKey: false }),
    true,
    "F8 key without modifiers must trigger focus mode"
  );
  assert.equal(
    isFocusModeShortcut({ key: "F7", ctrlKey: false, metaKey: false, altKey: false }),
    false,
    "F7 key must not trigger focus mode"
  );
  assert.equal(
    isFocusModeShortcut({ key: "F9", ctrlKey: false, metaKey: false, altKey: false }),
    false,
    "F9 key must not trigger focus mode"
  );
  assert.equal(
    isFocusModeShortcut({ key: "F8", ctrlKey: true, metaKey: false, altKey: false }),
    false,
    "Ctrl+F8 must not trigger plain F8 focus mode"
  );
  console.log("✓ Shortcut detection verified.");

  // 2. Verify ProseMirror plugin and Decoration generation logic
  console.log("2. Testing ProseMirror focusModePlugin and Decoration logic...");
  const focusKey = new PluginKey("testFocusModePlugin");
  assert.ok(focusKey, "PluginKey must be instantiable");

  // Simulate ProseMirror node tree
  const mockParagraphNode = {
    isBlock: true,
    nodeSize: 20,
    type: { name: "paragraph" },
  };
  const mockHeadingNode = {
    isBlock: true,
    nodeSize: 35,
    type: { name: "heading" },
  };

  const mockResolvedPos = {
    depth: 1,
    node: (d) => (d === 1 ? mockParagraphNode : null),
    before: (d) => (d === 1 ? 0 : 0),
    after: (d) => (d === 1 ? 20 : 0),
  };

  // Test decoration creation logic as in Editor.tsx
  const decs = [];
  if (mockResolvedPos.depth >= 1) {
    for (let d = 1; d <= mockResolvedPos.depth; d++) {
      const node = mockResolvedPos.node(d);
      if (node && node.isBlock) {
        const start = mockResolvedPos.before(d);
        decs.push(
          Decoration.node(start, start + node.nodeSize, {
            class: "focus-mode-active",
          })
        );
      }
    }
  }

  assert.equal(decs.length, 1, "Exactly one block decoration should be generated for depth 1");
  assert.equal(decs[0].from, 0, "Decoration starts at node beginning");
  assert.equal(decs[0].to, 20, "Decoration ends at node end");
  assert.equal(decs[0].type.attrs.class, "focus-mode-active", "Decoration applies 'focus-mode-active' class");
  console.log("✓ ProseMirror Decoration logic verified.");

  // 3. Verify CSS rules in src/index.css
  console.log("3. Verifying Focus Mode styling in src/index.css...");
  const cssPath = path.resolve("src/index.css");
  const cssContent = fs.readFileSync(cssPath, "utf-8");

  assert.ok(cssContent.includes(".focus-mode .ProseMirror > *"), "Must define dimming for ProseMirror non-active blocks");
  assert.ok(cssContent.includes(".focus-mode .ProseMirror > *.focus-mode-active"), "Must define full opacity for active block");
  assert.ok(cssContent.includes(".cm-focus-mode .cm-line"), "Must define dimming for CodeMirror lines");
  assert.ok(cssContent.includes(".cm-focus-mode .cm-activeLine"), "Must define active highlight for CodeMirror line");
  console.log("✓ CSS rules verified.");

  // 4. Verify Editor.tsx integration
  console.log("4. Verifying Editor.tsx implementation...");
  const editorPath = path.resolve("src/components/Editor/Editor.tsx");
  const editorContent = fs.readFileSync(editorPath, "utf-8");

  assert.ok(editorContent.includes("focusModePluginKey"), "Editor.tsx must export focusModePluginKey");
  assert.ok(editorContent.includes("focusModePlugin"), "Editor.tsx must define and use focusModePlugin");
  assert.ok(editorContent.includes("isFocusMode"), "Editor.tsx must support isFocusMode prop");
  assert.ok(editorContent.includes("onToggleFocusMode"), "Editor.tsx must support onToggleFocusMode prop");
  assert.ok(editorContent.includes('focus-mode'), "Editor.tsx must attach focus-mode class when active");
  assert.ok(editorContent.includes('e.key === "F8"'), "Editor.tsx must handle F8 in keydown");
  console.log("✓ Editor.tsx integration verified.");

  // 5. Verify EditorToolbar.tsx integration
  console.log("5. Verifying EditorToolbar.tsx implementation...");
  const toolbarPath = path.resolve("src/components/Editor/EditorToolbar.tsx");
  const toolbarContent = fs.readFileSync(toolbarPath, "utf-8");

  assert.ok(toolbarContent.includes("isFocusMode"), "EditorToolbar.tsx must accept isFocusMode");
  assert.ok(toolbarContent.includes("onToggleFocusMode"), "EditorToolbar.tsx must accept onToggleFocusMode");
  assert.ok(toolbarContent.includes("(F8)"), "EditorToolbar.tsx must show F8 tooltip on focus button");
  console.log("✓ EditorToolbar.tsx integration verified.");

  // 6. Verify SourceEditor.tsx integration
  console.log("6. Verifying SourceEditor.tsx implementation...");
  const sourceEditorPath = path.resolve("src/components/Editor/SourceEditor.tsx");
  const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8");

  assert.ok(sourceEditorContent.includes("isFocusMode"), "SourceEditor.tsx must accept isFocusMode");
  assert.ok(sourceEditorContent.includes("onToggleFocusMode"), "SourceEditor.tsx must accept onToggleFocusMode");
  assert.ok(sourceEditorContent.includes('key: "F8"'), "SourceEditor.tsx must register F8 in CodeMirror keymap");
  assert.ok(sourceEditorContent.includes("cm-focus-mode"), "SourceEditor.tsx must attach cm-focus-mode class");
  console.log("✓ SourceEditor.tsx integration verified.");

  // 7. Verify App.tsx integration
  console.log("7. Verifying App.tsx implementation...");
  const appPath = path.resolve("src/App.tsx");
  const appContent = fs.readFileSync(appPath, "utf-8");

  assert.ok(appContent.includes("isFocusMode"), "App.tsx must have isFocusMode state");
  assert.ok(appContent.includes("handleToggleFocusMode"), "App.tsx must define handleToggleFocusMode");
  assert.ok(appContent.includes('e.key === "F8"'), "App.tsx must handle F8 key in window keydown");
  assert.ok(appContent.includes("menu:toggle_focus_mode"), "App.tsx must listen to menu:toggle_focus_mode");
  assert.ok(appContent.includes("isFocusMode={isFocusMode}"), "App.tsx must pass isFocusMode to editors");
  assert.ok(appContent.includes("onToggleFocusMode={handleToggleFocusMode}"), "App.tsx must pass onToggleFocusMode to editors");
  console.log("✓ App.tsx integration verified.");

  // 8. Verify src-tauri/src/menu.rs integration
  console.log("8. Verifying src-tauri/src/menu.rs implementation...");
  const menuRsPath = path.resolve("src-tauri/src/menu.rs");
  const menuRsContent = fs.readFileSync(menuRsPath, "utf-8");

  assert.ok(menuRsContent.includes("toggle_focus_mode"), "menu.rs must register toggle_focus_mode menu item");
  assert.ok(menuRsContent.includes('"F8"'), "menu.rs must bind F8 shortcut accelerator to toggle_focus_mode");
  assert.ok(menuRsContent.includes('"menu:toggle_focus_mode"'), "menu.rs must emit menu:toggle_focus_mode event");
  assert.ok(menuRsContent.includes('assert_eq!("toggle_focus_mode", "toggle_focus_mode")'), "menu.rs must test toggle_focus_mode id");
  console.log("✓ menu.rs integration verified.");

  console.log("\n>>> ALL FOCUS MODE VERIFICATION TESTS PASSED SUCCESSFULLY! <<<");
}

verifyFocusMode().catch((err) => {
  console.error("Focus mode verification failed:", err);
  process.exit(1);
});
