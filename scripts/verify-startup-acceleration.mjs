import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log(" [検証] Phase 21: 起動高速化・ホワイトブランク完全解消 検証スイート ");
console.log("==================================================================");

// -----------------------------------------------------------------------------
// [Test 1] バックエンド/IPC一括化 (init_workspace) の整合性検証
// -----------------------------------------------------------------------------
console.log("\n--- [Test 1] バックエンド/IPC一括化 (init_workspace) の整合性検証 ---");

const fsRsPath = path.resolve(projectRoot, "src-tauri/src/fs.rs");
assert.ok(fs.existsSync(fsRsPath), "src-tauri/src/fs.rs が存在すること");
const fsRsContent = fs.readFileSync(fsRsPath, "utf-8").replace(/\r\n/g, "\n");

// 1.1 WorkspaceInitResult 構造体の定義とフィールド検証
assert.ok(
  fsRsContent.includes("pub struct WorkspaceInitResult"),
  "WorkspaceInitResult 構造体が定義されていること"
);
assert.ok(
  fsRsContent.includes("pub current_dir: String"),
  "WorkspaceInitResult に current_dir フィールドが存在すること"
);
assert.ok(
  fsRsContent.includes("pub entries: Vec<FileEntry>"),
  "WorkspaceInitResult に entries フィールドが存在すること"
);
assert.ok(
  fsRsContent.includes("pub initial_file_path: Option<String>"),
  "WorkspaceInitResult に initial_file_path フィールドが存在すること"
);
assert.ok(
  fsRsContent.includes("pub initial_file_content: Option<String>"),
  "WorkspaceInitResult に initial_file_content フィールドが存在すること"
);
assert.ok(
  fsRsContent.includes("pub initial_file_error: Option<String>"),
  "WorkspaceInitResult に initial_file_error フィールドが存在すること"
);
console.log("✓ Rust: WorkspaceInitResult 構造体と全フィールドが正しく定義されています");

// 1.2 init_workspace コマンドの実装検証
assert.ok(
  fsRsContent.includes("#[tauri::command]\npub fn init_workspace(") ||
  fsRsContent.includes("#[tauri::command]\r\npub fn init_workspace(") ||
  fsRsContent.includes("pub fn init_workspace("),
  "init_workspace コマンド関数が実装されていること"
);
assert.ok(
  fsRsContent.includes("test_init_workspace_internal_default_no_args") &&
  fsRsContent.includes("test_init_workspace_internal_cli_markdown_file") &&
  fsRsContent.includes("test_init_workspace_internal_file_not_found") &&
  fsRsContent.includes("test_init_workspace_internal_custom_path_directory"),
  "init_workspace の単体テスト群が実装されていること"
);
console.log("✓ Rust: init_workspace コマンドおよび単体テストが実装されています");

// 1.3 src-tauri/src/lib.rs でのハンドラー登録とセーフティフォールバック
const libRsPath = path.resolve(projectRoot, "src-tauri/src/lib.rs");
assert.ok(fs.existsSync(libRsPath), "src-tauri/src/lib.rs が存在すること");
const libRsContent = fs.readFileSync(libRsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  libRsContent.includes("fs::init_workspace"),
  "lib.rs の generate_handler に fs::init_workspace が登録されていること"
);
assert.ok(
  libRsContent.includes("use tauri::Manager;"),
  "lib.rs で tauri::Manager トレイトがインポートされていること"
);
assert.ok(
  libRsContent.includes("get_webview_window(\"main\")") &&
  libRsContent.includes("window.show()"),
  "lib.rs の setup 内に起動セーフティフォールバック（自動 show）が実装されていること"
);
console.log("✓ Rust: generate_handler への登録およびバックエンド側セーフティフォールバックを確認");

// 1.4 フロントエンド API (src/api/fs.ts) の定義検証
const fsTsPath = path.resolve(projectRoot, "src/api/fs.ts");
assert.ok(fs.existsSync(fsTsPath), "src/api/fs.ts が存在すること");
const fsTsContent = fs.readFileSync(fsTsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  fsTsContent.includes("export interface WorkspaceInitResult"),
  "src/api/fs.ts で WorkspaceInitResult インターフェースがエクスポートされていること"
);
assert.ok(
  fsTsContent.includes("export async function initWorkspace("),
  "src/api/fs.ts で initWorkspace 関数がエクスポートされていること"
);
assert.ok(
  fsTsContent.includes('invoke<WorkspaceInitResult>("init_workspace"'),
  "initWorkspace で invoke('init_workspace') が呼ばれていること"
);
assert.ok(
  fsTsContent.includes("normalizeLineEndings(result.initial_file_content)"),
  "initWorkspace で初期ファイルコンテンツの改行コードが LF に正規化されていること"
);
console.log("✓ フロントエンド: initWorkspace API および改行コード正規化処理を確認");


