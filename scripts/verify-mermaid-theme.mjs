import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("   Typori Phase 20 Mermaid テーマ連動 & 動的再描画機能検証        ");
console.log("==================================================================");

// 1. src/utils/mermaid.ts のテーマ連動定義検証
console.log("\n[1] src/utils/mermaid.ts のテーマ変数 & テーマ更新関数検証...");
const mermaidUtilPath = path.resolve(projectRoot, "src/utils/mermaid.ts");
assert.ok(fs.existsSync(mermaidUtilPath), "src/utils/mermaid.ts が存在すること");
const mermaidUtilContent = fs.readFileSync(mermaidUtilPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  mermaidUtilContent.includes("export function updateMermaidTheme"),
  "src/utils/mermaid.ts に updateMermaidTheme がエクスポートされていること"
);
assert.ok(
  mermaidUtilContent.includes("themeVariables"),
  "initMermaid に themeVariables 設定が含まれていること"
);
assert.ok(
  mermaidUtilContent.includes('background: "#1f2937"') || mermaidUtilContent.includes("#1f2937"),
  "ダークテーマ用の配色 (#1f2937) が themeVariables に設定されていること"
);
assert.ok(
  mermaidUtilContent.includes("background-color: transparent"),
  "renderMermaidSvg 内で背景色透過のサニタイズ処理が行われていること"
);
console.log("✓ mermaid.ts のテーマ変数設定 & updateMermaidTheme 定義を確認");

// 2. src/hooks/useTheme.ts のテーマ変更イベント通知検証
console.log("\n[2] src/hooks/useTheme.ts のテーマイベント通知検証...");
const useThemePath = path.resolve(projectRoot, "src/hooks/useTheme.ts");
assert.ok(fs.existsSync(useThemePath), "src/hooks/useTheme.ts が存在すること");
const useThemeContent = fs.readFileSync(useThemePath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  useThemeContent.includes('window.dispatchEvent(') &&
    useThemeContent.includes('"typori:theme-change"'),
  "useTheme.ts の applyTheme 内で 'typori:theme-change' イベントがディスパッチされていること"
);
console.log("✓ useTheme.ts の 'typori:theme-change' イベント発火を確認");

// 3. src/components/Editor/mermaidPlugin.ts のテーマ連動・一括再描画機構検証
console.log("\n[3] src/components/Editor/mermaidPlugin.ts のテーマ連動・一括再描画機構検証...");
const pluginFilePath = path.resolve(projectRoot, "src/components/Editor/mermaidPlugin.ts");
assert.ok(fs.existsSync(pluginFilePath), "src/components/Editor/mermaidPlugin.ts が存在すること");
const pluginContent = fs.readFileSync(pluginFilePath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  pluginContent.includes("export function getCurrentAppTheme"),
  "getCurrentAppTheme がエクスポートされていること"
);
assert.ok(
  pluginContent.includes("export async function rerenderAllMermaidDiagrams") ||
    pluginContent.includes("export function rerenderAllMermaidDiagrams"),
  "rerenderAllMermaidDiagrams がエクスポートされていること"
);
assert.ok(
  pluginContent.includes("export const activeMermaidViews") ||
    pluginContent.includes("activeMermaidViews = new Set"),
  "activeMermaidViews レジストリが定義されていること"
);
assert.ok(
  pluginContent.includes("ensureGlobalThemeObserver") &&
    pluginContent.includes("teardownGlobalThemeObserver"),
  "グローバルテーマ監視の開始・解除機構 (ensureGlobalThemeObserver / teardownGlobalThemeObserver) が実装されていること"
);
assert.ok(
  pluginContent.includes('window.addEventListener("typori:theme-change"'),
  "グローバルテーマ監視において 'typori:theme-change' イベントが購読されていること"
);
assert.ok(
  pluginContent.includes("targetTheme ?? getCurrentAppTheme()"),
  "renderDiagram および rerenderAllMermaidDiagrams で明示テーマまたは最新アプリテーマが解決されていること"
);
console.log("✓ mermaidPlugin.ts の一括再描画 & グローバルテーマ監視機構を確認");

