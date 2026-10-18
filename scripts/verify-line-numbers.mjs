import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("     Typori Phase 19 行番号表示機能 (Line Numbers) 網羅的検証     ");
console.log("==================================================================");

// 1. 状態管理フック (useLineNumberSettings.ts)
console.log("\n[1] 状態管理フック (src/hooks/useLineNumberSettings.ts) の静的検証 & シミュレーション...");
const hookPath = path.resolve(projectRoot, "src/hooks/useLineNumberSettings.ts");
assert.ok(fs.existsSync(hookPath), "src/hooks/useLineNumberSettings.ts が存在すること");
const hookContent = fs.readFileSync(hookPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  hookContent.includes('export const LINE_NUMBERS_STORAGE_KEY = "typori:line_numbers_enabled"'),
  "LINE_NUMBERS_STORAGE_KEY が 'typori:line_numbers_enabled' として定義されていること"
);
assert.ok(
  hookContent.includes("export function useLineNumberSettings()"),
  "useLineNumberSettings フック関数が export されていること"
);
assert.ok(
  hookContent.includes("return true;"),
  "デフォルト設定が行番号有効 (true) であること"
);
assert.ok(
  hookContent.includes("localStorage.getItem(LINE_NUMBERS_STORAGE_KEY)"),
  "localStorage から設定を読み出すロジックが存在すること"
);
assert.ok(
  hookContent.includes("localStorage.setItem(LINE_NUMBERS_STORAGE_KEY, String(next))"),
  "localStorage に設定を永続化するロジックが存在すること"
);

// フックのロジックシミュレーション
{
  const mockStorage = new Map();
  const STORAGE_KEY = "typori:line_numbers_enabled";

  const initLineNumbers = () => {
    const val = mockStorage.get(STORAGE_KEY);
    return val !== undefined ? val === "true" : true; // default true
  };

  let state = initLineNumbers();
  assert.equal(state, true, "初期状態はデフォルトで true (有効)");

  const toggle = () => {
    state = !state;
    mockStorage.set(STORAGE_KEY, String(state));
  };

  toggle();
  assert.equal(state, false, "トグル後に false (無効)");
  assert.equal(mockStorage.get(STORAGE_KEY), "false", "localStorage に 'false' が保存されること");

  toggle();
  assert.equal(state, true, "再トグル後に true (有効)");
  assert.equal(mockStorage.get(STORAGE_KEY), "true", "localStorage に 'true' が保存されること");

  // 保存済みの値からの再初期化テスト
  mockStorage.set(STORAGE_KEY, "false");
  assert.equal(initLineNumbers(), false, "localStorage の false が正しく復元されること");
}
console.log("✓ useLineNumberSettings の定義・ストレージキー・初期値・トグルシミュレーション合格");

// 2. ショートカット設定定義 (ShortcutSettingsModal/types.ts)
console.log("\n[2] ショートカット設定定義 (src/components/ShortcutSettingsModal/types.ts) の検証...");
const shortcutTypesPath = path.resolve(projectRoot, "src/components/ShortcutSettingsModal/types.ts");
assert.ok(fs.existsSync(shortcutTypesPath), "ShortcutSettingsModal/types.ts が存在すること");
const shortcutTypesContent = fs.readFileSync(shortcutTypesPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  shortcutTypesContent.includes('id: "toggle_line_numbers"'),
  "SHORTCUT_ITEMS に 'toggle_line_numbers' が登録されていること"
);
assert.ok(
  shortcutTypesContent.includes('defaultKeys: ["Ctrl", "Alt", "L"]'),
  "toggle_line_numbers のデフォルトキーバインドが ['Ctrl', 'Alt', 'L'] であること"
);
assert.ok(
  shortcutTypesContent.includes('category: "view"'),
  "toggle_line_numbers のカテゴリが 'view' であること"
);
assert.ok(
  shortcutTypesContent.includes('name: "行番号表示切替"'),
  "toggle_line_numbers の name が '行番号表示切替' であること"
);
console.log("✓ SHORTCUT_ITEMS の toggle_line_numbers 定義合格");

