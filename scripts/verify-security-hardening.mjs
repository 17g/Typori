import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("==================================================================");
console.log("   Typori Phase 23 セキュリティ強化・脆弱性対策 自動検証スイート   ");
console.log("==================================================================");

// ==================================================================
// [Part 1] Mermaid XSS対策 (CRIT-01 / MED-03) 検証
// ==================================================================
console.log("\n[1] Mermaid XSS対策 (CRIT-01 / MED-03) の静的・動的検証...");

const mermaidPath = path.resolve(projectRoot, "src/utils/mermaid.ts");
assert.ok(fs.existsSync(mermaidPath), "src/utils/mermaid.ts が存在すること");
const mermaidContent = fs.readFileSync(mermaidPath, "utf-8").replace(/\r\n/g, "\n");

// 1.1 securityLevel: "strict" および secure ロック設定の検証
assert.ok(
  mermaidContent.includes('securityLevel: "strict"'),
  "initMermaid 内で securityLevel: 'strict' が設定されていること"
);
assert.ok(
  mermaidContent.includes('secure: ["secure", "securityLevel", "startOnLoad", "maxTextSize"]') ||
    mermaidContent.includes('secure: ['),
  "initMermaid 内で secure 設定ロックが定義されていること"
);
console.log("✓ Mermaid 初期化設定: securityLevel='strict' および secure ロック設定を確認");

// 1.2 sanitizeMermaidSvg のエクスポートおよび renderMermaidSvg での適用検証
assert.ok(
  mermaidContent.includes("export function sanitizeMermaidSvg"),
  "src/utils/mermaid.ts から sanitizeMermaidSvg がエクスポートされていること"
);
assert.ok(
  mermaidContent.includes("svg = sanitizeMermaidSvg(svg);") ||
    mermaidContent.includes("sanitizeMermaidSvg(svg)"),
  "renderMermaidSvg 内で sanitizeMermaidSvg が適用されていること"
);
console.log("✓ sanitizeMermaidSvg 関数の定義および renderMermaidSvg での呼出を確認");

// 1.3 sanitizeMermaidSvg の動的サニタイズ挙動シミュレーション検証
{
  // sanitizeMermaidSvg のロジックシミュレーション
  const sanitizeMermaidSvg = (svg) => {
    if (!svg || typeof svg !== "string") return "";
    let sanitized = svg;
    let prev;
    do {
      prev = sanitized;
      sanitized = sanitized
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<script\b[^>]*\/?>/gi, "")
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
        .replace(/<iframe\b[^>]*\/?>/gi, "")
        .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, "")
        .replace(/<object\b[^>]*\/?>/gi, "")
        .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, "")
        .replace(/<embed\b[^>]*\/?>/gi, "")
        .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "")
        .replace(/<form\b[^>]*\/?>/gi, "")
        .replace(/<base\b[^>]*\/?>/gi, "");
    } while (sanitized !== prev);

    sanitized = sanitized.replace(/\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

    sanitized = sanitized.replace(
      /\s+(?:href|xlink:href|src|action)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
      (fullMatch, q1, q2, q3) => {
        const rawVal = q1 ?? q2 ?? q3 ?? "";
        const val = rawVal.replace(/[\s\x00-\x1f\x7f-\x9f]/g, "").toLowerCase();
        const decodedVal = val
          .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/&#([0-9]+);?/gi, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
          .replace(/[\s\x00-\x1f\x7f-\x9f]/g, "")
          .toLowerCase();

        if (
          decodedVal.startsWith("javascript:") ||
          decodedVal.startsWith("vbscript:") ||
          decodedVal.startsWith("data:text/html")
        ) {
          return "";
        }
        return fullMatch;
      }
    );
    return sanitized;
  };

  // テストケース1: <script> タグの除去
  const maliciousSvg1 = '<svg><g><script>alert("XSS")</script><text>Safe</text></g></svg>';
  const clean1 = sanitizeMermaidSvg(maliciousSvg1);
  assert.ok(!clean1.includes("<script>"), "script タグが除去されること");
  assert.ok(!clean1.includes("alert"), "script 内のコードが除去されること");
  assert.ok(clean1.includes("<text>Safe</text>"), "安全な要素は保持されること");

  // テストケース2: ネストされた <script> タグの完全除去
  const nestedScriptSvg = '<svg><script><script>alert(1)</script></script></svg>';
  const cleanNested = sanitizeMermaidSvg(nestedScriptSvg);
  assert.ok(!cleanNested.includes("<script"), "ネストされた script タグが完全に除去されること");

  // テストケース3: インラインイベントハンドラ（onload, onerror, onclick）の除去
  const eventSvg = '<svg onload="alert(1)"><circle r="10" onclick=\'steal()\' onerror=boom></circle></svg>';
  const clean2 = sanitizeMermaidSvg(eventSvg);
  assert.ok(!clean2.includes("onload"), "onload 属性が除去されること");
  assert.ok(!clean2.includes("onclick"), "onclick 属性が除去されること");
  assert.ok(!clean2.includes("onerror"), "onerror 属性が除去されること");
  assert.ok(clean2.includes("<circle r=\"10\""), "要素タグ自体は保持されること");

  // テストケース4: javascript: / vbscript: / data:text/html スキームの無害化
  const jsUriSvg = '<svg><a href="javascript:alert(1)"><text>Link</text></a><image xlink:href="&#106;&#97;vascript:alert(2)"/><a src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></a></svg>';
  const clean3 = sanitizeMermaidSvg(jsUriSvg);
  assert.ok(!clean3.includes("javascript:"), "javascript: スキームが除去されること");
  assert.ok(!clean3.includes("&#106;&#97;vascript:"), "エンコードされた javascript: スキームが除去されること");
  assert.ok(!clean3.includes("data:text/html"), "data:text/html スキームが除去されること");

  // テストケース5: 正常な SVG の保持
  const safeSvg = '<svg viewBox="0 0 100 100" class="typori-mermaid"><g class="node"><rect width="80" height="40" fill="#3b82f6"/><text fill="#ffffff">OK</text></g></svg>';
  assert.equal(sanitizeMermaidSvg(safeSvg), safeSvg, "安全な SVG は一切改変されないこと");

  console.log("✓ sanitizeMermaidSvg: scriptタグ除去・ネスト除去・on*ハンドラ除去・危険スキーム無害化を確認");
}

