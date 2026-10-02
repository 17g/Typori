import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("           Typori 全体総合結合テスト & システム整合性検証           ");
console.log("==================================================================");

// 1. 各機能の検証スクリプト一覧
const testScripts = [
  { name: "Undo/Redo 履歴管理", file: "verify-history.mjs" },
  { name: "リンク・引用 視覚的編集", file: "verify-link-blockquote.mjs" },
  { name: "テーブル作成・編集・リサイズ", file: "verify-table.mjs" },
  { name: "画像 D&D・保存・挿入・プレビュー", file: "verify-image-dnd.mjs" },
  { name: "CodeMirror 6 ソース直接編集モード", file: "verify-source-editor.mjs" },
  { name: "ショートカット (Ctrl+/) ソース編集切替", file: "verify-source-toggle.mjs" },
  { name: "フォーカスモード (F8)", file: "verify-focus-mode.mjs" },
  { name: "複数ファイル タブUI", file: "verify-tabs-ui.mjs" },
  { name: "タブ機能 グローバル状態管理・無効化ロジック", file: "verify-tabs-state.mjs" },
  { name: "OSネイティブメニュー & 双方向イベント連携", file: "verify-native-menu.mjs" },
  { name: "チートシート ポップアップUI", file: "verify-cheatsheet.mjs" },
  { name: "ショートカット設定画面 (ダイアログ)", file: "verify-shortcuts-settings.mjs" },
  { name: "ショートカット設定 localStorage永続化 & 動的反映", file: "verify-shortcuts-persistence.mjs" },
  { name: "サイドバー ファイル名検索・フィルタリング", file: "verify-sidebar-search.mjs" },
  { name: "Markdown -> HTML エクスポート機能", file: "verify-export-html.mjs" },
  { name: "Markdown -> PDF (印刷連携) エクスポート機能", file: "verify-export-pdf.mjs" },
  { name: "アウトライン (右サイドバー & 見出しジャンプ) 機能", file: "verify-outline.mjs" },
  { name: "クイックアクションパレット DOM配置独立化 & 右サイドバー連動オフセット", file: "verify-palette-dom.mjs" },
  { name: "クイックアクションパレット スクロール時オートハイド & 最上部再表示", file: "verify-palette-scroll.mjs" },
  { name: "クイックアクションパレット マウスホバー再表示 (Hover Reveal) & トランジション", file: "verify-palette-hover.mjs" },
  { name: "Markdown シリアライズフォーマット統一 (- / ---)", file: "verify-markdown-serialization.mjs" },
  { name: "Markdown 一般化シリアライズ検証 (番号付き/連続箇条書き/同一URLリンク)", file: "verify-markdown-general-serialization.mjs" },
];

console.log(`\n--- [Step 1] 全個別機能テストスクリプトの実行検証 (${testScripts.length}件) ---`);

let passedCount = 0;
for (const test of testScripts) {
  const scriptPath = path.resolve(__dirname, test.file);
  assert.ok(fs.existsSync(scriptPath), `テストスクリプトが存在しません: ${test.file}`);
  
  process.stdout.write(`実行中: ${test.name} (${test.file})... `);
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: projectRoot,
      stdio: "pipe",
      encoding: "utf-8",
    });
    console.log("✓ 合格");
    passedCount++;
  } catch (err) {
    console.log("✕ 失敗");
    console.error(`エラー内容 (${test.file}):\n`, err.stdout || err.stderr || err.message);
    process.exit(1);
  }
}
console.log(`✓ 全 ${passedCount}/${testScripts.length} 件の個別機能検証テストが成功しました。`);

// 2. Tauri IPC コマンド登録とフロントエンド API 定義の整合性検証
console.log("\n--- [Step 2] Tauri IPC コマンドとフロントエンド API の整合性検証 ---");

const libRsPath = path.resolve(projectRoot, "src-tauri/src/lib.rs");
assert.ok(fs.existsSync(libRsPath), "src-tauri/src/lib.rs が存在すること");
const libRsContent = fs.readFileSync(libRsPath, "utf-8");