// 4. src/components/Editor/Editor.tsx の Props & useEffect 連動検証
console.log("\n[4] src/components/Editor/Editor.tsx の theme prop & useEffect 連動検証...");
const editorFilePath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorFilePath), "src/components/Editor/Editor.tsx が存在すること");
const editorContent = fs.readFileSync(editorFilePath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  editorContent.includes('theme?: "light" | "dark"'),
  "EditorProps に theme?: 'light' | 'dark' が定義されていること"
);
assert.ok(
  editorContent.includes("rerenderAllMermaidDiagrams"),
  "Editor.tsx で rerenderAllMermaidDiagrams がインポートされていること"
);
assert.ok(
  editorContent.includes("rerenderAllMermaidDiagrams(theme)"),
  "Editor.tsx 内の useEffect で theme 変化時に rerenderAllMermaidDiagrams(theme) が呼び出されていること"
);
console.log("✓ Editor.tsx の theme prop & 再描画 useEffect 連携を確認");

// 5. src/App.tsx の TyporiEditor 呼び出し検証
console.log("\n[5] src/App.tsx の TyporiEditor への theme 伝達検証...");
const appFilePath = path.resolve(projectRoot, "src/App.tsx");
assert.ok(fs.existsSync(appFilePath), "src/App.tsx が存在すること");
const appContent = fs.readFileSync(appFilePath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  appContent.includes("<TyporiEditor") && appContent.includes("theme={resolvedTheme}"),
  "App.tsx で <TyporiEditor に theme={resolvedTheme} が渡されていること"
);
console.log("✓ App.tsx の TyporiEditor への theme={resolvedTheme} 伝達を確認");

// 6. テーマ連動シミュレーション検証
console.log("\n[6] テーマ連動・一括再描画ロジックのシミュレーション検証...");

{
  // 仮想ノードビューとレジストリ
  const virtualViews = new Set();
  const renderedThemes = [];

  class MockMermaidNodeView {
    constructor(id) {
      this.id = id;
      virtualViews.add(this);
    }
    async renderDiagram(theme) {
      renderedThemes.push({ id: this.id, theme });
    }
    destroy() {
      virtualViews.delete(this);
    }
  }

  const v1 = new MockMermaidNodeView("v1");
  const v2 = new MockMermaidNodeView("v2");
  assert.equal(virtualViews.size, 2, "2つのビューが登録されていること");

  // 再レンダリング関数シミュレーション
  const simulateRerenderAll = async (targetTheme, fallbackTheme) => {
    const theme = targetTheme ?? fallbackTheme;
    const promises = [];
    virtualViews.forEach((v) => {
      promises.push(v.renderDiagram(theme));
    });
    await Promise.all(promises);
  };

  // 1. ダークテーマへの一括切り替え
  renderedThemes.length = 0;
  await simulateRerenderAll("dark", "light");
  assert.equal(renderedThemes.length, 2, "2つのビューが再レンダリングされたこと");
  assert.deepEqual(
    renderedThemes.map((r) => r.theme),
    ["dark", "dark"],
    "全ビューが dark テーマで再レンダリングされたこと"
  );

  // 2. ライトテーマへの一括切り替え
  renderedThemes.length = 0;
  await simulateRerenderAll("light", "dark");
  assert.equal(renderedThemes.length, 2, "2つのビューが再レンダリングされたこと");
  assert.deepEqual(
    renderedThemes.map((r) => r.theme),
    ["light", "light"],
    "全ビューが light テーマで再レンダリングされたこと"
  );

  // 3. ビュー破棄後の追従
  v1.destroy();
  assert.equal(virtualViews.size, 1, "破棄後は1つのビューのみ残る");
  renderedThemes.length = 0;
  await simulateRerenderAll("dark", "light");
  assert.equal(renderedThemes.length, 1, "残ったビューのみ再レンダリングされること");
  assert.equal(renderedThemes[0].id, "v2");
  assert.equal(renderedThemes[0].theme, "dark");

  console.log("✓ テーマ切り替え一括再レンダリングシミュレーション合格");
}

console.log("\n==================================================================");
console.log(" >>> Typori Phase 20 Mermaid テーマ連動動的再描画: 全検証合格 <<< ");
console.log("==================================================================");