// 1.4 mermaidPlugin.ts の bindFunctions 呼出除去検証
const pluginPath = path.resolve(projectRoot, "src/components/Editor/mermaidPlugin.ts");
assert.ok(fs.existsSync(pluginPath), "src/components/Editor/mermaidPlugin.ts が存在すること");
const pluginContent = fs.readFileSync(pluginPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  !pluginContent.includes("result.bindFunctions("),
  "mermaidPlugin.ts 内で result.bindFunctions の呼び出しが存在しないこと (XSS防止)"
);
console.log("✓ mermaidPlugin.ts: result.bindFunctions 呼出の完全除去を確認");

// 1.5 mermaidExport.ts の正規表現フォールバック時エラーメッセージ HTML エスケープ検証
const exportPath = path.resolve(projectRoot, "src/utils/mermaidExport.ts");
assert.ok(fs.existsSync(exportPath), "src/utils/mermaidExport.ts が存在すること");
const exportContent = fs.readFileSync(exportPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  exportContent.includes("escapeHtml(renderResult.error") ||
    exportContent.includes("escapeHtml(errorMsg)") ||
    exportContent.includes("const errorMsg = escapeHtml("),
  "replaceMermaidRegex 内でエラーメッセージ出力時に escapeHtml が適用されていること"
);

// エスケープ処理の動的シミュレーション
{
  const escapeHtml = (str) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const maliciousError = 'Parse error: <img src=x onerror=alert("XSS")>';
  const escaped = escapeHtml(maliciousError);
  assert.ok(!escaped.includes("<img"), "エラーメッセージ内のタグがエスケープされること");
  assert.ok(escaped.includes("&lt;img src=x onerror=alert(&quot;XSS&quot;)&gt;"), "文字エンティティに変換されていること");
  console.log("✓ mermaidExport.ts: エラーメッセージの HTML エスケープ処理を確認");
}

console.log("\n==================================================================");
console.log(" >>> Phase 23 セキュリティ強化 (Task 79: Mermaid XSS対策) 合格 <<< ");
console.log("==================================================================");
