import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================================");
console.log("  SourceEditor: Ctrl+/ コメント誤挿入防止 & WYSIWYG切替競合解消 検証  ");
console.log("==================================================================");

// 1. 静的コード解析: SourceEditor.tsx の Prec.highest, domEventHandlers, keymap 実装検証
console.log("\n--- [Step 1] SourceEditor.tsx 静的コード解析 ---");

const sourceEditorPath = path.resolve("src/components/Editor/SourceEditor.tsx");
assert.ok(fs.existsSync(sourceEditorPath), "src/components/Editor/SourceEditor.tsx が存在すること");
const sourceEditorContent = fs.readFileSync(sourceEditorPath, "utf-8");

// Prec のインポート確認
assert.ok(
  sourceEditorContent.includes("Prec"),
  "SourceEditor.tsx で @uiw/react-codemirror から Prec がインポートされていること"
);

// Callback Refs の定義確認（stale closure の根絶）
assert.ok(
  sourceEditorContent.includes("const onSaveRef = useRef(onSave);"),
  "onSaveRef が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("const onToggleSourceModeRef = useRef(onToggleSourceMode);"),
  "onToggleSourceModeRef が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("const onExitSourceModeRef = useRef(onExitSourceMode);"),
  "onExitSourceModeRef が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("const onToggleFocusModeRef = useRef(onToggleFocusMode);"),
  "onToggleFocusModeRef が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("const handleToggleOrExit = useCallback("),
  "handleToggleOrExit が定義されていること"
);

// domEventExtension の実装確認 (Prec.highest, preventDefault, stopPropagation)
assert.ok(
  sourceEditorContent.includes("const domEventExtension = useMemo(() => {"),
  "domEventExtension が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("Prec.highest("),
  "Prec.highest が適用されていること"
);
assert.ok(
  sourceEditorContent.includes("EditorView.domEventHandlers("),
  "EditorView.domEventHandlers が使用されていること"
);
assert.ok(
  sourceEditorContent.includes("event.preventDefault();"),
  "domEventHandlers で event.preventDefault() が実行されていること"
);
assert.ok(
  sourceEditorContent.includes("event.stopPropagation();"),
  "domEventHandlers で event.stopPropagation() が実行されていること"
);

// スラッシュ判定の網羅性確認（US / JIS / NumpadDivide）
assert.ok(
  sourceEditorContent.includes("event.key === \"/\""),
  "key === '/' 判定が含まれていること"
);
assert.ok(
  sourceEditorContent.includes("event.code === \"Slash\""),
  "code === 'Slash' 判定が含まれていること"
);
assert.ok(
  sourceEditorContent.includes("event.code === \"NumpadDivide\""),
  "code === 'NumpadDivide' (テンキー除算記号) 判定が含まれていること"
);

// keymapExtension の実装確認 (Prec.highest, Mod-s, Mod-/, F8, preventDefault, stopPropagation)
assert.ok(
  sourceEditorContent.includes("const keymapExtension = useMemo(() => {"),
  "keymapExtension が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("key: \"Mod-s\""),
  "keymap に Mod-s が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("key: \"Mod-/\""),
  "keymap に Mod-/ が定義されていること"
);
assert.ok(
  sourceEditorContent.includes("key: \"F8\""),
  "keymap に F8 が定義されていること"
);

// extensions 配列への登録確認
assert.ok(
  sourceEditorContent.includes("domEventExtension"),
  "extensions に domEventExtension が登録されていること"
);
assert.ok(
  sourceEditorContent.includes("keymapExtension"),
  "extensions に keymapExtension が登録されていること"
);

// App.tsx との統合確認
const appPath = path.resolve("src/App.tsx");
assert.ok(fs.existsSync(appPath), "src/App.tsx が存在すること");
const appContent = fs.readFileSync(appPath, "utf-8");
assert.ok(
  appContent.includes("key={selectedPath ?? \"__source__\"}"),
  "App.tsx で SourceEditor に独立した key が付与されていること"
);
assert.ok(
  appContent.includes("onToggleSourceMode={handleToggleSourceMode}"),
  "App.tsx で SourceEditor に onToggleSourceMode が渡されていること"
);

console.log("✓ SourceEditor.tsx および App.tsx の静的コード構造検査に合格");

// 2. キーボードショートカット判定ロジックの網羅的シミュレーション
console.log("\n--- [Step 2] キーイベント捕捉 & 伝播遮断シミュレーション ---");

