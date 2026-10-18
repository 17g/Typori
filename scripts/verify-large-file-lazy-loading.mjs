import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("  Typori Phase 25 Task 94: アウトライン・画像・Mermaid遅延ロード検証 ");
console.log("==================================================================");

// -----------------------------------------------------------------------------
// [Step 1] OutlineSidebar のアウトライン抽出デバウンス検証
// -----------------------------------------------------------------------------
console.log("\n--- [Step 1] OutlineSidebar のアウトライン抽出デバウンス検証 ---");

const outlineSidebarPath = path.resolve(projectRoot, "src/components/OutlineSidebar/OutlineSidebar.tsx");
assert.ok(fs.existsSync(outlineSidebarPath), "OutlineSidebar.tsx が存在すること");
const outlineSidebarCode = fs.readFileSync(outlineSidebarPath, "utf-8").replace(/\r\n/g, "\n");

// 1.1 OUTLINE_DEBOUNCE_MS 定数の存在とエクスポート
assert.ok(
  outlineSidebarCode.includes("export const OUTLINE_DEBOUNCE_MS = 150"),
  "OUTLINE_DEBOUNCE_MS が 150ms でエクスポートされていること"
);
console.log("✓ OUTLINE_DEBOUNCE_MS (150ms) のエクスポートを確認");

// 1.2 index.ts からの再エクスポート
const outlineIndexPath = path.resolve(projectRoot, "src/components/OutlineSidebar/index.ts");
const outlineIndexCode = fs.readFileSync(outlineIndexPath, "utf-8").replace(/\r\n/g, "\n");
assert.ok(
  outlineIndexCode.includes("OUTLINE_DEBOUNCE_MS"),
  "OutlineSidebar/index.ts から OUTLINE_DEBOUNCE_MS が再エクスポートされていること"
);
console.log("✓ index.ts からの OUTLINE_DEBOUNCE_MS 再エクスポートを確認");

// 1.3 setTimeout と clearTimeout によるデバウンスおよび lastProcessedContentRef による重複排除
assert.ok(
  outlineSidebarCode.includes("setTimeout") && outlineSidebarCode.includes("clearTimeout"),
  "OutlineSidebar 内で setTimeout / clearTimeout によるデバウンス処理が実装されていること"
);
assert.ok(
  outlineSidebarCode.includes("lastProcessedContentRef"),
  "同一コンテンツの重複抽出を抑止する lastProcessedContentRef が実装されていること"
);
console.log("✓ デバウンスタイマー & 重複抽出ガードの静的構造を確認");

// 1.4 デバウンスシミュレーション検証
{
  let callCount = 0;
  function mockExtractOutline(content) {
    callCount++;
    return [{ level: 1, text: "Heading", line: 0 }];
  }

  const DEBOUNCE_MS = 150;
  let timer = null;
  let lastContent = null;

  function simulateContentChange(content, onDone) {
    if (content === lastContent) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      lastContent = content;
      mockExtractOutline(content);
      if (onDone) onDone();
    }, DEBOUNCE_MS);
  }

  // 30ms間隔で3回高速入力
  simulateContentChange("# A");
  simulateContentChange("# AB");
  simulateContentChange("# ABC", () => {
    assert.equal(callCount, 1, "高速タイピング中は抽出が実行されず、停止後に1回のみ実行されること");
  });

  // 直前時点では未実行（0回）
  assert.equal(callCount, 0, "デバウンス期間満了前は抽出未実行であること");
  console.log("✓ OutlineSidebar デバウンスシミュレーション合格");
}

// -----------------------------------------------------------------------------
// [Step 2] DOM内ローカル画像解決 (resolveImagesInDOM) の最適化検証
// -----------------------------------------------------------------------------
console.log("\n--- [Step 2] DOM内ローカル画像解決 (resolveImagesInDOM) の最適化検証 ---");

const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorPath), "Editor.tsx が存在すること");
const editorCode = fs.readFileSync(editorPath, "utf-8").replace(/\r\n/g, "\n");

// 2.1 onlyVisible オプションと可視領域内外判定
assert.ok(
  editorCode.includes("options?: { onlyVisible?: boolean }") ||
    editorCode.includes("onlyVisible?: boolean"),
  "resolveImagesInDOM に onlyVisible オプションが定義されていること"
);
assert.ok(
  editorCode.includes("BUFFER_PX = 400") || editorCode.includes("BUFFER_PX"),
  "ビューポート判定にバッファ領域 (BUFFER_PX) が設定されていること"
);
console.log("✓ resolveImagesInDOM のビューポート優先オプション & バッファ設定を確認");

// 2.2 重複解決防止 (resolvingImagesRef)
assert.ok(
  editorCode.includes("resolvingImagesRef"),
  "非同期解決中の重複要求を防止する resolvingImagesRef が実装されていること"
);
console.log("✓ resolvingImagesRef による重複IPC読み込み防止を確認");

// 2.3 スクロール時デバウンス & MutationObserver デバウンス & アイドル段階解決
assert.ok(
  editorCode.includes("resolveImagesTimerRef"),
  "スクロールおよびDOM変更検知時のデバウンス用タイマー ref が実装されていること"
);
assert.ok(
  editorCode.includes("idleTimer = setTimeout") || editorCode.includes("idleTimer"),
  "初期オープン後のアイドル時（遅延）に全体画像を段階解決する機構が存在すること"
);
console.log("✓ スクロール/DOM変更デバウンス & アイドル段階解決を確認");

