import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== Phase 33 Task 124: 書式クリア (Ctrl+Shift+B) 引用競合解消 検証 ===");

// 1. Editor.tsx のソースコード静的検証
console.log("\n[Step 1] Editor.tsx の静的構成検証...");
const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorPath), "Editor.tsx が存在すること");

const editorContent = fs.readFileSync(editorPath, "utf-8").replace(/\r\n/g, "\n");

// blockquoteKeymap のインポート確認
assert.ok(
  editorContent.includes("blockquoteKeymap"),
  "Editor.tsx で blockquoteKeymap がインポートされていること"
);

// blockquoteKeymap.key のオーバーライド確認
assert.ok(
  editorContent.includes("ctx.update(blockquoteKeymap.key,"),
  "Editor.tsx で blockquoteKeymap.key のオーバーライドが行われていること"
);
assert.ok(
  editorContent.includes('shortcuts: ["Mod-Shift-q"') || editorContent.includes("shortcuts: 'Mod-Shift-q'"),
  "WrapInBlockquote のショートカットが Mod-Shift-q に変更され Mod-Shift-b が解除されていること"
);

// handleKeyDownCapture の定義と onKeyDownCapture の登録確認
assert.ok(
  editorContent.includes("handleKeyDownCapture"),
  "handleKeyDownCapture が定義されていること"
);
assert.ok(
  editorContent.includes("onKeyDownCapture={handleKeyDownCapture}"),
  "コンテナ要素に onKeyDownCapture={handleKeyDownCapture} が設定されていること"
);
assert.ok(
  editorContent.includes("clearFormattingAction()"),
  "書式クリアハンドラが呼び出されていること"
);

// Ctrl+B の太字機能が阻害されていないことの確認
// e.shiftKey が true の場合のみ書式クリアを捕捉し、e.shiftKey が false (Ctrl+B) の場合はスルーすること
assert.ok(
  editorContent.includes("(e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && isBKey"),
  "Ctrl+Shift+B のみ捕捉し Ctrl+B (Shiftなし) はキャプチャで妨害せず通過させること"
);

console.log("✓ Editor.tsx の静的検証に合格しました");

// 2. Milkdown の設定値動的検証
console.log("\n[Step 2] Milkdown の blockquoteKeymap 設定オーバーライド動的検証...");
import { Editor } from "@milkdown/kit/core";
import { blockquoteKeymap } from "@milkdown/kit/preset/commonmark";

const testEditor = Editor.make();
const ctx = testEditor.ctx;
ctx.inject(blockquoteKeymap.key, blockquoteKeymap.key._defaultValue);

// 初期状態のデフォルト値確認（Mod-Shift-b）
const initialConfig = ctx.get(blockquoteKeymap.key);
assert.equal(
  initialConfig.WrapInBlockquote.shortcuts,
  "Mod-Shift-b",
  "初期状態では Mod-Shift-b が設定されていること"
);

// Editor.tsx と同様のオーバーライドを実行
ctx.update(blockquoteKeymap.key, (prev) => ({
  ...prev,
  WrapInBlockquote: {
    ...prev?.WrapInBlockquote,
    shortcuts: ["Mod-Shift-q", "Mod-Alt-q"],
  },
}));

const updatedConfig = ctx.get(blockquoteKeymap.key);
assert.ok(updatedConfig, "blockquoteKeymap.key の update が実行されること");
assert.deepEqual(
  updatedConfig.WrapInBlockquote.shortcuts,
  ["Mod-Shift-q", "Mod-Alt-q"],
  "WrapInBlockquote のショートカットが Mod-Shift-q に置換されていること"
);
assert.ok(
  !updatedConfig.WrapInBlockquote.shortcuts.includes("Mod-Shift-b"),
  "Mod-Shift-b がショートカットから完全に排除されていること"
);

console.log("✓ blockquoteKeymap のショートカットオーバーライド動的検証に合格しました");

// 3. キーイベントシミュレーション検証
console.log("\n[Step 3] キーイベントシミュレーション (Ctrl+Shift+B vs Ctrl+B)...");

// キャプチャフェーズ判定関数のロジック検証
function isCapturedClearShortcut(e) {
  const isBKey = e.key === "b" || e.key === "B" || e.code === "KeyB";
  const isDefaultClearShortcut =
    (e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && isBKey;
  return isDefaultClearShortcut;
}

// ケース1: Ctrl+Shift+B (書式クリア) -> キャプチャで捕捉 (true)
const clearEvent = { ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, key: "b", code: "KeyB" };
assert.equal(isCapturedClearShortcut(clearEvent), true, "Ctrl+Shift+B はキャプチャで捕捉されること");

// ケース2: Cmd+Shift+B (Mac 書式クリア) -> キャプチャで捕捉 (true)
const macClearEvent = { ctrlKey: false, metaKey: true, shiftKey: true, altKey: false, key: "B", code: "KeyB" };
assert.equal(isCapturedClearShortcut(macClearEvent), true, "Cmd+Shift+B はキャプチャで捕捉されること");

// ケース3: Ctrl+B (太字) -> キャプチャで捕捉されない (false -> 太字キーマップへ通過)
const boldEvent = { ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, key: "b", code: "KeyB" };
assert.equal(isCapturedClearShortcut(boldEvent), false, "Ctrl+B はキャプチャされず通過すること（太字が動作）");

// ケース4: Ctrl+Shift+Q (引用トグル) -> キャプチャで捕捉されない (false -> 引用処理へ通過)
const quoteEvent = { ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, key: "q", code: "KeyQ" };
assert.equal(isCapturedClearShortcut(quoteEvent), false, "Ctrl+Shift+Q はキャプチャされず通過すること");

console.log("✓ キーイベントシミュレーション検証に合格しました");
console.log("\n=== Phase 33 Task 124 の全検証に合格しました ===");
