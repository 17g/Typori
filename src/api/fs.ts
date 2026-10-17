import { invoke } from "@tauri-apps/api/core";
import { FileEntry } from "../components/Sidebar/types";
import { normalizeLineEndings } from "../utils/text";
import { renderMermaidInHtml } from "../utils/mermaidExport";

/**
 * 指定ディレクトリ直下のファイルおよびディレクトリ一覧を取得します。
 * @param path 対象ディレクトリのパス
 */
export async function readDir(path: string): Promise<FileEntry[]> {
  return await invoke<FileEntry[]>("read_dir", { path });
}

/**
 * カレントワーキングディレクトリの絶対パスを取得します。
 */
export async function getCurrentDir(): Promise<string> {
  return await invoke<string>("get_current_dir");
}

/**
 * 指定パスの親ディレクトリのパスを取得します。親が存在しない場合は null を返します。
 * @param path 対象パス
 */
export async function getParentDir(path: string): Promise<string | null> {
  return await invoke<string | null>("get_parent_dir", { path });
}

/**
 * 指定パスのファイルをUTF-8テキストとして読み込み、改行コードをLFに正規化して返します。
 * @param path 対象ファイルのパス
 */
export async function openFile(path: string): Promise<string> {
  const content = await invoke<string>("open_file", { path });
  return normalizeLineEndings(content);
}

/**
 * 指定パスにテキストを保存します。
 * @param path 対象ファイルのパス
 * @param content ファイル内容
 */
export async function saveFile(path: string, content: string): Promise<void> {
  await invoke<void>("save_file", { path, content });
}

/**
 * 指定パスに新しいファイルを作成します。
 * @param path 作成するファイルのフルパス
 * @param initialContent 初期コンテンツ（省略時は空文字）
 */
export async function createFile(path: string, initialContent?: string): Promise<FileEntry> {
  return await invoke<FileEntry>("create_file", { path, initialContent });
}

/**
 * コマンドライン引数を取得します。
 */
export async function getCliArgs(): Promise<string[]> {
  return await invoke<string[]>("get_cli_args");
}

export interface WorkspaceInitResult {
  current_dir: string;
  entries: FileEntry[];
  initial_file_path: string | null;
  initial_file_content: string | null;
  initial_file_error: string | null;
}

/**
 * 起動時のワークスペースを一括で初期化します。
 * カレントディレクトリの特定、ディレクトリエントリの読み込み、および初期指定ファイルの内容取得を1往復で集約して返します。
 * @param customPath オプションの対象ファイルまたはディレクトリパス
 */
export async function initWorkspace(customPath?: string): Promise<WorkspaceInitResult> {
  const result = await invoke<WorkspaceInitResult>("init_workspace", {
    customPath: customPath ?? null,
  });
  if (result.initial_file_content !== null && result.initial_file_content !== undefined) {
    result.initial_file_content = normalizeLineEndings(result.initial_file_content);
  }
  return result;
}

/**
 * 指定ディレクトリ配下を再帰的に走査し、ファイル名・フォルダ名にクエリが含まれるエントリを検索します。
 * @param rootPath 検索起点ディレクトリのパス
 * @param query 検索クエリ
 * @param maxResults 最大取得件数（デフォルト200）
 */
export async function searchFiles(
  rootPath: string,
  query: string,
  maxResults?: number
): Promise<FileEntry[]> {
  return await invoke<FileEntry[]>("search_files", {
    rootPath,
    query,
    maxResults,
  });
}

export interface SavedImage {
  file_name: string;
  relative_path: string;
  absolute_path: string;
}

/**
 * ファイルパスまたはファイル名が画像ファイルかどうかを判定します。
 */
export function isImageFilePath(path: string): boolean {
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".avif", ".tiff"];
  const lower = path.toLowerCase();
  return imageExtensions.some((ext) => lower.endsWith(ext));
}

/**
 * 指定されたローカル画像ファイルを開いているドキュメントの assets フォルダにコピーして保存します。
 */
export async function saveImageFile(
  sourcePath: string,
  documentPath?: string | null,
  workspaceDir?: string | null
): Promise<SavedImage> {
  return await invoke<SavedImage>("save_image_file", {
    sourcePath,
    documentPath: documentPath ?? null,
    workspaceDir: workspaceDir ?? null,
  });
}

/**
 * バイナリデータから画像を開いているドキュメントの assets フォルダに保存します。
 */
export async function saveImageBinary(
  fileName: string,
  data: number[],
  documentPath?: string | null,
  workspaceDir?: string | null
): Promise<SavedImage> {
  return await invoke<SavedImage>("save_image_binary", {
    fileName,
    data,
    documentPath: documentPath ?? null,
    workspaceDir: workspaceDir ?? null,
  });
}

/**
 * 指定されたパスのファイルのバイナリデータを読み込みます。
 */
export async function readFileBinary(path: string): Promise<number[]> {
  return await invoke<number[]>("read_file_binary", { path });
}

/**
 * 画像の相対パスから絶対パスを解決します。
 */
export async function resolveImagePath(
  imageSrc: string,
  documentPath?: string | null,
  workspaceDir?: string | null
): Promise<string> {
  return await invoke<string>("resolve_image_path", {
    imageSrc,
    documentPath: documentPath ?? null,
    workspaceDir: workspaceDir ?? null,
  });
}

/**
 * Markdown文字列をスタンドアロンのHTML（CSSスタイル内蔵）文字列に変換します。
 */