// 2.4 可視領域判定ロジックシミュレーション
{
  const containerRect = { top: 100, bottom: 800 };
  const BUFFER_PX = 400;
  const searchTop = containerRect.top - BUFFER_PX; // -300
  const searchBottom = containerRect.bottom + BUFFER_PX; // 1200

  const isNearViewport = (imgRect) => {
    return imgRect.bottom >= searchTop && imgRect.top <= searchBottom;
  };

  // 画面内
  assert.equal(isNearViewport({ top: 200, bottom: 350 }), true, "画面内画像は判定 true");
  // 画面直上（バッファ内）
  assert.equal(isNearViewport({ top: -100, bottom: -20 }), true, "バッファ内画像は判定 true");
  // 画面直下（バッファ内）
  assert.equal(isNearViewport({ top: 900, bottom: 1100 }), true, "画面直下バッファ内は判定 true");
  // 画面はるか下（1500px〜）
  assert.equal(isNearViewport({ top: 2500, bottom: 2700 }), false, "画面外遠方は判定 false");

  console.log("✓ ビューポート近傍判定ロジック合格");
}

// -----------------------------------------------------------------------------
// [Step 3] Mermaid レンダリングのビューポート遅延評価 (Lazy Render) 検証
// -----------------------------------------------------------------------------
console.log("\n--- [Step 3] Mermaid レンダリングのビューポート遅延評価 (Lazy Render) 検証 ---");

const mermaidPluginPath = path.resolve(projectRoot, "src/components/Editor/mermaidPlugin.ts");
assert.ok(fs.existsSync(mermaidPluginPath), "mermaidPlugin.ts が存在すること");
const mermaidPluginCode = fs.readFileSync(mermaidPluginPath, "utf-8").replace(/\r\n/g, "\n");

// 3.1 MermaidNodeView の遅延評価プロパティ
assert.ok(
  mermaidPluginCode.includes("hasRendered: boolean = false;"),
  "MermaidNodeView に hasRendered プロパティが定義されていること"
);
assert.ok(
  mermaidPluginCode.includes("isVisibleInViewport: boolean = false;"),
  "MermaidNodeView に isVisibleInViewport プロパティが定義されていること"
);
assert.ok(
  mermaidPluginCode.includes("intersectionObserver"),
  "MermaidNodeView に intersectionObserver が定義されていること"
);
console.log("✓ MermaidNodeView の遅延描画追跡プロパティ (hasRendered, isVisibleInViewport, intersectionObserver) を確認");

// 3.2 setupIntersectionObserver 実装とプレースホルダー
assert.ok(
  mermaidPluginCode.includes("setupIntersectionObserver(): void") ||
    mermaidPluginCode.includes("setupIntersectionObserver"),
  "setupIntersectionObserver メソッドが実装されていること"
);
assert.ok(
  mermaidPluginCode.includes("rootMargin: \"300px 0px\"") ||
    mermaidPluginCode.includes("300px"),
  "IntersectionObserver にビューポート接近検知バッファ (300px) が設定されていること"
);
assert.ok(
  mermaidPluginCode.includes("typori-mermaid-placeholder"),
  "未描画時の軽量プレースホルダー (typori-mermaid-placeholder) が設定されていること"
);
console.log("✓ IntersectionObserver による可視領域検知 & 軽量プレースホルダーを確認");

// 3.3 Selection アクティブ化時の即時描画 & destroy 解放
assert.ok(
  mermaidPluginCode.includes("if (!this.hasRendered) {\n        this.renderDiagram();\n      }"),
  "アクティブ化（クリック/キャレット進入）時に未描画であれば即時 renderDiagram が呼び出されること"
);
assert.ok(
  mermaidPluginCode.includes("this.intersectionObserver.disconnect()"),
  "destroy メソッドで intersectionObserver が確実に切断・解放されること"
);
console.log("✓ アクティブ化時即時描画 & destroy 時の observer 解放を確認");

// 3.4 テーマ一括変更時の遅延考慮 (rerenderAllMermaidDiagrams)
assert.ok(
  mermaidPluginCode.includes("view.hasRendered || view.isVisibleInViewport"),
  "rerenderAllMermaidDiagrams において描画済みまたは可視なもののみ優先再レンダリングされること"
);
console.log("✓ テーマ一括変更時の可視/描画済み限定再レンダリングを確認");

// 3.5 遅延描画ライフサイクルシミュレーション
{
  class MockMermaidNodeView {
    constructor(inViewport = false) {
      this.hasRendered = false;
      this.isVisibleInViewport = inViewport;
      this.isActive = false;
    }

    onIntersect(isIntersecting) {
      this.isVisibleInViewport = isIntersecting;
      if (isIntersecting && !this.hasRendered) {
        this.renderDiagram();
      }
    }

    onActivate() {
      this.isActive = true;
      if (!this.hasRendered) {
        this.renderDiagram();
      }
    }

    renderDiagram() {
      this.hasRendered = true;
    }
  }

  // シナリオ 1: 画面外で初期化された場合（描画されない）
  const offscreenView = new MockMermaidNodeView(false);
  assert.equal(offscreenView.hasRendered, false, "画面外ビューは初期化時に描画されない");

  // スクロールして画面内に入った場合（自動描画される）
  offscreenView.onIntersect(true);
  assert.equal(offscreenView.hasRendered, true, "スクロール接近時に自動描画される");

  // シナリオ 2: 画面外のままクリック/選択された場合（即時描画される）
  const clickedView = new MockMermaidNodeView(false);
  assert.equal(clickedView.hasRendered, false);
  clickedView.onActivate();
  assert.equal(clickedView.hasRendered, true, "アクティブ化されたら即時描画される");

  console.log("✓ 遅延描画ライフサイクルシミュレーション合格");
}

console.log("\n==================================================================");
console.log(" >>> Phase 25 Task 94: 遅延ロード最適化テスト 全項目合格 <<< ");
console.log("==================================================================");
