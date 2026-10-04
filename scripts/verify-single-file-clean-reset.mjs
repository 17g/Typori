import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  検証: 単一ファイル切替時の未保存ステータス破棄 & クリーン初期化");
console.log("==================================================================");

// -----------------------------------------------------------------------------
// [Step 1] 静的コード検査: src/App.tsx の単一ファイルモード破棄ロジック検証
// -----------------------------------------------------------------------------
console.log("\n--- [Step 1] App.tsx の単一ファイル切替・破棄処理の静的コード検査 ---");

const appTsxPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appTsxPath), "src/App.tsx が存在すること");
const appTsxContent = fs.readFileSync(appTsxPath, "utf-8").replace(/\r\n/g, "\n");

// 1. handleSelectFile における未保存確認と先行破棄
assert.ok(
  appTsxContent.includes("if (!isTabsEnabledRef.current) {"),
  "handleSelectFile 内で単一ファイルモード (!isTabsEnabledRef.current) の判定が存在すること"
);

assert.ok(
  appTsxContent.includes("isContentDirty(currentContent, savedContentRef.current)"),
  "単一ファイルモードで現在のファイルが Dirty か判定されていること"
);

assert.ok(
  appTsxContent.includes("保存せずに別のファイルを開きますか？"),
  "未保存変更がある場合に確認ダイアログが表示されること"
);

// 先行破棄（クリーンリセット）の検証
assert.ok(
  appTsxContent.includes("fileContentRef.current = null;"),
  "未保存破棄承認時に fileContentRef.current が null にリセットされていること"
);
assert.ok(
  appTsxContent.includes("savedContentRef.current = null;"),
  "未保存破棄承認時に savedContentRef.current が null にリセットされていること"
);
assert.ok(
  appTsxContent.includes("tabsRef.current = [];"),
  "未保存破棄承認時に tabsRef.current が空配列にリセットされていること"
);
assert.ok(
  appTsxContent.includes("activeTabIdRef.current = null;"),
  "未保存破棄承認時に activeTabIdRef.current が null にリセットされていること"
);
assert.ok(
  appTsxContent.includes("setFileContent(null);"),
  "未保存破棄承認時に setFileContent(null) が実行されていること"
);
assert.ok(
  appTsxContent.includes("setSavedContent(null);"),
  "未保存破棄承認時に setSavedContent(null) が実行されていること"
);
assert.ok(
  appTsxContent.includes("setTabs([]);"),
  "未保存破棄承認時に setTabs([]) が実行されていること"
);
assert.ok(
  appTsxContent.includes("setActiveTabId(null);"),
  "未保存破棄承認時に setActiveTabId(null) が実行されていること"
);
assert.ok(
  appTsxContent.includes("setSaveStatus(null);"),
  "未保存破棄承認時に setSaveStatus(null) が実行されていること"
);
assert.ok(
  appTsxContent.includes("setSaveError(null);"),
  "未保存破棄承認時に setSaveError(null) が実行されていること"
);
assert.ok(
  appTsxContent.includes("setFileError(null);"),
  "未保存破棄承認時に setFileError(null) が実行されていること"
);

// 新規ファイル読み込み完了時のクリーン初期化
assert.ok(
  appTsxContent.includes("isDirty: false,"),
  "新規ファイル読み込み完了時に newTab の isDirty が false で初期化されていること"
);
assert.ok(
  appTsxContent.includes("tabsRef.current = [newTab];"),
  "単一ファイルモードで tabsRef.current に新規ファイル単一タブが設定されていること"
);
assert.ok(
  appTsxContent.includes("savedContentRef.current = content;"),
  "savedContentRef.current が新規ファイルの内容で同期されていること"
);
assert.ok(
  appTsxContent.includes("fileContentRef.current = content;"),
  "fileContentRef.current が新規ファイルの内容で同期されていること"
);

// handleCreateFile における未保存確認と先行ステータスクリア
assert.ok(
  appTsxContent.includes("保存せずに新規ファイルを作成しますか？"),
  "handleCreateFile で単一ファイルモード時に未保存確認ダイアログが表示されること"
);

console.log("✓ App.tsx の単一ファイルモード未保存破棄・クリーン同期ロジックの静的検査に合格");

// -----------------------------------------------------------------------------
// [Step 2] 単一ファイルモードのライフサイクル・状態遷移シミュレーションテスト
// -----------------------------------------------------------------------------
console.log("\n--- [Step 2] 単一ファイルモード状態遷移シミュレーションテスト ---");

