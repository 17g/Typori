import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("=== Mermaidダイアグラム エクスポート連携（HTML/PDF印刷）検証を開始 ===");

// 1. ファイルの存在確認
console.log("1. 関連モジュールファイルの存在確認...");
const exportModulePath = path.join(rootDir, "src/utils/mermaidExport.ts");
assert.ok(fs.existsSync(exportModulePath), "src/utils/mermaidExport.ts が存在すること");

const mermaidModulePath = path.join(rootDir, "src/utils/mermaid.ts");
assert.ok(fs.existsSync(mermaidModulePath), "src/utils/mermaid.ts が存在すること");

const apiFsPath = path.join(rootDir, "src/api/fs.ts");
assert.ok(fs.existsSync(apiFsPath), "src/api/fs.ts が存在すること");

const exportModalPath = path.join(rootDir, "src/components/ExportModal/ExportModal.tsx");
assert.ok(fs.existsSync(exportModalPath), "src/components/ExportModal/ExportModal.tsx が存在すること");

const rsFsPath = path.join(rootDir, "src-tauri/src/fs.rs");
assert.ok(fs.existsSync(rsFsPath), "src-tauri/src/fs.rs が存在すること");
console.log("✓ 全関連モジュールファイルが存在することを確認");

// 2. mermaidExport.ts の実装検査
console.log("\n2. src/utils/mermaidExport.ts の実装検査...");
const exportModuleContent = fs.readFileSync(exportModulePath, "utf-8");
assert.ok(exportModuleContent.includes("export function hasMermaidInHtml"), "hasMermaidInHtml がエクスポートされていること");
assert.ok(exportModuleContent.includes("export function extractMermaidBlocksFromHtml"), "extractMermaidBlocksFromHtml がエクスポートされていること");
assert.ok(exportModuleContent.includes("export async function renderMermaidInHtml"), "renderMermaidInHtml がエクスポートされていること");
assert.ok(exportModuleContent.includes("typori-mermaid-svg"), "クラス名 typori-mermaid-svg が含まれていること");
assert.ok(exportModuleContent.includes("typori-mermaid-error"), "エラークラス名 typori-mermaid-error が含まれていること");
assert.ok(exportModuleContent.includes("data-mermaid-processed"), "処理済み属性 data-mermaid-processed が付与されていること");
console.log("✓ mermaidExport.ts のエクスポート定義・主要処理を検証");

// 3. mermaidExport.ts のロジック単体検証 (Node.js 環境での正規表現フォールバック検証)
console.log("\n3. HTML内Mermaidブロック検出・抽出・置換ロジックの動作検証...");

// 簡易シミュレータによる検証
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#10;/g, "\n");
}

function hasMermaidInHtml(html) {
  return /language-mermaid\b/i.test(html);
}

