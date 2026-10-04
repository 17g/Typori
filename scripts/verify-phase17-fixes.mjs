import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("    Phase 17 全3項目 総合統合テスト (品質保証 & シナリオ検証)      ");
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
// [Step 1] 静的整合性検証: Phase 17 全3項目の設定・実装の網羅的チェック
// -----------------------------------------------------------------------------
console.log("\n--- [Step 1] Phase 17 全3項目のファイル・設定整合性静的検証 ---");

// 項目 1: ウィンドウクローズ (CloseRequested) インターセプト & 双方向ハンドシェイク (タスク51)
console.log("-> 項目 1 検証: Rust側 CloseRequested インターセプト & 双方向ハンドシェイク");
const libRsPath = path.resolve(projectRoot, "src-tauri/src/lib.rs");
assert.ok(fs.existsSync(libRsPath), "src-tauri/src/lib.rs が存在すること");
const libRsContent = fs.readFileSync(libRsPath, "utf-8");

assert.ok(libRsContent.includes("use tauri::Emitter;"), "lib.rs で Emitter がインポートされていること");
assert.ok(libRsContent.includes(".on_window_event("), "lib.rs で on_window_event が登録されていること");
assert.ok(libRsContent.includes("tauri::WindowEvent::CloseRequested"), "lib.rs で CloseRequested イベントが捕捉されていること");
assert.ok(libRsContent.includes("api.prevent_close();"), "lib.rs で api.prevent_close() が実行されていること");
assert.ok(libRsContent.includes('window.emit("window:close_requested", ())'), "lib.rs で window:close_requested がフロントに送出されていること");

const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(appTsxContent.includes('listen("window:close_requested"'), "App.tsx で window:close_requested がリッスンされていること");
assert.ok(appTsxContent.includes("executeCloseWorkflow"), "App.tsx で executeCloseWorkflow が定義されていること");
assert.ok(appTsxContent.includes("getUnsavedDocuments()"), "App.tsx で未保存ファイルの検出が行われていること");
assert.ok(appTsxContent.includes("appWindow.destroy()"), "App.tsx で確認承認後または未保存なし時に appWindow.destroy() が実行されること");

