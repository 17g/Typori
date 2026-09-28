import assert from "node:assert/strict";

async function verifyLinkAndBlockquote() {
  console.log("=== Testing Milkdown Link & Blockquote Support ===");

  // 1. Verify preset-commonmark exports for link and blockquote
  const commonmarkModule = await import("@milkdown/kit/preset/commonmark");

  assert.ok(commonmarkModule.linkSchema, "linkSchema should be exported from preset-commonmark");
  assert.ok(commonmarkModule.blockquoteSchema, "blockquoteSchema should be exported from preset-commonmark");
  assert.ok(commonmarkModule.toggleLinkCommand, "toggleLinkCommand should be exported from preset-commonmark");
  assert.ok(commonmarkModule.updateLinkCommand, "updateLinkCommand should be exported from preset-commonmark");
  assert.ok(commonmarkModule.wrapInBlockquoteCommand, "wrapInBlockquoteCommand should be exported from preset-commonmark");

  console.log("✓ preset-commonmark link and blockquote exports verified");

  // 2. Verify prose commands for blockquote lifting and wrapping
  const proseCommands = await import("@milkdown/kit/prose/commands");
  assert.equal(typeof proseCommands.wrapIn, "function", "wrapIn should be a function");
  assert.equal(typeof proseCommands.lift, "function", "lift should be a function");

  console.log("✓ ProseMirror commands (wrapIn, lift) verified");

  // 3. Verify @tauri-apps/plugin-opener export
  const openerModule = await import("@tauri-apps/plugin-opener");
  assert.equal(typeof openerModule.openUrl, "function", "openUrl should be exported from @tauri-apps/plugin-opener");

  console.log("✓ @tauri-apps/plugin-opener openUrl verified");

  console.log("\nAll link & blockquote core modules verified successfully!");
}

verifyLinkAndBlockquote().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
