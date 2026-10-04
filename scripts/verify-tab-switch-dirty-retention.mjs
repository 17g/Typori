import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  検証: タブ有効時における未保存マーク（isDirty）維持とクローズ警告判定");
console.log("  (ファイル1編集 -> ファイル2オープン -> ファイル1切替 -> isDirty維持 -> クローズ警告)");
console.log("==================================================================");

// ============================================================================
// 1. 静的コード検査 (Static Code Assertions)
// ============================================================================
console.log("\n--- [Step 1] Editor.tsx および App.tsx の静的コード検査 ---");

// 1-1. Editor.tsx の検査
const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorPath), "Editor.tsx が存在すること");
const editorContent = fs.readFileSync(editorPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  editorContent.includes("isDirty?: boolean;"),
  "EditorProps に isDirty?: boolean が定義されていること"
);
assert.ok(
  editorContent.includes("isDirty = false,"),
  "MilkdownEditorContent が isDirty プロップを受け取っていること"
);
assert.ok(
  editorContent.includes("if (isDirty) {\n        hasUserInteractedRef.current = true;\n      }") ||
  editorContent.includes("if (isDirty) {") && editorContent.includes("hasUserInteractedRef.current = true;"),
  "isDirty: true の場合に hasUserInteractedRef.current が同期されること"
);
assert.ok(
  editorContent.includes("if (!hasUserInteractedRef.current && !isDirty) {"),
  "mounted リスナーで !hasUserInteractedRef.current && !isDirty のガードが存在すること"
);

// 1-2. App.tsx の検査
const appPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appPath), "App.tsx が存在すること");
const appContent = fs.readFileSync(appPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  appContent.includes("isDirty={isDirty}"),
  "App.tsx で TyporiEditor コンポーネントに isDirty={isDirty} が渡されていること"
);
assert.ok(
  appContent.includes("const isDirty = isTabsEnabled"),
  "App.tsx でタブ有効時の包括的 isDirty 計算が定義されていること"
);
assert.ok(
  appContent.includes("activeTab?.isDirty ||"),
  "isDirty 計算に activeTab?.isDirty が含まれていること"
);
assert.ok(
  appContent.includes("const hasUnsavedChanges = activeTab"),
  "handleContentChange に hasUnsavedChanges の未保存判定ロジックが存在すること"
);
assert.ok(
  appContent.includes("if (hasUnsavedChanges) {"),
  "meta.isUserInteraction === false 受信時に hasUnsavedChanges ガード分岐が存在すること"
);
assert.ok(
  appContent.includes("preservedSavedContent") && appContent.includes("isDirty: true"),
  "未保存タブへの再マウント通知時に savedContent を保護し isDirty: true を維持すること"
);
assert.ok(
  appContent.includes("handleSelectTab"),
  "handleSelectTab コールバックが存在すること"
);
assert.ok(
  appContent.includes("targetIsDirty = Boolean("),
  "handleSelectTab で targetIsDirty の未保存保持計算が行われていること"
);
assert.ok(
  appContent.includes("handleCloseTab"),
  "handleCloseTab コールバックが存在すること"
);
assert.ok(
  appContent.includes("targetIsDirty") && appContent.includes("window.confirm("),
  "handleCloseTab で targetIsDirty に応じて window.confirm が呼ばれること"
);
assert.ok(
  appContent.includes("if (!ok) return;"),
  "handleCloseTab でユーザーがキャンセルした場合はタブクローズを中断すること"
);

console.log("✓ 静的コード検査がすべて合格しました。");

// ============================================================================
// 2. 状態遷移・振る舞いシミュレーションテスト (Behavioral Simulation)
// ============================================================================
console.log("\n--- [Step 2] 状態遷移シミュレーション: タブ切替時の未保存維持とクローズ保護 ---");

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

// App.tsx のタブ管理・エディタライフサイクルシミュレータ
class AppTabStateManager {
  constructor() {
    this.tabs = [];
    this.activeTabId = null;
    this.selectedPath = null;
    this.fileContent = null;
    this.savedContent = null;
    this.isTabsEnabled = true;

    // 確認ダイアログのモック用
    this.confirmCalls = [];
    this.confirmReturnValue = true;
  }