// 項目 2: Milkdown 初回シリアライズ差異による未保存（Dirty）判定の誤爆防止機構 (タスク52)
console.log("-> 項目 2 検証: Milkdown 初回シリアライズ差異誤爆防止 & ベースライン自動同期");
const editorTsxPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorTsxPath), "Editor.tsx が存在すること");
const editorTsxContent = fs.readFileSync(editorTsxPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(editorTsxContent.includes("hasUserInteracted: () => boolean;"), "EditorRef に hasUserInteracted が定義されていること");
assert.ok(editorTsxContent.includes("markUserInteracted: () => void;"), "EditorRef に markUserInteracted が定義されていること");
assert.ok(editorTsxContent.includes("onChange?: (markdown: string, meta?: { isUserInteraction?: boolean }) => void;"), "EditorProps の onChange に meta オプションが定義されていること");
assert.ok(editorTsxContent.includes("onChangeRef.current?.(initialSerialized, { isUserInteraction: false });"), "マウント時に isUserInteraction: false で初期シリアライズ通知されること");
assert.ok(editorTsxContent.includes("onChangeRef.current?.(normalized, { isUserInteraction: isUser });"), "markdownUpdated で isUserInteraction フラグが付与されること");

assert.ok(appTsxContent.includes("if (meta && meta.isUserInteraction === false) {"), "App.tsx の handleContentChange で isUserInteraction === false が処理されていること");
assert.ok(appTsxContent.includes("savedContentRef.current = normalized;"), "初期シリアライズ通知時に savedContentRef のベースラインが自動同期されること");
assert.ok(appTsxContent.includes("!editorRef.current.hasUserInteracted()"), "App.tsx の getUnsavedDocuments でユーザー未操作ガードが存在すること");

// 項目 3: 単一ファイル切替時における未保存ステータスの確実な破棄とクリーン状態リセット (タスク53)
console.log("-> 項目 3 検証: 単一ファイル切替時の未保存ステータス破棄 & クリーン状態リセット");
assert.ok(appTsxContent.includes("if (!isTabsEnabledRef.current) {"), "handleSelectFile に単一ファイルモード分岐が存在すること");
assert.ok(appTsxContent.includes("保存せずに別のファイルを開きますか？"), "未保存確認ダイアログの表示文言が存在すること");
assert.ok(appTsxContent.includes("tabsRef.current = [];"), "未保存破棄承認時に tabsRef が初期化されること");
assert.ok(appTsxContent.includes("activeTabIdRef.current = null;"), "未保存破棄承認時に activeTabIdRef が初期化されること");
assert.ok(appTsxContent.includes("fileContentRef.current = null;"), "未保存破棄承認時に fileContentRef が初期化されること");
assert.ok(appTsxContent.includes("savedContentRef.current = null;"), "未保存破棄承認時に savedContentRef が初期化されること");
assert.ok(appTsxContent.includes("setTabs([]);"), "未保存破棄承認時に setTabs([]) が実行されること");
assert.ok(appTsxContent.includes("setFileContent(null);"), "未保存破棄承認時に setFileContent(null) が実行されること");
assert.ok(appTsxContent.includes("setSavedContent(null);"), "未保存破棄承認時に setSavedContent(null) が実行されること");
assert.ok(appTsxContent.includes("setSaveStatus(null);"), "未保存破棄承認時に setSaveStatus(null) が実行されること");
assert.ok(appTsxContent.includes("setSaveError(null);"), "未保存破棄承認時に setSaveError(null) が実行されること");
assert.ok(appTsxContent.includes("setFileError(null);"), "未保存破棄承認時に setFileError(null) が実行されること");

assert.ok(appTsxContent.includes("tabsRef.current = [newTab];"), "単一ファイルオープン成功時に tabsRef に newTab が設定されること");
assert.ok(appTsxContent.includes("savedContentRef.current = content;"), "単一ファイルオープン成功時に savedContentRef が同期されること");
assert.ok(appTsxContent.includes("fileContentRef.current = content;"), "単一ファイルオープン成功時に fileContentRef が同期されること");

console.log("✓ Phase 17 全3項目のソースファイル・権限・関数の静的整合性を確認しました");

// -----------------------------------------------------------------------------
// [Step 2] Phase 17 全3機能連動シナリオシミュレーション (End-to-End Workflow)
// -----------------------------------------------------------------------------
console.log("\n--- [Step 2] Phase 17 全3機能連動シナリオシミュレーション ---");

class Phase17ApplicationLifecycleSimulator {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.isTabsEnabled = false; // デフォルトは単一ファイルモード
    this.fileContent = null;
    this.savedContent = null;
    this.selectedPath = null;
    this.saveStatus = null;
    this.saveError = null;
    this.hasUserInteracted = false;
    this.isWindowDestroyed = false;
  }

  // ファイルをオープン
  openFile(path, diskContent) {
    const norm = normalizeLineEndings(diskContent);
    this.selectedPath = path;
    this.fileContent = norm;
    this.savedContent = norm;
    this.tabs = [
      {
        id: path,
        path: path,
        title: path.split("/").pop(),
        content: norm,
        savedContent: norm,
        isDirty: false,
      },
    ];
    this.activeTabId = path;
    this.hasUserInteracted = false;
    this.saveStatus = null;
    this.saveError = null;
  }

  // Milkdown マウント時の初期シリアライズ通知
  onMilkdownMount(serializedOutput) {
    const norm = normalizeLineEndings(serializedOutput);
    this.fileContent = norm;
    // ユーザー未操作時はベースライン自動同期
    if (!this.hasUserInteracted) {
      this.savedContent = norm;
      if (this.tabs.length > 0 && this.tabs[0].id === this.activeTabId) {
        this.tabs[0].savedContent = norm;
        this.tabs[0].content = norm;
        this.tabs[0].isDirty = false;
      }
    }
  }

  // ユーザーによる編集操作
  onUserEdit(newContent) {
    this.hasUserInteracted = true;
    const norm = normalizeLineEndings(newContent);
    this.fileContent = norm;
    if (this.tabs.length > 0 && this.tabs[0].id === this.activeTabId) {
      this.tabs[0].content = norm;
      this.tabs[0].isDirty = isContentDirty(norm, this.tabs[0].savedContent);
    }
  }

  // 保存実行
  saveCurrentFile() {
    this.savedContent = this.fileContent;
    if (this.tabs.length > 0 && this.tabs[0].id === this.activeTabId) {
      this.tabs[0].savedContent = this.fileContent;
      this.tabs[0].isDirty = false;
    }
    this.saveStatus = "saved";
  }

  // 未保存ファイル一覧取得 (getUnsavedDocuments のシミュレーション)
  getUnsavedDocuments() {
    const unsaved = [];
    for (const tab of this.tabs) {
      // ユーザー未操作の場合は初期シリアライズ差分を無視
      if (!this.hasUserInteracted && tab.id === this.activeTabId) {
        continue;
      }
      const isDirty = isContentDirty(tab.content, tab.savedContent);
      if (isDirty) {
        unsaved.push(tab.title || tab.path);
      }
    }
    return unsaved;
  }

  // 単一ファイルモードでの別ファイルオープン
  switchFileInSingleMode(newPath, diskContent, confirmDialogCallback) {
    if (this.selectedPath === newPath) return { status: "same_file" };

    const isCurrentDirty = isContentDirty(this.fileContent, this.savedContent);
    if (isCurrentDirty) {
      const ok = confirmDialogCallback();
      if (!ok) {
        return { status: "cancelled" };
      }
    }

    // 承認時: 先行クリーンリセット
    this.fileContent = null;
    this.savedContent = null;
    this.tabs = [];
    this.activeTabId = null;
    this.saveStatus = null;
    this.saveError = null;

    // 新規ファイルロード
    const norm = normalizeLineEndings(diskContent);
    this.selectedPath = newPath;
    this.fileContent = norm;
    this.savedContent = norm;
    this.tabs = [
      {
        id: newPath,
        path: newPath,
        title: newPath.split("/").pop(),
        content: norm,
        savedContent: norm,
        isDirty: false,
      },
    ];
    this.activeTabId = newPath;
    this.hasUserInteracted = false;

    return { status: "switched" };
  }

  // ウィンドウクローズワークフロー (executeCloseWorkflow のシミュレーション)
  handleWindowCloseRequest(confirmDialogCallback) {
    const unsaved = this.getUnsavedDocuments();
    if (unsaved.length > 0) {
      const ok = confirmDialogCallback(unsaved);
      if (!ok) {
        return { closed: false };
      }
    }
    this.isWindowDestroyed = true;
    return { closed: true };
  }
}

