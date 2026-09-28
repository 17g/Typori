import assert from "node:assert/strict";

async function verifyHistoryPlugin() {
  console.log("=== Testing Milkdown History Plugin & Undo/Redo Keymaps ===");

  // 1. Check exports
  const historyModule = await import("@milkdown/kit/plugin/history");
  assert.ok(historyModule.history, "history plugin should be defined");
  assert.ok(historyModule.undoCommand, "undoCommand should be defined");
  assert.ok(historyModule.redoCommand, "redoCommand should be defined");
  assert.ok(historyModule.historyKeymap, "historyKeymap should be defined");

  console.log("✓ History module exports verified");

  // 2. Check plugin composition
  assert.ok(Array.isArray(historyModule.history), "history should be an array of plugins");
  assert.equal(historyModule.history.length, 6, "history should contain 6 plugin elements");

  console.log("✓ History plugin elements verified");

  // 3. Check keymaps for Ctrl+Z and Ctrl+Y (Mod-z, Mod-y, Shift-Mod-z)
  const defaultKeymap = historyModule.historyKeymap.key._defaultValue;
  assert.ok(defaultKeymap.Undo, "Undo keymap must be registered");
  assert.equal(defaultKeymap.Undo.shortcuts, "Mod-z", "Undo shortcut must be Mod-z (Ctrl+Z / Cmd+Z)");

  assert.ok(defaultKeymap.Redo, "Redo keymap must be registered");
  const redoShortcuts = Array.isArray(defaultKeymap.Redo.shortcuts)
    ? defaultKeymap.Redo.shortcuts
    : [defaultKeymap.Redo.shortcuts];
  assert.ok(redoShortcuts.includes("Mod-y"), "Redo shortcuts must include Mod-y (Ctrl+Y / Cmd+Y)");
  assert.ok(redoShortcuts.includes("Shift-Mod-z"), "Redo shortcuts must include Shift-Mod-z (Ctrl+Shift+Z / Cmd+Shift+Z)");

  console.log(`✓ Undo/Redo keymaps verified: Undo=${defaultKeymap.Undo.shortcuts}, Redo=${JSON.stringify(redoShortcuts)}`);

  // 4. Check callCommand compatibility
  const utilsModule = await import("@milkdown/kit/utils");
  assert.equal(typeof utilsModule.callCommand, "function", "callCommand should be a function");

  const undoAction = utilsModule.callCommand(historyModule.undoCommand.key);
  assert.equal(typeof undoAction, "function", "callCommand(undoCommand.key) should return a command action function");

  const redoAction = utilsModule.callCommand(historyModule.redoCommand.key);
  assert.equal(typeof redoAction, "function", "callCommand(redoCommand.key) should return a command action function");

  console.log("✓ callCommand with undoCommand.key and redoCommand.key verified");

  console.log("\nAll history plugin and Undo/Redo keymap checks passed successfully!");
}

verifyHistoryPlugin().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