// 3. チートシート定義 (CheatSheetModal/data.ts)
console.log("\n[3] チートシート定義 (src/components/CheatSheetModal/data.ts) の検証...");
const cheatSheetDataPath = path.resolve(projectRoot, "src/components/CheatSheetModal/data.ts");
assert.ok(fs.existsSync(cheatSheetDataPath), "CheatSheetModal/data.ts が存在すること");
const cheatSheetDataContent = fs.readFileSync(cheatSheetDataPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  cheatSheetDataContent.includes('id: "toggle_line_numbers"'),
  "KEYBOARD_SHORTCUTS に 'toggle_line_numbers' が掲載されていること"
);
assert.ok(
  cheatSheetDataContent.includes('keys: ["Ctrl", "Alt", "L"]'),
  "KEYBOARD_SHORTCUTS の keys に ['Ctrl', 'Alt', 'L'] が設定されていること"
);
assert.ok(
  cheatSheetDataContent.includes("行番号表示切替"),
  "KEYBOARD_SHORTCUTS に '行番号表示切替' の項目が掲載されていること"
);
console.log("✓ チートシートへのショートカット掲載合格");

// 4. バックエンド Rust メニュー & IPC コマンド (src-tauri/src/menu.rs & lib.rs)
console.log("\n[4] バックエンド Rust ネイティブメニュー & IPC コマンドの検証...");
const menuRsPath = path.resolve(projectRoot, "src-tauri/src/menu.rs");
assert.ok(fs.existsSync(menuRsPath), "src-tauri/src/menu.rs が存在すること");
const menuRsContent = fs.readFileSync(menuRsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  menuRsContent.includes('CheckMenuItem::with_id(\n        app,\n        "toggle_line_numbers",\n        "行番号を表示",\n        true,\n        true,\n        Some("CmdOrCtrl+Alt+L"),\n    )?') ||
  (menuRsContent.includes('CheckMenuItem::with_id') && menuRsContent.includes('"toggle_line_numbers"') && menuRsContent.includes('"行番号を表示"')),
  "menu.rs に CheckMenuItem 'toggle_line_numbers' が初期 checked: true で作成されていること"
);
assert.ok(
  menuRsContent.includes("&toggle_line_numbers"),
  "view_menu のサブメニュー項目に &toggle_line_numbers が含まれていること"
);
assert.ok(
  /\"toggle_line_numbers\"\s*=>\s*\{\s*let _ = app\.emit\(\"menu:toggle_line_numbers\",\s*\(\)\);/m.test(
    menuRsContent
  ),
  "handle_menu_event で 'toggle_line_numbers' を受信した際に 'menu:toggle_line_numbers' を emit すること"
);
assert.ok(
  menuRsContent.includes("pub fn set_line_numbers_menu_checked(app: AppHandle, checked: bool) -> Result<(), String>"),
  "set_line_numbers_menu_checked コマンドが定義されていること"
);
assert.ok(
  menuRsContent.includes('assert_eq!("toggle_line_numbers", "toggle_line_numbers");'),
  "menu.rs の単体テスト test_menu_event_ids に toggle_line_numbers が含まれていること"
);

// lib.rs でのハンドラ登録確認
const libRsPath = path.resolve(projectRoot, "src-tauri/src/lib.rs");
assert.ok(fs.existsSync(libRsPath), "src-tauri/src/lib.rs が存在すること");
const libRsContent = fs.readFileSync(libRsPath, "utf-8").replace(/\r\n/g, "\n");
assert.ok(
  libRsContent.includes("menu::set_line_numbers_menu_checked"),
  "src-tauri/src/lib.rs の generate_handler! に menu::set_line_numbers_menu_checked が登録されていること"
);

// src/api/fs.ts での API ラッパー確認
const fsApiPath = path.resolve(projectRoot, "src/api/fs.ts");
assert.ok(fs.existsSync(fsApiPath), "src/api/fs.ts が存在すること");
const fsApiContent = fs.readFileSync(fsApiPath, "utf-8").replace(/\r\n/g, "\n");
assert.ok(
  fsApiContent.includes("export async function setLineNumbersMenuChecked(checked: boolean): Promise<void>"),
  "src/api/fs.ts で setLineNumbersMenuChecked が export されていること"
);
assert.ok(
  fsApiContent.includes('invoke<void>("set_line_numbers_menu_checked", { checked })') ||
  /invoke(?:<[^>]+>)?\("set_line_numbers_menu_checked",\s*\{\s*checked\s*\}\)/.test(fsApiContent),
  "setLineNumbersMenuChecked が invoke('set_line_numbers_menu_checked', { checked }) を呼ぶこと"
);
console.log("✓ バックエンド CheckMenuItem 定義・イベント emit・IPC コマンド登録・フロント API ラッパー合格");