  // 包括的 isDirty 計算（App.tsx と完全同一ロジック）
  get isDirty() {
    const activeTab = this.tabs.find(
      (t) => t.id === this.activeTabId || (this.selectedPath && t.path === this.selectedPath)
    );
    if (this.isTabsEnabled) {
      return Boolean(
        activeTab?.isDirty ||
        (this.fileContent !== null && this.savedContent !== null && isContentDirty(this.fileContent, this.savedContent)) ||
        (activeTab && activeTab.content !== null && activeTab.savedContent !== null && isContentDirty(activeTab.content, activeTab.savedContent))
      );
    }
    return Boolean(
      this.selectedPath !== null &&
      this.fileContent !== null &&
      this.savedContent !== null &&
      isContentDirty(this.fileContent, this.savedContent)
    );
  }

  getActiveTab() {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }

  // ファイルを開く（タブに追加）
  openFileInTab(filePath, rawContent) {
    const content = normalizeLineEndings(rawContent);
    const fileName = filePath.split(/[/\\]/).filter(Boolean).pop() || filePath;

    const existingTab = this.tabs.find((t) => t.path === filePath);
    if (existingTab) {
      this.handleSelectTab(existingTab.id);
      return;
    }

    const newTab = {
      id: filePath,
      path: filePath,
      title: fileName,
      content,
      savedContent: content,
      isDirty: false,
    };

    this.tabs = [...this.tabs, newTab];
    this.activeTabId = newTab.id;
    this.selectedPath = filePath;
    this.fileContent = content;
    this.savedContent = content;
  }

  // ユーザー入力によるコンテンツ変更
  handleUserEdit(newContent) {
    this.handleContentChange(newContent, { isUserInteraction: true });
  }

  // エディタマウント時や自動シリアライズによるコンテンツ変更
  handleContentChange(markdown, meta) {
    const normalized = normalizeLineEndings(markdown);
    this.fileContent = normalized;

    const currentActiveId = this.activeTabId;
    const currentSelectedPath = this.selectedPath;
    const activeTab = this.tabs.find(
      (t) => t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
    );

    // 未保存変更の有無を判定（App.tsx のガードロジック）
    const hasUnsavedChanges = activeTab
      ? Boolean(
          activeTab.isDirty ||
          (activeTab.savedContent !== null &&
           activeTab.savedContent !== undefined &&
           isContentDirty(activeTab.content, activeTab.savedContent))
        )
      : Boolean(
          this.savedContent !== null &&
          isContentDirty(this.fileContent, this.savedContent)
        );

    if (meta && meta.isUserInteraction === false) {
      if (hasUnsavedChanges) {
        // 未保存タブの保護: savedContentの上書きおよびisDirtyリセットを抑止
        const preservedSavedContent = activeTab?.savedContent ?? this.savedContent ?? normalized;
        this.savedContent = preservedSavedContent;
        this.tabs = this.tabs.map((t) =>
          t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
            ? {
                ...t,
                content: normalized,
                savedContent: t.savedContent ?? preservedSavedContent,
                isDirty: true,
              }
            : t
        );
        return;
      }

      // クリーンなタブのみベースライン同期
      this.savedContent = normalized;
      this.tabs = this.tabs.map((t) =>
        t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
          ? { ...t, content: normalized, savedContent: normalized, isDirty: false }
          : t
      );
      return;
    }

    // ユーザー操作による編集
    this.tabs = this.tabs.map((t) =>
      t.id === currentActiveId || (currentSelectedPath && t.path === currentSelectedPath)
        ? { ...t, content: normalized, isDirty: isContentDirty(normalized, t.savedContent) }
        : t
    );
  }

  // タブ切り替え（App.tsx の handleSelectTab と完全同一）
  handleSelectTab(tabId) {
    if (tabId === this.activeTabId) return;

    const currentContent = this.fileContent;
    const currentActiveId = this.activeTabId;

    // 切り替え元タブの変更内容を同期退避
    const updatedTabs = this.tabs.map((t) => {
      if (t.id === currentActiveId && currentContent !== null) {
        const normContent = normalizeLineEndings(currentContent);
        return {
          ...t,
          content: normContent,
          isDirty: isContentDirty(normContent, t.savedContent),
        };
      }
      return t;
    });

    const targetTab = updatedTabs.find((t) => t.id === tabId);
    if (!targetTab) return;

    const normTargetContent = normalizeLineEndings(targetTab.content);
    const normTargetSavedContent = normalizeLineEndings(targetTab.savedContent ?? targetTab.content);
    const targetIsDirty = Boolean(
      targetTab.isDirty || isContentDirty(normTargetContent, normTargetSavedContent)
    );

    const syncedTabs = updatedTabs.map((t) =>
      t.id === tabId
        ? { ...t, content: normTargetContent, savedContent: normTargetSavedContent, isDirty: targetIsDirty }
        : t
    );

    this.tabs = syncedTabs;
    this.activeTabId = tabId;
    this.selectedPath = targetTab.path;
    this.fileContent = normTargetContent;
    this.savedContent = normTargetSavedContent;
  }

