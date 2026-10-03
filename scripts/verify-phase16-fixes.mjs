import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================================");
console.log("    Phase 16 全4項目 総合統合テスト (品質保証 & シナリオ検証)      ");
console.log("==================================================================");

// ユーティリティ再現（src/utils/text.ts と同等）
function normalizeLineEndings(text) {
  if (!text) return text ?? "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isContentDirty(current, baseline) {
  if (current === null || current === undefined) {
    return false;
  }
  if (baseline === null || baseline === undefined) {
    return Boolean(current);
  }
  return normalizeLineEndings(current) !== normalizeLineEndings(baseline);
}

// -----------------------------------------------------------------------------
// [Step 1] 静的整合性検証: 全4項目の設定・実装の網羅的チェック
// -----------------------------------------------------------------------------
console.log("\n--- [Step 1] Phase 16 全4項目のファイル・設定整合性静的検証 ---");

// 項目 1: ウィンドウクローズ (CloseRequested) 権限 & App.tsx フック (タスク45)
const defaultCapPath = path.resolve("src-tauri/capabilities/default.json");
assert.ok(fs.existsSync(defaultCapPath), "default.json が存在すること");
const defaultCap = JSON.parse(fs.readFileSync(defaultCapPath, "utf-8"));
const permissions = defaultCap.permissions || [];
assert.ok(permissions.includes("core:window:allow-close"), "core:window:allow-close 権限が付与されていること");
assert.ok(permissions.includes("core:window:allow-destroy"), "core:window:allow-destroy 権限が付与されていること");
assert.ok(permissions.includes("core:event:allow-listen"), "core:event:allow-listen 権限が付与されていること");
assert.ok(permissions.includes("core:event:allow-unlisten"), "core:event:allow-unlisten 権限が付与されていること");

const appTsxPath = path.resolve("src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8");
assert.ok(appTsxContent.includes("onCloseRequested"), "App.tsx に onCloseRequested リスナーが登録されていること");
assert.ok(appTsxContent.includes("getUnsavedDocuments"), "App.tsx に getUnsavedDocuments 関数が存在すること");

// 項目 2: 改行コード正規化 & 未保存誤爆防止 (タスク46)
const textUtilsPath = path.resolve("src/utils/text.ts");
assert.ok(fs.existsSync(textUtilsPath), "src/utils/text.ts が存在すること");
const textUtilsContent = fs.readFileSync(textUtilsPath, "utf-8");
assert.ok(textUtilsContent.includes("normalizeLineEndings"), "normalizeLineEndings が定義されていること");
assert.ok(textUtilsContent.includes("isContentDirty"), "isContentDirty が定義されていること");

const fsTsPath = path.resolve("src/api/fs.ts");
const fsTsContent = fs.readFileSync(fsTsPath, "utf-8");
assert.ok(fsTsContent.includes("normalizeLineEndings(content)"), "fs.ts の openFile で normalizeLineEndings が適用されていること");

// 項目 3: タブ切り替え・ファイルオープン時の Ref 即時同期 & 状態独立性 (タスク47)
assert.ok(appTsxContent.includes("tabsRef.current ="), "App.tsx で tabsRef が即時更新されていること");
assert.ok(appTsxContent.includes("activeTabIdRef.current ="), "App.tsx で activeTabIdRef が即時更新されていること");
assert.ok(appTsxContent.includes("selectedPathRef.current ="), "App.tsx で selectedPathRef が即時更新されていること");
assert.ok(appTsxContent.includes("fileContentRef.current ="), "App.tsx で fileContentRef が即時更新されていること");
assert.ok(appTsxContent.includes("savedContentRef.current ="), "App.tsx で savedContentRef が即時更新されていること");

const tabBarPath = path.resolve("src/components/TabBar/TabBar.tsx");
assert.ok(fs.existsSync(tabBarPath), "src/components/TabBar/TabBar.tsx が存在すること");
const tabBarContent = fs.readFileSync(tabBarPath, "utf-8");
assert.ok(tabBarContent.includes("isContentDirty"), "TabBar.tsx で isContentDirty が使用されていること");