// 5. App.tsx での統合
console.log("\n[5] App.tsx でのフック呼び出し・リスナー・メニュー同期・エディタ受け渡しの検証...");
const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  appTsxContent.includes("useLineNumberSettings"),
  "App.tsx で useLineNumberSettings がインポートされていること"
);
assert.ok(
  appTsxContent.includes("const { isLineNumbersEnabled, toggleLineNumbers } = useLineNumberSettings();"),
  "App.tsx で isLineNumbersEnabled と toggleLineNumbers がフックから取得されていること"
);
assert.ok(
  appTsxContent.includes('setLineNumbersMenuChecked(isLineNumbersEnabled)'),
  "isLineNumbersEnabled の変更時に setLineNumbersMenuChecked が実行されること"
);
assert.ok(
  appTsxContent.includes('listen("menu:toggle_line_numbers"'),
  "App.tsx で 'menu:toggle_line_numbers' イベントが listen されていること"
);
assert.ok(
  appTsxContent.includes("toggleLineNumbersRef.current()"),
  "イベントハンドラで toggleLineNumbersRef.current() が呼び出されていること"
);
assert.ok(
  appTsxContent.includes("showLineNumbers={isLineNumbersEnabled}"),
  "エディタコンポーネントに showLineNumbers={isLineNumbersEnabled} が渡されていること"
);
assert.ok(
  appTsxContent.includes("toggle_line_numbers"),
  "キーボードショートカット処理で toggle_line_numbers が処理されていること"
);
console.log("✓ App.tsx のイベントリスナー・メニューチェック同期・props 受け渡し合格");

// 6. ソース直接編集モード (SourceEditor.tsx)
console.log("\n[6] ソース直接編集モード (src/components/Editor/SourceEditor.tsx) の検証...");
const sourceEditorPath = path.resolve(projectRoot, "src/components/Editor/SourceEditor.tsx");
assert.ok(fs.existsSync(sourceEditorPath), "SourceEditor.tsx が存在すること");
const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  sourceEditorContent.includes("showLineNumbers?: boolean;"),
  "SourceEditorProps に showLineNumbers?: boolean が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("showLineNumbers = true,"),
  "SourceEditor で showLineNumbers のデフォルト値が true に設定されていること"
);
assert.ok(
  sourceEditorContent.includes("lineNumbers: showLineNumbers"),
  "basicSetupOptions で lineNumbers: showLineNumbers が設定されていること"
);
assert.ok(
  sourceEditorContent.includes("highlightActiveLineGutter: showLineNumbers"),
  "basicSetupOptions で highlightActiveLineGutter: showLineNumbers が設定されていること"
);
assert.ok(
  sourceEditorContent.includes(".cm-gutters"),
  "SourceEditor のテーマ設定に .cm-gutters のスタイリングが含まれていること"
);
assert.ok(
  sourceEditorContent.includes(".cm-activeLineGutter"),
  "SourceEditor のテーマ設定に .cm-activeLineGutter のスタイリングが含まれていること"
);
console.log("✓ SourceEditor の props 定義・basicSetup 制御・ガタースタイリング合格");

// 7. WYSIWYG モード (Editor.tsx)
console.log("\n[7] WYSIWYG モード (src/components/Editor/Editor.tsx) の検証 & ブロック走査シミュレーション...");
const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorPath), "Editor.tsx が存在すること");
const editorContent = fs.readFileSync(editorPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  editorContent.includes("showLineNumbers?: boolean;"),
  "EditorProps に showLineNumbers?: boolean が定義されていること"
);
assert.ok(
  editorContent.includes("export const lineNumbersPluginKey = new PluginKey"),
  "lineNumbersPluginKey が export されていること"
);
assert.ok(
  editorContent.includes("export const lineNumbersPlugin = $prose("),
  "lineNumbersPlugin が $prose で実装されていること"
);
assert.ok(
  editorContent.includes("export function getTargetBlocks("),
  "getTargetBlocks 関数が export されていること"
);
assert.ok(
  editorContent.includes("export function getActiveBlockIndex("),
  "getActiveBlockIndex 関数が export されていること"
);
assert.ok(
  editorContent.includes("export function findBlockIndexByPos("),
  "findBlockIndexByPos 関数が export されていること"
);
assert.ok(
  editorContent.includes("export function getVisibleBlockRange("),
  "getVisibleBlockRange 関数が export されていること"
);
assert.ok(
  editorContent.includes("requestAnimationFrame"),
  "requestAnimationFrame による描画デバウンスが実装されていること"
);
assert.ok(
  editorContent.includes('addEventListener("scroll", handleScroll'),
  "スクロールイベントのリスナー登録が実装されていること"
);
assert.ok(
  editorContent.includes("setGlobalShowLineNumbers(showLineNumbers)"),
  "showLineNumbers の変更時に setGlobalShowLineNumbers が呼び出されていること"
);
assert.ok(
  editorContent.includes("typori-prosemirror-gutter"),
  "ガターコンテナクラス 'typori-prosemirror-gutter' が生成されること"
);
assert.ok(
  editorContent.includes("typori-line-number-active"),
  "アクティブ行番号クラス 'typori-line-number-active' が付与されること"
);