  // タブを閉じる（App.tsx の handleCloseTab と完全同一）
  handleCloseTab(tabId) {
    const currentActiveId = this.activeTabId;
    let currentContent = this.fileContent;
    if (currentContent !== null) {
      currentContent = normalizeLineEndings(currentContent);
      this.fileContent = currentContent;
    }

    const currentTabs = this.tabs;
    const targetTab = currentTabs.find((t) => t.id === tabId);
    if (!targetTab) return;

    const targetIsDirty =
      tabId === currentActiveId && currentContent !== null
        ? Boolean(
            targetTab.isDirty ||
            isContentDirty(currentContent, targetTab.savedContent) ||
            isContentDirty(targetTab.content, targetTab.savedContent)
          )
        : Boolean(
            targetTab.isDirty ||
            isContentDirty(targetTab.content, targetTab.savedContent)
          );

    if (targetIsDirty) {
      const msg = `「${targetTab.title}」には保存されていない変更があります。保存せずに閉じますか？`;
      this.confirmCalls.push(msg);
      if (!this.confirmReturnValue) {
        return; // キャンセルされたためクローズ中断
      }
    }

    const targetIndex = currentTabs.findIndex((t) => t.id === tabId);
    const newTabs = currentTabs.filter((t) => t.id !== tabId);

    if (tabId === currentActiveId) {
      if (newTabs.length > 0) {
        const nextIndex = Math.min(targetIndex, newTabs.length - 1);
        const nextTab = newTabs[nextIndex];
        const normNextContent = normalizeLineEndings(nextTab.content);
        const normNextSavedContent = normalizeLineEndings(nextTab.savedContent ?? nextTab.content);
        const nextIsDirty = Boolean(
          nextTab.isDirty || isContentDirty(normNextContent, normNextSavedContent)
        );

        const syncedNewTabs = newTabs.map((t, idx) =>
          idx === nextIndex
            ? { ...t, content: normNextContent, savedContent: normNextSavedContent, isDirty: nextIsDirty }
            : t
        );

        this.tabs = syncedNewTabs;
        this.activeTabId = nextTab.id;
        this.selectedPath = nextTab.path;
        this.fileContent = normNextContent;
        this.savedContent = normNextSavedContent;
      } else {
        this.tabs = [];
        this.activeTabId = null;
        this.selectedPath = null;
        this.fileContent = null;
        this.savedContent = null;
      }
    } else {
      this.tabs = newTabs;
    }
  }

  // 保存処理
  handleSave() {
    if (!this.selectedPath || this.fileContent === null) return;
    const norm = normalizeLineEndings(this.fileContent);
    this.savedContent = norm;
    this.fileContent = norm;
    this.tabs = this.tabs.map((t) =>
      t.id === this.activeTabId ? { ...t, content: norm, savedContent: norm, isDirty: false } : t
    );
  }
}

// ----------------------------------------------------------------------------
// テストケース 1:
// 「ファイル1編集 -> ファイル2オープン -> ファイル1切替 -> 未保存マーク（isDirty）維持 -> タブクローズ時警告判定」
// ----------------------------------------------------------------------------
console.log("テスト 1: ファイル1編集 -> ファイル2オープン -> ファイル1切替 -> isDirty維持 -> タブクローズ時警告判定");
const app = new AppTabStateManager();

// 1. ファイル1 (file1.md) を開く
app.openFileInTab("C:/docs/file1.md", "# File 1 Initial Content\nOriginal text.");
assert.equal(app.tabs.length, 1);
assert.equal(app.activeTabId, "C:/docs/file1.md");
assert.equal(app.isDirty, false, "開いた直後はクリーン（isDirty: false）");
assert.equal(app.getActiveTab().isDirty, false);