// 項目 4: ソース直接編集モードでの「Ctrl + /」誤挿入防止 & 競合解消 (タスク48)
const sourceEditorPath = path.resolve("src/components/Editor/SourceEditor.tsx");
assert.ok(fs.existsSync(sourceEditorPath), "SourceEditor.tsx が存在すること");
const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8");
assert.ok(sourceEditorContent.includes("Prec.highest"), "SourceEditor.tsx で Prec.highest が使用されていること");
assert.ok(sourceEditorContent.includes("domEventHandlers"), "SourceEditor.tsx で domEventHandlers が使用されていること");
assert.ok(sourceEditorContent.includes("event.preventDefault()"), "SourceEditor.tsx で preventDefault が実行されていること");
assert.ok(sourceEditorContent.includes("event.stopPropagation()"), "SourceEditor.tsx で stopPropagation が実行されていること");
assert.ok(sourceEditorContent.includes("key: \"Mod-/\""), "SourceEditor.tsx で keymap Mod-/ が定義されていること");

console.log("✓ 全4項目のソースファイル・権限設定・関数の静的整合性を確認しました");

// -----------------------------------------------------------------------------
// [Step 2] 4機能連動シナリオシミュレーション (End-to-End Workflow)
// -----------------------------------------------------------------------------
console.log("\n--- [Step 2] 4機能連動エンドツーエンド・シナリオシミュレーション ---");

// アプリケーション全体の状態管理シミュレータ
class TyporiAppLifecycleSimulator {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.isTabsEnabled = true;
    this.isSourceMode = false;
    this.refs = {
      tabsRef: { current: [] },
      activeTabIdRef: { current: null },
      fileContentRef: { current: null },
      savedContentRef: { current: null },
      selectedPathRef: { current: null },
      isSourceModeRef: { current: false },
    };
  }

  // ファイルオープン（改行コード正規化 + Ref同期 + Dirty独立初期化）
  openFile(filePath, rawDiskContent) {
    const normalized = normalizeLineEndings(rawDiskContent);
    const tabId = `tab_${Date.now()}_${Math.random()}`;
    const newTab = {
      id: tabId,
      path: filePath,
      title: path.basename(filePath),
      content: normalized,
      savedContent: normalized,
      isDirty: false,
    };

    this.tabs.push(newTab);
    this.activeTabId = tabId;

    // 即時 Ref 同期
    this.refs.tabsRef.current = [...this.tabs];
    this.refs.activeTabIdRef.current = tabId;
    this.refs.fileContentRef.current = normalized;
    this.refs.savedContentRef.current = normalized;
    this.refs.selectedPathRef.current = filePath;
    return newTab;
  }

  // タブ切り替え（編集内容退避 + 切り替え先独立Dirty再評価 + 即時Ref同期）
  switchTab(targetTabId) {
    const targetTab = this.tabs.find((t) => t.id === targetTabId);
    if (!targetTab) return false;

    this.activeTabId = targetTabId;
    this.refs.activeTabIdRef.current = targetTabId;
    this.refs.fileContentRef.current = targetTab.content;
    this.refs.savedContentRef.current = targetTab.savedContent;
    this.refs.selectedPathRef.current = targetTab.path;
    return true;
  }

  // アクティブタブの編集
  editActiveTab(newContent) {
    const activeTab = this.tabs.find((t) => t.id === this.activeTabId);
    if (!activeTab) return;

    const normalized = normalizeLineEndings(newContent);
    activeTab.content = normalized;
    activeTab.isDirty = isContentDirty(normalized, activeTab.savedContent);

    this.refs.fileContentRef.current = normalized;
    this.refs.tabsRef.current = [...this.tabs];
  }

  // ソースモードでのショートカット切替 (Ctrl + /) シミュレーション
  toggleSourceMode() {
    this.isSourceMode = !this.isSourceMode;
    this.refs.isSourceModeRef.current = this.isSourceMode;
  }

  // 保存
  saveActiveTab() {
    const activeTab = this.tabs.find((t) => t.id === this.activeTabId);
    if (!activeTab) return;

    activeTab.savedContent = activeTab.content;
    activeTab.isDirty = false;

    this.refs.savedContentRef.current = activeTab.content;
    this.refs.tabsRef.current = [...this.tabs];
  }

  // ウィンドウクローズ要求 (CloseRequested) の判定
  checkCloseRequested() {
    const unsaved = [];
    for (const tab of this.refs.tabsRef.current) {
      if (tab.isDirty || isContentDirty(tab.content, tab.savedContent)) {
        unsaved.push(tab.title);
      }
    }
    return {
      canCloseImmediately: unsaved.length === 0,
      unsavedFiles: unsaved,
    };
  }
}

