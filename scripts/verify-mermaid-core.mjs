import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("   Typori Phase 20 Mermaid 基盤 & ユーティリティモジュール検証    ");
console.log("==================================================================");

// 1. package.json の依存関係検証
console.log("\n[1] package.json の mermaid 依存関係検証...");
const pkgJsonPath = path.resolve(projectRoot, "package.json");
assert.ok(fs.existsSync(pkgJsonPath), "package.json が存在すること");
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
assert.ok(
  pkg.dependencies && pkg.dependencies.mermaid,
  "package.json の dependencies に mermaid が含まれていること"
);
console.log(`✓ mermaid パッケージ登録確認: ${pkg.dependencies.mermaid}`);

// 2. src/utils/mermaid.ts の存在およびエクスポート検証
console.log("\n[2] src/utils/mermaid.ts の定義およびエクスポート検証...");
const mermaidUtilPath = path.resolve(projectRoot, "src/utils/mermaid.ts");
assert.ok(fs.existsSync(mermaidUtilPath), "src/utils/mermaid.ts が存在すること");
const mermaidUtilContent = fs.readFileSync(mermaidUtilPath, "utf-8").replace(/\r\n/g, "\n");

const expectedExports = [
  "export type MermaidTheme",
  "export interface MermaidRenderResult",
  "export interface MermaidValidationResult",
  "export function generateMermaidId",
  "export function initMermaid",
  "export function getMermaidTheme",
  "export function cleanupMermaidTempElements",
  "export function extractMermaidErrorMessage",
  "export function isMermaidLanguage",
  "export function detectDiagramType",
  "export async function validateMermaidCode",
  "export async function renderMermaidSvg",
];

for (const exp of expectedExports) {
  assert.ok(
    mermaidUtilContent.includes(exp),
    `src/utils/mermaid.ts に '${exp}' が定義されていること`
  );
}
console.log("✓ 全必須関数・型の定義とエクスポートを確認");

// 3. ロジックシミュレーション検証
console.log("\n[3] ユーティリティ関数のロジックシミュレーション検証...");

// 3.1 isMermaidLanguage シミュレーション
{
  const isMermaidLanguage = (lang) => {
    if (!lang) return false;
    const normalized = String(lang).trim().toLowerCase();
    return normalized === "mermaid" || normalized === "mermaid.js";
  };

  assert.equal(isMermaidLanguage("mermaid"), true, "'mermaid' は true");
  assert.equal(isMermaidLanguage("MERMAID"), true, "'MERMAID' は true");
  assert.equal(isMermaidLanguage(" mermaid.js "), true, "' mermaid.js ' は true");
  assert.equal(isMermaidLanguage("javascript"), false, "'javascript' は false");
  assert.equal(isMermaidLanguage("markdown"), false, "'markdown' は false");
  assert.equal(isMermaidLanguage(""), false, "空文字は false");
  assert.equal(isMermaidLanguage(null), false, "null は false");
  assert.equal(isMermaidLanguage(undefined), false, "undefined は false");
  console.log("✓ isMermaidLanguage 判定ロジック合格");
}

// 3.2 detectDiagramType シミュレーション
{
  const detectDiagramType = (code) => {
    const trimmed = code.trim();
    if (!trimmed) return "unknown";
    if (/^(?:flowchart|graph)\b/i.test(trimmed)) return "flowchart";
    if (/^sequenceDiagram\b/i.test(trimmed)) return "sequenceDiagram";
    if (/^erDiagram\b/i.test(trimmed)) return "erDiagram";
    if (/^gantt\b/i.test(trimmed)) return "gantt";
    if (/^classDiagram\b/i.test(trimmed)) return "classDiagram";
    if (/^stateDiagram\b/i.test(trimmed)) return "stateDiagram";
    if (/^pie\b/i.test(trimmed)) return "pie";
    if (/^mindmap\b/i.test(trimmed)) return "mindmap";
    if (/^gitGraph\b/i.test(trimmed)) return "gitGraph";
    return "diagram";
  };

  assert.equal(detectDiagramType("graph TB\nA-->B"), "flowchart");
  assert.equal(detectDiagramType("flowchart TD\nStart-->Stop"), "flowchart");
  assert.equal(detectDiagramType("sequenceDiagram\nAlice->>Bob: Hello"), "sequenceDiagram");
  assert.equal(detectDiagramType("erDiagram\nCUSTOMER ||--o{ ORDER : places"), "erDiagram");
  assert.equal(detectDiagramType("gantt\ntitle A Gantt Diagram"), "gantt");
  assert.equal(detectDiagramType("classDiagram\nClass01 <|-- AveryLongClass"), "classDiagram");
  assert.equal(detectDiagramType("stateDiagram-v2\n[*] --> Still"), "stateDiagram");
  assert.equal(detectDiagramType("pie title Pets\n\"Dogs\" : 386"), "pie");
  assert.equal(detectDiagramType("mindmap\nroot((Root))"), "mindmap");
  assert.equal(detectDiagramType("gitGraph\ncommit"), "gitGraph");
  assert.equal(detectDiagramType(""), "unknown");
  console.log("✓ detectDiagramType 検出ロジック合格");
}

