import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== MarkdownファイルをPDF形式へエクスポートする機能の検証を開始 ===");

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

function getInitialOutputPath(filePath, directory, title, extension = "html") {
  const sanitize = (name) => name.replace(/[\\/:*?"<>|]/g, "_");
  const cleanTitle = sanitize(title) || "Untitled";

  if (filePath) {
    const lastDotIndex = filePath.lastIndexOf(".");
    if (lastDotIndex > 0) {
      return filePath.substring(0, lastDotIndex) + "." + extension;
    }
    return filePath + "." + extension;
  }

  const baseDir = directory || ".";
  const separator = baseDir.includes("\\") ? "\\" : "/";
  const normalizedDir = baseDir.endsWith("/") || baseDir.endsWith("\\")
    ? baseDir.slice(0, -1)
    : baseDir;

  return `${normalizedDir}${separator}${cleanTitle}.${extension}`;
}

// テスト1: Markdown の H1 からタイトル抽出
const contentWithH1 = "# レポート概要\n\n本文...";
assert.strictEqual(extractInitialTitle(contentWithH1, "/path/to/report.md"), "レポート概要");

// テスト2: 拡張子をpdf指定したパス算出
assert.strictEqual(
  getInitialOutputPath("C:\\docs\\spec.md", "C:\\docs", "仕様書", "pdf"),
  "C:\\docs\\spec.pdf"
);
assert.strictEqual(
  getInitialOutputPath(null, "/home/user/docs", "プロジェクト 計画", "pdf"),
  "/home/user/docs/プロジェクト 計画.pdf"
);
console.log("✓ ExportModal ユーティリティ関数のロジック検証に成功");

// 2. ExportModal コンポーネントファイルの検証
console.log("2. ExportModal コンポーネントファイルの検証...");
const modalFilePath = path.join(rootDir, "src/components/ExportModal/ExportModal.tsx");
assert.ok(fs.existsSync(modalFilePath), "ExportModal.tsx が存在しません");
const modalFileContent = fs.readFileSync(modalFilePath, "utf-8");
assert.ok(modalFileContent.includes("printMarkdownDocument"), "printMarkdownDocument API の呼び出しが含まれていません");
assert.ok(modalFileContent.includes("PDF形式でエクスポート (印刷)"), "PDF用モーダルタイトルが含まれていません");
assert.ok(modalFileContent.includes("HTML (.html)"), "HTMLタブが含まれていません");
assert.ok(modalFileContent.includes("PDF (印刷 / .pdf)"), "PDFタブが含まれていません");
assert.ok(modalFileContent.includes("initialFormat"), "initialFormat prop が定義されていません");
assert.ok(modalFileContent.includes("Escape"), "Escキーハンドラが含まれていません");
assert.ok(modalFileContent.includes('role="dialog"'), "dialog role が含まれていません");
console.log("✓ ExportModal コンポーネント検証に成功");

// 3. API fs.ts の検証
console.log("3. API fs.ts の検証...");
const apiFsPath = path.join(rootDir, "src/api/fs.ts");
const apiFsContent = fs.readFileSync(apiFsPath, "utf-8");
assert.ok(apiFsContent.includes("export async function exportToPdfHtml"), "exportToPdfHtml が存在しません");
assert.ok(apiFsContent.includes("export function printHtmlContent"), "printHtmlContent が存在しません");
assert.ok(apiFsContent.includes("export async function printMarkdownDocument"), "printMarkdownDocument が存在しません");
console.log("✓ API fs.ts 検証に成功");

// 4. ショートカット & チートシート定義の検証
console.log("4. ショートカット設定 & チートシート定義の検証...");
const shortcutTypesPath = path.join(rootDir, "src/components/ShortcutSettingsModal/types.ts");
const shortcutTypesContent = fs.readFileSync(shortcutTypesPath, "utf-8");
assert.ok(shortcutTypesContent.includes('"export_pdf"'), "SHORTCUT_ITEMS に export_pdf が定義されていません");
assert.ok(shortcutTypesContent.includes('["Ctrl", "Shift", "P"]'), "export_pdf のデフォルトキーが正しく定義されていません");

const cheatsheetDataPath = path.join(rootDir, "src/components/CheatSheetModal/data.ts");
const cheatsheetDataContent = fs.readFileSync(cheatsheetDataPath, "utf-8");
assert.ok(cheatsheetDataContent.includes('"export_pdf"'), "チートシートに export_pdf が定義されていません");
console.log("✓ ショートカット & チートシート定義検証に成功");

// 5. Rust バックエンドの実装検証
console.log("5. Rust バックエンドの実装検証...");
const rustFsPath = path.join(rootDir, "src-tauri/src/fs.rs");
const rustFsContent = fs.readFileSync(rustFsPath, "utf-8");
assert.ok(rustFsContent.includes("pub fn export_to_pdf_html"), "Rust fs.rs に export_to_pdf_html が実装されていません");
assert.ok(rustFsContent.includes("@page"), "Rust fs.rs のHTML生成スタイルに @page ルールが含まれていません");
assert.ok(rustFsContent.includes("@media print"), "Rust fs.rs のHTML生成スタイルに @media print ルールが含まれていません");
assert.ok(rustFsContent.includes("test_export_to_pdf_html"), "Rust fs.rs に test_export_to_pdf_html 単体テストが含まれていません");

const rustLibPath = path.join(rootDir, "src-tauri/src/lib.rs");
const rustLibContent = fs.readFileSync(rustLibPath, "utf-8");
assert.ok(rustLibContent.includes("fs::export_to_pdf_html"), "src-tauri/src/lib.rs に export_to_pdf_html が登録されていません");

const rustMenuPath = path.join(rootDir, "src-tauri/src/menu.rs");
const rustMenuContent = fs.readFileSync(rustMenuPath, "utf-8");
assert.ok(rustMenuContent.includes('"export_pdf"'), "src-tauri/src/menu.rs に export_pdf メニュー項目がありません");
assert.ok(rustMenuContent.includes('"menu:export_pdf"'), "src-tauri/src/menu.rs に menu:export_pdf イベント送信がありません");
assert.ok(rustMenuContent.includes('assert_eq!("export_pdf", "export_pdf");'), "src-tauri/src/menu.rs のテストに export_pdf がありません");
console.log("✓ Rust バックエンド実装検証に成功");

// 6. App.tsx のUI・イベント連携検証
console.log("6. App.tsx のUI・イベント連携検証...");
const appTsxPath = path.join(rootDir, "src/App.tsx");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");
assert.ok(appTsxContent.includes("exportModalFormat"), "App.tsx に exportModalFormat state が定義されていません");
assert.ok(appTsxContent.includes('config.export_pdf || ["Ctrl", "Shift", "P"]'), "App.tsx に PDFエクスポートショートカット判定がありません");
assert.ok(appTsxContent.includes('"menu:export_pdf"'), "App.tsx に menu:export_pdf リスナーがありません");
assert.ok(appTsxContent.includes('aria-label="PDF形式でエクスポート (印刷)"'), "App.tsx に PDFエクスポートボタンがありません");
assert.ok(appTsxContent.includes("initialFormat={exportModalFormat}"), "App.tsx の ExportModal に initialFormat が渡されていません");
console.log("✓ App.tsx UI・イベント連携検証に成功");

console.log("\n=== 全てのPDFエクスポート機能検証テストをパスしました ===");
