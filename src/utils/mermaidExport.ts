/**
 * Mermaid エクスポート連携モジュール
 * 
 * HTMLエクスポートおよびPDF印刷（iframe連携）において、
 * Markdownから生成されたHTML内の Mermaid コードブロック（<pre><code class="language-mermaid">...</code></pre>）を
 * インライン SVG ダイアグラムにレンダリング・置換する機能を提供します。
 */

import { renderMermaidSvg, MermaidTheme } from "./mermaid";

export interface RenderMermaidInHtmlOptions {
  theme?: MermaidTheme;
  preserveErrorBlock?: boolean;
}

/**
 * HTMLエンティティ（&lt;, &gt;, &amp;, &quot;, &#39;, &#10; 等）をデコードします。
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "\r");
}

/**
 * HTML 特殊文字をエスケープします (CRIT-01 / MED-03)。
 */
export function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * HTML文字列内に Mermaid コードブロックが存在するかを判定します。
 */
export function hasMermaidInHtml(htmlContent: string): boolean {
  if (!htmlContent) return false;
  return /language-mermaid\b/i.test(htmlContent);
}

/**
 * HTML文字列から Mermaid コードブロックのテキスト配列を抽出します。
 */
export function extractMermaidBlocksFromHtml(htmlContent: string): string[] {
  if (!hasMermaidInHtml(htmlContent)) return [];

  // ブラウザ / DOMParser 環境
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const codeElements = Array.from(
        doc.querySelectorAll('pre > code.language-mermaid, pre > code[class*="language-mermaid"]')
      );
      return codeElements.map((el) => (el.textContent || "").trim()).filter(Boolean);
    } catch {
      // フォールバックへ
    }
  }

  // 正規表現フォールバック
  const results: string[] = [];
  const regex = /<pre><code(?:\s+[^>]*class=["'][^"']*language-mermaid[^"']*["'][^>]*)>([\s\S]*?)<\/code><\/pre>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(htmlContent)) !== null) {
    const decoded = decodeHtmlEntities(match[1]).trim();
    if (decoded) {
      results.push(decoded);
    }
  }
  return results;
}

/**
 * 正規表現を用いて HTML 内の Mermaid コードブロックを SVG に置換します（Node.js / フォールバック用）。
 */