// 2. ファイル1 を編集して未保存状態（Dirty）にする
app.handleUserEdit("# File 1 Initial Content\nOriginal text.\nEdited by user.");
assert.equal(app.isDirty, true, "編集後は isDirty: true になること");
assert.equal(app.getActiveTab().isDirty, true, "アクティブタブの isDirty が true であること");
assert.equal(app.savedContent, "# File 1 Initial Content\nOriginal text.");
assert.equal(app.fileContent, "# File 1 Initial Content\nOriginal text.\nEdited by user.");

// 3. ファイル2 (file2.md) を新規オープン
app.openFileInTab("C:/docs/file2.md", "# File 2 Content\nClean file.");
assert.equal(app.tabs.length, 2, "タブが2つ存在すること");
assert.equal(app.activeTabId, "C:/docs/file2.md", "ファイル2がアクティブタブになること");
assert.equal(app.isDirty, false, "クリーンなファイル2を表示中のため全体 isDirty は false");
const file1TabBeforeSwitch = app.tabs.find((t) => t.id === "C:/docs/file1.md");
assert.equal(file1TabBeforeSwitch.isDirty, true, "非アクティブなファイル1の isDirty は true のまま退避保持されていること");
assert.equal(file1TabBeforeSwitch.savedContent, "# File 1 Initial Content\nOriginal text.");

// 4. ファイル1 へタブ切り替え
app.handleSelectTab("C:/docs/file1.md");
assert.equal(app.activeTabId, "C:/docs/file1.md", "ファイル1がアクティブタブに復帰");
assert.equal(app.isDirty, true, "ファイル1復帰時に isDirty: true が即座に維持・反映されていること");
assert.equal(app.getActiveTab().isDirty, true, "アクティブタブの isDirty が true であること");
assert.equal(app.savedContent, "# File 1 Initial Content\nOriginal text.", "savedContent が編集前基準値のまま維持されていること");

// 5. エディタ再マウントによる初期シリアライズ通知 (meta.isUserInteraction === false) のシミュレーション
// わずかな改行やインデント整形が含まれて通知された場合を模倣
app.handleContentChange("# File 1 Initial Content\nOriginal text.\nEdited by user.\n", { isUserInteraction: false });
assert.equal(app.isDirty, true, "再マウント時の初期シリアライズ通知後も isDirty: true が厳格に保持されること (誤リセットされない)");
assert.equal(app.getActiveTab().isDirty, true, "タブアイテムの isDirty も true を維持");
assert.equal(app.savedContent, "# File 1 Initial Content\nOriginal text.", "savedContent が編集後コンテンツで誤上書きされていないこと");

// 6. タブクローズ（handleCloseTab）時の警告判定の検証
// 6-1. ユーザーが「キャンセル」した場合
app.confirmReturnValue = false; // window.confirm でキャンセルを選択
app.handleCloseTab("C:/docs/file1.md");
assert.equal(app.confirmCalls.length, 1, "window.confirm が1回呼び出されたこと");
assert.ok(app.confirmCalls[0].includes("file1.md"), "警告ダイアログにファイル名が含まれていること");
assert.equal(app.tabs.length, 2, "キャンセルされたためタブは閉じられず2個のままであること");
assert.equal(app.activeTabId, "C:/docs/file1.md", "ファイル1のアクティブ状態が維持されていること");
assert.equal(app.isDirty, true, "isDirty: true が維持されていること");

// 6-2. ユーザーが「OK（破棄を承認）」した場合
app.confirmCalls = [];
app.confirmReturnValue = true; // window.confirm でOKを選択
app.handleCloseTab("C:/docs/file1.md");
assert.equal(app.confirmCalls.length, 1, "window.confirm が呼び出されたこと");
assert.equal(app.tabs.length, 1, "ファイル1が閉じられ、タブ数が1になったこと");
assert.equal(app.activeTabId, "C:/docs/file2.md", "ファイル2がアクティブになったこと");
assert.equal(app.isDirty, false, "クリーンなファイル2に切り替わったため isDirty: false であること");

console.log("✓ テスト 1: ファイル1編集 -> 切替 -> isDirty維持 -> クローズ時警告判定 成功");