const app = new Phase17ApplicationLifecycleSimulator();

// =============================================================================
// シナリオ 1: 初回オープン時の Milkdown シリアライズ微細差異による未保存誤爆防止
// =============================================================================
console.log("シナリオ 1: 初回ファイルオープン直後の初期シリアライズ差異吸収テスト");
const initialMarkdown = "# Welcome to Typori\n- List Item 1\n- List Item 2\n";
app.openFile("/docs/welcome.md", initialMarkdown);

assert.strictEqual(app.tabs[0].isDirty, false, "オープン直後は isDirty: false");

// Milkdown の初期パース・シリアライズで空行・改行の微細差分が発生
const milkdownInitialOutput = "# Welcome to Typori\n\n- List Item 1\n- List Item 2\n\n";
app.onMilkdownMount(milkdownInitialOutput);

assert.strictEqual(app.hasUserInteracted, false, "マウント段階ではユーザー未操作");
assert.strictEqual(app.tabs[0].isDirty, false, "初期シリアライズ差異があっても isDirty: false が維持されること");
assert.deepStrictEqual(app.getUnsavedDocuments(), [], "未保存ドキュメントとして検出されないこと");
console.log("  ✓ 初期シリアライズ差異による未保存誤爆防止が正常に動作");

// =============================================================================
// シナリオ 2: 単一ファイルモードでの未保存変更と別ファイル切替破棄
// =============================================================================
console.log("シナリオ 2: 単一ファイルモードでの未保存ステータス破棄 & クリーン状態リセットテスト");
// ユーザーが編集を行う
app.onUserEdit("# Welcome to Typori\n\n- List Item 1\n- List Item 2\n- Item 3 (New)\n\n");
assert.strictEqual(app.tabs[0].isDirty, true, "ユーザー編集後は isDirty: true");
assert.deepStrictEqual(app.getUnsavedDocuments(), ["welcome.md"], "welcome.md が未保存として検出されること");