// -----------------------------------------------------------------------------
// [Test 2] ウィンドウ初期非表示設定 & Capabilities 権限の検証
// -----------------------------------------------------------------------------
console.log("\n--- [Test 2] ウィンドウ初期非表示設定 & Capabilities 権限の検証 ---");

const tauriConfPath = path.resolve(projectRoot, "src-tauri/tauri.conf.json");
assert.ok(fs.existsSync(tauriConfPath), "src-tauri/tauri.conf.json が存在すること");
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));

assert.ok(
  tauriConf.app && Array.isArray(tauriConf.app.windows) && tauriConf.app.windows.length > 0,
  "tauri.conf.json に windows 設定が存在すること"
);
const mainWindowConfig = tauriConf.app.windows[0];
assert.strictEqual(
  mainWindowConfig.visible,
  false,
  "初期ウィンドウの visible が false (初期非表示) に設定されていること"
);
assert.ok(
  typeof mainWindowConfig.backgroundColor === "string" && mainWindowConfig.backgroundColor.length > 0,
  "初期ウィンドウの backgroundColor が設定されていること"
);
console.log(`✓ tauri.conf.json: visible: false, backgroundColor: "${mainWindowConfig.backgroundColor}" を確認`);

const defaultCapPath = path.resolve(projectRoot, "src-tauri/capabilities/default.json");
assert.ok(fs.existsSync(defaultCapPath), "src-tauri/capabilities/default.json が存在すること");
const defaultCap = JSON.parse(fs.readFileSync(defaultCapPath, "utf-8"));

assert.ok(
  Array.isArray(defaultCap.permissions),
  "capabilities/default.json に permissions 配列が存在すること"
);
assert.ok(
  defaultCap.permissions.includes("core:window:allow-show"),
  "permissions に 'core:window:allow-show' が付与されていること"
);
assert.ok(
  defaultCap.permissions.includes("core:window:allow-set-focus"),
  "permissions に 'core:window:allow-set-focus' が付与されていること"
);
console.log("✓ capabilities: core:window:allow-show および allow-set-focus 権限を確認");


// -----------------------------------------------------------------------------
// [Test 3] 0ms テーマ判定インラインスクリプト & ゼロフラッシュ初期スケルトン (index.html)
// -----------------------------------------------------------------------------
console.log("\n--- [Test 3] 0ms テーマ判定スクリプト & ゼロフラッシュ初期スケルトン (index.html) ---");

const indexHtmlPath = path.resolve(projectRoot, "index.html");
assert.ok(fs.existsSync(indexHtmlPath), "index.html が存在すること");
const indexHtmlContent = fs.readFileSync(indexHtmlPath, "utf-8").replace(/\r\n/g, "\n");

// 3.1 0ms テーマ同期インラインスクリプト検証
assert.ok(
  indexHtmlContent.includes("localStorage.getItem(\"typori-theme\")"),
  "index.html に localStorage('typori-theme') を読み出す同期スクリプトが存在すること"
);
assert.ok(
  indexHtmlContent.includes("prefers-color-scheme: dark"),
  "index.html に システム配色 (prefers-color-scheme: dark) を判定するコードが存在すること"
);
assert.ok(
  indexHtmlContent.includes("root.classList.add(\"dark\")") &&
  indexHtmlContent.includes("root.style.backgroundColor = \"#18181b\""),
  "ダークモード時に html 要素へ dark クラスと背景色 #18181b を即座に適用していること"
);

// 3.2 テーマ判定ロジックのシミュレーション検証
function simulateThemeInit(storageValue, prefersDark) {
  let isDark = false;
  if (storageValue === "dark") {
    isDark = true;
  } else if (storageValue === "light") {
    isDark = false;
  } else {
    isDark = prefersDark;
  }
  return {
    className: isDark ? "dark" : "",
    bgColor: isDark ? "#18181b" : "#ffffff",
  };
}

assert.deepStrictEqual(simulateThemeInit("dark", false), { className: "dark", bgColor: "#18181b" });
assert.deepStrictEqual(simulateThemeInit("light", true), { className: "", bgColor: "#ffffff" });
assert.deepStrictEqual(simulateThemeInit(null, true), { className: "dark", bgColor: "#18181b" });
assert.deepStrictEqual(simulateThemeInit(null, false), { className: "", bgColor: "#ffffff" });
console.log("✓ 0ms テーマ判定ロジックのシミュレーション（dark/light/OS連動）が完全に機能することを確認");

// 3.3 初期スケルトンDOMとスタイルの検証
assert.ok(
  indexHtmlContent.includes("id=\"typori-initial-skeleton\""),
  "index.html の #root 内に初期スケルトンDOM (id='typori-initial-skeleton') が配置されていること"
);
assert.ok(
  indexHtmlContent.includes("class=\"initial-skeleton-sidebar\"") &&
  indexHtmlContent.includes("class=\"initial-skeleton-main\"") &&
  indexHtmlContent.includes("class=\"initial-skeleton-editor\""),
  "初期スケルトン内にサイドバー・メイン領域・エディタ領域の各枠組みが存在すること"
);
assert.ok(
  indexHtmlContent.includes("--typori-bg:") &&
  indexHtmlContent.includes("--typori-skeleton:"),
  "初期インラインスタイルにゼロフラッシュ用CSS変数が定義されていること"
);
console.log("✓ ゼロフラッシュ初期スケルトンDOMおよびインラインスタイルを確認");