async function replaceMermaidRegex(
  html: string,
  theme: MermaidTheme,
  preserveErrorBlock: boolean
): Promise<string> {
  const mermaidRegex = /<pre><code(?:\s+[^>]*class=["'][^"']*language-mermaid[^"']*["'][^>]*)>([\s\S]*?)<\/code><\/pre>/gi;
  const matches: Array<{ fullMatch: string; code: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = mermaidRegex.exec(html)) !== null) {
    matches.push({
      fullMatch: match[0],
      code: decodeHtmlEntities(match[1]).trim(),
    });
  }

  if (matches.length === 0) return html;

  let resultHtml = html;
  for (const item of matches) {
    const renderResult = await renderMermaidSvg(item.code, theme);
    if (renderResult.success && renderResult.svg) {
      const containerHtml = `<div class="typori-mermaid-svg" data-mermaid-processed="true" style="display:flex;justify-content:center;margin:20px 0;overflow-x:auto;page-break-inside:avoid;break-inside:avoid;">${renderResult.svg}</div>`;
      resultHtml = resultHtml.replace(item.fullMatch, containerHtml);
    } else {
      const errorMsg = escapeHtml(renderResult.error || "構文が無効です");
      const errorHtml = preserveErrorBlock
        ? `<div class="typori-mermaid-error-container" style="margin:16px 0;page-break-inside:avoid;break-inside:avoid;"><div class="typori-mermaid-error" style="color:#ef4444;font-size:13px;margin-bottom:8px;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:4px;border-left:3px solid #ef4444;">Mermaid 構文エラー: ${errorMsg}</div>${item.fullMatch}</div>`
        : `<div class="typori-mermaid-error" style="color:#ef4444;font-size:13px;padding:8px 12px;background:rgba(239,68,68,0.1);border-radius:4px;border-left:3px solid #ef4444;">Mermaid 構文エラー: ${errorMsg}</div>`;
      resultHtml = resultHtml.replace(item.fullMatch, errorHtml);
    }
  }

  return resultHtml;
}

/**
 * HTML文字列内の Mermaid コードブロック（<pre><code class="language-mermaid">...</code></pre>）を検出し、
 * レンダリング済み SVG（<div class="typori-mermaid-svg">...</div>）に置換します。
 * 
 * @param htmlContent Markdownから変換された生のHTML文字列
 * @param options テーマ設定（'light' | 'dark'）またはオプションオブジェクト
 * @returns MermaidダイアグラムがSVGに置換されたスタンドアロンHTML文字列
 */
export async function renderMermaidInHtml(
  htmlContent: string,
  options?: RenderMermaidInHtmlOptions | MermaidTheme
): Promise<string> {
  if (!htmlContent) return "";
  if (!hasMermaidInHtml(htmlContent)) return htmlContent;

  const resolvedTheme: MermaidTheme =
    typeof options === "string" ? options : options?.theme ?? "light";
  const preserveError =
    typeof options === "object" && options?.preserveErrorBlock !== undefined
      ? options.preserveErrorBlock
      : true;

  // 1. DOMParser 環境（ブラウザ環境）での DOM ツリー変換
  if (typeof DOMParser !== "undefined") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const codeElements = Array.from(
        doc.querySelectorAll('pre > code.language-mermaid, pre > code[class*="language-mermaid"]')
      );

      if (codeElements.length === 0) {
        return htmlContent;
      }

      for (let i = 0; i < codeElements.length; i++) {
        const codeEl = codeElements[i];
        const preEl = codeEl.parentElement;
        if (!preEl) continue;

        const rawCode = (codeEl.textContent || "").trim();
        if (!rawCode) continue;

        const renderResult = await renderMermaidSvg(rawCode, resolvedTheme);

        if (renderResult.success && renderResult.svg) {
          const container = doc.createElement("div");
          container.className = "typori-mermaid-svg";
          container.setAttribute("data-mermaid-processed", "true");
          container.style.display = "flex";
          container.style.justifyContent = "center";
          container.style.margin = "20px 0";
          container.style.overflowX = "auto";
          container.style.pageBreakInside = "avoid";
          container.style.breakInside = "avoid";
          container.innerHTML = renderResult.svg;

          preEl.parentNode?.replaceChild(container, preEl);
        } else {
          // 構文エラー時: エラーバナーを表示し、元のコードブロックを保護
          const errorContainer = doc.createElement("div");
          errorContainer.className = "typori-mermaid-error-container";
          errorContainer.style.margin = "16px 0";
          errorContainer.style.pageBreakInside = "avoid";
          errorContainer.style.breakInside = "avoid";

          const errorBanner = doc.createElement("div");
          errorBanner.className = "typori-mermaid-error";
          errorBanner.style.color = "#ef4444";
          errorBanner.style.fontSize = "13px";
          errorBanner.style.marginBottom = "8px";
          errorBanner.style.padding = "8px 12px";
          errorBanner.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
          errorBanner.style.borderRadius = "4px";
          errorBanner.style.borderLeft = "3px solid #ef4444";
          errorBanner.textContent = `Mermaid 構文エラー: ${renderResult.error || "構文が無効です"}`;

          if (preserveError) {
            preEl.parentNode?.insertBefore(errorContainer, preEl);
            errorContainer.appendChild(errorBanner);
            errorContainer.appendChild(preEl);
          } else {
            errorContainer.appendChild(errorBanner);
            preEl.parentNode?.replaceChild(errorContainer, preEl);
          }
        }
      }

      const hasDoctype = /^<!DOCTYPE\s+html/i.test(htmlContent);
      return (hasDoctype ? "<!DOCTYPE html>\n" : "") + doc.documentElement.outerHTML;
    } catch {
      // DOMParser でパース例外が発生した場合は正規表現フォールバックへ
    }
  }

  // 2. Node.js 環境 または DOMParser 例外時の正規表現フォールバック
  return await replaceMermaidRegex(htmlContent, resolvedTheme, preserveError);
}
