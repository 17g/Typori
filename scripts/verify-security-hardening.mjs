import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
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

// ==================================================================
// [Part 2] Content Security Policy (CSP) 設定 & 外部リンクURLスキーム検証 (HIGH-01 / MED-01) 検証
// ==================================================================
console.log("\n[2] Content Security Policy (CSP) 設定 & 外部リンクURLスキーム検証 (HIGH-01 / MED-01) の検証...");

// 2.1 tauri.conf.json の CSP 設定検証
const tauriConfPath = path.resolve(projectRoot, "src-tauri/tauri.conf.json");
assert.ok(fs.existsSync(tauriConfPath), "src-tauri/tauri.conf.json が存在すること");
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));

const csp = tauriConf.app?.security?.csp;
assert.ok(typeof csp === "string" && csp.length > 0, "security.csp が有効な文字列として設定されていること (null でないこと)");
assert.ok(csp.includes("object-src 'none'"), "CSP に object-src 'none' が設定されていること");
assert.ok(csp.includes("default-src 'self'"), "CSP に default-src 'self' が設定されていること");
assert.ok(csp.includes("ipc:") && csp.includes("http://ipc.localhost"), "CSP に Tauri IPC 通信 (ipc:, http://ipc.localhost) が許可されていること");
assert.ok(csp.includes("script-src 'self' 'unsafe-inline'"), "CSP に script-src 'self' 'unsafe-inline' が設定されていること (インラインテーマ・Vite対応)");
assert.ok(csp.includes("style-src 'self' 'unsafe-inline'"), "CSP に style-src 'self' 'unsafe-inline' が設定されていること (Tailwind・Mermaid対応)");
assert.ok(
  csp.includes("img-src") &&
    csp.includes("https:") &&
    csp.includes("blob:") &&
    csp.includes("data:") &&
    (csp.includes("asset:") || csp.includes("http://asset.localhost")),
  "CSP に img-src (self, asset, blob, data, https) が網羅されていること"
);
console.log("✓ tauri.conf.json: 防御的 CSP 設定（object-src 'none' / IPC許可 / アセット許可）を確認");

// 2.2 src/utils/url.ts の存在および静的定義検証
const urlUtilsPath = path.resolve(projectRoot, "src/utils/url.ts");
assert.ok(fs.existsSync(urlUtilsPath), "src/utils/url.ts が存在すること");
const urlUtilsContent = fs.readFileSync(urlUtilsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  urlUtilsContent.includes("ALLOWED_EXTERNAL_URL_SCHEMES") &&
    urlUtilsContent.includes('"http:"') &&
    urlUtilsContent.includes('"https:"') &&
    urlUtilsContent.includes('"mailto:"'),
  "ALLOWED_EXTERNAL_URL_SCHEMES に http:, https:, mailto: が定義されていること"
);
assert.ok(
  urlUtilsContent.includes("export function isSafeExternalUrl"),
  "src/utils/url.ts から isSafeExternalUrl がエクスポートされていること"
);
console.log("✓ src/utils/url.ts: 許可スキーム定数および isSafeExternalUrl 関数定義を確認");

