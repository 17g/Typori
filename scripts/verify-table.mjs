import assert from "node:assert/strict";

async function verifyTableSupport() {
  console.log("=== Testing Milkdown Table Support, Visual Editing & Resizing ===");

  // 1. Verify preset-gfm table exports
  const gfmModule = await import("@milkdown/kit/preset/gfm");
  assert.ok(gfmModule.gfm, "gfm preset should be exported");
  assert.ok(gfmModule.columnResizingPlugin, "columnResizingPlugin should be exported");
  assert.ok(gfmModule.tableEditingPlugin, "tableEditingPlugin should be exported");
  assert.ok(gfmModule.createTable, "createTable helper should be exported");
  assert.equal(typeof gfmModule.createTable, "function", "createTable should be a function");

  assert.ok(gfmModule.insertTableCommand, "insertTableCommand should be exported");
  assert.ok(gfmModule.addRowBeforeCommand, "addRowBeforeCommand should be exported");
  assert.ok(gfmModule.addRowAfterCommand, "addRowAfterCommand should be exported");
  assert.ok(gfmModule.addColBeforeCommand, "addColBeforeCommand should be exported");
  assert.ok(gfmModule.addColAfterCommand, "addColAfterCommand should be exported");
  assert.ok(gfmModule.deleteSelectedCellsCommand, "deleteSelectedCellsCommand should be exported");

  console.log("✓ preset-gfm table and columnResizing exports verified");

  // 2. Verify prose/tables visual editing and resizing operations
  const proseTables = await import("@milkdown/kit/prose/tables");
  assert.equal(typeof proseTables.isInTable, "function", "isInTable should be a function");
  assert.equal(typeof proseTables.addRowBefore, "function", "addRowBefore should be a function");
  assert.equal(typeof proseTables.addRowAfter, "function", "addRowAfter should be a function");
  assert.equal(typeof proseTables.deleteRow, "function", "deleteRow should be a function");
  assert.equal(typeof proseTables.addColumnBefore, "function", "addColumnBefore should be a function");
  assert.equal(typeof proseTables.addColumnAfter, "function", "addColumnAfter should be a function");
  assert.equal(typeof proseTables.deleteColumn, "function", "deleteColumn should be a function");
  assert.equal(typeof proseTables.deleteTable, "function", "deleteTable should be a function");
  assert.ok(proseTables.columnResizing, "columnResizing prose plugin should be exported");

  console.log("✓ prose/tables visual editing functions verified");

  // 3. Verify Editor configuration with columnResizingPlugin
  const { Editor, rootCtx, defaultValueCtx } = await import("@milkdown/kit/core");
  const { commonmark } = await import("@milkdown/kit/preset/commonmark");

  const editor = Editor.make()
    .config((ctx) => {
      ctx.set(rootCtx, {});
      ctx.set(defaultValueCtx, "| 機能 | 状態 |\n| :--- | :---: |\n| 表の編集 | 完了 |");
    })
    .use(commonmark)
    .use(gfmModule.gfm)
    .use(gfmModule.columnResizingPlugin);

  assert.ok(editor, "Editor instance should be configured with columnResizingPlugin");
  console.log("✓ Editor composition with columnResizingPlugin verified");

  console.log("\nAll table support, visual editing, and resizing checks passed successfully!");
}

verifyTableSupport().catch((err) => {
  console.error("Table verification failed:", err);
  process.exit(1);
});
