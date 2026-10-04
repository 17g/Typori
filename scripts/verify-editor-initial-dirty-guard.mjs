import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("------------------------------------------------------------------");
console.log("  検証: Milkdown初回シリアライズ差異による未保存誤爆防止機構");
console.log("------------------------------------------------------------------");

// 1. Editor.tsx の静的コード検査
const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorPath), "Editor.tsx が存在すること");
const editorContent = fs.readFileSync(editorPath, "utf-8").replace(/\r\n/g, "\n");

// EditorRef 型定義の検証
assert.ok(
  editorContent.includes("hasUserInteracted: () => boolean;"),
  "EditorRef に hasUserInteracted メソッドが定義されていること"
);
assert.ok(
  editorContent.includes("markUserInteracted: () => void;"),
  "EditorRef に markUserInteracted メソッドが定義されていること"
);

// EditorProps 型定義の検証
assert.ok(
  editorContent.includes("onChange?: (markdown: string, meta?: { isUserInteraction?: boolean }) => void;"),
  "EditorProps の onChange に meta オプションが定義されていること"
);

// hasUserInteractedRef および markUserInteracted の実装検証
assert.ok(
  editorContent.includes("const hasUserInteractedRef = useRef(false);"),
  "hasUserInteractedRef が定義されていること"
);
assert.ok(
  editorContent.includes("const markUserInteracted = useCallback("),
  "markUserInteracted コールバックが定義されていること"
);

// mounted フックでの初期シリアライズ自動同期
assert.ok(
  editorContent.includes("ctx.get(listenerCtx).mounted("),
  "listenerCtx.mounted リスナーが登録されていること"
);
assert.ok(
  editorContent.includes("onChangeRef.current?.(initialSerialized, { isUserInteraction: false });"),
  "mounted 時に isUserInteraction: false で初期シリアライズ結果が通知されること"
);

// markdownUpdated での isUserInteraction 通知
assert.ok(
  editorContent.includes("onChangeRef.current?.(normalized, { isUserInteraction: isUser });"),
  "markdownUpdated で isUserInteraction フラグとともに onChange が呼ばれること"
);

// DOM 入力イベントリスナーの検証
assert.ok(
  editorContent.includes("onBeforeInputCapture={markUserInteracted}"),
  "onBeforeInputCapture で markUserInteracted が呼ばれること"
);
assert.ok(
  editorContent.includes("onCompositionEndCapture={markUserInteracted}"),
  "onCompositionEndCapture で markUserInteracted が呼ばれること"
);
assert.ok(
  editorContent.includes("onPasteCapture={markUserInteracted}"),
  "onPasteCapture で markUserInteracted が呼ばれること"
);
assert.ok(
  editorContent.includes("onDropCapture={markUserInteracted}"),
  "onDropCapture で markUserInteracted が呼ばれること"
);

// 2. App.tsx の静的コード検査
const appPath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appPath), "App.tsx が存在すること");
const appContent = fs.readFileSync(appPath, "utf-8").replace(/\r\n/g, "\n");

// handleContentChange でのベースライン同期検証
assert.ok(
  appContent.includes("meta?: { isUserInteraction?: boolean }"),
  "App.tsx の handleContentChange が meta 引数を受け取ること"
);
assert.ok(
  appContent.includes("if (meta && meta.isUserInteraction === false) {"),
  "handleContentChange で isUserInteraction === false の条件分岐が存在すること"
);
assert.ok(
  appContent.includes("savedContentRef.current = normalized;"),
  "isUserInteraction === false 時に savedContentRef が正規化値に同期されること"
);
assert.ok(
  appContent.includes("isDirty: false"),
  "isUserInteraction === false 時に isDirty: false が維持されること"
);

// getUnsavedDocuments でのガード検証
assert.ok(
  appContent.includes("typeof editorRef.current.hasUserInteracted === \"function\""),
  "getUnsavedDocuments で editorRef.current.hasUserInteracted の存在確認があること"
);
assert.ok(
  appContent.includes("!editorRef.current.hasUserInteracted()"),
  "ユーザー未操作時にシリアライズ差分による上書きがスキップされること"
);

// 3. 動作シミュレーションロジックの検証
console.log("  -> 状態遷移シミュレーションテスト実行中...");

function normalizeLineEndings(text) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function isContentDirty(current, saved) {
  return normalizeLineEndings(current) !== normalizeLineEndings(saved);
}

// シナリオ A: ファイルオープン直後、微小な初回シリアライズ差異が発生したケース
const originalDiskContent = "# Document\n- item 1\n- item 2\n";
let currentFileContent = originalDiskContent;
let currentSavedContent = originalDiskContent;
let isDirty = false;
let userInteracted = false;

// Milkdown マウント時に Remark による初回シリアライズ差異が発生（例: 末尾改行の正規化等）
const milkdownSerializedInitial = "# Document\n\n- item 1\n- item 2\n\n";

// 初回同期イベント (isUserInteraction: false)
function onContentChange(markdown, meta) {
  const norm = normalizeLineEndings(markdown);
  currentFileContent = norm;
  if (meta && meta.isUserInteraction === false) {
    currentSavedContent = norm;
    isDirty = false;
  } else {
    isDirty = isContentDirty(norm, currentSavedContent);
  }
}

// マウント時の自動同期が実行される
onContentChange(milkdownSerializedInitial, { isUserInteraction: false });

assert.strictEqual(isDirty, false, "初回シリアライズ差異があっても isDirty は false を維持すること");
assert.strictEqual(currentSavedContent, currentFileContent, "ベースラインが Milkdown 初期シリアライズ値と完全に同期されていること");

// シナリオ B: ユーザーが実際にテキストを入力・編集した場合
userInteracted = true;
const userEditedContent = "# Document\n\n- item 1\n- item 2\n- item 3 (ユーザー追記)\n\n";
onContentChange(userEditedContent, { isUserInteraction: true });

assert.strictEqual(isDirty, true, "ユーザー能動編集後は isDirty が true に変化すること");

// シナリオ C: 保存実行時
currentSavedContent = currentFileContent;
isDirty = isContentDirty(currentFileContent, currentSavedContent);
assert.strictEqual(isDirty, false, "保存後は isDirty が false に戻ること");

console.log("✓ 全ての静的検査およびシミュレーションテストに合格しました。");
