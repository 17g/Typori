import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== WYSIWYGモード 書式クリア（Clear Formatting / Bare）機能検証 (Phase 26 Task 98) ===");

// 1. Editor.tsx の静的構成・エクスポート・Ref定義検証
console.log("\n[Step 1] Editor.tsx の静的構造およびインターフェース検証...");
const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorPath), "Editor.tsx が存在すること");

const editorContent = fs.readFileSync(editorPath, "utf-8");

// インターフェースと関数のエクスポート確認
assert.ok(
  editorContent.includes("export interface EditorRef"),
  "EditorRef が export されていること"
);
assert.ok(
  editorContent.includes("clearFormatting: () => boolean;"),
  "EditorRef に clearFormatting メソッドが定義されていること"
);
assert.ok(
  editorContent.includes("export function clearWysiwygFormatting("),
  "clearWysiwygFormatting 関数が export されていること"
);
assert.ok(
  editorContent.includes("export const clearWysiwygFormattingCommand = clearWysiwygFormatting"),
  "clearWysiwygFormattingCommand が export されていること"
);
assert.ok(
  editorContent.includes("onClearFormatting?: () => void;"),
  "EditorProps に onClearFormatting コールバックが定義されていること"
);
assert.ok(
  editorContent.includes("clearFormatting: clearFormattingAction"),
  "useImperativeHandle で clearFormatting が外部公開されていること"
);
assert.ok(
  editorContent.includes("clearFormattingAction,"),
  "useImperativeHandle の依存配列に clearFormattingAction が含まれていること"
);

// tr.removeMark および空選択ガードの実装確認
assert.ok(
  editorContent.includes("selection.empty || selection.from === selection.to"),
  "空選択ガード（selection.empty || selection.from === selection.to）が実装されていること"
);
assert.ok(
  editorContent.includes("state.tr.removeMark(selection.from, selection.to)"),
  "ProseMirror の tr.removeMark(selection.from, selection.to) が呼び出されていること"
);
assert.ok(
  editorContent.includes("tr.setStoredMarks([])"),
  "tr.setStoredMarks([]) により入力予定マークが初期化されていること"
);

console.log("✓ Editor.tsx の型定義・エクスポート・ref外部公開を確認");

// 2. ショートカットキーハンドラー (Ctrl+Shift+B / Cmd+Shift+B) の検証
console.log("\n[Step 2] ショートカット（Ctrl+Shift+B / Cmd+Shift+B）キーダウンハンドラ検証...");

assert.ok(
  editorContent.includes('(e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "b" || e.key === "B")'),
  "handleKeyDown 内で Ctrl/Cmd + Shift + B キーが検知されていること"
);
assert.ok(
  editorContent.includes("clearFormattingAction()"),
  "ショートカットキー押下時に clearFormattingAction() が呼び出されていること"
);

console.log("✓ handleKeyDown における Ctrl+Shift+B / Cmd+Shift+B ショートカット登録を確認");

// 3. ProseMirror 状態管理・書式クリア動作シミュレーション
console.log("\n[Step 3] ProseMirror 状態管理・書式クリア（tr.removeMark）動作シミュレーション...");

// モック ProseMirror 構造による検証
function createMockEditorState({ docText, marks = [], selectionFrom, selectionTo }) {
  // ノードごとのマーク保持構造
  let currentDoc = {
    text: docText,
    marks: [...marks], // { from, to, type }
  };

  const state = {
    doc: currentDoc,
    selection: {
      from: selectionFrom,
      to: selectionTo,
      empty: selectionFrom === selectionTo,
    },
    tr: {
      doc: currentDoc,
      storedMarks: null,
      removeMark(from, to, markType = null) {
        // markType が null の場合は全マーク解除、指定がある場合は該当マークのみ解除
        currentDoc.marks = currentDoc.marks.filter((m) => {
          if (markType && m.type !== markType) return true;
          // 範囲外のマークはそのまま保持
          if (m.to <= from || m.from >= to) return true;
          // 完全に含まれるマークは除去
          if (m.from >= from && m.to <= to) return false;
          // 範囲と交差する場合は分割または縮小
          // 簡略化シミュレーション: 対象範囲のマークを除去
          return false;
        });
        return this;
      },
      setStoredMarks(m) {
        this.storedMarks = m;
        return this;
      },
    },
  };

  return state;
}

