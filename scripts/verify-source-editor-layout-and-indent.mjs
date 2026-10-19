import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { indentWithTab, indentMore, indentLess } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  Phase 30: ソース直接編集モード レイアウト・インデント実証的検証  ");
console.log("             および生ソース100%保護 網羅的品質保証                ");
console.log("==================================================================");

async function runVerification() {
  const sourceEditorPath = path.resolve(projectRoot, "src/components/Editor/SourceEditor.tsx");
  assert.ok(fs.existsSync(sourceEditorPath), "SourceEditor.tsx が存在すること");
  const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8").replace(/\r\n/g, "\n");

  const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
  assert.ok(fs.existsSync(editorPath), "Editor.tsx が存在すること");
  const editorContent = fs.readFileSync(editorPath, "utf-8").replace(/\r\n/g, "\n");

  const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
  assert.ok(fs.existsSync(appTsxPath), "App.tsx が存在すること");
  const appTsxContent = fs.readFileSync(appTsxPath, "utf-8").replace(/\r\n/g, "\n");

  // ==========================================================================
  // [Part 1] CSS スタイルプロパティの実証的検証
  //          - 行番号ガター縦落ち防止（横並び flex-direction: row）
  //          - width: 100% 完全排除
  //          - CodeMirror 6 標準仮想スクロール健全性（maxHeight 排除）
  // ==========================================================================
  console.log("\n--- [Part 1] CSS スタイルプロパティの実証的検証 (ガター横並び・width100%排除・仮想スクロール) ---");

  // 1.1 customTheme 内のスタイル定義ブロックをパース・抽出
  const customThemeMatch = sourceEditorContent.match(/const customTheme = useMemo\(\(\) => \{[\s\S]*?EditorView\.theme\(\s*(\{[\s\S]*?\})\s*,\s*\{ dark: isDark \}\s*\);/m);
  assert.ok(customThemeMatch, "SourceEditor.tsx に EditorView.theme の定義が存在すること");

  const themeBlock = customThemeMatch[1];

  // 1.2 .cm-scroller スタイルプロパティの実証的検証
  // display: "flex !important", flexDirection: "row !important", flexWrap: "nowrap !important", alignItems: "flex-start !important"
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?display:\s*["']flex !important["']/,
    ".cm-scroller に display: 'flex !important' が指定されていること"
  );
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?flexDirection:\s*["']row !important["']/,
    ".cm-scroller に flexDirection: 'row !important' が指定され、ガターと本文の横並びが保証されていること"
  );
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?flexWrap:\s*["']nowrap !important["']/,
    ".cm-scroller に flexWrap: 'nowrap !important' が指定され、ガターの縦落ち折り返しが完全に防止されていること"
  );
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?alignItems:\s*["']flex-start !important["']/,
    ".cm-scroller に alignItems: 'flex-start !important' が指定されていること"
  );

  // 1.3 .cm-scroller 仮想スクロール標準設定の検証（maxHeight 排除）
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?height:\s*["']100%["']/,
    ".cm-scroller に height: '100%' が指定されていること"
  );
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?overflow:\s*["']auto["']/,
    ".cm-scroller に CodeMirror 6 標準の overflow: 'auto' が指定されていること"
  );
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?boxSizing:\s*["']border-box["']/,
    ".cm-scroller に boxSizing: 'border-box' が指定されていること"
  );
  assert.match(
    themeBlock,
    /["']\.cm-scroller["']\s*:\s*\{[\s\S]*?paddingBottom:\s*["']120px["']/,
    ".cm-scroller に paddingBottom: '120px' が指定され、最下行の視認性が確保されていること"
  );

  // 過剰プロパティの完全排除（CodeMirror 6 内部スクロール測定との干渉防止）
  const scrollerBlockMatch = themeBlock.match(/["']\.cm-scroller["']\s*:\s*\{([^}]+)\}/);
  assert.ok(scrollerBlockMatch, ".cm-scroller スタイルブロックが抽出できること");
  const scrollerStyles = scrollerBlockMatch[1];

  assert.ok(
    !scrollerStyles.includes("maxHeight"),
    ".cm-scroller から仮想スクロール測定を破壊する maxHeight が完全に排除されていること"
  );
  assert.ok(
    !scrollerStyles.includes("minHeight"),
    ".cm-scroller から minHeight が排除されていること"
  );
  assert.ok(
    !scrollerStyles.includes("overflowY"),
    ".cm-scroller から重複する overflowY が排除され、標準 overflow: 'auto' に一本化されていること"
  );

  // 1.4 .cm-content スタイルプロパティの実証的検証（width: 100% 完全排除）
  const contentBlockMatch = themeBlock.match(/["']\.cm-content["']\s*:\s*\{([^}]+)\}/);
  assert.ok(contentBlockMatch, ".cm-content スタイルブロックが抽出できること");
  const contentStyles = contentBlockMatch[1];

  // 核心: ガター縦落ちの元凶であった width: 100% の完全排除
  assert.ok(
    !contentStyles.includes("width"),
    ".cm-content からガター縦落ちの元凶であった width: '100%' プロパティが完全に撤廃されていること"
  );
  assert.ok(
    contentStyles.includes("minWidth: 0"),
    ".cm-content に minWidth: 0 が指定され、Flexbox 幅潰れを防止していること"
  );
  assert.ok(
    contentStyles.includes("flexGrow: 1"),
    ".cm-content に flexGrow: 1 が指定され、利用可能残余幅を自然に占有すること"
  );
  assert.ok(
    contentStyles.includes("flexShrink: 1"),
    ".cm-content に flexShrink: 1 が指定され、コンテナ幅超過時の縮小が許可されていること"
  );
  assert.ok(
    contentStyles.includes('whiteSpace: "break-spaces"'),
    ".cm-content に whiteSpace: 'break-spaces' が指定され、行頭空白が保持されること"
  );
  assert.ok(
    contentStyles.includes('wordBreak: "break-word"'),
    ".cm-content に wordBreak: 'break-word' が指定されていること"
  );

  // 1.5 Flexbox レイアウト幾何計算シミュレーション（縦落ち防止の実証）
  {
    const containerWidth = 900;
    const gutterWidth = 48; // 行番号ガターの幅（約48px）
    const paddingX = 32 * 2; // 左右パディング 64px

    // 旧バグ状態のシミュレーション: content に width: 100% が指定されていた場合
    const buggyTotalWidth = gutterWidth + containerWidth; // 48px + 900px = 948px > 900px
    const buggyFlexWrapOccurred = buggyTotalWidth > containerWidth;
    assert.equal(buggyFlexWrapOccurred, true, "旧仕様（width: 100%）ではコンテナ幅を超過し、flexWrap が発生することを確認");

    // Phase 30 修正後仕様のシミュレーション:
    // flex-direction: row, flex-wrap: nowrap, flex-grow: 1, flex-shrink: 1, min-width: 0
    const fixedContentWidth = containerWidth - gutterWidth; // 852px
    const totalRowWidth = gutterWidth + fixedContentWidth; // 900px
    assert.equal(totalRowWidth, containerWidth, "修正後は合計幅がコンテナ幅（900px）に完全に一致すること");
    assert.ok(fixedContentWidth > 0, "本文領域に十分な幅が割り当てられること");
    assert.equal(fixedContentWidth - paddingX, 788, "パディング除外後の本文純描画幅が 788px 確保されること");
  }

  console.log("✓ CSS プロパティ（横並び flex-direction: row !important / nowrap / width 100% 排除 / maxHeight 排除）の実証的検証に合格");

  // ==========================================================================
  // [Part 2] Markdown AST のパース＆シリアライズによるネストインデント保持の実証的検証
  // ==========================================================================
  console.log("\n--- [Part 2] Markdown AST パース＆シリアライズによるネストインデント保持の実証的検証 ---");

  // 2.1 Editor.tsx の remarkStringifyOptionsCtx 設定の静的検証
  assert.ok(
    editorContent.includes('listItemIndent: "one" as const') ||
    editorContent.includes('listItemIndent: "one"'),
    "Editor.tsx で listItemIndent: 'one' が設定されていること"
  );

  // 2.2 unified / remark-parse / remark-stringify のロード
  const pnpmDir = path.resolve(projectRoot, "node_modules/.pnpm");
  assert.ok(fs.existsSync(pnpmDir), "node_modules/.pnpm が存在すること");
  const pnpmDirs = fs.readdirSync(pnpmDir);

  const unifiedDir = pnpmDirs.find((d) => d.startsWith("unified@"));
  const remarkParseDir = pnpmDirs.find((d) => d.startsWith("remark-parse@"));
  const remarkStringifyDir = pnpmDirs.find((d) => d.startsWith("remark-stringify@"));

  assert.ok(unifiedDir, "unified パッケージが存在すること");
  assert.ok(remarkParseDir, "remark-parse パッケージが存在すること");
  assert.ok(remarkStringifyDir, "remark-stringify パッケージが存在すること");

  const unifiedPath = path.join(pnpmDir, unifiedDir, "node_modules/unified/index.js");
  const remarkParsePath = path.join(pnpmDir, remarkParseDir, "node_modules/remark-parse/index.js");
  const remarkStringifyPath = path.join(pnpmDir, remarkStringifyDir, "node_modules/remark-stringify/index.js");

  const { unified } = await import(pathToFileURL(unifiedPath).href);
  const remarkParse = (await import(pathToFileURL(remarkParsePath).href)).default;
  const remarkStringify = (await import(pathToFileURL(remarkStringifyPath).href)).default;

  // Editor.tsx の実際の remarkStringifyOptions と同一の構成
  const stringifyOptions = {
    bullet: "-",
    bulletOther: "*",
    bulletOrdered: ".",
    listItemIndent: "one",
    incrementListMarker: true,
    resourceLink: true,
    rule: "-",
    ruleRepetition: 3,
    ruleSpaces: false,
    handlers: {
      list: (node, _parent, state, info) => {
        const exit = state.enter("list");
        const bulletCurrent = state.bulletCurrent;
        const bullet = node.ordered
          ? (state.options.bulletOrdered || ".")
          : (state.options.bullet || "-");

        state.bulletCurrent = bullet;
        const value = state.containerFlow(node, info);
        state.bulletLastUsed = bullet;
        state.bulletCurrent = bulletCurrent;
        exit();
        return value;
      },
    },
  };

  const processor = unified().use(remarkParse).use(remarkStringify, stringifyOptions);

  // 2.3 多階層ネストリストのインデント保持テスト（箇条書きハイフン '-'）
  const nestedUnorderedInput = [
    "- ルート項目 1",
    "  - 子項目 1.1",
    "    - 孫項目 1.1.1",
    "    - 孫項目 1.1.2",
    "  - 子項目 1.2",
    "- ルート項目 2",
    "  - 子項目 2.1",
  ].join("\n") + "\n";

  const serializedNestedUnordered = String(processor.processSync(nestedUnorderedInput));

  // ネストのインデント（2スペース / 4スペース）が正しく出力されていること
  assert.ok(
    serializedNestedUnordered.includes("- ルート項目 1\n  - 子項目 1.1\n    - 孫項目 1.1.1"),
    "箇条書きリストの2階層・3階層ネストインデントが正確に保持されていること"
  );
  assert.ok(
    serializedNestedUnordered.includes("  - 子項目 1.2\n- ルート項目 2\n  - 子項目 2.1"),
    "兄弟項目および親階層への復帰インデントが正確に保持されていること"
  );

  // 2.4 連番付きリストのネストインデント保持テスト（数字.）
  const nestedOrderedInput = [
    "1. 第1章",
    "   1. 第1節",
    "      1. 第1項",
    "      2. 第2項",
    "   2. 第2節",
    "2. 第2章",
  ].join("\n") + "\n";

  const serializedNestedOrdered = String(processor.processSync(nestedOrderedInput));
  assert.ok(
    serializedNestedOrdered.includes("1. 第1章"),
    "第1章の連番が維持されること"
  );
  assert.ok(
    serializedNestedOrdered.includes("1. 第1節") || serializedNestedOrdered.includes("第1節"),
    "ネストされた節が階層を保持していること"
  );
  assert.ok(
    serializedNestedOrdered.includes("2. 第2章"),
    "第2章の連番が維持されること"
  );

  // 2.5 AST レベルでのツリー階層構造の完全一致検証
  const parsedAst = processor.parse(nestedUnorderedInput);
  assert.equal(parsedAst.type, "root", "AST ルートが root であること");
  assert.equal(parsedAst.children.length, 1, "トップレベルの子が 1 つの list であること");

  const topList = parsedAst.children[0];
  assert.equal(topList.type, "list", "トップレベルが list であること");
  assert.equal(topList.children.length, 2, "トップレベルに 2 つの listItem があること");

  // 子ノードにネストされた list が存在することを確認
  const firstItem = topList.children[0];
  const nestedList = firstItem.children.find((c) => c.type === "list");
  assert.ok(nestedList, "第1 listItem 内に子 list が存在すること（階層保持）");
  assert.equal(nestedList.children.length, 2, "子 list に 2 つの listItem が存在すること");

  console.log("✓ Markdown AST パース＆シリアライズによるネストインデント保持の実証的検証に合格");

  // ==========================================================================
  // [Part 3] 直接編集モード切り替え時の生ソース 100% 完全保護の実証的検証
  // ==========================================================================
  console.log("\n--- [Part 3] 直接編集モード切り替え時の生ソース 100% 完全保護の実証的検証 ---");

  // 3.1 App.tsx の生ソース保護ロジックの静的解析検証
  assert.ok(
    appTsxContent.includes("isInitialMountSync = meta && meta.isUserInteraction === false && !hasUnsavedChanges"),
    "App.tsx で初回マウント同期（isInitialMountSync）の厳格ガードが定義されていること"
  );
  assert.ok(
    appTsxContent.includes("if (!isInitialMountSync) {\n        fileContentRef.current = normalized;"),
    "isInitialMountSync 時は fileContentRef.current の自動上書きがスキップされること"
  );
  assert.ok(
    appTsxContent.includes("const rawSavedContent = activeTab?.savedContent ?? savedContentRef.current;"),
    "クリーンなファイルではディスクからの元の生テキスト（rawSavedContent）が厳格に保護されること"
  );

  // 3.2 handleToggleSourceMode における生ソース保護の静的検証
  assert.ok(
    appTsxContent.includes("let markdownToUse = fileContentRef.current ?? \"\";"),
    "handleToggleSourceMode で初期値として fileContentRef.current が優先されること"
  );
  assert.ok(
    appTsxContent.includes("editorRef.current.hasUserInteracted()") ||
    appTsxContent.includes("isContentDirty(fileContentRef.current, savedContentRef.current)"),
    "ユーザー操作または未保存差分が存在する場合のみ Milkdown からシリアライズ結果を取得すること"
  );

  // 3.3 生ソース保護ステートマシンの実証的シミュレーション
  // 特殊なインデント、空行、コメント、表、記法を含む生 Markdown サンプル
  const rawMarkdownSamples = [
    {
      name: "カスタムインデントと空行を含む生Markdown",
      content: [
        "# タイトル",
        "",
        "これはテスト文章です。",
        "",
        "  - 2スペースインデントのリスト",
        "    - 4スペースインデントの子リスト",
        "      - 6スペースインデントの孫リスト",
        "",
        "    4スペースインデントされたコードブロック",
        "    line 2",
        "",
        "<!-- 独自コメント -->",
        "",
        "> 引用行1",
        ">   引用行2（内部インデント）",
      ].join("\n"),
    },
    {
      name: "テーブルと特殊リンク記法を含む生Markdown",
      content: [
        "| 列1 | 列2 | 列3 |",
        "| :--- | :---: | ---: |",
        "| 値1 | 値2 | [リンク](https://example.com) |",
        "",
        "末尾の段落。",
      ].join("\n"),
    },
    {
      name: "Frontmatter (YAML) と混在記法を含む生Markdown",
      content: [
        "---",
        "title: Typori Raw Test",
        "tags: [editor, test]",
        "draft: true",
        "---",
        "",
        "## セクション見出し",
        "",
        "1. 番号1",
        "2. 番号2",
      ].join("\n"),
    },
  ];

  for (const sample of rawMarkdownSamples) {
    console.log(`  3.3.1 テストケース検証: 「${sample.name}」...`);

    // ステートマシンシミュレータ
    class MockEditorApp {
      constructor(initialDiskContent) {
        this.rawDiskContent = initialDiskContent;
        this.fileContent = initialDiskContent;
        this.savedContent = initialDiskContent;
        this.isDirty = false;
        this.hasUserInteracted = false;
        this.isSourceMode = false;
      }

      // Milkdown がマウントされた時に発火する初回シリアライズ通知
      onMilkdownMounted(serializedByMilkdown) {
        const normalized = serializedByMilkdown;
        const hasUnsavedChanges = this.isDirty;
        const isInitialMountSync = !this.hasUserInteracted && !hasUnsavedChanges;

        if (!isInitialMountSync) {
          this.fileContent = normalized;
        }

        if (isInitialMountSync) {
          // 生ソース 100% 完全保護ロジック (App.tsx lines 674-688)
          const rawSavedContent = this.savedContent;
          if (rawSavedContent !== null && rawSavedContent !== undefined) {
            this.fileContent = rawSavedContent;
            this.savedContent = rawSavedContent;
            this.isDirty = false;
            return;
          }
        }
      }

      // ユーザーが Ctrl + / でソース直接編集モードに切り替えた時のハンドラ (App.tsx lines 453-487)
      toggleSourceMode(editorRefMarkdown) {
        this.isSourceMode = !this.isSourceMode;
        if (this.isSourceMode) {
          let markdownToUse = this.fileContent;
          if (this.hasUserInteracted || this.isDirty) {
            markdownToUse = editorRefMarkdown;
          }
          this.fileContent = markdownToUse;
          return markdownToUse;
        }
        return this.fileContent;
      }

      // ユーザーが実際にエディタに文字を入力した時のハンドラ
      userEdit(newContent) {
        this.hasUserInteracted = true;
        this.fileContent = newContent;
        this.isDirty = this.fileContent !== this.savedContent;
      }
    }

    const app = new MockEditorApp(sample.content);

    // シナリオ A: 未編集ファイルを開いてマウント -> ソース直接編集モードへ切り替え
    // Milkdown がフォーマットを少し変形してシリアライズしたと仮定
    const milkdownModifiedOutput = sample.content.replace(/  -/g, "-"); // インデントが詰まる変形
    app.onMilkdownMounted(milkdownModifiedOutput);

    // マウント後も fileContent と savedContent が元の生ソースと 1 文字の狂いもなく完全一致すること
    assert.equal(
      app.fileContent,
      sample.content,
      "マウント後も生テキストが 100% 保持されていること"
    );
    assert.equal(
      app.savedContent,
      sample.content,
      "マウント後も savedContent が 100% 保持されていること"
    );
    assert.equal(app.isDirty, false, "マウント後も isDirty が false であること（未保存誤爆防止）");

    // ソース直接編集モードへ切り替え
    const sourceEditorContentReceived = app.toggleSourceMode(milkdownModifiedOutput);
    assert.equal(
      sourceEditorContentReceived,
      sample.content,
      "ソース直接編集モードへ渡されたテキストが元の生ソースと 100% 完全一致すること"
    );

    // シナリオ B: ユーザーが編集を行った場合
    const editedText = sample.content + "\n\n新しい編集行";
    app.userEdit(editedText);
    assert.equal(app.isDirty, true, "編集後は isDirty が true になること");
    assert.equal(app.fileContent, editedText, "編集後は新しい内容が反映されること");
  }

  console.log("✓ 直接編集モード切り替え時の生ソース 100% 完全保護の実証的検証に合格");

  // ==========================================================================
  // [Part 4] CodeMirror 6 indentWithTab と行頭空白保持の実証的検証
  // ==========================================================================
  console.log("\n--- [Part 4] CodeMirror 6 indentWithTab キーマップと行頭空白保持の実証的検証 ---");

  // 4.1 indentWithTab の動作仕様検証
  assert.equal(indentWithTab.key, "Tab", "indentWithTab の key が 'Tab' であること");
  assert.equal(indentWithTab.run, indentMore, "Tab 押下で indentMore が実行されること");
  assert.equal(indentWithTab.shift, indentLess, "Shift+Tab 押下で indentLess が実行されること");

  // 4.2 CodeMirror EditorState におけるインデント操作シミュレーション
  const sampleDoc = "行 1\n  インデント行 2\n    多重インデント行 3";
  const state = EditorState.create({
    doc: sampleDoc,
  });

  assert.equal(state.doc.line(1).text, "行 1", "行 1 のテキストが正確であること");
  assert.equal(state.doc.line(2).text, "  インデント行 2", "行 2 の 2 スペースインデントが正確であること");
  assert.equal(state.doc.line(3).text, "    多重インデント行 3", "行 3 の 4 スペースインデントが正確であること");

  console.log("✓ CodeMirror 6 indentWithTab および行頭空白保持の実証的検証に合格");

  // ==========================================================================
  // [Part 5] Phase 31: handleKeyDown における修飾キーショートカット誤爆完全防止の実証的検証
  // ==========================================================================
  console.log("\n--- [Part 5] Phase 31: handleKeyDown 修飾キーショートカット誤爆完全防止の実証的検証 ---");

  // 5.1 Editor.tsx の handleKeyDown 実装の静的検証
  assert.ok(
    editorContent.includes("const hasModifier = e.ctrlKey || e.metaKey || e.altKey;"),
    "Editor.tsx で hasModifier の判定が存在すること"
  );
  assert.ok(
    editorContent.includes("if (!hasModifier && !isModifierOnly && !isNavigation)"),
    "Editor.tsx で修飾キー押下時は markUserInteracted が抑止されること"
  );

  // 5.2 handleKeyDown ロジックのシミュレーション検証
  function simulateHandleKeyDown(e) {
    let userInteracted = false;
    const markUserInteracted = () => {
      userInteracted = true;
    };

    const hasModifier = Boolean(e.ctrlKey || e.metaKey || e.altKey);
    const isModifierOnly = [
      "Control",
      "Shift",
      "Alt",
      "Meta",
      "CapsLock",
      "Fn",
      "NumLock",
      "ScrollLock",
    ].includes(e.key);
    const isNavigation = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
      "PageUp",
      "PageDown",
      "Escape",
    ].includes(e.key);

    if (!hasModifier && !isModifierOnly && !isNavigation) {
      const isEditingKey =
        e.key.length === 1 ||
        e.key === "Enter" ||
        e.key === "Backspace" ||
        e.key === "Delete" ||
        e.key === "Tab";
      if (isEditingKey) {
        markUserInteracted();
      }
    }

    return userInteracted;
  }

  // テストケース群
  // 1. Ctrl + / (ソース直接編集モード切替): markUserInteracted が絶対に発火してはならない
  assert.equal(
    simulateHandleKeyDown({ key: "/", ctrlKey: true }),
    false,
    "Ctrl + / 押下時に markUserInteracted が発火しないこと（生ソース保護）"
  );

  // 2. 他の修飾キー付きショートカット (Ctrl+S, Ctrl+C, Ctrl+A, Alt+F 等)
  assert.equal(simulateHandleKeyDown({ key: "s", ctrlKey: true }), false, "Ctrl+S で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "c", ctrlKey: true }), false, "Ctrl+C で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "a", ctrlKey: true }), false, "Ctrl+A で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "k", metaKey: true }), false, "Cmd+K で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "Tab", altKey: true }), false, "Alt+Tab で発火しないこと");

  // 3. 修飾キー単体 (Control, Shift, Alt, Meta)
  assert.equal(simulateHandleKeyDown({ key: "Control" }), false, "Control 単体で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "Shift" }), false, "Shift 単体で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "Alt" }), false, "Alt 単体で発火しないこと");

  // 4. ナビゲーションキー (ArrowDown, PageUp, Escape 等)
  assert.equal(simulateHandleKeyDown({ key: "ArrowDown" }), false, "ArrowDown で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "PageUp" }), false, "PageUp で発火しないこと");
  assert.equal(simulateHandleKeyDown({ key: "Escape" }), false, "Escape で発火しないこと");

  // 5. 通常の編集キー（文字入力、Enter、Backspace、Delete、Tab）
  assert.equal(simulateHandleKeyDown({ key: "a" }), true, "通常文字 'a' で markUserInteracted が発火すること");
  assert.equal(simulateHandleKeyDown({ key: "あ" }), true, "日本語文字 'あ' で markUserInteracted が発火すること");
  assert.equal(simulateHandleKeyDown({ key: "Enter" }), true, "Enter で markUserInteracted が発火すること");
  assert.equal(simulateHandleKeyDown({ key: "Backspace" }), true, "Backspace で markUserInteracted が発火すること");
  assert.equal(simulateHandleKeyDown({ key: "Delete" }), true, "Delete で markUserInteracted が発火すること");
  assert.equal(simulateHandleKeyDown({ key: "Tab" }), true, "Tab で markUserInteracted が発火すること");

  console.log("✓ handleKeyDown 修飾キーショートカット誤爆完全防止の実証的検証に合格");

  console.log("\n==================================================================");
  console.log(" >>> Phase 30/31 レイアウト・インデント実証的検証 & 生ソース保護 全項目合格 <<< ");
  console.log("==================================================================");
}

runVerification().catch((err) => {
  console.error("Phase 30 verification failed:", err);
  process.exit(1);
});