function normalizeLineEndings(text) {
  if (!text) return text ?? "";
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function isContentDirty(current, baseline) {
  if (current === null || current === undefined) return false;
  if (baseline === null || baseline === undefined) return Boolean(current);
  return normalizeLineEndings(current) !== normalizeLineEndings(baseline);
}

class SingleFileModeSimulator {
  constructor() {
    this.selectedPath = null;
    this.fileContent = null;
    this.savedContent = null;
    this.tabs = [];
    this.activeTabId = null;
    this.saveStatus = null;
    this.saveError = null;
    this.fileError = null;
    this.isTabsEnabled = false; // 単一ファイルモード
  }

  // ファイルオープン
  async openInitialFile(path, content) {
    const norm = normalizeLineEndings(content);
    const tab = {
      id: path,
      path: path,
      title: path.split("/").pop(),
      content: norm,
      savedContent: norm,
      isDirty: false,
    };
    this.selectedPath = path;
    this.fileContent = norm;
    this.savedContent = norm;
    this.tabs = [tab];
    this.activeTabId = path;
    this.saveStatus = null;
    this.saveError = null;
    this.fileError = null;
  }

  // ユーザー編集
  editContent(newContent) {
    const norm = normalizeLineEndings(newContent);
    this.fileContent = norm;
    this.tabs = this.tabs.map((t) =>
      t.id === this.activeTabId
        ? { ...t, content: norm, isDirty: isContentDirty(norm, t.savedContent) }
        : t
    );
  }

  // 保存エラー発生の模擬
  simulateSaveError(errorMsg) {
    this.saveStatus = "error";
    this.saveError = errorMsg;
  }

  // 別のファイルを選択
  async selectAnotherFile(entry, confirmCallback, fileContentLoader) {
    if (this.selectedPath === entry.path) return;

    const currentDirty = Boolean(
      this.selectedPath !== null &&
      this.fileContent !== null &&
      this.savedContent !== null &&
      isContentDirty(this.fileContent, this.savedContent)
    );

    if (currentDirty) {
      const ok = confirmCallback();
      if (!ok) return { cancelled: true };
    }

    // 未保存破棄承認時: 先行クリーン初期化
    this.selectedPath = entry.path;
    this.fileContent = null;
    this.savedContent = null;
    this.tabs = [];
    this.activeTabId = null;
    this.fileError = null;
    this.saveError = null;
    this.saveStatus = null;

    try {
      const rawContent = await fileContentLoader(entry.path);
      const content = normalizeLineEndings(rawContent);
      const newTab = {
        id: entry.path,
        path: entry.path,
        title: entry.path.split("/").pop(),
        content,
        savedContent: content,
        isDirty: false,
      };
      this.tabs = [newTab];
      this.activeTabId = newTab.id;
      this.fileContent = content;
      this.savedContent = content;
      return { success: true };
    } catch (err) {
      this.fileError = `読み込み失敗: ${err.message}`;
      this.fileContent = null;
      this.savedContent = null;
      this.tabs = [];
      return { success: false, error: err };
    }
  }
}

// テスト実行
const sim = new SingleFileModeSimulator();

// 1. ファイルAを開く
await sim.openInitialFile("/docs/fileA.md", "# File A\nOriginal content");
assert.strictEqual(sim.selectedPath, "/docs/fileA.md");
assert.strictEqual(sim.tabs[0].isDirty, false, "初期ロード時は isDirty: false");
assert.strictEqual(sim.saveStatus, null);

// 2. ファイルAを編集し、保存エラーを発生させる
sim.editContent("# File A\nModified content by user");
sim.simulateSaveError("ディスク書き込み権限がありません");
assert.strictEqual(sim.tabs[0].isDirty, true, "編集後は isDirty: true");
assert.strictEqual(sim.saveStatus, "error");
assert.strictEqual(sim.saveError, "ディスク書き込み権限がありません");

// 3. 別ファイルBを選択（確認ダイアログで「キャンセル」を選択した場合）
const cancelResult = await sim.selectAnotherFile(
  { path: "/docs/fileB.md" },
  () => false, // ユーザーがキャンセル
  async () => "# File B"
);
assert.strictEqual(cancelResult.cancelled, true);
assert.strictEqual(sim.selectedPath, "/docs/fileA.md", "キャンセル時はファイルAが維持されること");
assert.strictEqual(sim.tabs[0].isDirty, true, "キャンセル時はDirty状態が維持されること");

// 4. 別ファイルBを選択（確認ダイアログで「OK（破棄）」を選択した場合）
const successResult = await sim.selectAnotherFile(
  { path: "/docs/fileB.md" },
  () => true, // ユーザーがOK
  async () => "# File B\nClean content"
);
assert.strictEqual(successResult.success, true);
assert.strictEqual(sim.selectedPath, "/docs/fileB.md", "ファイルBに切り替わっていること");
assert.strictEqual(sim.tabs.length, 1, "タブ数は単一（1件）であること");
assert.strictEqual(sim.tabs[0].id, "/docs/fileB.md");
assert.strictEqual(sim.tabs[0].isDirty, false, "ファイルBはクリーン（isDirty: false）であること");
assert.strictEqual(sim.fileContent, "# File B\nClean content");
assert.strictEqual(sim.savedContent, "# File B\nClean content");
assert.strictEqual(sim.saveStatus, null, "前のファイルの保存エラーステータスが破棄されていること");
assert.strictEqual(sim.saveError, null, "前のファイルの保存エラー文言が破棄されていること");
assert.strictEqual(sim.fileError, null, "ファイルエラーがクリアされていること");

// 5. 読み込み失敗時のフォールバック検証
const failResult = await sim.selectAnotherFile(
  { path: "/docs/missing.md" },
  () => true,
  async () => {
    throw new Error("File not found");
  }
);
assert.strictEqual(failResult.success, false);
assert.strictEqual(sim.tabs.length, 0, "読み込み失敗時は前のタブが残留せず空になること");
assert.strictEqual(sim.fileContent, null, "バッファがクリアされていること");
assert.ok(sim.fileError.includes("File not found"), "ファイルエラーが記録されていること");

console.log("✓ 単一ファイルモード状態遷移シミュレーションテストにすべて合格しました");
console.log("\n==================================================================");
console.log("   >>> 単一ファイル切替時の未保存ステータス破棄検証: 合格 <<<    ");
console.log("==================================================================");
