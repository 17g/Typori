import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";
import vm from "vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== ゼロフラッシュ基盤 & 0msテーマ判定検証 (verify-zero-flash-theme.mjs) ===");

// 1. index.html の存在と静的検査
const indexPath = path.join(projectRoot, "index.html");
assert(fs.existsSync(indexPath), "index.html が存在しません");

const indexContent = fs.readFileSync(indexPath, "utf-8").replace(/\r\n/g, "\n");

// 0msテーマ判定スクリプトの検査
assert(
  indexContent.includes('localStorage.getItem("typori-theme")'),
  "index.html に typori-theme の localStorage 参照が含まれていません"
);
assert(
  indexContent.includes('window.matchMedia("(prefers-color-scheme: dark)")') ||
  indexContent.includes("window.matchMedia && window.matchMedia"),
  "index.html に prefers-color-scheme の判定が含まれていません"
);
assert(
  indexContent.includes('root.classList.add("dark")') &&
  indexContent.includes('root.classList.remove("dark")'),
  "index.html で document.documentElement の dark クラス操作が行われていません"
);
assert(
  indexContent.includes('root.style.backgroundColor = "#18181b"') &&
  indexContent.includes('root.style.backgroundColor = "#ffffff"'),
  "index.html で背景色同期 (#18181b / #ffffff) が設定されていません"
);
assert(
  indexContent.includes("try {") && indexContent.includes("} catch"),
  "index.html の0msテーマスクリプトに例外保護 (try-catch) がありません"
);
console.log("✓ index.html の 0ms テーマ判定インラインスクリプト検査: 合格");

// インラインスタイル & CSS変数の検査
assert(
  indexContent.includes("<style>") && indexContent.includes("</style>"),
  "index.html にインライン <style> が含まれていません"
);
assert(
  indexContent.includes("--typori-bg: #ffffff") &&
  indexContent.includes("--typori-bg: #18181b"),
  "index.html にライト/ダーク用の背景色変数 (--typori-bg) が定義されていません"
);
assert(
  indexContent.includes(".initial-skeleton-wrapper") &&
  indexContent.includes(".initial-skeleton-sidebar") &&
  indexContent.includes(".initial-skeleton-editor"),
  "index.html に初期スケルトン用CSSクラスが定義されていません"
);
console.log("✓ index.html の ゼロフラッシュ用インラインスタイル検査: 合格");

// 初期スケルトン DOM 構造の検査
assert(
  indexContent.includes('id="typori-initial-skeleton"'),
  "index.html の #root 内に初期スケルトンコンテナ (#typori-initial-skeleton) が配置されていません"
);
assert(
  indexContent.includes("initial-skeleton-sidebar") &&
  indexContent.includes("initial-skeleton-header") &&
  indexContent.includes("initial-skeleton-editor") &&
  indexContent.includes("initial-skeleton-statusbar"),
  "index.html の初期スケルトン内にサイドバー・ヘッダー・エディタ・ステータスバー枠がすべて揃っていません"
);
console.log("✓ index.html の 初期スケルトン DOM 構造検査: 合格");

// 2. src/hooks/useTheme.ts の同期検査
const useThemePath = path.join(projectRoot, "src", "hooks", "useTheme.ts");
const useThemeContent = fs.readFileSync(useThemePath, "utf-8").replace(/\r\n/g, "\n");
assert(
  useThemeContent.includes('root.style.backgroundColor = "#18181b"') &&
  useThemeContent.includes('root.style.backgroundColor = "#ffffff"'),
  "src/hooks/useTheme.ts の applyTheme 内で root.style.backgroundColor が同期されていません"
);
console.log("✓ src/hooks/useTheme.ts の 背景色同期検査: 合格");

// 3. インラインスクリプトのシミュレーション実行検証
function runThemeScriptSimulation(storedValue, prefersDark) {
  const classList = new Set();
  const style = {};
  const root = {
    classList: {
      add: (cls) => classList.add(cls),
      remove: (cls) => classList.delete(cls),
      contains: (cls) => classList.has(cls),
    },
    style: style,
  };

  const fakeLocalStorage = {
    getItem: (key) => (key === "typori-theme" ? storedValue : null),
  };

  const fakeWindow = {
    matchMedia: (query) => ({
      matches: query.includes("dark") ? prefersDark : false,
    }),
  };

  const sandbox = {
    localStorage: fakeLocalStorage,
    window: fakeWindow,
    document: { documentElement: root },
  };

  // index.html から script 内のコードを抽出
  const scriptMatch = indexContent.match(/<script>([\s\S]*?)<\/script>/);
  assert(scriptMatch, "index.html から <script> を抽出できませんでした");
  const scriptCode = scriptMatch[1];

  vm.createContext(sandbox);
  vm.runInContext(scriptCode, sandbox);

  return {
    isDark: classList.has("dark"),
    bgColor: style.backgroundColor,
  };
}

// Case 1: localStorage = "dark"
{
  const res = runThemeScriptSimulation("dark", false);
  assert.strictEqual(res.isDark, true, "localStorage=dark 時に dark クラスが付与されていません");
  assert.strictEqual(res.bgColor, "#18181b", "localStorage=dark 時に #18181b が設定されていません");
}

// Case 2: localStorage = "light"
{
  const res = runThemeScriptSimulation("light", true);
  assert.strictEqual(res.isDark, false, "localStorage=light 時に dark クラスが除去されていません");
  assert.strictEqual(res.bgColor, "#ffffff", "localStorage=light 時に #ffffff が設定されていません");
}

// Case 3: localStorage = null, OS = dark (prefersDark = true)
{
  const res = runThemeScriptSimulation(null, true);
  assert.strictEqual(res.isDark, true, "OS=dark 時に dark クラスが付与されていません");
  assert.strictEqual(res.bgColor, "#18181b", "OS=dark 時に #18181b が設定されていません");
}

// Case 4: localStorage = null, OS = light (prefersDark = false)
{
  const res = runThemeScriptSimulation(null, false);
  assert.strictEqual(res.isDark, false, "OS=light 時に dark クラスが除去されていません");
  assert.strictEqual(res.bgColor, "#ffffff", "OS=light 時に #ffffff が設定されていません");
}

// Case 5: localStorage = "system", OS = dark
{
  const res = runThemeScriptSimulation("system", true);
  assert.strictEqual(res.isDark, true, "system/dark 時に dark クラスが付与されていません");
  assert.strictEqual(res.bgColor, "#18181b", "system/dark 時に #18181b が設定されていません");
}

console.log("✓ 0msテーマ判定スクリプトのシミュレーション全ケース実行 (dark/light/system/OS連動): 合格");
console.log("=== 全ゼロフラッシュ基盤検証: 合格 ===");