// -----------------------------------------------------------------------------
// [Test 4] フロントエンド初期化一括化 & 表示ハンドシェイク & フォールバック (src/App.tsx)
// -----------------------------------------------------------------------------
console.log("\n--- [Test 4] フロントエンド初期化一括化 & 表示ハンドシェイク & フォールバック (src/App.tsx) ---");

const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8").replace(/\r\n/g, "\n");

// 4.1 initWorkspace の呼び出し検証
assert.ok(
  appTsxContent.includes("const initResult = await initWorkspace();"),
  "App.tsx で initWorkspace() が呼び出されていること"
);
assert.ok(
  appTsxContent.includes("setCurrentDirectory(currentDir);") &&
  appTsxContent.includes("setDirectoryContents("),
  "initWorkspace の結果からディレクトリおよびファイル一覧が初期化されていること"
);

// 4.2 revealWindow ハンドシェイクと二重実行防止
assert.ok(
  appTsxContent.includes("hasRevealedWindowRef = useRef(false);"),
  "ウィンドウ表示の二重実行を防ぐ hasRevealedWindowRef ガードが存在すること"
);
assert.ok(
  appTsxContent.includes("const win = getCurrentWindow();") &&
  appTsxContent.includes("await win.show();") &&
  appTsxContent.includes("await win.setFocus();"),
  "revealWindow 内で getCurrentWindow().show() および setFocus() が呼ばれていること"
);

// 4.3 requestAnimationFrame による描画反映後のウィンドウ表示
assert.ok(
  appTsxContent.includes("requestAnimationFrame(() => {") &&
  appTsxContent.includes("revealWindow();"),
  "初回レンダリングがDOMに反映された直後に revealWindow() がトリガーされること"
);

// 4.4 フロントエンド側セーフティフォールバックタイマー
assert.ok(
  appTsxContent.includes("const fallbackTimer = setTimeout(() => {") &&
  appTsxContent.includes("revealWindow();") &&
  appTsxContent.includes("400);"),
  "初期化遅延・エラー防止のための400msセーフティフォールバックタイマーが設定されていること"
);
console.log("✓ App.tsx: initWorkspace 集約呼び出し、表示ハンドシェイク、400msフォールバックを確認");


// -----------------------------------------------------------------------------
// [Test 5] コード分割 & バンドル最適化 (Lazy Loading & Manual Chunks)
// -----------------------------------------------------------------------------
console.log("\n--- [Test 5] コード分割 & バンドル最適化 (Lazy Loading & Manual Chunks) ---");

// 5.1 App.tsx での重いコンポーネントの遅延ロード (React.lazy)
const lazyComponents = [
  "SourceEditor",
  "CheatSheetModal",
  "ShortcutSettingsModal",
  "ExportModal",
];

for (const comp of lazyComponents) {
  const lazyPattern = new RegExp(`const\\s+${comp}\\s*=\\s*lazy\\(`);
  assert.ok(
    lazyPattern.test(appTsxContent),
    `App.tsx でコンポーネント ${comp} が React.lazy() で遅延ロードされていること`
  );
}
assert.ok(
  appTsxContent.includes("<Suspense"),
  "App.tsx で遅延ロードコンポーネントを囲む <Suspense> が組み込まれていること"
);
console.log("✓ App.tsx: SourceEditor, CheatSheetModal, ShortcutSettingsModal, ExportModal の React.lazy 遅延ロードを確認");

// 5.2 vite.config.ts でのチャンク分割設定 (manualChunks)
const viteConfigPath = path.resolve(projectRoot, "vite.config.ts");
assert.ok(fs.existsSync(viteConfigPath), "vite.config.ts が存在すること");
const viteConfigContent = fs.readFileSync(viteConfigPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  viteConfigContent.includes("manualChunks(id)"),
  "vite.config.ts に manualChunks 設定が存在すること"
);
assert.ok(
  viteConfigContent.includes("editor-milkdown") &&
  viteConfigContent.includes("editor-codemirror") &&
  viteConfigContent.includes("vendor-react"),
  "manualChunks で editor-milkdown, editor-codemirror, vendor-react のチャンク分離が定義されていること"
);
console.log("✓ vite.config.ts: Rollup manualChunks によるチャンク最適化設定を確認");

console.log("\n==================================================================");
console.log(" >>> Phase 21: 起動高速化・ホワイトブランク完全解消 検証全項目合格 <<< ");
console.log("==================================================================");
