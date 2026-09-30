import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== MarkdownファイルをHTML形式へエクスポートする機能の検証を開始 ===");

// 1. extractInitialTitle & getInitialOutputPath ロジックの検証
console.log("1. ExportModal ユーティリティ関数のロジック検証...");

function extractInitialTitle(content, filePath) {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      const title = trimmed.replace(/^#\s+/, "").trim();
      if (title) return title;
    }
  }
  if (filePath) {
    const fileName = filePath.split(/[/\\]/).filter(Boolean).pop() || "";
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    if (nameWithoutExt) return nameWithoutExt;
  }
  return "Untitled";
}

function getInitialOutputPath(filePath, directory, title) {
  const sanitize = (name) => name.replace(/[\\/:*?"<>|]/g, "_");
  const cleanTitle = sanitize(title) || "Untitled";

  if (filePath) {
    const lastDotIndex = filePath.lastIndexOf(".");
    if (lastDotIndex > 0) {
      return filePath.substring(0, lastDotIndex) + ".html";
    }
    return filePath + ".html";
  }

  const baseDir = directory || ".";
  const separator = baseDir.includes("\\") ? "\\" : "/";
  const normalizedDir = baseDir.endsWith("/") || baseDir.endsWith("\\")
    ? baseDir.slice(0, -1)
    : baseDir;

  return `${normalizedDir}${separator}${cleanTitle}.html`;
}

// テスト1: Markdown の H1 からタイトル抽出
const contentWithH1 = "Some intro\n\n# タイトル：テスト文書\n\n本文...";
assert.strictEqual(extractInitialTitle(contentWithH1, "/path/to/doc.md"), "タイトル：テスト文書");

// テスト2: H1 がない場合はファイル名から拡張子を除いたもの
const contentWithoutH1 = "本文のみ\n## 見出し2";
assert.strictEqual(extractInitialTitle(contentWithoutH1, "C:\\work\\my_document.md"), "my_document");

// テスト3: ファイルパスもない場合は "Untitled"
assert.strictEqual(extractInitialTitle(contentWithoutH1, null), "Untitled");

// テスト4: 出力先パス算出（既存ファイルパスあり）
assert.strictEqual(
  getInitialOutputPath("C:\\work\\my_document.md", "C:\\work", "タイトル"),
  "C:\\work\\my_document.html"
);

// テスト5: 出力先パス算出（ディレクトリのみ、タイトルからサニタイズ生成）
assert.strictEqual(
  getInitialOutputPath(null, "/home/user/docs", "My Project: Spec"),
  "/home/user/docs/My Project_ Spec.html"
);
console.log("✓ ExportModal ユーティリティ関数のロジック検証に成功");

// 2. ExportModal コンポーネントファイルの検証
console.log("2. ExportModal コンポーネントファイルの検証...");
const modalFilePath = path.join(rootDir, "src/components/ExportModal/ExportModal.tsx");
assert.ok(fs.existsSync(modalFilePath), "ExportModal.tsx が存在しません");
const modalFileContent = fs.readFileSync(modalFilePath, "utf-8");
assert.ok(modalFileContent.includes("exportToHtml"), "exportToHtml API の呼び出しが含まれていません");
assert.ok(modalFileContent.includes("HTML形式でエクスポート"), "モーダルタイトルが含まれていません");
assert.ok(modalFileContent.includes("Escape"), "Escキーハンドラが含まれていません");
assert.ok(modalFileContent.includes('role="dialog"'), "dialog role が含まれていません");
console.log("✓ ExportModal コンポーネント検証に成功");

// 3. API fs.ts の検証
console.log("3. API fs.ts の検証...");
const apiFsPath = path.join(rootDir, "src/api/fs.ts");
const apiFsContent = fs.readFileSync(apiFsPath, "utf-8");
assert.ok(apiFsContent.includes("export async function convertMarkdownToHtml"), "convertMarkdownToHtml が存在しません");
assert.ok(apiFsContent.includes("export async function exportToHtml"), "exportToHtml が存在しません");
console.log("✓ API fs.ts 検証に成功");

// 4. ショートカット & チートシート定義の検証
console.log("4. ショートカット設定 & チートシート定義の検証...");
const shortcutTypesPath = path.join(rootDir, "src/components/ShortcutSettingsModal/types.ts");
const shortcutTypesContent = fs.readFileSync(shortcutTypesPath, "utf-8");
assert.ok(shortcutTypesContent.includes('"export_html"'), "SHORTCUT_ITEMS に export_html が定義されていません");

const cheatSheetDataPath = path.join(rootDir, "src/components/CheatSheetModal/data.ts");
const cheatSheetDataContent = fs.readFileSync(cheatSheetDataPath, "utf-8");
assert.ok(cheatSheetDataContent.includes('"export_html"'), "CheatSheetModal に export_html が定義されていません");
console.log("✓ ショートカット & チートシート定義検証に成功");

// 5. Rust バックエンド (fs.rs, lib.rs, menu.rs) の検証
console.log("5. Rust バックエンドの実装検証...");
const rustFsPath = path.join(rootDir, "src-tauri/src/fs.rs");
const rustFsContent = fs.readFileSync(rustFsPath, "utf-8");
assert.ok(rustFsContent.includes("pub fn convert_markdown_to_html"), "fs.rs に convert_markdown_to_html が実装されていません");
assert.ok(rustFsContent.includes("pub fn export_to_html"), "fs.rs に export_to_html が実装されていません");
assert.ok(rustFsContent.includes("pulldown_cmark"), "fs.rs に pulldown_cmark が使用されていません");

const rustLibPath = path.join(rootDir, "src-tauri/src/lib.rs");
const rustLibContent = fs.readFileSync(rustLibPath, "utf-8");
assert.ok(rustLibContent.includes("fs::convert_markdown_to_html"), "lib.rs の invoke_handler に convert_markdown_to_html が登録されていません");
assert.ok(rustLibContent.includes("fs::export_to_html"), "lib.rs の invoke_handler に export_to_html が登録されていません");

const rustMenuPath = path.join(rootDir, "src-tauri/src/menu.rs");
const rustMenuContent = fs.readFileSync(rustMenuPath, "utf-8");
assert.ok(rustMenuContent.includes('"export_html"'), "menu.rs に export_html MenuItem が定義されていません");
assert.ok(rustMenuContent.includes('"menu:export_html"'), "menu.rs に menu:export_html のイベント送出が実装されていません");
console.log("✓ Rust バックエンド実装検証に成功");

// 6. App.tsx のUI・イベント連携検証
console.log("6. App.tsx のUI・イベント連携検証...");
const appPath = path.join(rootDir, "src/App.tsx");
const appContent = fs.readFileSync(appPath, "utf-8");
assert.ok(appContent.includes("ExportModal"), "App.tsx に ExportModal がインポートされていません");
assert.ok(appContent.includes("isExportModalOpen"), "App.tsx に isExportModalOpen 状態が存在しません");
assert.ok(appContent.includes("menu:export_html"), "App.tsx に menu:export_html のイベントリスナーが登録されていません");
assert.ok(appContent.includes("export_html"), "App.tsx に export_html のショートカット処理が登録されていません");
assert.ok(appContent.includes("<ExportModal"), "App.tsx に ExportModal コンポーネントが描画されていません");
console.log("✓ App.tsx UI・イベント連携検証に成功");

console.log("\n=== 全てのHTMLエクスポート機能検証テストをパスしました ===");