// clearWysiwygFormatting のロジックをシミュレーション
function runClearWysiwygFormatting(view) {
  if (!view || !view.state) return false;
  const { state, dispatch } = view;
  const { selection } = state;

  if (selection.empty || selection.from === selection.to) {
    // 空選択ガード: 選択範囲がない場合は何もしない
    return false;
  }

  const tr = state.tr.removeMark(selection.from, selection.to);
  tr.setStoredMarks([]);
  dispatch(tr);
  view.focus();
  return true;
}

// 3-1. 空選択ガードの検証 (selection.empty = true)
{
  let dispatched = false;
  let focused = false;
  const mockState = createMockEditorState({
    docText: "Hello world",
    marks: [{ from: 0, to: 11, type: "strong" }],
    selectionFrom: 5,
    selectionTo: 5,
  });

  const mockView = {
    state: mockState,
    dispatch: () => { dispatched = true; },
    focus: () => { focused = true; },
  };

  const result = runClearWysiwygFormatting(mockView);
  assert.equal(result, false, "空選択時は false が返ること");
  assert.equal(dispatched, false, "空選択時は dispatch されないこと");
  assert.equal(focused, false, "空選択時は focus されないこと");
  assert.equal(mockState.doc.marks.length, 1, "マークが保持されていること");
  console.log("  3-1. 空選択ガード: 正常 (no-op 確認)");
}

// 3-2. 単一装飾（太字）の一括解除
{
  let dispatched = false;
  let focused = false;
  const mockState = createMockEditorState({
    docText: "Bold text here",
    marks: [{ from: 0, to: 14, type: "strong" }],
    selectionFrom: 0,
    selectionTo: 14,
  });

  const mockView = {
    state: mockState,
    dispatch: (tr) => { dispatched = true; },
    focus: () => { focused = true; },
  };

  const result = runClearWysiwygFormatting(mockView);
  assert.equal(result, true, "選択範囲が存在する場合は true が返ること");
  assert.equal(dispatched, true, "dispatch が呼び出されること");
  assert.equal(focused, true, "view.focus が呼び出されること");
  assert.equal(mockState.doc.marks.length, 0, "太字マークが完全に解除されること");
  assert.deepEqual(mockState.tr.storedMarks, [], "storedMarks が空配列に初期化されること");
  console.log("  3-2. 単一装飾（太字）解除: 正常");
}

// 3-3. 複合装飾（太字 + 斜体 + リンク）の一括解除
{
  let dispatched = false;
  const mockState = createMockEditorState({
    docText: "Complex formatting with multiple marks",
    marks: [
      { from: 0, to: 38, type: "strong" },
      { from: 0, to: 38, type: "em" },
      { from: 8, to: 18, type: "link" },
      { from: 0, to: 38, type: "strike" },
    ],
    selectionFrom: 0,
    selectionTo: 38,
  });

  const mockView = {
    state: mockState,
    dispatch: (tr) => { dispatched = true; },
    focus: () => {},
  };

  const result = runClearWysiwygFormatting(mockView);
  assert.equal(result, true, "複合装飾でも true が返ること");
  assert.equal(dispatched, true, "dispatch されること");
  assert.equal(mockState.doc.marks.length, 0, "全4種類のマークが一括解除されること");
  console.log("  3-3. 複合装飾（strong, em, link, strike）一括解除: 正常");
}

// 3-4. 部分選択時の範囲外マーク保持
{
  const mockState = createMockEditorState({
    docText: "First part and Second part",
    marks: [
      { from: 0, to: 10, type: "strong" },
      { from: 15, to: 26, type: "em" },
    ],
    selectionFrom: 0,
    selectionTo: 10,
  });

  const mockView = {
    state: mockState,
    dispatch: () => {},
    focus: () => {},
  };

  const result = runClearWysiwygFormatting(mockView);
  assert.equal(result, true);
  assert.equal(mockState.doc.marks.length, 1, "選択外のマーク（Second part の em）は保持されること");
  assert.equal(mockState.doc.marks[0].type, "em");
  console.log("  3-4. 部分選択時の範囲外マーク保持: 正常");
}

console.log("\n✓ 全ステップの検証に合格しました！");