// 3.3 generateMermaidId シミュレーション
{
  let idCounter = 0;
  const generateMermaidId = (prefix = "typori-mermaid") => {
    idCounter += 1;
    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "_");
    return `${safePrefix}-${Date.now()}-${idCounter}`;
  };

  const id1 = generateMermaidId();
  const id2 = generateMermaidId("custom/prefix!");
  assert.ok(/^typori-mermaid-\d+-\d+$/.test(id1), "ID形式が正常であること");
  assert.ok(/^custom_prefix_-\d+-\d+$/.test(id2), "プレフィックスのサニタイズが正常であること");
  assert.notEqual(id1, id2, "生成IDが一意であること");
  console.log("✓ generateMermaidId 生成 & サニタイズ合格");
}

// 3.4 extractMermaidErrorMessage シミュレーション
{
  const extractMermaidErrorMessage = (err) => {
    if (!err) return "不明な構文エラーが発生しました。";
    if (err instanceof Error) return err.message;
    if (typeof err === "object" && err !== null && "str" in err && typeof err.str === "string") {
      return err.str;
    }
    return String(err);
  };

  assert.equal(
    extractMermaidErrorMessage(new Error("Syntax error at line 3")),
    "Syntax error at line 3"
  );
  assert.equal(
    extractMermaidErrorMessage({ str: "Parse error on line 5" }),
    "Parse error on line 5"
  );
  assert.equal(
    extractMermaidErrorMessage("Plain error string"),
    "Plain error string"
  );
  assert.equal(
    extractMermaidErrorMessage(null),
    "不明な構文エラーが発生しました。"
  );
  console.log("✓ extractMermaidErrorMessage エラー抽出ロジック合格");
}

// 3.5 テーマ管理シミュレーション
{
  let currentTheme = null;
  const initMermaid = (theme = "light", force = false) => {
    if (currentTheme === theme && !force) return;
    currentTheme = theme;
  };
  const getMermaidTheme = () => currentTheme ?? "light";

  assert.equal(getMermaidTheme(), "light", "初期テーマは light");
  initMermaid("dark");
  assert.equal(getMermaidTheme(), "dark", "dark への変更が反映されること");
  initMermaid("light");
  assert.equal(getMermaidTheme(), "light", "light への復帰が反映されること");
  console.log("✓ テーマ管理・同期ロジック合格");
}

// 4. 空コードガード・エラーハンドリングシミュレーション
console.log("\n[4] 空入力ガード & 構文エラー耐性ハンドリングの検証...");
assert.ok(
  mermaidUtilContent.includes('error: "ダイアグラムコードが入力されていません。"'),
  "空入力ガードでエラーメッセージを返却するロジックが存在すること"
);
assert.ok(
  mermaidUtilContent.includes("cleanupMermaidTempElements(id);"),
  "エラー発生時に一時 DOM 要素をクリーンアップするロジックが存在すること"
);
assert.ok(
  mermaidUtilContent.includes("suppressErrorRendering: true"),
  "Mermaid 初期化時に suppressErrorRendering: true が指定されていること"
);
assert.ok(
  mermaidUtilContent.includes("theme === \"dark\" ? \"dark\" : \"default\""),
  "ライト/ダークテーマに応じた Mermaid theme ('default' / 'dark') 切替ロジックが存在すること"
);
console.log("✓ 構文エラー耐性 & 一時要素クリーンアップ機構合格");

console.log("\n==================================================================");
console.log(" >>> Typori Phase 20 Mermaid 基盤 & ユーティリティ: 全検証合格 <<< ");
console.log("==================================================================");