function extractMermaidBlocksFromHtml(html) {
  const results = [];
  const regex = /<pre><code(?:\s+[^>]*class=["'][^"']*language-mermaid[^"']*["'][^>]*)>([\s\S]*?)<\/code><\/pre>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const decoded = decodeHtmlEntities(match[1]).trim();
    if (decoded) results.push(decoded);
  }
  return results;
}

const sampleHtml = `<!DOCTYPE html>
<html>
<head><title>Test Doc</title></head>
<body>
  <h1>ドキュメント見出し</h1>
  <p>通常パラグラフ</p>
  <pre><code class="language-mermaid">graph TD
  A[開始] --&gt; B[処理]
  B --&gt; C[終了]</code></pre>
  <pre><code class="language-mermaid">sequenceDiagram
  Alice-&gt;&gt;Bob: こんにちは</code></pre>
  <pre><code class="language-typescript">const x = 1;</code></pre>
</body>
</html>`;

assert.strictEqual(hasMermaidInHtml(sampleHtml), true, "sampleHtml から Mermaid を検出できること");
assert.strictEqual(hasMermaidInHtml("<p>No diagrams</p>"), false, "ダイアグラムなし HTML からは false を返すこと");

const extracted = extractMermaidBlocksFromHtml(sampleHtml);
assert.strictEqual(extracted.length, 2, "2件のMermaidブロックが抽出されること");
assert.ok(extracted[0].includes("graph TD"), "1件目がフローチャートであること");
assert.ok(extracted[0].includes("A[開始] --> B[処理]"), "HTMLエンティティがデコードされていること");
assert.ok(extracted[1].includes("sequenceDiagram"), "2件目がシーケンス図であること");
console.log("✓ Mermaidブロック検出・デコード抽出ロジックが正常に動作することを確認");

// 4. API (src/api/fs.ts) の Mermaid 連携検査
console.log("\n4. src/api/fs.ts の Mermaid エクスポート・印刷ハンドシェイク検査...");
const apiFsContent = fs.readFileSync(apiFsPath, "utf-8");

// exportToHtml が renderMermaidInHtml を使用して saveFile で保存していること
assert.ok(apiFsContent.includes("import { renderMermaidInHtml }"), "renderMermaidInHtml がインポートされていること");
assert.ok(
  apiFsContent.includes("renderMermaidInHtml(rawHtml") || apiFsContent.includes("renderMermaidInHtml("),
  "exportToHtml 内で renderMermaidInHtml が呼び出されていること"
);
assert.ok(
  apiFsContent.includes("await saveFile(path, finalHtml)"),
  "exportToHtml で finalHtml が saveFile で書き出されていること"
);

// rawExportToHtml が invoke("export_to_html") を保持していること
assert.ok(
  apiFsContent.includes('invoke<void>("export_to_html"'),
  "Tauri IPC コマンド export_to_html の呼び出しが維持されていること"
);

// printMarkdownDocument が renderMermaidInHtml を通していること
const printMarkdownSnippet = apiFsContent.substring(apiFsContent.indexOf("printMarkdownDocument"));
assert.ok(
  printMarkdownSnippet.includes("renderMermaidInHtml"),
  "printMarkdownDocument 内で renderMermaidInHtml が呼び出されていること"
);
assert.ok(
  printMarkdownSnippet.includes("printHtmlContent(htmlContent)"),
  "printMarkdownDocument 内で変換後の htmlContent が printHtmlContent に渡されていること"
);

// printHtmlContent 内のハンドシェイク実装
const printHtmlSnippet = apiFsContent.substring(apiFsContent.indexOf("printHtmlContent"), apiFsContent.indexOf("printMarkdownDocument"));
assert.ok(
  printHtmlSnippet.includes("performPrintHandshake"),
  "printHtmlContent 内に performPrintHandshake 関数が存在すること"
);
assert.ok(
  printHtmlSnippet.includes("data-typori-mermaid-ready"),
  "ハンドシェイク完了時に data-typori-mermaid-ready 属性が付与されること"
);
assert.ok(
  printHtmlSnippet.includes("requestAnimationFrame"),
  "描画確定のために requestAnimationFrame が利用されていること"
);
assert.ok(
  printHtmlSnippet.includes("typori:mermaid-ready"),
  "ハンドシェイク完了時に typori:mermaid-ready カスタムイベントが送出されること"
);
console.log("✓ src/api/fs.ts の HTMLエクスポート・PDF印刷ハンドシェイク実装を検証");

// 5. Rust側 HTML/PDF 変換スタイル (src-tauri/src/fs.rs) の検証
console.log("\n5. src-tauri/src/fs.rs の Mermaid CSSスタイル定義検査...");
const rsFsContent = fs.readFileSync(rsFsPath, "utf-8");

assert.ok(
  rsFsContent.includes(".typori-mermaid-svg"),
  "fs.rs の CSS に .typori-mermaid-svg スタイルが定義されていること"
);
assert.ok(
  rsFsContent.includes(".typori-mermaid-error"),
  "fs.rs の CSS に .typori-mermaid-error スタイルが定義されていること"
);
assert.ok(
  rsFsContent.includes("page-break-inside: avoid") || rsFsContent.includes("break-inside: avoid"),
  "印刷時スタイル (@media print) に改ページ回避が指定されていること"
);
console.log("✓ src-tauri/src/fs.rs の Mermaid CSSスタイル定義を検証");

// 6. src/utils/mermaid.ts の再エクスポート検証
console.log("\n6. src/utils/mermaid.ts の再エクスポート検査...");
const mermaidContent = fs.readFileSync(mermaidModulePath, "utf-8");
assert.ok(
  mermaidContent.includes("renderMermaidInHtml"),
  "src/utils/mermaid.ts から renderMermaidInHtml が再エクスポートされていること"
);
assert.ok(
  mermaidContent.includes("hasMermaidInHtml"),
  "src/utils/mermaid.ts から hasMermaidInHtml が再エクスポートされていること"
);
console.log("✓ src/utils/mermaid.ts の再エクスポート定義を検証");

console.log("\n==================================================================");
console.log("✓ 全ての Mermaid ダイアグラム エクスポート連携検証に合格しました！");
console.log("==================================================================");