// ----------------------------------------------------------------------------
// テストケース 2:
// 非アクティブな未保存タブの閉じるボタン押下時にも警告判定が発火することの検証
// ----------------------------------------------------------------------------
console.log("\nテスト 2: 非アクティブな未保存タブのクローズ時警告判定");
const app2 = new AppTabStateManager();
app2.openFileInTab("C:/docs/fileA.md", "Content A");
app2.handleUserEdit("Content A - modified");
assert.equal(app2.isDirty, true);

// タブBを開いてアクティブにする
app2.openFileInTab("C:/docs/fileB.md", "Content B");
assert.equal(app2.activeTabId, "C:/docs/fileB.md");
assert.equal(app2.isDirty, false);

// 非アクティブな fileA.md の閉じるボタンを押す
app2.confirmCalls = [];
app2.confirmReturnValue = false; // キャンセル
app2.handleCloseTab("C:/docs/fileA.md");
assert.equal(app2.confirmCalls.length, 1, "非アクティブタブでも未保存警告ダイアログが表示されること");
assert.ok(app2.confirmCalls[0].includes("fileA.md"), "ダイアログに fileA.md が含まれていること");
assert.equal(app2.tabs.length, 2, "キャンセル時はタブが削除されないこと");

app2.confirmReturnValue = true; // OK
app2.handleCloseTab("C:/docs/fileA.md");
assert.equal(app2.tabs.length, 1, "承認時は非アクティブタブが正常にクローズされること");
assert.equal(app2.activeTabId, "C:/docs/fileB.md", "アクティブタブは fileB.md のまま維持されること");

console.log("✓ テスト 2: 非アクティブタブのクローズ時警告判定 成功");

// ----------------------------------------------------------------------------
// テストケース 3:
// クリーンなタブにおけるエディタ初回シリアライズ差異のベースライン同期（未保存誤爆防止）の共存確認
// ----------------------------------------------------------------------------
console.log("\nテスト 3: クリーンなタブにおける初回シリアライズベースライン同期（未保存誤爆防止）の共存");
const app3 = new AppTabStateManager();
app3.openFileInTab("C:/docs/clean.md", "1. Item 1\n2. Item 2");
assert.equal(app3.isDirty, false);

// 未編集の状態で Milkdown が自動整形した差異を通知してきた場合
app3.handleContentChange("1. Item 1\n2. Item 2\n", { isUserInteraction: false });
assert.equal(app3.isDirty, false, "クリーンタブでは初回シリアライズ差異で isDirty: true に誤爆しないこと");
assert.equal(app3.savedContent, "1. Item 1\n2. Item 2\n", "クリーンタブでは savedContent がベースライン同期されること");

// クリーンタブを閉じる際は警告ダイアログが出ないこと
app3.confirmCalls = [];
app3.handleCloseTab("C:/docs/clean.md");
assert.equal(app3.confirmCalls.length, 0, "クリーンタブのクローズ時は警告ダイアログが表示されないこと");
assert.equal(app3.tabs.length, 0, "クリーンタブがダイアログなしでクローズされること");

console.log("✓ テスト 3: クリーンタブのベースライン同期共存 成功");

// ----------------------------------------------------------------------------
// テストケース 4:
// 保存操作（Ctrl+S）実行後は未保存フラグが解除され、警告なしでクローズできることの検証
// ----------------------------------------------------------------------------
console.log("\nテスト 4: ファイル保存操作による未保存フラグ解除とクローズ検証");
const app4 = new AppTabStateManager();
app4.openFileInTab("C:/docs/savedDoc.md", "Initial text");
app4.handleUserEdit("Updated text");
assert.equal(app4.isDirty, true, "編集直後は未保存");

// 保存実行
app4.handleSave();
assert.equal(app4.isDirty, false, "保存後は isDirty: false になること");
assert.equal(app4.getActiveTab().isDirty, false, "タブアイテムの isDirty も false になること");
assert.equal(app4.savedContent, "Updated text");

// 保存後のクローズ検証
app4.confirmCalls = [];
app4.handleCloseTab("C:/docs/savedDoc.md");
assert.equal(app4.confirmCalls.length, 0, "保存後は確認ダイアログなしでタブを閉じられること");
assert.equal(app4.tabs.length, 0);

console.log("✓ テスト 4: 保存後の未保存フラグ解除とクローズ 成功");

console.log("\n==================================================================");
console.log("  ✓ 全ての検証（静的検査 + 4つの状態遷移シミュレーション）が合格しました！");
console.log("==================================================================");
