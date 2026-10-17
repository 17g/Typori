/**
 * Mermaid ダイアグラムユーティリティモジュール
 * 
 * Markdown 内の ```mermaid コードブロックに対する
 * SVG レンダリング、ライト/ダークテーマ切り替え、構文エラー耐性ハンドリングを提供します。
 */

import mermaid from "mermaid";

export type MermaidTheme = "light" | "dark";

export interface MermaidRenderResult {
  success: boolean;
  svg: string;
  error?: string;
  bindFunctions?: (element: Element) => void;
}

export interface MermaidValidationResult {
  valid: boolean;
  error?: string;
  diagramType?: string;
}

let currentTheme: MermaidTheme | null = null;
let idCounter = 0;

/**
 * 一意な Mermaid 要素 ID を生成します。
 */
export function generateMermaidId(prefix: string = "typori-mermaid"): string {
  idCounter += 1;
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safePrefix}-${Date.now()}-${idCounter}`;
}

/**
 * Mermaid の設定およびテーマを初期化します。
 * 
 * @param theme ライト ('light') またはダーク ('dark')
 * @param force 既に同一テーマで初期化済みでも強制再初期化する場合は true
 */
export function initMermaid(theme: MermaidTheme = "light", force: boolean = false): void {
  if (currentTheme === theme && !force) {
    return;
  }
  currentTheme = theme;

  mermaid.initialize({
    startOnLoad: false,
    theme: theme === "dark" ? "dark" : "default",
    securityLevel: "loose",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    suppressErrorRendering: true,
  });
}

/**
 * 現在設定されている Mermaid テーマを取得します。
 */
export function getMermaidTheme(): MermaidTheme {
  return currentTheme ?? "light";
}

/**
 * エラー発生時に Mermaid が DOM 内に残留させた一時要素をクリーンアップします。
 */
export function cleanupMermaidTempElements(id: string): void {
  if (typeof document === "undefined") return;

  const directEl = document.getElementById(id);
  if (directEl?.parentNode) {
    directEl.parentNode.removeChild(directEl);
  }

  const errorEl = document.getElementById(`d${id}`);
  if (errorEl?.parentNode) {
    errorEl.parentNode.removeChild(errorEl);
  }
}

/**
 * エラーオブジェクトからエラーメッセージを抽出します。
 */
export function extractMermaidErrorMessage(err: unknown): string {
  if (!err) return "不明な構文エラーが発生しました。";
  if (err instanceof Error) {
    return err.message;
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "str" in err &&
    typeof (err as { str: unknown }).str === "string"
  ) {
    return (err as { str: string }).str;
  }
  return String(err);
}

/**
 * 指定されたコード言語が Mermaid かどうかを判定します。
 */
export function isMermaidLanguage(lang: string | null | undefined): boolean {
  if (!lang) return false;
  const normalized = lang.trim().toLowerCase();
  return normalized === "mermaid" || normalized === "mermaid.js";
}

/**
 * Mermaid コードのダイアグラム種別を検出します。
 */
export function detectDiagramType(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return "unknown";

  try {
    if (typeof mermaid.detectType === "function") {
      const detected = mermaid.detectType(trimmed);
      if (detected) return detected;
    }
  } catch {
    // detectType でのエラー時はフォールバック判定へ進む
  }

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
}

/**
 * Mermaid コードの構文検証（パース）を行います。
 */
export async function validateMermaidCode(code: string): Promise<MermaidValidationResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: "ダイアグラムコードが入力されていません。",
    };
  }

  try {
    const parseResult = await mermaid.parse(trimmed, { suppressErrors: false });
    const diagramType =
      typeof parseResult === "object" && parseResult !== null && "diagramType" in parseResult
        ? String((parseResult as { diagramType: unknown }).diagramType)
        : detectDiagramType(trimmed);

    return {
      valid: true,
      diagramType,
    };
  } catch (err) {
    return {
      valid: false,
      error: extractMermaidErrorMessage(err),
      diagramType: detectDiagramType(trimmed),
    };
  }
}

/**
 * Mermaid コードを SVG 文字列にレンダリングします。
 * 構文エラー発生時も例外をスローせず、エラー情報を含むオブジェクトを返却します。
 * 
 * @param code レンダリング対象の Mermaid 構文コード
 * @param theme 適用するテーマ ('light' | 'dark')。省略時は現在（またはデフォルト）のテーマを使用
 * @param customId 一意な要素 ID（省略時は自動生成）
 * @returns レンダリング結果（成功時は SVG、失敗時は error）
 */
export async function renderMermaidSvg(
  code: string,
  theme?: MermaidTheme,
  customId?: string
): Promise<MermaidRenderResult> {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      success: false,
      svg: "",
      error: "ダイアグラムコードが入力されていません。",
    };
  }

  const id = customId
    ? customId.replace(/[^a-zA-Z0-9_-]/g, "_")
    : generateMermaidId();

  if (theme) {
    initMermaid(theme);
  } else if (!currentTheme) {
    initMermaid("light");
  }

  try {
    const result = await mermaid.render(id, trimmed);
    return {
      success: true,
      svg: result.svg,
      bindFunctions: result.bindFunctions,
    };
  } catch (err) {
    cleanupMermaidTempElements(id);
    return {
      success: false,
      svg: "",
      error: extractMermaidErrorMessage(err),
    };
  }
}
