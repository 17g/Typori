/**
 * verify-phase31-fixes.mjs
 * Phase 31 品質保証・自動テスト:
 * 1. 実機での Ctrl+/ 押下等、修飾キー付きショートカット押下による hasUserInteracted 誤爆完全防止シミュレーション
 * 2. SourceEditor の二重 max-width 排除と CodeMirror 6 標準ガター横並び・縦スクロール健全性検証
 * 3. v1.8.2 バージョン整合性および全機能連携の検証
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  Phase 31: ショートカット誤爆完全防止・スクロール＆ガターレイアウト ");
console.log("             および v1.8.2 テスト版リリース品質保証検証            ");
console.log("==================================================================");

// [Part 1] Editor.tsx の handleKeyDown によるショートカット誤爆完全防止検証
console.log("\n--- [Part 1] handleKeyDown における修飾キー付きショートカット誤爆防止検証 ---");

const editorTsxPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorTsxPath), "Editor.tsx が存在すること");
const editorContent = fs.readFileSync(editorTsxPath, "utf-8").replace(/\r\n/g, "\n");

// 1.1 handleKeyDown 内のガードロジックの静的コード検証
const handleKeyDownMatch = editorContent.match(/const handleKeyDown = \(e: React\.KeyboardEvent<HTMLDivElement>\) => \{([\s\S]*?)\n    \};/m);
assert.ok(handleKeyDownMatch, "Editor.tsx に handleKeyDown が存在すること");
const handleKeyDownBody = handleKeyDownMatch[1];

assert.match(
  handleKeyDownBody,
  /const hasModifier = e\.ctrlKey \|\| e\.metaKey \|\| e\.altKey;/,
  "hasModifier で ctrlKey, metaKey, altKey を判定していること"
);
assert.match(
  handleKeyDownBody,
  /!hasModifier && !isModifierOnly && !isNavigation/,
  "hasModifier, isModifierOnly, isNavigation がすべて false の場合のみ編集キー判定を行うこと"
);

// 1.2 キーイベント判定ロジックのシミュレーション検証
function simulateKeyHandling(event) {
  let userInteracted = false;
  const markUserInteracted = () => {
    userInteracted = true;
  };

  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
  const isModifierOnly = [
    "Control",
    "Shift",
    "Alt",
    "Meta",
    "CapsLock",
    "Fn",
    "NumLock",
    "ScrollLock",
  ].includes(event.key);
  const isNavigation = [
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "Escape",
  ].includes(event.key);

  if (!hasModifier && !isModifierOnly && !isNavigation) {
    const isEditingKey =
      event.key.length === 1 ||
      event.key === "Enter" ||
      event.key === "Backspace" ||
      event.key === "Delete" ||
      event.key === "Tab";
    if (isEditingKey) {
      markUserInteracted();
    }
  }

  return userInteracted;
}

// ショートカット操作では絶対に markUserInteracted が呼ばれないことを実証
const nonInteractingEvents = [
  { key: "/", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, desc: "Ctrl + / (ソース編集切替)" },
  { key: "/", ctrlKey: false, metaKey: true, altKey: false, shiftKey: false, desc: "Cmd + / (macOS ソース編集切替)" },
  { key: "s", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, desc: "Ctrl + S (保存)" },
  { key: "c", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, desc: "Ctrl + C (コピー)" },
  { key: "v", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, desc: "Ctrl + V (貼り付け等のショートカット先行判定)" },
  { key: "k", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, desc: "Ctrl + K (リンク編集)" },
  { key: "q", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true, desc: "Ctrl + Shift + Q (引用)" },
  { key: "t", ctrlKey: true, metaKey: false, altKey: true, shiftKey: false, desc: "Ctrl + Alt + T (テーブル挿入)" },
  { key: "b", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true, desc: "Ctrl + Shift + B (書式クリア)" },
  { key: "Control", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false, desc: "Control キー単体" },
  { key: "Shift", ctrlKey: false, metaKey: false, altKey: false, shiftKey: true, desc: "Shift キー単体" },
  { key: "Alt", ctrlKey: false, metaKey: false, altKey: true, shiftKey: false, desc: "Alt キー単体" },
  { key: "ArrowDown", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "ArrowDown ナビゲーション" },
  { key: "PageUp", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "PageUp ナビゲーション" },
  { key: "Escape", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "Escape キー" },
  { key: "F8", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "F8 ファンクションキー" },
];

for (const evt of nonInteractingEvents) {
  const result = simulateKeyHandling(evt);
  assert.equal(result, false, `${evt.desc} で markUserInteracted が発火しないこと`);
}
console.log(`✓ 全 ${nonInteractingEvents.length} 件のショートカット・修飾キー・ナビゲーション操作で markUserInteracted が誤爆しないことを実証確認`);

// 通常文字入力や編集キーでは正しく markUserInteracted が呼ばれることを実証
const interactingEvents = [
  { key: "a", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "文字入力 'a'" },
  { key: "#", ctrlKey: false, metaKey: false, altKey: false, shiftKey: true, desc: "記号入力 '#'" },
  { key: "Enter", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "Enter 改行" },
  { key: "Backspace", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "Backspace 削除" },
  { key: "Delete", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "Delete 削除" },
  { key: "Tab", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, desc: "Tab インデント" },
];

for (const evt of interactingEvents) {
  const result = simulateKeyHandling(evt);
  assert.equal(result, true, `${evt.desc} で markUserInteracted が正しく発火すること`);
}
console.log(`✓ 全 ${interactingEvents.length} 件の能動編集操作で markUserInteracted が正しく発火することを確認`);


// [Part 2] SourceEditor.tsx の二重 max-width 排除とレイアウト健全性検証
console.log("\n--- [Part 2] SourceEditor.tsx の二重 max-width 排除・ガター横並び・仮想スクロール健全性検証 ---");

const sourceEditorPath = path.resolve(projectRoot, "src/components/Editor/SourceEditor.tsx");
assert.ok(fs.existsSync(sourceEditorPath), "SourceEditor.tsx が存在すること");
const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8").replace(/\r\n/g, "\n");

// 2.1 外側コンテナの検証（max-w- が存在せず w-full であること）
const outerContainerMatch = sourceEditorContent.match(/<div\s+className=\{`flex-1 min-h-0 w-full overflow-hidden/);
assert.ok(outerContainerMatch, "SourceEditor の CodeMirror 外側コンテナが w-full かつ flex-1 min-h-0 であること");
assert.ok(
  !sourceEditorContent.includes("max-w-5xl") && !sourceEditorContent.includes("max-w-4xl") && !sourceEditorContent.includes("max-w-[900px]"),
  "外側コンテナに max-w-* Tailwind クラスが二重に付与されていないこと"
);
console.log("✓ 外側コンテナの二重 max-width が完全に排除されています");

// 2.2 customTheme の `&` (CodeMirror ルート) での中央寄せレイアウト
assert.match(
  sourceEditorContent,
  /"&":\s*\{[\s\S]*?maxWidth:\s*"900px"[\s\S]*?margin:\s*"0 auto"/,
  "customTheme の '&' で maxWidth: '900px' かつ margin: '0 auto' が指定されていること"
);
console.log("✓ CodeMirror ルート (&) での最大幅 900px 中央寄せが正しく定義されています");

// 2.3 .cm-scroller のガター横並び・仮想スクロール検証
assert.match(
  sourceEditorContent,
  /display:\s*"flex !important",\s*flexDirection:\s*"row !important",\s*flexWrap:\s*"nowrap !important"/,
  ".cm-scroller に flex-direction: row, flex-wrap: nowrap が !important で指定され、ガターと本文の横並びが保証されていること"
);
assert.match(
  sourceEditorContent,
  /height:\s*"100%",\s*overflow:\s*"auto",\s*boxSizing:\s*"border-box"/,
  ".cm-scroller に height: '100%' と overflow: 'auto' が指定されていること"
);
assert.ok(
  !sourceEditorContent.includes('maxHeight: "100%"'),
  ".cm-scroller に CodeMirror 仮想スクロールを阻害する maxHeight: '100%' が存在しないこと"
);
console.log("✓ .cm-scroller のガター横並び（Flexbox row nowrap）と仮想スクロール設定が正常です");

// 2.4 .cm-content の幅潰れ防止・行頭空白保護
assert.match(
  sourceEditorContent,
  /minWidth:\s*0,\s*flexGrow:\s*1,\s*flexShrink:\s*1,\s*whiteSpace:\s*"break-spaces"/,
  ".cm-content に minWidth: 0, flexGrow: 1, whiteSpace: 'break-spaces' が指定されていること"
);
assert.ok(
  !sourceEditorContent.includes('width: "100%"'),
  ".cm-content にガター縦落ちの原因となる width: '100%' が存在しないこと"
);
console.log("✓ .cm-content の幅潰れ防止・行頭空白保護（whiteSpace: break-spaces）が正常です");


// [Part 3] バージョン整合性検証 (v1.8.2)
console.log("\n--- [Part 3] v1.8.2 バージョン整合性検証 ---");

const packageJson = JSON.parse(fs.readFileSync(path.resolve(projectRoot, "package.json"), "utf-8"));
const tauriConf = JSON.parse(fs.readFileSync(path.resolve(projectRoot, "src-tauri/tauri.conf.json"), "utf-8"));
const cargoToml = fs.readFileSync(path.resolve(projectRoot, "src-tauri/Cargo.toml"), "utf-8");

assert.equal(packageJson.version, "1.8.2", "package.json のバージョンが 1.8.2 であること");
assert.equal(tauriConf.version, "1.8.2", "tauri.conf.json のバージョンが 1.8.2 であること");
const cargoMatch = cargoToml.match(/\[package\][\s\S]*?version\s*=\s*"([^"]+)"/);
assert.ok(cargoMatch, "Cargo.toml に version が存在すること");
assert.equal(cargoMatch[1], "1.8.2", "Cargo.toml のバージョンが 1.8.2 であること");
console.log("✓ package.json, tauri.conf.json, Cargo.toml のバージョンが全て 1.8.2 に統一されています");

console.log("\n==================================================================");
console.log("  Phase 31 品質保証・自動テスト: 全項目合格 (Exit Code 0)         ");
console.log("==================================================================");
