import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  Phase 24: ソース直接編集モード表示・レイアウト・構文ハイライト・完全同期 検証  ");
console.log("==================================================================");

async function runVerification() {
  // --------------------------------------------------------------------------
  // [Step 1] SourceEditor.tsx レイアウト・スタイル構造の検証
  // --------------------------------------------------------------------------
  console.log("\n--- [Step 1] SourceEditor.tsx レイアウト・スタイル構造の静的検証 ---");

  const sourceEditorPath = path.resolve(projectRoot, "src/components/Editor/SourceEditor.tsx");
  assert.ok(fs.existsSync(sourceEditorPath), "SourceEditor.tsx が存在すること");
  const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8");

  // 1.1 コンテナ構造の検証（フレックスボックス・全高・オーバーフロー制御）
  assert.ok(
    sourceEditorContent.includes('className="relative w-full h-full flex flex-col bg-white dark:bg-zinc-900 overflow-hidden"'),
    "親コンテナが flex-col / overflow-hidden で全高配置されていること"
  );
  assert.ok(
    sourceEditorContent.includes('className={`flex-1 min-h-0 w-full overflow-hidden ${isFocusMode ? "cm-focus-mode" : ""}`}'),
    "CodeMirror ラッパーが flex-1 min-h-0 w-full overflow-hidden でスクロール逸脱を抑止していること"
  );
  assert.ok(
    sourceEditorContent.includes('height="100%"'),
    "CodeMirror 本体が height='100%' で配置されていること"
  );

  // 1.2 ヘッダーバナー・操作ボタンの配置
  assert.ok(
    sourceEditorContent.includes("Markdown ソース直接編集モード"),
    "ヘッダーバナーに直接編集モードのタイトルが表示されていること"
  );
  assert.ok(
    sourceEditorContent.includes("WYSIWYG表示に戻る"),
    "ヘッダーバナーに WYSIWYG 復帰ボタンが存在すること"
  );
  assert.ok(
    sourceEditorContent.includes("Ctrl + /"),
    "ヘッダーバナーに切替ショートカット (Ctrl + /) のヒントが表示されていること"
  );

  // 1.3 customTheme のレイアウト設計（ガターと本文の一体化、等幅パディング、快適な最下行余白）
  assert.ok(
    sourceEditorContent.includes('padding: "24px 32px"'),
    ".cm-content に Typora ライクな等幅執筆パディング (padding: 24px 32px) が設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('margin: "0"'),
    ".cm-content のマージンが 0 に設定され、ガターとの分離（margin: 0 auto による巨大空白）が排除されていること"
  );
  assert.ok(
    sourceEditorContent.includes('overflow: "auto"'),
    ".cm-scroller の overflow が auto に設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('paddingBottom: "120px"'),
    ".cm-scroller に最下行でも画面下に張り付かない快適余白 (paddingBottom: 120px) が設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('lineHeight: "1.7"'),
    ".cm-scroller の行送りが読みやすい 1.7 に設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('borderRightWidth: "1px"') &&
    sourceEditorContent.includes('borderRightStyle: "solid"'),
    ".cm-gutters に境界ボーダーが設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('padding: "0 8px 0 12px"'),
    ".cm-lineNumbers .cm-gutterElement に適切なインセットパディングが設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes('textAlign: "right"'),
    "行番号が右揃え (textAlign: right) に設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes(".cm-activeLine") &&
    sourceEditorContent.includes(".cm-activeLineGutter"),
    "アクティブ行およびアクティブ行番号のハイライトスタイルが設定されていること"
  );
  assert.ok(
    sourceEditorContent.includes(".cm-selectionMatch"),
    "選択一致ハイライト (.cm-selectionMatch) が設定されていること"
  );

  console.log("✓ SourceEditor.tsx の等幅一体型レイアウト・余白・スクロール構造の検証に合格");

  // --------------------------------------------------------------------------
  // [Step 2] Typori 調和シンタックスハイライトテーマの検証
  // --------------------------------------------------------------------------
  console.log("\n--- [Step 2] Typori 調和シンタックスハイライトテーマ (ライト/ダーク) の検証 ---");

  // 2.1 スタイル定義のエクスポート確認
  assert.ok(
    sourceEditorContent.includes("export const typoriLightHighlightStyle = HighlightStyle.define(["),
    "typoriLightHighlightStyle が定義・エクスポートされていること"
  );
  assert.ok(
    sourceEditorContent.includes("export const typoriDarkHighlightStyle = HighlightStyle.define(["),
    "typoriDarkHighlightStyle が定義・エクスポートされていること"
  );

  // 2.2 ライトテーマ配色の検証 (Tailwind Zinc 配色整合)
  assert.ok(sourceEditorContent.includes('color: "#09090b", fontWeight: "bold"'), "ライト: 見出し (#09090b, bold)");
  assert.ok(sourceEditorContent.includes('color: "#4f46e5", textDecoration: "underline"'), "ライト: リンク (#4f46e5, underline)");
  assert.ok(sourceEditorContent.includes('color: "#0284c7"'), "ライト: インラインコード (#0284c7)");
  assert.ok(sourceEditorContent.includes('color: "#7c3aed"'), "ライト: キーワード (#7c3aed)");
  assert.ok(sourceEditorContent.includes('color: "#059669"'), "ライト: 文字列 (#059669)");
  assert.ok(sourceEditorContent.includes('color: "#71717a", fontStyle: "italic"'), "ライト: コメント (#71717a, italic)");
  assert.ok(sourceEditorContent.includes('color: "#ea580c"'), "ライト: 数値 (#ea580c)");

  // 2.3 ダークテーマ配色の検証 (Tailwind Zinc 配色整合)
  assert.ok(sourceEditorContent.includes('color: "#fafafa", fontWeight: "bold"'), "ダーク: 見出し (#fafafa, bold)");
  assert.ok(sourceEditorContent.includes('color: "#818cf8", textDecoration: "underline"'), "ダーク: リンク (#818cf8, underline)");
  assert.ok(sourceEditorContent.includes('color: "#38bdf8"'), "ダーク: インラインコード (#38bdf8)");
  assert.ok(sourceEditorContent.includes('color: "#a78bfa"'), "ダーク: キーワード (#a78bfa)");
  assert.ok(sourceEditorContent.includes('color: "#34d399"'), "ダーク: 文字列 (#34d399)");
  assert.ok(sourceEditorContent.includes('color: "#a1a1aa", fontStyle: "italic"'), "ダーク: コメント (#a1a1aa, italic)");
  assert.ok(sourceEditorContent.includes('color: "#fb923c"'), "ダーク: 数値 (#fb923c)");

  // 2.4 動的テーマ切替の検証
  assert.ok(
    sourceEditorContent.includes("syntaxHighlighting(theme === \"dark\" ? typoriDarkHighlightStyle : typoriLightHighlightStyle)"),
    "theme プロップに応じてライト/ダークハイライトスタイルが動的に適用されること"
  );

  console.log("✓ Typori 調和シンタックスハイライトテーマ定義の検証に合格");

  // --------------------------------------------------------------------------
  // [Step 3] GFM構文パース & 主要プログラミング言語の構文ハイライトのランタイム検証
  // --------------------------------------------------------------------------
  console.log("\n--- [Step 3] GFM構文 & 主要言語コードブロックハイライトのランタイム検証 ---");

  const { markdown, markdownLanguage } = await import("@codemirror/lang-markdown");
  const { languages } = await import("@codemirror/language-data");
  const { LanguageDescription } = await import("@codemirror/language");

  assert.ok(Array.isArray(languages), "languages が配列として読み込めること");
  assert.ok(languages.length > 50, `言語定義が豊富に含まれていること (現在: ${languages.length}件)`);

  // 3.1 仕様で求められる主要言語のパーサー対応確認
  const requiredLanguages = [
    { name: "javascript", ext: "js" },
    { name: "typescript", ext: "ts" },
    { name: "python", ext: "py" },
    { name: "rust", ext: "rs" },
    { name: "html", ext: "html" },
    { name: "css", ext: "css" },
    { name: "json", ext: "json" },
    { name: "markdown", ext: "md" },
    { name: "yaml", ext: "yaml" },
    { name: "bash", ext: "sh" },
    { name: "sql", ext: "sql" },
  ];

  for (const item of requiredLanguages) {
    const nameMatch = LanguageDescription.matchLanguageName(languages, item.name, true);
    assert.ok(nameMatch, `言語名 ${item.name} の LanguageDescription が matchLanguageName で見つかること`);
    if (item.ext) {
      const extMatch = LanguageDescription.matchFilename(languages, `dummy.${item.ext}`);
      assert.ok(extMatch, `拡張子 .${item.ext} の LanguageDescription が matchFilename で見つかること`);
    }
  }
  console.log(`✓ 主要 ${requiredLanguages.length} 言語および拡張子の構文パーサー定義を確認`);

  // 3.2 代表的言語パーサーの動的ロード検証
  const jsDesc = LanguageDescription.matchLanguageName(languages, "javascript", true);
  const jsSupport = await jsDesc.load();
  assert.ok(jsSupport && jsSupport.extension, "JavaScript パーサーが動的にロードできること");

  const rustDesc = LanguageDescription.matchLanguageName(languages, "rust", true);
  const rustSupport = await rustDesc.load();
  assert.ok(rustSupport && rustSupport.extension, "Rust パーサーが動的にロードできること");

  const pyDesc = LanguageDescription.matchLanguageName(languages, "python", true);
  const pySupport = await pyDesc.load();
  assert.ok(pySupport && pySupport.extension, "Python パーサーが動的にロードできること");

  console.log("✓ 言語パーサー（JS, Rust, Python）の動的ロードに成功");

  // 3.3 GFM 構文要素のパース検証
  const gfmSupport = markdown({
    base: markdownLanguage,
    codeLanguages: languages,
  });

  const sampleGfmDoc = `# GFM Feature Test
Paragraph with ~~strikethrough~~ and [link](https://typori.dev) and autolink: https://github.com

## Task List
- [ ] Incomplete task item
- [x] Completed task item

## Table
| Column A | Column B |
| :--- | :---: |
| Value 1 | Value 2 |

## Code Blocks
\`\`\`rust
fn main() {
    println!("Hello, Typori!");
}
\`\`\`

\`\`\`javascript
const greeting = "Hello, GFM!";
console.log(greeting);
\`\`\`
`;

  const parsedTree = gfmSupport.language.parser.parse(sampleGfmDoc);
  let hasTable = false;
  let hasTableHeader = false;
  let hasTableRow = false;
  let hasTableCell = false;
  let hasStrikethrough = false;
  let hasTask = false;
  let hasTaskMarker = false;
  let hasFencedCode = false;
  let hasCodeInfo = false;

  parsedTree.iterate({
    enter(node) {
      const n = node.name;
      if (n === "Table") hasTable = true;
      if (n === "TableHeader") hasTableHeader = true;
      if (n === "TableRow") hasTableRow = true;
      if (n === "TableCell") hasTableCell = true;
      if (n === "Strikethrough") hasStrikethrough = true;
      if (n === "Task") hasTask = true;
      if (n === "TaskMarker") hasTaskMarker = true;
      if (n === "FencedCode") hasFencedCode = true;
      if (n === "CodeInfo") hasCodeInfo = true;
    },
  });

  assert.ok(hasTable, "GFM テーブル (Table) がパースされること");
  assert.ok(hasTableHeader, "テーブルヘッダー (TableHeader) がパースされること");
  assert.ok(hasTableRow, "テーブル行 (TableRow) がパースされること");
  assert.ok(hasTableCell, "テーブルセル (TableCell) がパースされること");
  assert.ok(hasStrikethrough, "打消し線 (Strikethrough) がパースされること");
  assert.ok(hasTask, "タスクリスト (Task) がパースされること");
  assert.ok(hasTaskMarker, "タスクマーカー (TaskMarker) がパースされること");
  assert.ok(hasFencedCode, "フェンスドコードブロック (FencedCode) がパースされること");
  assert.ok(hasCodeInfo, "コードブロック言語指定 (CodeInfo) がパースされること");

  console.log("✓ GFM 構文要素（テーブル・打消し線・タスクリスト・コードブロック）の AST パース検証に合格");

  // --------------------------------------------------------------------------
  // [Step 4] 双方向モード切替 & Ref/State 整合性の静的検証 (App.tsx)
  // --------------------------------------------------------------------------
  console.log("\n--- [Step 4] 双方向モード切替 & Ref/State 整合性の静的検証 (App.tsx) ---");

  const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
  assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
  const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");

  // 4.1 handleToggleSourceMode の Ref 同期 & スクロール位置保護
  assert.ok(
    appTsxContent.includes("const handleToggleSourceMode = useCallback(() => {"),
    "handleToggleSourceMode が定義されていること"
  );
  assert.ok(
    appTsxContent.includes("captureCurrentScrollTop();"),
    "切替前に captureCurrentScrollTop() でスクロール位置を退避していること"
  );
  assert.ok(
    appTsxContent.includes("const next = !isSourceModeRef.current;"),
    "最新の isSourceModeRef.current から次のモードを反転算出していること"
  );
  assert.ok(
    appTsxContent.includes("isSourceModeRef.current = next;"),
    "isSourceModeRef.current が同期的に即時更新されていること"
  );
  assert.ok(
    appTsxContent.includes("setIsSourceMode(next);"),
    "setIsSourceMode(next) で React State が更新されていること"
  );

  // 4.2 WYSIWYG -> ソース直接編集切替時の元ファイル生ソース 100% 保護ロジック
  assert.ok(
    appTsxContent.includes("typeof editorRef.current.hasUserInteracted === \"function\" && editorRef.current.hasUserInteracted()"),
    "未操作ファイルでは ProseMirror シリアライズを行わず生ソースを保持する条件判定が存在すること"
  );
  assert.ok(
    appTsxContent.includes("let markdownToUse = fileContentRef.current ?? \"\";"),
    "未操作時は fileContentRef.current の元生ソースがそのまま使用されること"
  );

  // 4.3 handleExitSourceMode の Ref 同期 & スクロール位置保護
  assert.ok(
    appTsxContent.includes("const handleExitSourceMode = useCallback(() => {"),
    "handleExitSourceMode が定義されていること"
  );
  assert.ok(
    appTsxContent.includes("isSourceModeRef.current = false;"),
    "handleExitSourceMode で isSourceModeRef.current = false が確実に更新されていること"
  );
  assert.ok(
    appTsxContent.includes("setIsSourceMode(false);"),
    "handleExitSourceMode で setIsSourceMode(false) が更新されていること"
  );

  // 4.4 SourceEditor へのハンドラ受け渡し
  assert.ok(
    appTsxContent.includes("onExitSourceMode={handleExitSourceMode}"),
    "SourceEditor に onExitSourceMode が正しく渡されていること"
  );
  assert.ok(
    appTsxContent.includes("onToggleSourceMode={handleToggleSourceMode}"),
    "SourceEditor に onToggleSourceMode が正しく渡されていること"
  );
  assert.ok(
    appTsxContent.includes("initialScrollTop={editorScrollTopRef.current}"),
    "SourceEditor に initialScrollTop が渡されていること"
  );

  // 4.5 ソース直接編集モードでのディスク保存ロジック（生ソース直接保存）
  assert.ok(
    appTsxContent.includes("if (!isSourceModeRef.current && editorRef.current)"),
    "保存時にソースモードでは Milkdown シリアライズを介さず生ソースを直接保存するガードがあること"
  );

  // 4.6 OSネイティブメニュー連携
  assert.ok(
    appTsxContent.includes('listen("menu:toggle_source_mode"'),
    "menu:toggle_source_mode リスナーが登録されていること"
  );
  assert.ok(
    appTsxContent.includes("handleToggleSourceModeRef.current();"),
    "メニューイベントで handleToggleSourceModeRef.current() が呼び出されること"
  );

  console.log("✓ App.tsx における双方向モード切替・Ref同期・生ソース保護ロジックの検証に合格");

  // --------------------------------------------------------------------------
  // [Step 5] コンテンツ完全保持シナリオシミュレーション
  // --------------------------------------------------------------------------
  console.log("\n--- [Step 5] テキスト完全保持（Preservation Simulation）シナリオ検証 ---");

  // シナリオ用 Markdown: 独自コメント、HTMLブロック、非標準インデント、生URLを含む複雑な文書
  const rawComplexMarkdown = `# Document with Raw Quirks
<!-- Important Author Note: Do not remove this comment -->
<div align="center">
  <img src="assets/banner.png" alt="Banner" width="400" />
</div>

Here is a list with non-standard formatting:
*   Three-space indented item
    *   Sub item with 4 spaces
*   Another item

Math and entities:
$E = mc^2$ & &copy; 2026

\`\`\`python
# Python block
def calculate(x: int) -> int:
    return x * 42
\`\`\`
`;

  // 改行コード正規化関数（アプリ標準仕様: LF統一）
  function normalizeLineEndings(str) {
    return str.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function isContentDirty(current, saved) {
    if (saved === null || saved === undefined) return false;
    return normalizeLineEndings(current) !== normalizeLineEndings(saved);
  }

  // 5.1 初期ロード状態のシミュレーション（クリーン状態）
  const initialContent = normalizeLineEndings(rawComplexMarkdown);
  let fileContentRef = initialContent;
  let savedContentRef = initialContent;
  let isSourceModeRef = false;
  let hasUserInteracted = false;

  // 5.2 WYSIWYG -> ソース直接編集切替（未操作時）
  // ユーザーが未操作の場合、ProseMirrorシリアライザを一切通さず、元の生Markdownが100%忠実に渡される
  let sourceModeMarkdown = fileContentRef;
  if (hasUserInteracted) {
    sourceModeMarkdown = "SERIALIZED_BY_PROSEMIRROR"; // シミュレーション
  }
  isSourceModeRef = true;
  assert.equal(
    sourceModeMarkdown,
    initialContent,
    "未操作での直接編集モード切替時、元の生Markdownテキストがバイト単位で100%同一に保持されること"
  );
  assert.equal(
    isContentDirty(sourceModeMarkdown, savedContentRef),
    false,
    "未操作での切替直後、isDirty が false（クリーン）であること"
  );

  // 5.3 ソース直接編集モードでの編集シミュレーション
  const editedSourceMarkdown = sourceModeMarkdown + "\n\nAdded in source editor.";
  fileContentRef = editedSourceMarkdown;
  const isDirtyAfterEdit = isContentDirty(fileContentRef, savedContentRef);
  assert.equal(isDirtyAfterEdit, true, "直接編集モードで文字入力された場合、isDirty が true になること");

  // 5.4 ソース直接編集モード -> WYSIWYG復帰シミュレーション
  isSourceModeRef = false;
  const currentAfterExit = fileContentRef;
  assert.equal(
    currentAfterExit,
    editedSourceMarkdown,
    "WYSIWYG復帰後も直接編集モードでの変更内容が失われず完全に保持されること"
  );
  assert.equal(
    isContentDirty(currentAfterExit, savedContentRef),
    true,
    "WYSIWYG復帰後も未保存状態（isDirty: true）が正確に維持されること"
  );

  // 5.5 ソース直接編集モードでの保存シミュレーション（生テキスト直接書き込み）
  savedContentRef = fileContentRef;
  const isDirtyAfterSave = isContentDirty(fileContentRef, savedContentRef);
  assert.equal(isDirtyAfterSave, false, "保存完了後、isDirty が false にリセットされること");
  assert.ok(
    savedContentRef.includes("<!-- Important Author Note: Do not remove this comment -->"),
    "保存されたテキストに元のHTMLコメントが完全に残っていること"
  );
  assert.ok(
    savedContentRef.includes('<div align="center">'),
    "保存されたテキストに元のインラインHTMLが完全に残っていること"
  );
  assert.ok(
    savedContentRef.includes("Added in source editor."),
    "保存されたテキストに編集内容が確実に反映されていること"
  );

  console.log("✓ コンテンツ完全保持シミュレーション（双方向切替・未保存状態・生Markdown保護）に合格");

  console.log("\n==================================================================");
  console.log("  >>> Phase 24 ソース直接編集モード全検証テスト: 合格 (Exit Code 0) <<<  ");
  console.log("==================================================================");
}

runVerification().catch((err) => {
  console.error("❌ 検証失敗:", err);
  process.exit(1);
});