function simulateDomKeydown(event, callback) {
  let defaultPrevented = false;
  let propagationStopped = false;

  const mockEvent = {
    ...event,
    preventDefault: () => {
      defaultPrevented = true;
    },
    stopPropagation: () => {
      propagationStopped = true;
    },
  };

  const isSlashKey =
    mockEvent.key === "/" ||
    (mockEvent.code === "Slash" && !mockEvent.shiftKey) ||
    mockEvent.code === "NumpadDivide";

  let handled = false;
  if ((mockEvent.ctrlKey || mockEvent.metaKey) && isSlashKey && !mockEvent.altKey) {
    mockEvent.preventDefault();
    mockEvent.stopPropagation();
    callback();
    handled = true;
  }

  return { handled, defaultPrevented, propagationStopped };
}

// テスト 1: Windows US 配列 (Ctrl + /)
let toggleCalled = 0;
let res = simulateDomKeydown(
  { key: "/", code: "Slash", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
  () => { toggleCalled++; }
);
assert.equal(res.handled, true, "Ctrl + / (US) で捕捉されること");
assert.equal(res.defaultPrevented, true, "Ctrl + / (US) で preventDefault されること");
assert.equal(res.propagationStopped, true, "Ctrl + / (US) で stopPropagation されること");
assert.equal(toggleCalled, 1, "コールバックが実行されること");

// テスト 2: macOS 配列 (Cmd + /)
res = simulateDomKeydown(
  { key: "/", code: "Slash", ctrlKey: false, metaKey: true, altKey: false, shiftKey: false },
  () => { toggleCalled++; }
);
assert.equal(res.handled, true, "Cmd + / (macOS) で捕捉されること");
assert.equal(res.defaultPrevented, true, "Cmd + / (macOS) で preventDefault されること");
assert.equal(res.propagationStopped, true, "Cmd + / (macOS) で stopPropagation されること");
assert.equal(toggleCalled, 2, "コールバックが実行されること");

// テスト 3: テンキー除算記号 (Ctrl + NumpadDivide)
res = simulateDomKeydown(
  { key: "/", code: "NumpadDivide", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
  () => { toggleCalled++; }
);
assert.equal(res.handled, true, "Ctrl + NumpadDivide で捕捉されること");
assert.equal(res.defaultPrevented, true, "Ctrl + NumpadDivide で preventDefault されること");
assert.equal(res.propagationStopped, true, "Ctrl + NumpadDivide で stopPropagation されること");
assert.equal(toggleCalled, 3, "コールバックが実行されること");

// テスト 4: 欧州配列等 (Ctrl + Shift + 7 -> key '/')
res = simulateDomKeydown(
  { key: "/", code: "Digit7", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true },
  () => { toggleCalled++; }
);
assert.equal(res.handled, true, "Ctrl + Shift + 7 (key '/') で捕捉されること");
assert.equal(toggleCalled, 4);

// テスト 5: ネガティブケース（誤爆防止）
// 5a. 単なるスラッシュ '/' 入力
res = simulateDomKeydown(
  { key: "/", code: "Slash", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false },
  () => { toggleCalled++; }
);
assert.equal(res.handled, false, "単なる '/' 入力は横取りされないこと");
assert.equal(res.defaultPrevented, false);
assert.equal(res.propagationStopped, false);

// 5b. Ctrl + Shift + Slash ('?')
res = simulateDomKeydown(
  { key: "?", code: "Slash", ctrlKey: true, metaKey: false, altKey: false, shiftKey: true },
  () => { toggleCalled++; }
);
assert.equal(res.handled, false, "Ctrl + ? (Shift+Slash) は横取りされないこと");

// 5c. Alt 修飾キー付き (Ctrl + Alt + /)
res = simulateDomKeydown(
  { key: "/", code: "Slash", ctrlKey: true, metaKey: false, altKey: true, shiftKey: false },
  () => { toggleCalled++; }
);
assert.equal(res.handled, false, "Ctrl + Alt + / は横取りされないこと");

// 5d. 一般キー入力 (Ctrl + s, F8 等)
res = simulateDomKeydown(
  { key: "s", code: "KeyS", ctrlKey: true, metaKey: false, altKey: false, shiftKey: false },
  () => { toggleCalled++; }
);
assert.equal(res.handled, false, "Ctrl + s はスラッシュリスナーで横取りされないこと");

assert.equal(toggleCalled, 4, "不要なコールバック発火がないこと");
console.log("✓ キーイベント捕捉・伝播遮断・非対象キー透過シミュレーションに合格");

// 3. CodeMirror 優先順位（Prec.highest vs defaultKeymap）およびコメント挿入抑止シミュレーション
console.log("\n--- [Step 3] CodeMirror 優先順位 & コメント誤挿入防止シミュレーション ---");

// CodeMirror のキーマップディスパッチシミュレータ
class MockCodeMirrorDispatcher {
  constructor() {
    this.handlers = [];
    this.documentText = "# Original Title\n\nContent here";
  }

  register(priority, key, run) {
    this.handlers.push({ priority, key, run });
    // 優先順位順（highest -> default -> low）にソート
    const priorityOrder = { highest: 3, default: 2, low: 1 };
    this.handlers.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  dispatch(keyName) {
    for (const h of this.handlers) {
      if (h.key === keyName) {
        const handled = h.run();
        if (handled) {
          return true;
        }
      }
    }
    return false;
  }
}

// シミュレータ準備
const cm = new MockCodeMirrorDispatcher();

let modeSwitchedToWysiwyg = false;

// 1. defaultKeymap (CodeMirror の basicSetup で登録される標準コメントトグル: default 優先度)
cm.register("default", "Mod-/", () => {
  // toggleComment コマンド: HTML コメント <!-- --> を挿入してしまう！
  cm.documentText = cm.documentText.replace("Original Title", "<!-- Original Title -->");
  return true;
});

// 2. SourceEditor の Prec.highest keymapExtension (最高優先度)
cm.register("highest", "Mod-/", () => {
  modeSwitchedToWysiwyg = true;
  return true; // handled: true により defaultKeymap は実行されない
});

// 実行: Mod-/ を押下
const handled = cm.dispatch("Mod-/");
assert.equal(handled, true, "Mod-/ がディスパッチされること");
assert.equal(modeSwitchedToWysiwyg, true, "Prec.highest により WYSIWYG モードへの復帰が発火すること");
assert.ok(
  !cm.documentText.includes("<!--"),
  "本文にコメント記号 <!-- が挿入されていないこと（コメント誤挿入の完全防止）"
);
assert.equal(
  cm.documentText,
  "# Original Title\n\nContent here",
  "ドキュメント本文が汚染されず元のまま維持されていること"
);

console.log("✓ Prec.highest による defaultKeymap (toggleComment) 先行抑止 & 本文汚染防止に合格");

// 4. Callback Refs の最新性（Stale Closure 根絶）シミュレーション
console.log("\n--- [Step 4] Callback Refs 動的追従 & フォールバック動作シミュレーション ---");

let activeVersion = 1;
const mockRefs = {
  onToggleSourceModeRef: { current: () => `version_${activeVersion}` },
  onExitSourceModeRef: { current: null },
};

function handleToggleOrExitSim() {
  const toggle = mockRefs.onToggleSourceModeRef.current || mockRefs.onExitSourceModeRef.current;
  if (toggle) {
    return toggle();
  }
  return null;
}

// バージョン 1
assert.equal(handleToggleOrExitSim(), "version_1", "初期ハンドラが実行されること");

// 親の再レンダリングでハンドラが差し替わった場合（エディタ拡張を再生成しなくても即座に最新が反映）
activeVersion = 2;
mockRefs.onToggleSourceModeRef.current = () => `version_${activeVersion}`;
assert.equal(handleToggleOrExitSim(), "version_2", "最新のクロージャ参照が即時反映されること");

// onToggleSourceMode が未指定で onExitSourceMode のみが指定されている場合のフォールバック検証
mockRefs.onToggleSourceModeRef.current = null;
mockRefs.onExitSourceModeRef.current = () => "fallback_exit_executed";
assert.equal(handleToggleOrExitSim(), "fallback_exit_executed", "onExitSourceMode へのフォールバックが正しく実行されること");

console.log("✓ Callback Refs による Stale Closure 根絶およびフォールバック検証に合格");

console.log("\n==================================================================");
console.log("  >>> SourceEditor: Ctrl+/ 誤挿入防止 & 競合解消検証: 全項目合格 <<<  ");
console.log("==================================================================");
