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

  // 4. Verify @codemirror/language-data & LanguageDescription
  const langDataModule = await import("@codemirror/language-data");
  const languageModule = await import("@codemirror/language");
  assert.ok(Array.isArray(langDataModule.languages), "languages should be an array");
  assert.ok(langDataModule.languages.length > 50, "languages should contain rich programming languages");
  const targetLangs = ["javascript", "typescript", "python", "rust", "html", "css", "json", "markdown", "yaml", "bash", "sql"];
  for (const lang of targetLangs) {
    const match = languageModule.LanguageDescription.matchLanguageName(langDataModule.languages, lang, true);
    assert.ok(match, `Language ${lang} should be matched in languages`);
  }
  console.log("✓ @codemirror/language-data language matching verified");

  // 5. Verify GFM markdownLanguage & parsing
  assert.ok(markdownModule.markdownLanguage, "markdownLanguage should be exported");
  const gfmExt = markdownModule.markdown({
    base: markdownModule.markdownLanguage,
    codeLanguages: langDataModule.languages,
  });
  assert.ok(gfmExt, "markdown with markdownLanguage and codeLanguages created");

  const testDoc = `# Heading 1
~~strikethrough~~
- [ ] Task
| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |

\`\`\`javascript
const num = 42;
// comment
\`\`\`
`;
  const tree = gfmExt.language.parser.parse(testDoc);
  let hasStrikethrough = false;
  let hasTable = false;
  let hasFencedCode = false;

  tree.iterate({
    enter(node) {
      if (node.name === "Strikethrough") hasStrikethrough = true;
      if (node.name === "Table") hasTable = true;
      if (node.name === "FencedCode") hasFencedCode = true;
    },
  });

  assert.ok(hasStrikethrough, "GFM strikethrough should be parsed");
  assert.ok(hasTable, "GFM table should be parsed");
  assert.ok(hasFencedCode, "Fenced code block should be parsed");
  console.log("✓ GFM syntax parsing (table, strikethrough, fenced code) verified");

  // 6. Verify SourceEditor.tsx exports and theme implementation
  const fs = await import("node:fs");
  const path = await import("node:path");
  const sourceEditorPath = path.resolve("src/components/Editor/SourceEditor.tsx");
  const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8");
  assert.ok(
    sourceEditorContent.includes("export const typoriLightHighlightStyle"),
    "typoriLightHighlightStyle should be exported"
  );
  assert.ok(
    sourceEditorContent.includes("export const typoriDarkHighlightStyle"),
    "typoriDarkHighlightStyle should be exported"
  );
  assert.ok(
    sourceEditorContent.includes("markdownLanguage"),
    "SourceEditor should use markdownLanguage for GFM"
  );
  assert.ok(
    sourceEditorContent.includes("codeLanguages: languages"),
    "SourceEditor should provide codeLanguages"
  );
  assert.ok(
    sourceEditorContent.includes("syntaxHighlighting("),
    "SourceEditor should use syntaxHighlighting"
  );
  console.log("✓ SourceEditor.tsx highlight styles & GFM integration verified");

  console.log("\nAll Markdown source direct editing mode checks passed successfully!");
}

verifySourceEditor().catch((err) => {
  console.error("Source editor verification failed:", err);
  process.exit(1);
});
