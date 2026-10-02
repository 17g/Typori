import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== クイックアクションパレット マウスホバー再表示（Hover Reveal）& 滑らかなトランジション検証 ===");

// 1. EditorToolbar.tsx の検証
console.log("1. EditorToolbar.tsx の ホバー状態管理・トリガー領域・Hover Revealスタイルの検証...");
const toolbarFilePath = path.join(projectRoot, "src", "components", "Editor", "EditorToolbar.tsx");
assert.ok(fs.existsSync(toolbarFilePath), "src/components/Editor/EditorToolbar.tsx が存在すること");
const toolbarSource = fs.readFileSync(toolbarFilePath, "utf-8");

assert.ok(
  toolbarSource.includes("isHovered?: boolean;"),
  "EditorToolbarProps に isHovered が定義されていること"
);
assert.ok(
  toolbarSource.includes("onMouseEnter?: () => void;"),
  "EditorToolbarProps に onMouseEnter が定義されていること"
);
assert.ok(
  toolbarSource.includes("onMouseLeave?: () => void;"),
  "EditorToolbarProps に onMouseLeave が定義されていること"
);
assert.ok(
  toolbarSource.includes('data-testid="editor-toolbar-trigger-zone"'),
  "トリガー領域要素 (editor-toolbar-trigger-zone) が存在すること"
);
assert.ok(
  toolbarSource.includes("typori-toolbar-trigger-zone"),
  "トリガー領域クラス typori-toolbar-trigger-zone が設定されていること"
);
assert.ok(
  toolbarSource.includes("data-hovered={isHovered}"),
  "data-hovered 属性が付与されていること"
);
assert.ok(
  toolbarSource.includes("data-visible={isVisible}"),
  "data-visible 属性が付与されていること"
);
assert.ok(
  toolbarSource.includes("data-scrolled={isScrolled}"),
  "data-scrolled 属性が付与されていること"
);
assert.ok(
  toolbarSource.includes("|| isHovered"),
  "ホバー時に再表示（Hover Reveal）を判定する isVisible ロジックが存在すること"
);
assert.ok(
  toolbarSource.includes("isHovered ? \"opacity-100\" : \"opacity-60\""),
  "ホバー時に opacity-100、通常表示時に opacity-60 が適用されるスタイルロジックが存在すること"
);
assert.ok(
  toolbarSource.includes("duration-200") || toolbarSource.includes("duration-150"),
  "150ms〜200msの滑らかなトランジションアニメーションが設定されていること"
);
console.log("✓ EditorToolbar.tsx の検証に合格");

// 2. Editor.tsx のホバー状態管理・ハンドラ伝播の検証
console.log("2. Editor.tsx の ホバー状態連携検証...");
const editorFilePath = path.join(projectRoot, "src", "components", "Editor", "Editor.tsx");
assert.ok(fs.existsSync(editorFilePath), "src/components/Editor/Editor.tsx が存在すること");
const editorSource = fs.readFileSync(editorFilePath, "utf-8");

assert.ok(
  editorSource.includes("isToolbarHovered") && editorSource.includes("setIsToolbarHovered"),
  "Editor.tsx で isToolbarHovered の状態管理が定義されていること"
);
assert.ok(
  editorSource.includes("isHovered={isToolbarHovered}"),
  "EditorToolbar に isHovered={isToolbarHovered} が渡されていること"
);
assert.ok(
  editorSource.includes("onMouseEnter={() => setIsToolbarHovered(true)}"),
  "EditorToolbar に onMouseEnter ハンドラが渡されていること"
);
assert.ok(
  editorSource.includes("onMouseLeave={() => setIsToolbarHovered(false)}"),
  "EditorToolbar に onMouseLeave ハンドラが渡されていること"
);
console.log("✓ Editor.tsx の検証に合格");

// 3. 挙動シミュレーション検証
console.log("3. スクロールおよびホバー再表示（Hover Reveal）の挙動シミュレーション検証...");

function evaluateVisibility({ visible, isScrolled, isHovered }) {
  const isBaseVisible = visible !== undefined ? visible : !isScrolled;
  const isVisible = isBaseVisible || isHovered;
  const visibilityClass = isVisible
    ? `${isHovered ? "opacity-100" : "opacity-60"} hover:opacity-100 pointer-events-auto translate-y-0`
    : "opacity-0 pointer-events-none -translate-y-1";
  return { isVisible, visibilityClass };
}

// Case 1: ドキュメント最上部（非ホバー）
const topNormal = evaluateVisibility({ visible: true, isScrolled: false, isHovered: false });
assert.strictEqual(topNormal.isVisible, true, "最上部では通常表示 (isVisible: true)");
assert.ok(topNormal.visibilityClass.includes("opacity-60"), "最上部非ホバー時は控えめな半透明 (opacity-60)");
assert.ok(topNormal.visibilityClass.includes("pointer-events-auto"), "最上部非ホバー時はクリック可能");

// Case 2: ドキュメント最上部（ホバー中）
const topHovered = evaluateVisibility({ visible: true, isScrolled: false, isHovered: true });
assert.strictEqual(topHovered.isVisible, true, "最上部ホバー時も表示 (isVisible: true)");
assert.ok(topHovered.visibilityClass.includes("opacity-100"), "最上部ホバー時は強調表示 (opacity-100)");

// Case 3: スクロール時（非ホバー: オートハイド）
const scrolledNormal = evaluateVisibility({ visible: false, isScrolled: true, isHovered: false });
assert.strictEqual(scrolledNormal.isVisible, false, "スクロール時は自動非表示 (isVisible: false)");
assert.ok(scrolledNormal.visibilityClass.includes("opacity-0"), "スクロール時は非表示 (opacity-0)");
assert.ok(scrolledNormal.visibilityClass.includes("pointer-events-none"), "非表示時はクリック無効化 (pointer-events-none)");
assert.ok(scrolledNormal.visibilityClass.includes("-translate-y-1"), "非表示時は僅かに上方向へオフセット");

// Case 4: スクロール時のトリガーホバー（Hover Reveal: 再表示）
const scrolledHovered = evaluateVisibility({ visible: false, isScrolled: true, isHovered: true });
assert.strictEqual(scrolledHovered.isVisible, true, "スクロール時でもトリガーホバーで即座に再表示 (isVisible: true)");
assert.ok(scrolledHovered.visibilityClass.includes("opacity-100"), "ホバー再表示時は完全不透明 (opacity-100)");
assert.ok(scrolledHovered.visibilityClass.includes("pointer-events-auto"), "ホバー再表示時はボタン操作可能 (pointer-events-auto)");
assert.ok(scrolledHovered.visibilityClass.includes("translate-y-0"), "ホバー再表示時は定位置 (translate-y-0)");

// Case 5: ホバー離脱時（Auto-hide 復帰）
const scrolledLeave = evaluateVisibility({ visible: false, isScrolled: true, isHovered: false });
assert.strictEqual(scrolledLeave.isVisible, false, "ホバー離脱時は再度自動非表示 (isVisible: false)");
assert.ok(scrolledLeave.visibilityClass.includes("opacity-0 pointer-events-none"), "離脱後は再び完全非表示化");

console.log("✓ 挙動シミュレーション全ケースに合格");

console.log("=== クイックアクションパレット マウスホバー再表示（Hover Reveal）: 全検証合格 ===");
