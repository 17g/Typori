import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== クイックアクションパレット スクロール時オートハイド & 最上部再表示ロジック検証 ===");

// 1. EditorToolbar.tsx の検証
console.log("1. EditorToolbar.tsx の props と可視性・スタイリングロジックの検証...");
const toolbarFilePath = path.join(projectRoot, "src", "components", "Editor", "EditorToolbar.tsx");
assert.ok(fs.existsSync(toolbarFilePath), "src/components/Editor/EditorToolbar.tsx が存在すること");
const toolbarSource = fs.readFileSync(toolbarFilePath, "utf-8");

assert.ok(
  toolbarSource.includes("isScrolled?: boolean;"),
  "EditorToolbarProps に isScrolled が定義されていること"
);
assert.ok(
  toolbarSource.includes("visible?: boolean;"),
  "EditorToolbarProps に visible が定義されていること"
);
assert.ok(
  toolbarSource.includes("visible !== undefined ? visible : !isScrolled"),
  "isVisible の判定ロジックが存在すること"
);
assert.ok(
  toolbarSource.includes("opacity-0") && toolbarSource.includes("pointer-events-none"),
  "非表示時に opacity-0 と pointer-events-none が適用されること"
);
assert.ok(
  toolbarSource.includes("opacity-60") && toolbarSource.includes("hover:opacity-100"),
  "表示時に通常半透明 (opacity-60) かつホバー強調 (hover:opacity-100) が適用されること"
);
assert.ok(
  toolbarSource.includes("duration-200"),
  "150ms〜200msのトランジションアニメーションクラスが設定されていること"
);
assert.ok(
  toolbarSource.includes("data-visible={isVisible}"),
  "data-visible 属性が付与されていること"
);
assert.ok(
  toolbarSource.includes("data-scrolled={isScrolled}"),
  "data-scrolled 属性が付与されていること"
);
console.log("✓ EditorToolbar.tsx の検証に合格");

// 2. Editor.tsx のスクロール監視とオートハイド状態管理の検証
console.log("2. Editor.tsx のスクロール状態管理 & イベント連携の検証...");
const editorFilePath = path.join(projectRoot, "src", "components", "Editor", "Editor.tsx");
assert.ok(fs.existsSync(editorFilePath), "src/components/Editor/Editor.tsx が存在すること");
const editorSource = fs.readFileSync(editorFilePath, "utf-8");

assert.ok(
  editorSource.includes("isScrolled") && editorSource.includes("setIsScrolled"),
  "Editor.tsx で isScrolled の状態管理 (useState) が定義されていること"
);
assert.ok(
  editorSource.includes("SCROLL_TOP_THRESHOLD") || editorSource.includes("scrollTop >"),
  "スクロール量に応じた閾値判定ロジックが存在すること"
);
assert.ok(
  editorSource.includes("handleScroll"),
  "スクロールイベントハンドラー handleScroll が定義されていること"
);
assert.ok(
  editorSource.includes("onScroll={handleScroll}"),
  "typori-editor-wrapper に onScroll={handleScroll} が設定されていること"
);
assert.ok(
  editorSource.includes("isScrolled={isScrolled}"),
  "EditorToolbar に isScrolled が渡されていること"
);
assert.ok(
  editorSource.includes("visible={!isScrolled}"),
  "EditorToolbar に visible={!isScrolled} が渡されていること"
);
console.log("✓ Editor.tsx のスクロール監視とオートハイド状態管理の検証に合格");

console.log("=== クイックアクションパレット スクロール時オートハイド & 最上部再表示: 全検証合格 ===");