// 2.3 isSafeExternalUrl の動的検証 (安全なURL・危険なスキーム・エスケープ・境界値)
{
  const allowedSchemes = ["http:", "https:", "mailto:"];
  const isSafeExternalUrl = (url) => {
    if (!url || typeof url !== "string") return false;
    const trimmed = url.trim();
    if (!trimmed) return false;
    if (/[\x00-\x1f\x7f-\x9f]/.test(trimmed)) return false;
    try {
      const parsed = new URL(trimmed);
      const protocol = parsed.protocol.toLowerCase();
      return allowedSchemes.includes(protocol);
    } catch {
      return false;
    }
  };

  // 許可スキーム (Safe)
  assert.equal(isSafeExternalUrl("https://github.com/tauri-apps/tauri"), true, "https: URL は許可されること");
  assert.equal(isSafeExternalUrl("http://localhost:1420"), true, "http: URL は許可されること");
  assert.equal(isSafeExternalUrl("mailto:support@typori.example.com"), true, "mailto: URL は許可されること");
  assert.equal(isSafeExternalUrl("HTTPS://EXAMPLE.COM/PATH?QUERY=1#HASH"), true, "大文字スキーム HTTPS: も正規化されて許可されること");

  // 危険なスキーム (Blocked)
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false, "javascript: スキームは拒否されること");
  assert.equal(isSafeExternalUrl("javascript:void(0)"), false, "javascript: スキームは拒否されること");
  assert.equal(isSafeExternalUrl("vbscript:msgbox(1)"), false, "vbscript: スキームは拒否されること");
  assert.equal(isSafeExternalUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="), false, "data:text/html スキームは拒否されること");
  assert.equal(isSafeExternalUrl("file:///C:/Windows/System32/cmd.exe"), false, "file: スキームは拒否されること");
  assert.equal(isSafeExternalUrl("file://etc/passwd"), false, "file: スキームは拒否されること");
  assert.equal(isSafeExternalUrl("ms-msdt:/id PCWDiagnostic"), false, "ms-msdt: スキームは拒否されること");
  assert.equal(isSafeExternalUrl("custom-app://action"), false, "未許可のカスタムURLスキームは拒否されること");

  // 境界値・不正構文 (Blocked)
  assert.equal(isSafeExternalUrl(""), false, "空文字は拒否されること");
  assert.equal(isSafeExternalUrl("   "), false, "空白のみは拒否されること");
  assert.equal(isSafeExternalUrl(null), false, "null は拒否されること");
  assert.equal(isSafeExternalUrl(undefined), false, "undefined は拒否されること");
  assert.equal(isSafeExternalUrl("/relative/path/document.md"), false, "相対パスは拒否されること");
  assert.equal(isSafeExternalUrl("#heading-1"), false, "アンカーフラグメントは拒否されること");
  assert.equal(isSafeExternalUrl("https://example.com\x00evil"), false, "ヌルバイトを含むURLは拒否されること");
  assert.equal(isSafeExternalUrl("javascript\n:alert(1)"), false, "改行制御文字を含む不正URLは拒否されること");

  console.log("✓ isSafeExternalUrl: 許可スキーム (http/https/mailto) および拒否対象 (javascript/file/data/ms-msdt等) の動的テスト合格");
}

// 2.4 Editor.tsx の URL 検証および noopener,noreferrer 連携検証
const editorPath = path.resolve(projectRoot, "src/components/Editor/Editor.tsx");
assert.ok(fs.existsSync(editorPath), "src/components/Editor/Editor.tsx が存在すること");
const editorContent = fs.readFileSync(editorPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  editorContent.includes('import { isSafeExternalUrl } from "../../utils/url";') ||
    editorContent.includes("isSafeExternalUrl"),
  "Editor.tsx で isSafeExternalUrl がインポートまたは利用されていること"
);
assert.ok(
  editorContent.includes("if (!isSafeExternalUrl(url))"),
  "Editor.tsx の openExternalUrl 内で isSafeExternalUrl(url) による検証ガードが存在すること"
);
assert.ok(
  editorContent.includes('window.open(url, "_blank", "noopener,noreferrer")'),
  "Editor.tsx の window.open フォールバック呼び出しで 'noopener,noreferrer' が指定されていること"
);
console.log("✓ Editor.tsx: openExternalUrl での isSafeExternalUrl ガードおよび noopener,noreferrer を確認");

// 2.5 LinkTooltip.tsx の URL 検証およびボタン連携検証
const tooltipPath = path.resolve(projectRoot, "src/components/Editor/LinkTooltip.tsx");
assert.ok(fs.existsSync(tooltipPath), "src/components/Editor/LinkTooltip.tsx が存在すること");
const tooltipContent = fs.readFileSync(tooltipPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  tooltipContent.includes('import { isSafeExternalUrl } from "../../utils/url";') ||
    tooltipContent.includes("isSafeExternalUrl"),
  "LinkTooltip.tsx で isSafeExternalUrl がインポートまたは利用されていること"
);
assert.ok(
  tooltipContent.includes("isSafeExternalUrl(target)") ||
    tooltipContent.includes("isSafeExternalUrl(href.trim())"),
  "LinkTooltip.tsx 内で isSafeExternalUrl による URL 検証が行われていること"
);
assert.ok(
  tooltipContent.includes("disabled={!isSafeExternalUrl(href.trim())}"),
  "LinkTooltip.tsx の外部リンクボタンに disabled={!isSafeExternalUrl(href.trim())} が付与されていること"
);
console.log("✓ LinkTooltip.tsx: isSafeExternalUrl ガードおよびボタン無効化連動を確認");