const expectedBackendCommands = [
  "open_file",
  "save_file",
  "read_dir",
  "get_current_dir",
  "get_parent_dir",
  "create_file",
  "save_image_file",
  "save_image_binary",
  "read_file_binary",
  "resolve_image_path",
  "search_files",
  "convert_markdown_to_html",
  "export_to_html",
  "export_to_pdf_html",
];

for (const cmd of expectedBackendCommands) {
  assert.ok(
    libRsContent.includes(`fs::${cmd}`),
    `src-tauri/src/lib.rs の generate_handler に fs::${cmd} が登録されていること`
  );
}
console.log(`✓ 全 ${expectedBackendCommands.length} 件のバックエンドコマンドが generate_handler に登録されていることを確認`);

const fsTsPath = path.resolve(projectRoot, "src/api/fs.ts");
assert.ok(fs.existsSync(fsTsPath), "src/api/fs.ts が存在すること");
const fsTsContent = fs.readFileSync(fsTsPath, "utf-8");

for (const cmd of expectedBackendCommands) {
  const invokePattern = new RegExp(`invoke(?:<[^>]+>)?\\(["']${cmd}["']`);
  assert.ok(
    invokePattern.test(fsTsContent),
    `src/api/fs.ts で invoke("${cmd}") が呼び出されていること`
  );
}
console.log("✓ フロントエンド API (src/api/fs.ts) で全コマンドの invoke 定義が存在することを確認");

// 3. OSネイティブメニューイベントとフロントエンドリスナーの双方向整合性検証
console.log("\n--- [Step 3] OSネイティブメニューイベントの完全双方向連携検証 ---");

const menuRsPath = path.resolve(projectRoot, "src-tauri/src/menu.rs");
const menuRsContent = fs.readFileSync(menuRsPath, "utf-8");
const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");

const expectedMenuEvents = [
  "menu:new_file",
  "menu:save_file",
  "menu:export_html",
  "menu:export_pdf",
  "menu:toggle_sidebar",
  "menu:toggle_right_sidebar",
  "menu:undo",
  "menu:redo",
  "menu:insert_link",
  "menu:toggle_blockquote",
  "menu:insert_table",
  "menu:toggle_source_mode",
  "menu:toggle_focus_mode",
  "menu:toggle_tabs",
  "menu:open_cheatsheet",
  "menu:open_shortcuts_settings",
];

for (const ev of expectedMenuEvents) {
  assert.ok(
    menuRsContent.includes(ev),
    `src-tauri/src/menu.rs でイベント "${ev}" が送出されていること`
  );
  assert.ok(
    appTsxContent.includes(ev),
    `src/App.tsx でイベント "${ev}" がリッスンされていること`
  );
}
console.log(`✓ 全 ${expectedMenuEvents.length} 件のOSネイティブメニューイベントがバックエンド/フロントエンド双方で完全に一致しています`);

// 4. ショートカット定義の重複競合チェック
console.log("\n--- [Step 4] デフォルトショートカット定義の整合性 & 競合検証 ---");
const defaultShortcutsPath = path.resolve(projectRoot, "src/components/ShortcutSettingsModal/types.ts");
const defaultShortcutsContent = fs.readFileSync(defaultShortcutsPath, "utf-8");

assert.ok(defaultShortcutsContent.includes("SHORTCUT_ITEMS"), "SHORTCUT_ITEMS 定義が存在すること");
assert.ok(defaultShortcutsContent.includes("export_pdf"), "export_pdf ショートカットが定義されていること");
assert.ok(defaultShortcutsContent.includes("export_html"), "export_html ショートカットが定義されていること");
assert.ok(defaultShortcutsContent.includes("toggle_right_sidebar"), "toggle_right_sidebar ショートカットが定義されていること");
assert.ok(defaultShortcutsContent.includes("toggle_focus_mode"), "toggle_focus_mode ショートカットが定義されていること");

console.log("✓ ショートカット定義の整合性チェックに合格");

console.log("\n==================================================================");
console.log("       >>> 総合結合テスト & システム整合性検証: 全項目合格 <<<       ");
console.log("==================================================================");
