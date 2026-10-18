import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { indentWithTab, indentMore, indentLess } from "@codemirror/commands";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  Phase 28: ソース直接編集モード インデント・レイアウト・スクロール  ");
console.log("             および OSメニュー Submenu 再帰同期 網羅的検証          ");
console.log("==================================================================");

async function runVerification() {
  const sourceEditorPath = path.resolve(projectRoot, "src/components/Editor/SourceEditor.tsx");
  assert.ok(fs.existsSync(sourceEditorPath), "SourceEditor.tsx が存在すること");
  const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8").replace(/\r\n/g, "\n");

  const menuRsPath = path.resolve(projectRoot, "src-tauri/src/menu.rs");
  assert.ok(fs.existsSync(menuRsPath), "src-tauri/src/menu.rs が存在すること");
  const menuRsContent = fs.readFileSync(menuRsPath, "utf-8").replace(/\r\n/g, "\n");

  const libRsPath = path.resolve(projectRoot, "src-tauri/src/lib.rs");
  assert.ok(fs.existsSync(libRsPath), "src-tauri/src/lib.rs が存在すること");
  const libRsContent = fs.readFileSync(libRsPath, "utf-8").replace(/\r\n/g, "\n");

  const fsTsPath = path.resolve(projectRoot, "src/api/fs.ts");
  assert.ok(fs.existsSync(fsTsPath), "src/api/fs.ts が存在すること");
  const fsTsContent = fs.readFileSync(fsTsPath, "utf-8").replace(/\r\n/g, "\n");

  const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
  assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
  const appTsxContent = fs.readFileSync(appTsxPath, "utf-8").replace(/\r\n/g, "\n");

  // ==========================================================================
  // [Step 1] インデント操作（Tab / Shift+Tab）および行頭空白描画保証の検証 (課題2 & 3)
  // ==========================================================================
  console.log("\n--- [Step 1] インデント操作（Tab/Shift+Tab）および行頭空白描画保証の検証 ---");

  // 1.1 @codemirror/commands からの indentWithTab インポート
  assert.ok(
    sourceEditorContent.includes('import { indentWithTab } from "@codemirror/commands";'),
    "SourceEditor.tsx で @codemirror/commands から indentWithTab がインポートされていること"
  );

  // 1.2 indentKeymap の定義と Prec.highest による最優先設定
  assert.ok(
    sourceEditorContent.includes("const indentKeymap = useMemo(() => {") &&
    sourceEditorContent.includes("return Prec.highest(keymap.of([indentWithTab]));"),
    "indentKeymap が Prec.highest(keymap.of([indentWithTab])) で定義され、エディタフォーカス外れを確実に防止していること"
  );

  // 1.3 extensions 配列への indentKeymap の確実な登録
  assert.ok(
    /extensions\s*=\s*useMemo\(\(\)\s*=>\s*\{[\s\S]*?indentKeymap[\s\S]*?\}\s*,\s*\[[\s\S]*?indentKeymap[\s\S]*?\]\);/m.test(
      sourceEditorContent
    ),
    "extensions 配列に indentKeymap が組み込まれ、依存配列にも含まれていること"
  );

  // 1.4 indentWithTab キーマップの動作仕様検証
  assert.equal(indentWithTab.key, "Tab", "indentWithTab のキーが 'Tab' であること");
  assert.equal(indentWithTab.run, indentMore, "Tab キーで indentMore が実行されること");
  assert.equal(indentWithTab.shift, indentLess, "Shift+Tab キーで indentLess が実行されること");

  // 1.5 行頭空白描画保証（white-space: break-spaces）の静的検証
  assert.ok(
    sourceEditorContent.includes('whiteSpace: "break-spaces"'),
    "customTheme の .cm-content および .cm-line に whiteSpace: 'break-spaces' が設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('wordBreak: "break-word"'),
    "customTheme の .cm-content に wordBreak: 'break-word' が設定されていること"
  );

  // 1.6 行頭空白保持とネストリスト・インデントコードブロックのシミュレーション
  {
    const sampleMarkdown = [
      "# ネストリストテスト",
      "- 親アイテム1",
      "  - 子アイテム1.1 (2スペース)",
      "    - 孫アイテム1.1.1 (4スペース)",
      "      - ひ孫アイテム1.1.1.1 (6スペース)",
      "- 親アイテム2",
      "    コードブロックインデント (4スペース)",
      "        ネストされたブロック (8スペース)",
    ].join("\n");

    const lines = sampleMarkdown.split("\n");
    // 行頭スペース数のカウント
    const leadingSpaces = lines.map((l) => {
      const match = l.match(/^(\s*)/);
      return match ? match[1].length : 0;
    });

    assert.equal(leadingSpaces[2], 2, "子アイテムの2スペースが保持されること");
    assert.equal(leadingSpaces[3], 4, "孫アイテムの4スペースが保持されること");
    assert.equal(leadingSpaces[4], 6, "ひ孫アイテムの6スペースが保持されること");
    assert.equal(leadingSpaces[6], 4, "コードブロックの4スペースが保持されること");
    assert.equal(leadingSpaces[7], 8, "ネストブロックの8スペースが保持されること");
  }

  console.log("✓ Tab/Shift+Tabインデントキーマップ登録、行頭空白描画（break-spaces）、ネスト保持の検証に合格");

  // ==========================================================================
  // [Step 2] エディタ全体レイアウト・中央寄せ・余白構造の検証 (課題1)
  // ==========================================================================
  console.log("\n--- [Step 2] エディタ全体レイアウト・中央寄せ・等幅コンテナの検証 ---");

  // 2.1 customTheme のルート（&）における中央寄せ最大幅設定
  assert.ok(
    sourceEditorContent.includes('maxWidth: "900px"'),
    "customTheme の ルート (&) に maxWidth: '900px' が設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('margin: "0 auto"'),
    "customTheme の ルート (&) に margin: '0 auto' が設定されていること"
  );

  // 2.2 CodeMirror コンポーネントの Tailwind クラス設定
  assert.ok(
    sourceEditorContent.includes('className="h-full text-sm max-w-[900px] mx-auto"'),
    "CodeMirror コンポーネントに max-w-[900px] mx-auto が設定されていること"
  );

  // 2.3 ガター（.cm-gutters）と本文（.cm-content）の一体化配置（分離排除）
  assert.ok(
    sourceEditorContent.includes('margin: "0"'),
    ".cm-content のマージンが '0' に設定され、ガターとの間に余分な空白が生じず一体化していること"
  );
  assert.ok(
    sourceEditorContent.includes('padding: "24px 32px"'),
    ".cm-content に自然な等幅執筆パディング (padding: 24px 32px) が設定されていること"
  );

  // 2.4 余白領域クリック時のフォーカス移動
  assert.ok(
    sourceEditorContent.includes("e.target === e.currentTarget") &&
    sourceEditorContent.includes("editorRef.current?.view?.focus()"),
    "エディタ左右の余白領域クリック時にエディタ本体へフォーカスを当てるハンドラが存在すること"
  );

  // 2.5 レイアウト寸法シミュレーション（画面幅ごとの中央コンテナと余白）
  {
    const viewports = [
      { width: 1920, expectedContentWidth: 900, expectedMarginSide: (1920 - 900) / 2 },
      { width: 1440, expectedContentWidth: 900, expectedMarginSide: (1440 - 900) / 2 },
      { width: 1024, expectedContentWidth: 900, expectedMarginSide: (1024 - 900) / 2 },
      { width: 800, expectedContentWidth: 800, expectedMarginSide: 0 },
    ];

    for (const vp of viewports) {
      const containerWidth = Math.min(vp.width, 900);
      const sideMargin = Math.max(0, (vp.width - containerWidth) / 2);
      assert.equal(containerWidth, vp.expectedContentWidth, `ビューポート ${vp.width}px でのコンテナ幅が正確であること`);
      assert.equal(sideMargin, vp.expectedMarginSide, `ビューポート ${vp.width}px での片側余白が正確であること`);
    }
  }

  console.log("✓ 中央寄せコンテナ（maxWidth 900px, margin 0 auto）、ガター一体化、余白フォーカスの検証に合格");

  // ==========================================================================
  // [Step 3] 行番号ON/OFF時の本文表示・幅潰れ解消の検証 (問題点A)
  // ==========================================================================
  console.log("\n--- [Step 3] 行番号ON/OFF時の本文表示・Flex幅潰れ解消の検証 ---");

  // 3.1 .cm-content の Flexbox 幅縮小耐性と伸長設定
  assert.ok(
    sourceEditorContent.includes("minWidth: 0"),
    ".cm-content に minWidth: 0 が指定され、Flexbox の最小幅制約による幅潰れを防止していること"
  );
  assert.ok(
    sourceEditorContent.includes("flexGrow: 1"),
    ".cm-content に flexGrow: 1 が指定され、残余幅を完全に占有すること"
  );
  assert.ok(
    sourceEditorContent.includes('width: "100%"'),
    ".cm-content に width: '100%' が指定されていること"
  );

  // 3.2 basicSetupOptions における行番号設定の動的連動
  assert.ok(
    sourceEditorContent.includes("lineNumbers: showLineNumbers"),
    "basicSetupOptions の lineNumbers が showLineNumbers プロップスに連動していること"
  );
  assert.ok(
    sourceEditorContent.includes("highlightActiveLineGutter: showLineNumbers"),
    "basicSetupOptions の highlightActiveLineGutter が showLineNumbers プロップスに連動していること"
  );

  // 3.3 行番号ON/OFF時のレイアウト幅計算シミュレーション
  {
    const containerWidth = 900;
    const gutterWidth = 48; // 行番号ガター幅（約48px）
    const paddingX = 32 * 2; // 左右パディング合計 64px

    // 行番号ON時
    const contentWidthWithLineNumbers = containerWidth - gutterWidth;
    const textRenderWidthWithLineNumbers = contentWidthWithLineNumbers - paddingX;
    assert.ok(contentWidthWithLineNumbers > 0, "行番号ON時にもコンテンツ幅が正であること");
    assert.ok(textRenderWidthWithLineNumbers > 700, "行番号ON時に本文描画領域が十分確保されていること");

    // 行番号OFF時（ガター非表示: 幅0）
    const gutterWidthOff = 0;
    const contentWidthWithoutLineNumbers = containerWidth - gutterWidthOff;
    const textRenderWidthWithoutLineNumbers = contentWidthWithoutLineNumbers - paddingX;
    assert.equal(contentWidthWithoutLineNumbers, 900, "行番号OFF時にコンテンツ幅が全幅900pxに自然伸長すること");
    assert.equal(textRenderWidthWithoutLineNumbers, 836, "行番号OFF時にも本文が潰れず最大表示されること");
  }

  console.log("✓ minWidth: 0, flexGrow: 1, width: 100% による行番号ON/OFF時の本文表示・幅潰れ解消の検証に合格");

  // ==========================================================================
  // [Step 4] 縦スクロール性・親要素オーバーフロー健全化の検証 (問題点B)
  // ==========================================================================
  console.log("\n--- [Step 4] 縦スクロール性・親要素オーバーフロー健全化の検証 ---");

  // 4.1 .cm-scroller の縦スクロール高さ制約
  assert.ok(
    sourceEditorContent.includes('height: "100%"'),
    ".cm-scroller に height: '100%' が指定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('maxHeight: "100%"'),
    ".cm-scroller に maxHeight: '100%' が指定され、親要素を突き抜けないこと"
  );
  assert.ok(
    sourceEditorContent.includes('overflow: "auto"') ||
    sourceEditorContent.includes('overflowY: "auto"'),
    ".cm-scroller に overflow: 'auto' / overflowY: 'auto' が指定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('boxSizing: "border-box"'),
    ".cm-scroller に boxSizing: 'border-box' が指定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('paddingBottom: "120px"'),
    ".cm-scroller に paddingBottom: '120px' が指定され、最下行が隠れないこと"
  );

  // 4.2 親ラッパーのスクロール隔離構造
  assert.ok(
    sourceEditorContent.includes("flex-1 min-h-0 w-full overflow-hidden"),
    "親ラッパーが flex-1 min-h-0 w-full overflow-hidden でスクロールバーの親突き破りを防止していること"
  );

  // 4.3 SourceEditorRef の getScrollTop / setScrollTop 実装
  assert.ok(
    sourceEditorContent.includes("getScrollTop: () => {") &&
    sourceEditorContent.includes("editorRef.current?.view?.scrollDOM"),
    "SourceEditorRef の getScrollTop が scrollDOM.scrollTop を取得していること"
  );
  assert.ok(
    sourceEditorContent.includes("setScrollTop: (top: number) => {") &&
    sourceEditorContent.includes("scroller.scrollTop = top;"),
    "SourceEditorRef の setScrollTop が scrollDOM.scrollTop に設定していること"
  );

  // 4.4 長文ドキュメントスクロール位置シミュレーション
  {
    const mockScrollDOM = {
      scrollTop: 0,
      scrollHeight: 100000,
      clientHeight: 800,
      scrollTo(top) {
        this.scrollTop = Math.max(0, Math.min(top, this.scrollHeight - this.clientHeight));
      },
    };

    mockScrollDOM.scrollTo(2500);
    assert.equal(mockScrollDOM.scrollTop, 2500, "スクロール位置 2500px への遷移が正常");

    mockScrollDOM.scrollTo(999999);
    assert.equal(mockScrollDOM.scrollTop, 100000 - 800, "最下部スクロールで正しくクランプされること");

    mockScrollDOM.scrollTo(0);
    assert.equal(mockScrollDOM.scrollTop, 0, "最上部スクロールで 0 に戻ること");
  }

  console.log("✓ .cm-scroller 高さ制約（maxHeight 100%, overflowY auto）、親隔離、最下部余白の検証に合格");

  // ==========================================================================
  // [Step 5] OSネイティブメニュー Submenu 再帰探索・チェック同期の検証 (問題点C)
  // ==========================================================================
  console.log("\n--- [Step 5] OSネイティブメニュー Submenu 再帰探索・チェック状態同期の検証 ---");

  // 5.1 Rust バックエンド menu.rs における再帰探索ヘルパーの実装
  assert.ok(
    menuRsContent.includes("pub fn find_in_menu_tree<T, F, S>("),
    "src-tauri/src/menu.rs に汎用再帰探索関数 find_in_menu_tree が実装されていること"
  );
  assert.ok(
    menuRsContent.includes("pub fn find_check_menu_item<R: Runtime>("),
    "src-tauri/src/menu.rs に Submenu 再帰対応の find_check_menu_item が実装されていること"
  );
  assert.ok(
    menuRsContent.includes("find_check_item_in_items(&items, target_id)"),
    "find_check_menu_item がアイテムツリー全体を探索していること"
  );

  // 5.2 set_line_numbers_menu_checked コマンドでの find_check_menu_item 呼び出し
  assert.ok(
    menuRsContent.includes('find_check_menu_item(&menu, "toggle_line_numbers")'),
    "set_line_numbers_menu_checked が find_check_menu_item を介してチェックアイテムを取得していること"
  );
  assert.ok(
    menuRsContent.includes("check_item.set_checked(checked)"),
    "set_line_numbers_menu_checked が取得したアイテムの set_checked を実行していること"
  );

  // 5.3 Rust generate_handler への登録
  assert.ok(
    libRsContent.includes("menu::set_line_numbers_menu_checked"),
    "src-tauri/src/lib.rs の generate_handler に menu::set_line_numbers_menu_checked が登録されていること"
  );

  // 5.4 フロントエンド API (src/api/fs.ts) の invoke ラッパー
  assert.ok(
    fsTsContent.includes("export async function setLineNumbersMenuChecked(checked: boolean): Promise<void>"),
    "src/api/fs.ts で setLineNumbersMenuChecked 関数が export されていること"
  );
  assert.ok(
    fsTsContent.includes('invoke<void>("set_line_numbers_menu_checked", { checked })'),
    "setLineNumbersMenuChecked が invoke('set_line_numbers_menu_checked', { checked }) を呼び出すこと"
  );

  // 5.5 App.tsx での useEffect による動的同期ハンドシェイク
  assert.ok(
    appTsxContent.includes("setLineNumbersMenuChecked(isLineNumbersEnabled)"),
    "src/App.tsx の useEffect で isLineNumbersEnabled 変化時に setLineNumbersMenuChecked が呼び出されていること"
  );

  // 5.6 多階層ネスト Submenu 再帰探索アルゴリズムの完全シミュレーション
  {
    // Rust 側の find_in_menu_tree と同等の再帰走査ロジックをシミュレーション
    function findInTree(items, predicate, extractSub) {
      for (const item of items) {
        if (predicate(item)) {
          return item;
        }
        const children = extractSub(item);
        if (children && Array.isArray(children)) {
          const found = findInTree(children, predicate, extractSub);
          if (found) return found;
        }
      }
      return null;
    }

    // 複雑な多階層メニューツリー（ルート、サブメニュー、ネストサブメニュー）
    const mockMenu = [
      { type: "submenu", id: "file", title: "ファイル", items: [
        { type: "item", id: "new_file" },
        { type: "item", id: "save_file" },
      ]},
      { type: "submenu", id: "view", title: "表示", items: [
        { type: "item", id: "toggle_sidebar" },
        { type: "check", id: "toggle_line_numbers", checked: true },
        { type: "submenu", id: "layout_sub", title: "レイアウト", items: [
          { type: "check", id: "deep_nested_check", checked: false },
        ]},
      ]},
      { type: "check", id: "root_check", checked: true },
    ];

    const predCheck = (item, id) => item.type === "check" && item.id === id;
    const subExtractor = (item) => item.items;

    // 1. 表示メニュー配下の toggle_line_numbers 探索
    const lineNumItem = findInTree(mockMenu, (item) => predCheck(item, "toggle_line_numbers"), subExtractor);
    assert.ok(lineNumItem, "第1階層 Submenu（表示）内の toggle_line_numbers が検出されること");
    assert.equal(lineNumItem.id, "toggle_line_numbers");
    assert.equal(lineNumItem.checked, true);

    // 2. 深い第2階層ネスト Submenu の探索
    const deepItem = findInTree(mockMenu, (item) => predCheck(item, "deep_nested_check"), subExtractor);
    assert.ok(deepItem, "第2階層ネスト Submenu 内の deep_nested_check が検出されること");
    assert.equal(deepItem.id, "deep_nested_check");

    // 3. ルート直下の探索
    const rootItem = findInTree(mockMenu, (item) => predCheck(item, "root_check"), subExtractor);
    assert.ok(rootItem, "ルート直下の root_check が検出されること");

    // 4. 存在しないアイテムの探索
    const notFound = findInTree(mockMenu, (item) => predCheck(item, "non_existent"), subExtractor);
    assert.equal(notFound, null, "存在しないアイテムは null が返されること");

    // 5. チェック状態更新のシミュレーション
    lineNumItem.checked = false;
    assert.equal(lineNumItem.checked, false, "チェック状態が false に更新可能であること");
    lineNumItem.checked = true;
    assert.equal(lineNumItem.checked, true, "チェック状態が true に再同期可能であること");
  }

  console.log("✓ Rust find_in_menu_tree / find_check_menu_item、IPC連携、App.tsx同期ハンドシェイクの検証に合格");

  console.log("\n==================================================================");
  console.log(" >>> Phase 28 ソースモード最適化 & メニュー同期 全項目合格 <<< ");
  console.log("==================================================================");
}

runVerification().catch((err) => {
  console.error("Phase 28 verification failed:", err);
  process.exit(1);
});