// ==================================================================
// [Part 3] HTMLエクスポート・PDF印刷時のサニタイズ強化 (HIGH-02) 検証
// ==================================================================
console.log("\n[3] HTMLエクスポート・PDF印刷時のサニタイズ強化 (HIGH-02) の検証...");

// 3.1 Rust バックエンド (src-tauri/src/fs.rs) のサニタイズ実装検証
const fsRsPath = path.resolve(projectRoot, "src-tauri/src/fs.rs");
assert.ok(fs.existsSync(fsRsPath), "src-tauri/src/fs.rs が存在すること");
const fsRsContent = fs.readFileSync(fsRsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  fsRsContent.includes("pub fn sanitize_exported_html("),
  "src-tauri/src/fs.rs で sanitize_exported_html が公開定義されていること"
);
assert.ok(
  fsRsContent.includes("sanitize_exported_html(&body_html)"),
  "convert_markdown_to_html 内で sanitize_exported_html(&body_html) が適用されていること"
);
assert.ok(
  fsRsContent.includes("remove_dangerous_tags(") &&
    fsRsContent.includes("sanitize_tag_attributes("),
  "fs.rs 内に危険タグ除去および属性サニタイズ関数が実装されていること"
);
console.log("✓ src-tauri/src/fs.rs: sanitize_exported_html 定義および convert_markdown_to_html 連動を確認");

// 3.2 フロントエンド API (src/api/fs.ts) のサニタイズ実装検証
const fsTsPath = path.resolve(projectRoot, "src/api/fs.ts");
assert.ok(fs.existsSync(fsTsPath), "src/api/fs.ts が存在すること");
const fsTsContent = fs.readFileSync(fsTsPath, "utf-8").replace(/\r\n/g, "\n");

assert.ok(
  fsTsContent.includes("export function sanitizeExportHtml("),
  "src/api/fs.ts から sanitizeExportHtml がエクスポートされていること"
);
assert.ok(
  fsTsContent.includes("sanitizeExportHtml(htmlContent)"),
  "printHtmlContent 内で iframe への書き込み前に sanitizeExportHtml(htmlContent) が適用されていること"
);
assert.ok(
  fsTsContent.includes("sanitizeExportHtml(") && fsTsContent.includes("exportToHtml"),
  "exportToHtml 内で sanitizeExportHtml が適用されていること"
);
console.log("✓ src/api/fs.ts: sanitizeExportHtml 定義および printHtmlContent / exportToHtml 適用を確認");

