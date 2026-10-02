import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== クイックアクションパレット DOM配置独立化 & 右サイドバー連動オフセット検証 ===");

// 1. EditorToolbar.tsx の検証
console.log("1. EditorToolbar.tsx の props とオフセット調整ロジックの検証...");
const toolbarFilePath = path.join(projectRoot, "src", "components", "Editor", "EditorToolbar.tsx");
const toolbarSource = fs.readFileSync(toolbarFilePath, "utf-8");

assert.ok(
  toolbarSource.includes("isRightSidebarOpen?: boolean;"),
  "EditorToolbarProps に isRightSidebarOpen が定義されていること"
);
assert.ok(
  toolbarSource.includes("rightOffsetClass") && toolbarSource.includes("isRightSidebarOpen ?"),
  "isRightSidebarOpen に応じて rightOffsetClass が切り替わるロジックが存在すること"
);
assert.ok(
  toolbarSource.includes('data-testid="editor-toolbar"'),
  'data-testid="editor-toolbar" 属性が付与されていること'
);
assert.ok(
  toolbarSource.includes("data-right-sidebar-open="),
  "data-right-sidebar-open 属性が付与されていること"
);
console.log("✓ EditorToolbar.tsx の検証に合格");

// 2. Editor.tsx の DOM 独立化検証
console.log("2. Editor.tsx の DOM 独立配置 & props リレー検証...");
const editorFilePath = path.join(projectRoot, "src", "components", "Editor", "Editor.tsx");
const editorSource = fs.readFileSync(editorFilePath, "utf-8");

assert.ok(
  editorSource.includes("isRightSidebarOpen?: boolean;"),
  "EditorProps に isRightSidebarOpen が定義されていること"
);
assert.ok(
  editorSource.includes("isRightSidebarOpen = false"),
  "MilkdownEditorContent の引数で isRightSidebarOpen が受け取られていること"
);
assert.ok(
  editorSource.includes('className="typori-editor-root'),
  "最上位親コンテナとして typori-editor-root が存在すること"
);

// typori-editor-root 内で EditorToolbar が typori-editor-wrapper の前に配置されているか確認
const rootIndex = editorSource.indexOf('className="typori-editor-root');
const toolbarIndex = editorSource.indexOf("<EditorToolbar", rootIndex);
const wrapperIndex = editorSource.indexOf('className={`typori-editor-wrapper', rootIndex);

assert.ok(rootIndex !== -1, "typori-editor-root が見つかること");
assert.ok(toolbarIndex !== -1, "EditorToolbar が見つかること");
assert.ok(wrapperIndex !== -1, "typori-editor-wrapper が見つかること");
assert.ok(
  toolbarIndex < wrapperIndex,
  "EditorToolbar がスクロールコンテナ typori-editor-wrapper の外部（前）に独立配置されていること"
);
assert.ok(
  editorSource.includes("isRightSidebarOpen={isRightSidebarOpen}"),
  "Editor.tsx から EditorToolbar へ isRightSidebarOpen が渡されていること"
);
console.log("✓ Editor.tsx の DOM 独立化検証に合格");

// 3. App.tsx の TyporiEditor 呼び出し検証
console.log("3. App.tsx からの isRightSidebarOpen 伝播検証...");
const appFilePath = path.join(projectRoot, "src", "App.tsx");
const appSource = fs.readFileSync(appFilePath, "utf-8");

assert.ok(
  appSource.includes("<TyporiEditor") && appSource.includes("isRightSidebarOpen={isRightSidebarOpen}"),
  "App.tsx から TyporiEditor へ isRightSidebarOpen が伝播されていること"
);
console.log("✓ App.tsx の伝播検証に合格");

console.log("=== クイックアクションパレット DOM配置独立化 & 自動オフセット調整: 全検証合格 ===");