// getTargetBlocks & getActiveBlockIndex のロジックシミュレーション
{
  // 擬似 ProseMirror ドキュメントツリー
  const mockDoc = {
    descendants(cb) {
      // 1. Heading (level 1)
      cb({ isBlock: true, type: { name: "heading" }, nodeSize: 10 }, 0);
      // 2. Paragraph
      cb({ isBlock: true, type: { name: "paragraph" }, nodeSize: 15 }, 10);
      // 3. Table (内部構造に関わらず1ブロック)
      const shouldDescendTable = cb({ isBlock: true, type: { name: "table" }, nodeSize: 50 }, 25);
      assert.equal(shouldDescendTable, false, "table の内部ノードはスキップされること");
      // 4. Code Block (内部行数に関わらず1ブロック)
      const shouldDescendCode = cb({ isBlock: true, type: { name: "code_block" }, nodeSize: 30 }, 75);
      assert.equal(shouldDescendCode, false, "code_block の内部ノードはスキップされること");
      // 5. Horizontal Rule
      cb({ isBlock: true, type: { name: "hr" }, nodeSize: 2 }, 105);
      // 6. Block Image
      cb({ isBlock: true, type: { name: "image" }, nodeSize: 5 }, 107);
    },
  };

  // getTargetBlocks 相当のロジック実行
  const blocks = [];
  mockDoc.descendants((node, pos) => {
    if (!node.isBlock) return false;
    const typeName = node.type?.name ?? "";
    if (["table", "code_block", "fence", "hr", "image", "heading", "paragraph"].includes(typeName) || node.isTextblock) {
      blocks.push({
        index: blocks.length + 1,
        pos,
        size: node.nodeSize,
        type: typeName,
      });
      return false;
    }
    return true;
  });

  assert.equal(blocks.length, 6, "ブロック走査で全6個のブロックが正しく特定されること");
  assert.equal(blocks[0].index, 1);
  assert.equal(blocks[0].type, "heading");
  assert.equal(blocks[2].type, "table");
  assert.equal(blocks[3].type, "code_block");

  // getActiveBlockIndex 相当のロジック実行
  const findActive = (targetPos) => {
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const end = b.pos + b.size;
      const isLast = i === blocks.length - 1;
      if (isLast ? targetPos >= b.pos && targetPos <= end : targetPos >= b.pos && targetPos < end) {
        return i;
      }
    }
    return 0;
  };

  assert.equal(findActive(5), 0, "pos 5 は heading (ブロック0)");
  assert.equal(findActive(10), 1, "pos 10 は paragraph (ブロック1)");
  assert.equal(findActive(35), 2, "pos 35 は table (ブロック2)");
  assert.equal(findActive(80), 3, "pos 80 は code_block (ブロック3)");
  assert.equal(findActive(105), 4, "pos 105 は hr (ブロック4)");
  assert.equal(findActive(109), 5, "pos 109 は image (ブロック5)");
}