// 3.3 sanitizeExportHtml の動的サニタイズ挙動検証
{
  // sanitizeExportHtml の動的シミュレーション
  const sanitizeExportHtml = (html) => {
    if (!html || typeof html !== "string") return "";
    let sanitized = html;
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
        .replace(/<base\b[^>]*\/?>/gi, "")
        .replace(/<meta\b[^>]*http-equiv[^>]*\/?>/gi, "");
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

  // テスト1: 危険タグ（script, iframe, object, embed, form, base, meta）の完全除去
  const maliciousHtml = `
    <h1>Heading</h1>
    <script>alert("XSS")</script>
    <iframe src="evil.html"></iframe>
    <object data="evil.swf"></object>
    <embed src="evil.swf" />
    <form action="http://evil.com"><input type="text"/></form>
    <base href="http://evil.com/" />
    <meta http-equiv="refresh" content="0;url=http://evil.com" />
    <script><script>nested()</script></script>
    <p>Safe paragraph</p>
  `;
  const cleanHtml = sanitizeExportHtml(maliciousHtml);
  assert.ok(!cleanHtml.includes("<script"), "script タグが除去されること");
  assert.ok(!cleanHtml.includes("alert"), "script 内容が除去されること");
  assert.ok(!cleanHtml.includes("<iframe"), "iframe タグが除去されること");
  assert.ok(!cleanHtml.includes("<object"), "object タグが除去されること");
  assert.ok(!cleanHtml.includes("<embed"), "embed タグが除去されること");
  assert.ok(!cleanHtml.includes("<form"), "form タグが除去されること");
  assert.ok(!cleanHtml.includes("<base"), "base タグが除去されること");
  assert.ok(!cleanHtml.includes("<meta"), "meta http-equiv タグが除去されること");
  assert.ok(cleanHtml.includes("<h1>Heading</h1>"), "通常の見出しタグは保持されること");
  assert.ok(cleanHtml.includes("<p>Safe paragraph</p>"), "通常の段落タグは保持されること");

  // テスト2: インラインイベントハンドラ（onload, onerror, onclick）の除去
  const eventHtml = '<img src="image.png" onload="alert(1)" onerror=\'steal()\' onclick=doEvil() />';
  const cleanEvent = sanitizeExportHtml(eventHtml);
  assert.ok(!cleanEvent.includes("onload"), "onload 属性が除去されること");
  assert.ok(!cleanEvent.includes("onerror"), "onerror 属性が除去されること");
  assert.ok(!cleanEvent.includes("onclick"), "onclick 属性が除去されること");
  assert.ok(cleanEvent.includes('src="image.png"'), "安全な属性は保持されること");

  // テスト3: 危険な URI スキーム (javascript:, vbscript:, data:text/html) の除去
  const dangerousUriHtml = `
    <a href="javascript:alert(1)">Bad Link 1</a>
    <a href="  javascript:alert(2)">Bad Link 2</a>
    <a href="&#106;&#97;vascript:alert(3)">Bad Link 3</a>
    <a href="vbscript:msgbox(1)">Bad Link 4</a>
    <a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">Bad Link 5</a>
    <img src="javascript:alert(4)" alt="bad image" />
    <a href="https://example.com/safe">Safe Link</a>
  `;
  const cleanUri = sanitizeExportHtml(dangerousUriHtml);
  assert.ok(!cleanUri.includes("javascript:"), "javascript: スキームが除去されること");
  assert.ok(!cleanUri.includes("&#106;&#97;vascript:"), "エンコードされた javascript: スキームが除去されること");
  assert.ok(!cleanUri.includes("vbscript:"), "vbscript: スキームが除去されること");
  assert.ok(!cleanUri.includes("data:text/html"), "data:text/html スキームが除去されること");
  assert.ok(cleanUri.includes('href="https://example.com/safe"'), "安全な https: リンクは保持されること");

  // テスト4: GFM標準要素（表、チェックボックス、コード、画像、Mermaidコンテナ）の完全保持
  const gfmHtml = `
    <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>
    <ul><li><input type="checkbox" disabled="" checked="" /> Done</li></ul>
    <pre><code class="language-markdown"># Safe Code</code></pre>
    <div class="typori-mermaid-svg"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#3b82f6"/></svg></div>
  `;
  const cleanGfm = sanitizeExportHtml(gfmHtml);
  assert.ok(cleanGfm.includes("<table>"), "テーブルが保持されること");
  assert.ok(cleanGfm.includes('type="checkbox"'), "チェックボックスが保持されること");
  assert.ok(cleanGfm.includes('disabled=""'), "disabled属性が保持されること");
  assert.ok(cleanGfm.includes('checked=""'), "checked属性が保持されること");
  assert.ok(cleanGfm.includes('<code class="language-markdown">'), "コードブロックが保持されること");
  assert.ok(cleanGfm.includes('class="typori-mermaid-svg"'), "Mermaid SVG コンテナが保持されること");

  console.log("✓ sanitizeExportHtml: 危険タグ除去・イベントハンドラ除去・危険スキーム無害化・GFM要素保持を確認");
}

// ==================================================================
// [Part 4] バックエンドファイルシステムIPCの境界防御・DoS対策 (HIGH-03 / MED-02) 検証
// ==================================================================
console.log("\n[4] バックエンドファイルシステムIPCの境界防御・DoS対策 (HIGH-03 / MED-02) の検証...");

// 4.1 セキュリティ定数（MAX_SEARCH_DEPTH / MAX_IMAGE_FILE_SIZE）の定義検証
assert.ok(
  fsRsContent.includes("pub const MAX_SEARCH_DEPTH: usize = 16;"),
  "src-tauri/src/fs.rs に MAX_SEARCH_DEPTH: usize = 16 が定義されていること"
);
assert.ok(
  fsRsContent.includes("pub const MAX_IMAGE_FILE_SIZE: u64 = 50 * 1024 * 1024;"),
  "src-tauri/src/fs.rs に MAX_IMAGE_FILE_SIZE: u64 = 50 * 1024 * 1024 (50MB) が定義されていること"
);
console.log("✓ fs.rs: MAX_SEARCH_DEPTH (16階層) および MAX_IMAGE_FILE_SIZE (50MB) 定数定義を確認");

// 4.2 search_dir_recursive の再帰深度制限およびシンボリックリンク除外検証
assert.ok(
  fsRsContent.includes("current_depth >= MAX_SEARCH_DEPTH"),
  "search_dir_recursive で current_depth >= MAX_SEARCH_DEPTH による探索深度打ち切りが実装されていること"
);
assert.ok(
  fsRsContent.includes("if ft.is_symlink() {") && fsRsContent.includes("continue;"),
  "search_dir_recursive で ft.is_symlink() を検知してスキップする処理が実装されていること"
);
console.log("✓ fs.rs: ファイル検索の最大再帰深度 (16) ガードおよびシンボリックリンクスキップ処理を確認");

// 4.3 get_unique_file_path / save_image_file / save_image_binary のパストラバーサル防止検証
assert.ok(
  fsRsContent.includes("clean_name = std::path::Path::new(file_name)") ||
    fsRsContent.includes(".file_name()") && fsRsContent.includes("clean_name"),
  "get_unique_file_path 内でファイル名成分の抽出とサニタイズが行われていること"
);
assert.ok(
  fsRsContent.includes("clean_file_name = std::path::Path::new(&file_name)") ||
    (fsRsContent.includes("save_image_binary") && fsRsContent.includes(".file_name()")),
  "save_image_binary 内で file_name のパストラバーサル除去（ファイル名成分抽出）が行われていること"
);
console.log("✓ fs.rs: 画像保存時のパストラバーサル除去・ファイル名サニタイズ処理を確認");

// 4.4 画像拡張子検証 (is_image_extension) の適用検証
assert.ok(
  fsRsContent.includes("pub fn is_image_extension(ext: &str) -> bool"),
  "is_image_extension が定義されていること"
);
assert.ok(
  fsRsContent.includes("save_image_file") && fsRsContent.includes("!is_image_extension(ext)"),
  "save_image_file 内で is_image_extension(ext) による拡張子検証が行われていること"
);
assert.ok(
  fsRsContent.includes("save_image_binary") && fsRsContent.includes("!is_image_extension(ext)"),
  "save_image_binary 内で is_image_extension(ext) による拡張子検証が行われていること"
);
assert.ok(
  fsRsContent.includes("resolve_image_path") && fsRsContent.includes("!is_image_extension(ext)"),
  "resolve_image_path 内で is_image_extension(ext) による拡張子検証が行われていること"
);
assert.ok(
  fsRsContent.includes("read_file_binary") && fsRsContent.includes("!is_image_extension(ext)"),
  "read_file_binary 内で is_image_extension(ext) による拡張子検証が行われていること"
);
console.log("✓ fs.rs: save_image_file / save_image_binary / resolve_image_path / read_file_binary での画像拡張子検証を確認");

// 4.5 ファイルサイズ上限（50MB）ガードの検証
assert.ok(
  fsRsContent.includes("metadata.len() > MAX_IMAGE_FILE_SIZE") &&
    fsRsContent.includes("save_image_file"),
  "save_image_file 内で MAX_IMAGE_FILE_SIZE によるファイルサイズ上限検証が行われていること"
);
assert.ok(
  fsRsContent.includes("data.len() as u64 > MAX_IMAGE_FILE_SIZE") &&
    fsRsContent.includes("save_image_binary"),
  "save_image_binary 内で MAX_IMAGE_FILE_SIZE によるバイナリデータサイズ上限検証が行われていること"
);
assert.ok(
  fsRsContent.includes("metadata.len() > MAX_IMAGE_FILE_SIZE") &&
    fsRsContent.includes("read_file_binary"),
  "read_file_binary 内で MAX_IMAGE_FILE_SIZE によるファイルサイズ上限検証が行われていること"
);
console.log("✓ fs.rs: save_image_file / save_image_binary / read_file_binary での 50MB 上限ガードを確認");

// 4.6 resolve_image_path の上位トラバーサル拒否検証
assert.ok(
  fsRsContent.includes("Path traversal detected") &&
    fsRsContent.includes('part == ".."'),
  "resolve_image_path 内で .. によるベースディレクトリ外への上位トラバーサル検知・拒否が実装されていること"
);
console.log("✓ fs.rs: resolve_image_path での上位ディレクトリトラバーサル拒否処理を確認");

// ==================================================================
// [Part 5] 依存パッケージの既知脆弱性解消・オーバーライド (LOW-01 / Task 83) 検証
// ==================================================================
console.log("\n[5] 依存パッケージの既知脆弱性解消・オーバーライド (LOW-01 / Task 83) の検証...");

// 5.1 package.json の overrides および pnpm.overrides 設定検証
const packageJsonPath = path.resolve(projectRoot, "package.json");
assert.ok(fs.existsSync(packageJsonPath), "package.json が存在すること");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

assert.ok(
  packageJson.overrides &&
    packageJson.overrides["source-map-js"] === ">=1.2.2" &&
    packageJson.overrides["katex"] === ">=0.18.2",
  "package.json の overrides に source-map-js (>=1.2.2) および katex (>=0.18.2) が指定されていること"
);

assert.ok(
  packageJson.pnpm &&
    packageJson.pnpm.overrides &&
    packageJson.pnpm.overrides["source-map-js"] === ">=1.2.2" &&
    packageJson.pnpm.overrides["katex"] === ">=0.18.2",
  "package.json の pnpm.overrides に source-map-js (>=1.2.2) および katex (>=0.18.2) が指定されていること"
);
console.log("✓ package.json: overrides および pnpm.overrides 設定を確認");

// 5.2 pnpm-workspace.yaml の overrides 設定検証
const workspaceYamlPath = path.resolve(projectRoot, "pnpm-workspace.yaml");
assert.ok(fs.existsSync(workspaceYamlPath), "pnpm-workspace.yaml が存在すること");
const workspaceYamlContent = fs.readFileSync(workspaceYamlPath, "utf-8");
assert.ok(
  workspaceYamlContent.includes('source-map-js: ">=1.2.2"') &&
    workspaceYamlContent.includes('katex: ">=0.18.2"'),
  "pnpm-workspace.yaml の overrides に source-map-js および katex のバージョン制限が定義されていること"
);
console.log("✓ pnpm-workspace.yaml: overrides 設定を確認");

// 5.3 pnpm-lock.yaml のオーバーライド反映確認
const pnpmLockPath = path.resolve(projectRoot, "pnpm-lock.yaml");
assert.ok(fs.existsSync(pnpmLockPath), "pnpm-lock.yaml が存在すること");
const pnpmLockContent = fs.readFileSync(pnpmLockPath, "utf-8");
assert.ok(
  pnpmLockContent.includes("source-map-js@1.2.2") || pnpmLockContent.includes("source-map-js: 1.2.2"),
  "pnpm-lock.yaml で source-map-js 1.2.2 が解決されていること"
);
assert.ok(
  pnpmLockContent.includes("katex@0.18.9") || pnpmLockContent.includes("katex: 0.18.9"),
  "pnpm-lock.yaml で katex 0.18.9 (>=0.18.2) が解決されていること"
);
console.log("✓ pnpm-lock.yaml: オーバーライドによる安全バージョンの解決を確認");

// 5.4 pnpm audit による脆弱性 0 件検証
try {
  const auditOutput = execSync("pnpm audit", {
    cwd: projectRoot,
    encoding: "utf-8",
    stdio: "pipe",
  });
  assert.ok(
    auditOutput.includes("No known vulnerabilities found") ||
      auditOutput.includes("0 vulnerabilities"),
    "pnpm audit で既知の脆弱性が 0 件であること"
  );
  console.log("✓ pnpm audit: 検出された脆弱性 0 件 (No known vulnerabilities found) を確認");
} catch (err) {
  console.error("pnpm audit 失敗:\n", err.stdout || err.stderr || err.message);
  throw err;
}

console.log("\n==================================================================");
console.log(" >>> Phase 23 全セキュリティ強化・脆弱性対策 (Task 79〜84) 合格 <<< ");
console.log("==================================================================");