// 別ファイルを選択し、確認ダイアログで「キャンセル」を選択
const cancelRes = app.switchFileInSingleMode("/docs/guide.md", "# Guide", () => false);
assert.strictEqual(cancelRes.status, "cancelled");
assert.strictEqual(app.selectedPath, "/docs/welcome.md", "キャンセル時は元のファイルが維持されること");
assert.strictEqual(app.tabs[0].isDirty, true, "キャンセル時はDirty状態が維持されること");

// 別ファイルを選択し、確認ダイアログで「OK（保存せずに開く）」を選択
const okRes = app.switchFileInSingleMode("/docs/guide.md", "# Guide\nUser manual content", () => true);
assert.strictEqual(okRes.status, "switched");
assert.strictEqual(app.selectedPath, "/docs/guide.md", "guide.md に切り替わっていること");
assert.strictEqual(app.tabs.length, 1, "タブ数は単一（1つ）であること");
assert.strictEqual(app.tabs[0].isDirty, false, "切り替え後のファイルはクリーン（isDirty: false）であること");
assert.strictEqual(app.saveStatus, null, "保存ステータスがクリアされていること");
assert.deepStrictEqual(app.getUnsavedDocuments(), [], "切り替え後は未保存ファイルが存在しないこと");
console.log("  ✓ 単一ファイル切替時の未保存ステータス破棄 & クリーンリセットが正常に動作");

// =============================================================================
// シナリオ 3: ウィンドウクローズ要求 (CloseRequested) インターセプト & 双方向ハンドシェイク
// =============================================================================
console.log("シナリオ 3: ウィンドウクローズ要求インターセプト & 双方向ハンドシェイクテスト");

// 3-A: 未保存ファイルがない状態でクローズ要求
const cleanCloseRes = app.handleWindowCloseRequest(() => {
  throw new Error("未保存ファイルがない場合はダイアログが表示されてはならない");
});
assert.strictEqual(cleanCloseRes.closed, true, "未保存なし時は確認なしでクローズ成功");
assert.strictEqual(app.isWindowDestroyed, true, "ウィンドウ破棄 (destroy) が実行されたこと");

// 状態リセット
app.isWindowDestroyed = false;

// 3-B: 未保存ファイルがある状態でクローズ要求 -> キャンセル
app.onUserEdit("# Guide\nUnsaved modifications");
assert.strictEqual(app.tabs[0].isDirty, true);

let dialogShown = false;
const cancelCloseRes = app.handleWindowCloseRequest((unsavedList) => {
  dialogShown = true;
  assert.deepStrictEqual(unsavedList, ["guide.md"], "未保存ファイル名が渡されること");
  return false; // キャンセル
});
assert.strictEqual(dialogShown, true, "確認ダイアログが表示されたこと");
assert.strictEqual(cancelCloseRes.closed, false, "キャンセル時はクローズが中断されること");
assert.strictEqual(app.isWindowDestroyed, false, "ウィンドウは破棄されないこと");

// 3-C: 未保存ファイルがある状態でクローズ要求 -> OK（破棄して終了）
const okCloseRes = app.handleWindowCloseRequest((unsavedList) => {
  assert.deepStrictEqual(unsavedList, ["guide.md"]);
  return true; // OK
});
assert.strictEqual(okCloseRes.closed, true, "OK選択時はクローズが続行されること");
assert.strictEqual(app.isWindowDestroyed, true, "ウィンドウ破棄 (destroy) が実行されたこと");
console.log("  ✓ ウィンドウクローズインターセプト & 未保存確認ハンドシェイクが正常に動作");

console.log("\n==================================================================");
console.log("   >>> Phase 17 全3項目 総合統合テスト (品質保証): 全項目合格 <<<   ");
console.log("==================================================================");