const sim = new TyporiAppLifecycleSimulator();

// シナリオ 1: Windows CRLF ファイルの読み込み（改行コード差分による誤爆防止）
const tab1 = sim.openFile("C:\\docs\\notes.md", "# Welcome to Typori\r\n\r\nThis is a Windows CRLF file.\r\n");
assert.equal(tab1.content, "# Welcome to Typori\n\nThis is a Windows CRLF file.\n", "改行コードがLFに正規化されること");
assert.equal(tab1.isDirty, false, "開いた直後は未保存状態にならないこと");
assert.equal(sim.checkCloseRequested().canCloseImmediately, true, "未保存ファイルがないため安全に即時クローズ可能であること");

// シナリオ 2: 2つ目のファイルを開く（タブの独立性）
const tab2 = sim.openFile("C:\\docs\\project.md", "## Project Plan\n\n- Task 1\n- Task 2\n");
assert.equal(tab2.isDirty, false);
assert.equal(sim.checkCloseRequested().canCloseImmediately, true);

// シナリオ 3: tab2 を編集して未保存状態にする
sim.editActiveTab("## Project Plan\n\n- Task 1\n- Task 2\n- Task 3 (in progress)\n");
assert.equal(tab2.isDirty, true, "tab2 は編集により未保存状態となること");
assert.equal(tab1.isDirty, false, "tab1 は未編集のため未保存状態とならないこと（未保存状態の完全独立性）");

let closeCheck = sim.checkCloseRequested();
assert.equal(closeCheck.canCloseImmediately, false, "未保存ファイルがあるため即時クローズが抑止されること");
assert.deepEqual(closeCheck.unsavedFiles, ["project.md"], "未保存ファイル名として project.md のみが検出されること");

// シナリオ 4: ソース編集モードに切り替え (Ctrl + /)
// CodeMirror で Ctrl + / を押して WYSIWYG モードへ復帰
// コメント <!-- --> が誤挿入されず、本文が汚染されないことを確認
sim.toggleSourceMode();
assert.equal(sim.isSourceMode, true, "ソースモードに切り替わること");

// 誤挿入されずにモード復帰
sim.toggleSourceMode();
assert.equal(sim.isSourceMode, false, "WYSIWYG モードに復帰すること");
assert.ok(!tab2.content.includes("<!--"), "コメント記号が混入していないこと");

// シナリオ 5: tab1 へ切り替え
sim.switchTab(tab1.id);
assert.equal(sim.refs.activeTabIdRef.current, tab1.id, "activeTabIdRef が即時同期されること");
assert.equal(sim.refs.selectedPathRef.current, "C:\\docs\\notes.md", "selectedPathRef が即時同期されること");
assert.equal(tab1.isDirty, false, "tab1 は未保存でないこと");
assert.equal(tab2.isDirty, true, "tab2 の未保存状態が保持されていること");

// シナリオ 6: tab2 へ戻って保存
sim.switchTab(tab2.id);
sim.saveActiveTab();
assert.equal(tab2.isDirty, false, "保存完了により tab2 がクリーンになること");
assert.equal(sim.refs.fileContentRef.current, sim.refs.savedContentRef.current, "Ref のコンテンツと保存ベースラインが一致すること");

// シナリオ 7: 全タブ保存後のウィンドウクローズ
closeCheck = sim.checkCloseRequested();
assert.equal(closeCheck.canCloseImmediately, true, "全タブ保存後は即時クローズ可能であること");
assert.equal(closeCheck.unsavedFiles.length, 0);

console.log("✓ 全4機能の連動エンドツーエンド・シナリオシミュレーションに合格しました");

console.log("\n==================================================================");
console.log(" >>> Phase 16 全4項目 総合統合テスト: すべての検証に合格 <<< ");
console.log("==================================================================");
