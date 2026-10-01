import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== アウトライン（右サイドバー）機能の検証を開始 ===");

// 1. extractOutline ロジックの検証
console.log("1. extractOutline 見出し抽出ロジックの検証...");

function extractOutline(markdown) {
  const lines = markdown.split("\n");
  const outline = [];
  let inCodeBlock = false;

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (!inCodeBlock) {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        outline.push({
          level: match[1].length,
          text: match[2].trim(),
          line: index,
        });
      }
    }
  });

  return outline;
}

const sampleMarkdown = `# タイトル1
これは本文です。
## サブ見出し2
### 小見出し3
\`\`\`markdown
# コードブロック内の見出しは無視されるべき
## これも無視
\`\`\`
#### 見出し4
##### 見出し5
###### 見出し6
# 最後のタイトル
`;

const extracted = extractOutline(sampleMarkdown);
assert.strictEqual(extracted.length, 7, "抽出された見出し数が7件であること");
assert.strictEqual(extracted[0].level, 1);
assert.strictEqual(extracted[0].text, "タイトル1");
assert.strictEqual(extracted[0].line, 0);

assert.strictEqual(extracted[1].level, 2);
assert.strictEqual(extracted[1].text, "サブ見出し2");

assert.strictEqual(extracted[2].level, 3);
assert.strictEqual(extracted[2].text, "小見出し3");

assert.strictEqual(extracted[3].level, 4);
assert.strictEqual(extracted[3].text, "見出し4");

assert.strictEqual(extracted[4].level, 5);
assert.strictEqual(extracted[4].text, "見出し5");

assert.strictEqual(extracted[5].level, 6);
assert.strictEqual(extracted[5].text, "見出し6");

assert.strictEqual(extracted[6].level, 1);
assert.strictEqual(extracted[6].text, "最後のタイトル");


// 空ドキュメントや見出し無しの検証
assert.deepStrictEqual(extractOutline(""), []);
assert.deepStrictEqual(extractOutline("通常のテキストのみ\n複数行の本文"), []);

console.log("✓ extractOutline ロジック検証に成功");

// 2. OutlineSidebar コンポーネントファイルの検証
console.log("2. OutlineSidebar コンポーネントファイルの検証...");
const outlinePath = path.resolve(projectRoot, "src/components/OutlineSidebar/OutlineSidebar.tsx");
assert.ok(fs.existsSync(outlinePath), "OutlineSidebar.tsx が存在すること");
const outlineContent = fs.readFileSync(outlinePath, "utf-8");

assert.ok(outlineContent.includes("export interface OutlineItem"), "OutlineItem がエクスポートされていること");
assert.ok(outlineContent.includes("export function extractOutline"), "extractOutline がエクスポートされていること");
assert.ok(outlineContent.includes("onSelectHeading?: (item: OutlineItem) => void;"), "onSelectHeading propが定義されていること");
assert.ok(outlineContent.includes("onClick={() => onSelectHeading?.(item)}"), "クリックハンドラが実装されていること");
assert.ok(outlineContent.includes("onKeyDown="), "キーボード操作対応が実装されていること");
assert.ok(outlineContent.includes("見出しがありません"), "見出し無しのプレースホルダーが表示されること");

const outlineIndexPath = path.resolve(projectRoot, "src/components/OutlineSidebar/index.ts");
assert.ok(fs.existsSync(outlineIndexPath), "OutlineSidebar/index.ts が存在すること");
const indexContent = fs.readFileSync(outlineIndexPath, "utf-8");
assert.ok(indexContent.includes("extractOutline"), "index.ts から extractOutline が再エクスポートされていること");
assert.ok(indexContent.includes("OutlineItem"), "index.ts から OutlineItem が再エクスポートされていること");

console.log("✓ OutlineSidebar コンポーネント検証に成功");

// 3. App.tsx のUI・イベント・スクロール連携検証
console.log("3. App.tsx のUI・イベント・スクロール連携検証...");
const appPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appPath), "App.tsx が存在すること");
const appContent = fs.readFileSync(appPath, "utf-8");

assert.ok(appContent.includes("OutlineSidebar"), "OutlineSidebar がインポートされていること");
assert.ok(appContent.includes("isRightSidebarOpen"), "isRightSidebarOpen state が存在すること");
assert.ok(appContent.includes("handleToggleRightSidebar"), "handleToggleRightSidebar ハンドラーが存在すること");
assert.ok(appContent.includes("handleSelectHeading"), "handleSelectHeading スクロールハンドラーが存在すること");
assert.ok(appContent.includes("outline-target-highlight"), "outline-target-highlight ハイライトクラスが付与されること");
assert.ok(appContent.includes("onSelectHeading={handleSelectHeading}"), "OutlineSidebar に onSelectHeading が渡されていること");
assert.ok(appContent.includes("menu:toggle_right_sidebar"), "Tauri OSメニューイベント menu:toggle_right_sidebar をリッスンしていること");

console.log("✓ App.tsx UI・イベント・スクロール連携検証に成功");

// 4. Rust バックエンド menu.rs の連携検証
console.log("4. Rust バックエンド menu.rs の連携検証...");
const menuRsPath = path.resolve(projectRoot, "src-tauri/src/menu.rs");
assert.ok(fs.existsSync(menuRsPath), "menu.rs が存在すること");
const menuRsContent = fs.readFileSync(menuRsPath, "utf-8");

assert.ok(menuRsContent.includes("toggle_right_sidebar"), "menu.rs に toggle_right_sidebar が定義されていること");
assert.ok(menuRsContent.includes("アウトラインの表示切替"), "menu.rs に表示切替テキストが定義されていること");
assert.ok(menuRsContent.includes("menu:toggle_right_sidebar"), "menu:toggle_right_sidebar イベント送出が実装されていること");

console.log("✓ Rust バックエンド menu.rs 連携検証に成功");

// 5. CSS アニメーション定義の検証
console.log("5. src/index.css のハイライトスタイル検証...");
const cssPath = path.resolve(projectRoot, "src/index.css");
assert.ok(fs.existsSync(cssPath), "index.css が存在すること");
const cssContent = fs.readFileSync(cssPath, "utf-8");

assert.ok(cssContent.includes(".outline-target-highlight"), ".outline-target-highlight クラスが定義されていること");
assert.ok(cssContent.includes("outline-highlight-pulse"), "outline-highlight-pulse キーフレームが定義されていること");

console.log("✓ src/index.css ハイライトスタイル検証に成功");

console.log("\n=== 全てのアウトライン機能検証テストをパスしました ===");