export async function convertMarkdownToHtml(
  markdown: string,
  title?: string | null,
  theme?: string | null
): Promise<string> {
  return await invoke<string>("convert_markdown_to_html", {
    markdown,
    title: title ?? null,
    theme: theme ?? null,
  });
}

/**
 * 指定パスにMarkdownをHTMLファイルとしてエクスポートします。
 * Mermaidダイアグラムが存在する場合はインラインSVGとして完全描画されたスタンドアロンHTMLを生成して保存します。
 */
export async function exportToHtml(
  path: string,
  markdown: string,
  title?: string | null,
  theme?: string | null
): Promise<void> {
  const rawHtml = await convertMarkdownToHtml(markdown, title, theme);
  const finalHtml = await renderMermaidInHtml(
    rawHtml,
    theme === "dark" ? "dark" : "light"
  );
  await saveFile(path, finalHtml);
}

/**
 * バックエンド直接呼び出し用のエクスポートラッパー（Tauri IPC コマンド登録整合性を維持）
 */
export async function rawExportToHtml(
  path: string,
  markdown: string,
  title?: string | null,
  theme?: string | null
): Promise<void> {
  await invoke<void>("export_to_html", {
    path,
    markdown,
    title: title ?? null,
    theme: theme ?? null,
  });
}

/**
 * 指定パスにPDF印刷用としてMarkdownをHTMLファイルとして書き出します。
 */
export async function exportToPdfHtml(
  path: string,
  markdown: string,
  title?: string | null,
  theme?: string | null
): Promise<void> {
  await invoke<void>("export_to_pdf_html", {
    path,
    markdown,
    title: title ?? null,
    theme: theme ?? null,
  });
}

/**
 * HTML文字列を非表示iframeにレンダリングし、Mermaidダイアグラムの描画確定をハンドシェイクで待機後、
 * ブラウザ/OSの印刷ダイアログ（PDF出力対応）を呼び出します。
 */
export function printHtmlContent(htmlContent: string): Promise<void> {
  return new Promise((resolve) => {
    // 既存の印刷用iframeがあれば削除
    const existing = document.getElementById("typori-print-frame");
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "typori-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      iframe.remove();
      resolve();
      return;
    }

    let isPrinted = false;
    let handshakeCompleted = false;

    const triggerPrint = () => {
      if (isPrinted) return;
      isPrinted = true;
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Print invocation failed:", e);
        } finally {
          setTimeout(() => {
            iframe.remove();
            resolve();
          }, 1000);
        }
      }, 100);
    };

    /**
     * Mermaid ダイアグラム描画確定およびレイアウトハンドシェイク
     */
    const performPrintHandshake = async () => {
      if (handshakeCompleted || isPrinted) return;
      handshakeCompleted = true;

      try {
        const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
        if (iframeDoc) {
          // 1. iframe 内に未変換の Mermaid ブロックがある場合のフォールバック変換
          const unrendered = iframeDoc.querySelectorAll('pre > code.language-mermaid, pre > code[class*="language-mermaid"]');
          if (unrendered.length > 0) {
            const convertedHtml = await renderMermaidInHtml(iframeDoc.documentElement.outerHTML);
            iframeDoc.open();
            iframeDoc.write(convertedHtml);
            iframeDoc.close();
          }

          // 2. すべての Mermaid SVG 要素のレイアウト確定をダブル rAF で待機
          const mermaidSvgs = iframeDoc.querySelectorAll('.typori-mermaid-svg svg');
          if (mermaidSvgs.length > 0) {
            await new Promise<void>((r) => {
              if (iframe.contentWindow?.requestAnimationFrame) {
                iframe.contentWindow.requestAnimationFrame(() => {
                  iframe.contentWindow?.requestAnimationFrame(() => r());
                });
              } else {
                setTimeout(r, 120);
              }
            });

            iframeDoc.documentElement.setAttribute("data-typori-mermaid-ready", "true");
            try {
              iframe.contentWindow?.dispatchEvent(
                new CustomEvent("typori:mermaid-ready", { detail: { count: mermaidSvgs.length } })
              );
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn("Mermaid print handshake warning:", err);
      }

      triggerPrint();
    };

    doc.open();
    doc.write(htmlContent);
    doc.close();

    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => {
        performPrintHandshake();
      };
    }
    // 万一 onload が発火しない場合のタイムアウトフォールバック (800ms)
    setTimeout(() => {
      if (!handshakeCompleted) {
        performPrintHandshake();
      }
    }, 800);
  });
}

/**
 * Markdown文字列から完全なスタイル付きHTML（MermaidダイアグラムSVG展開済み）を生成し、
 * OS印刷ダイアログ（PDF保存）を呼び出します。
 */
export async function printMarkdownDocument(options: {
  markdown: string;
  title?: string | null;
  theme?: string | null;
}): Promise<void> {
  const rawHtml = await convertMarkdownToHtml(
    options.markdown,
    options.title,
    options.theme
  );
  const htmlContent = await renderMermaidInHtml(
    rawHtml,
    (options.theme as "light" | "dark") || "light"
  );
  await printHtmlContent(htmlContent);
}

/**
 * OSネイティブメニュー「行番号を表示」のチェック状態を同期します。
 * @param checked チェック状態（true: 有効, false: 無効）
 */
export async function setLineNumbersMenuChecked(checked: boolean): Promise<void> {
  return await invoke<void>("set_line_numbers_menu_checked", { checked });
}


