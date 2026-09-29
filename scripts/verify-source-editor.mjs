import assert from "node:assert/strict";

async function verifySourceEditor() {
  console.log("=== Testing Markdown Source Direct Editing Mode (CodeMirror 6) ===");

  // 1. Verify @uiw/react-codemirror exports
  const codeMirrorModule = await import("@uiw/react-codemirror");
  assert.ok(codeMirrorModule.default, "CodeMirror React component should be default export");
  assert.ok(codeMirrorModule.EditorView, "EditorView should be exported");
  assert.ok(codeMirrorModule.keymap, "keymap should be exported");
  assert.ok(codeMirrorModule.oneDark, "oneDark theme should be exported");
  console.log("✓ @uiw/react-codemirror exports verified");

  // 2. Verify @codemirror/lang-markdown
  const markdownModule = await import("@codemirror/lang-markdown");
  assert.ok(markdownModule.markdown, "markdown language support function should be exported");
  assert.equal(typeof markdownModule.markdown, "function", "markdown() should be a function");
  const markdownExt = markdownModule.markdown();
  assert.ok(markdownExt, "markdown extension initialized successfully");
  console.log("✓ @codemirror/lang-markdown support verified");

  // 3. Verify keymap extension and EditorView styling
  const saveKeymap = codeMirrorModule.keymap.of([
    {
      key: "Mod-s",
      run: () => true,
    },
  ]);
  assert.ok(saveKeymap, "Save keymap extension created successfully");

  const customTheme = codeMirrorModule.EditorView.theme({
    "&": {
      height: "100%",
      fontSize: "14px",
    },
  });
  assert.ok(customTheme, "Custom EditorView theme created successfully");
  console.log("✓ Extensions (keymap, theme, markdown) verified");

  console.log("\nAll Markdown source direct editing mode checks passed successfully!");
}

verifySourceEditor().catch((err) => {
  console.error("Source editor verification failed:", err);
  process.exit(1);
});