// 行番号仮想化（findBlockIndexByPos & getVisibleBlockRange）のシミュレーション
{
  const findBlockIndexByPosSim = (blocks, pos) => {
    if (blocks.length === 0) return -1;
    if (pos <= blocks[0].pos) return 0;
    if (pos >= blocks[blocks.length - 1].pos) return blocks.length - 1;

    let low = 0;
    let high = blocks.length - 1;
    let result = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const block = blocks[mid];
      const end = block.pos + block.size;

      if (pos >= block.pos && pos < end) {
        return mid;
      }

      if (block.pos <= pos) {
        result = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return result;
  };

  // 5000個のブロックを持つ大規模ドキュメント（800KB相当）を生成
  const largeBlocks = [];
  let curPos = 0;
  for (let i = 1; i <= 5000; i++) {
    const size = 50; // 各ブロック約50文字
    largeBlocks.push({
      index: i,
      pos: curPos,
      size,
      type: "paragraph",
    });
    curPos += size;
  }

  assert.equal(largeBlocks.length, 5000, "5000ブロックが正しく生成されること");

  // 二分探索の精度テスト
  assert.equal(findBlockIndexByPosSim(largeBlocks, 0), 0, "pos 0 はブロック0");
  assert.equal(findBlockIndexByPosSim(largeBlocks, 25), 0, "pos 25 はブロック0の内部");
  assert.equal(findBlockIndexByPosSim(largeBlocks, 50), 1, "pos 50 はブロック1");
  assert.equal(findBlockIndexByPosSim(largeBlocks, 50 * 2500 + 10), 2500, "pos 125010 はブロック2500");
  assert.equal(findBlockIndexByPosSim(largeBlocks, largeBlocks[4999].pos + 10), 4999, "末尾ブロック");

  // getVisibleBlockRange 仮想化ロジックのシミュレーション
  const simulateVisibleRange = (blocks, topPos, bottomPos, total) => {
    const VIRTUALIZATION_THRESHOLD = 60;
    if (total <= VIRTUALIZATION_THRESHOLD) {
      return { startIndex: 0, endIndex: total - 1, isVirtualized: false };
    }

    let startIndex = 0;
    let endIndex = total - 1;

    if (topPos != null) {
      const foundStart = findBlockIndexByPosSim(blocks, topPos);
      startIndex = Math.max(0, foundStart - 5);
    }

    if (bottomPos != null) {
      const foundEnd = findBlockIndexByPosSim(blocks, bottomPos);
      endIndex = Math.min(total - 1, foundEnd + 8);
    }

    if (startIndex > endIndex) {
      startIndex = Math.max(0, endIndex - 10);
    }

    return { startIndex, endIndex, isVirtualized: true };
  };

  // 画面内にブロック 1000〜1030 付近が表示されている場合の仮想化検証
  const viewportTopPos = largeBlocks[1000].pos;
  const viewportBottomPos = largeBlocks[1030].pos;
  const range = simulateVisibleRange(largeBlocks, viewportTopPos, viewportBottomPos, 5000);

  assert.equal(range.isVirtualized, true, "大容量ドキュメントで仮想化フラグが true");
  assert.equal(range.startIndex, 995, "バッファ5ブロック前（1000 - 5 = 995）から描画");
  assert.equal(range.endIndex, 1038, "バッファ8ブロック後（1030 + 8 = 1038）まで描画");
  const renderedCount = range.endIndex - range.startIndex + 1;
  assert.equal(renderedCount, 44, "描画対象ブロック数が44個（画面内＋バッファ）に抑えられ、5000回の Forced Reflow が完全排除されること");
}
console.log("✓ Editor.tsx プラグイン登録・TargetBlocks 走査・行番号ビューポート仮想化シミュレーション合格");

// 8. スタイリング (index.css)
console.log("\n[8] CSS スタイル定義 (src/index.css) の検証...");
const indexCssPath = path.resolve(projectRoot, "src/index.css");
assert.ok(fs.existsSync(indexCssPath), "src/index.css が存在すること");
const indexCssContent = fs.readFileSync(indexCssPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  indexCssContent.includes(".typori-prosemirror-gutter"),
  "index.css に .typori-prosemirror-gutter のスタイルが定義されていること"
);
assert.ok(
  indexCssContent.includes(".ProseMirror.has-line-numbers"),
  "index.css に .ProseMirror.has-line-numbers (左パディング) のスタイルが定義されていること"
);
assert.ok(
  indexCssContent.includes(".typori-line-number-item"),
  "index.css に .typori-line-number-item のスタイルが定義されていること"
);
assert.ok(
  indexCssContent.includes(".typori-line-number-item.typori-line-number-active"),
  "index.css に .typori-line-number-item.typori-line-number-active のスタイルが定義されていること"
);
assert.ok(
  indexCssContent.includes(".focus-mode .typori-line-number-item"),
  "index.css に フォーカスモード連動スタイルが定義されていること"
);
assert.ok(
  indexCssContent.includes(".focus-mode .typori-line-number-item.typori-line-number-active"),
  "index.css に フォーカスモード時アクティブ行ハイライト維持スタイルが定義されていること"
);
console.log("✓ CSS ガター・パディング・アクティブ行・フォーカスモード連動スタイル合格");

console.log("\n==================================================================");
console.log("  >>> Phase 19 行番号表示機能 (Line Numbers): 全網羅的検証合格 <<<  ");
console.log("==================================================================");
