import React, { useState, useEffect, useRef } from "react";
import { exportToHtml, printMarkdownDocument } from "../../api/fs";

export type ExportFormat = "html" | "pdf";

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilePath: string | null;
  currentDirectory: string | null;
  markdownContent: string;
  initialFormat?: ExportFormat;
  onExportSuccess?: (exportedPath: string) => void;
}

export function extractInitialTitle(content: string, filePath: string | null): string {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      const title = trimmed.replace(/^#\s+/, "").trim();
      if (title) return title;
    }
  }
  if (filePath) {
    const fileName = filePath.split(/[/\\]/).filter(Boolean).pop() || "";
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    if (nameWithoutExt) return nameWithoutExt;
  }
  return "Untitled";
}

export function getInitialOutputPath(
  filePath: string | null,
  directory: string | null,
  title: string,
  extension = "html"
): string {
  const sanitize = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_");
  const cleanTitle = sanitize(title) || "Untitled";

  if (filePath) {
    const lastDotIndex = filePath.lastIndexOf(".");
    if (lastDotIndex > 0) {
      return filePath.substring(0, lastDotIndex) + "." + extension;
    }
    return filePath + "." + extension;
  }

  const baseDir = directory || ".";
  const separator = baseDir.includes("\\") ? "\\" : "/";
  const normalizedDir = baseDir.endsWith("/") || baseDir.endsWith("\\")
    ? baseDir.slice(0, -1)
    : baseDir;

  return `${normalizedDir}${separator}${cleanTitle}.${extension}`;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  currentFilePath,
  currentDirectory,
  markdownContent,
  initialFormat = "html",
  onExportSuccess,
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>(initialFormat);
  const [title, setTitle] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successPath, setSuccessPath] = useState<string | null>(null);

  const initialFocusRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const format = initialFormat || "html";
      setExportFormat(format);
      const initTitle = extractInitialTitle(markdownContent, currentFilePath);
      setTitle(initTitle);
      const initPath = getInitialOutputPath(
        currentFilePath,
        currentDirectory,
        initTitle,
        format === "pdf" ? "html" : "html"
      );
      setOutputPath(initPath);
      setErrorMessage(null);
      setSuccessPath(null);
      setIsExporting(false);

      // モーダルオープン時に最初の入力にフォーカス
      setTimeout(() => {
        initialFocusRef.current?.focus();
        initialFocusRef.current?.select();
      }, 50);
    }
  }, [isOpen, currentFilePath, currentDirectory, markdownContent, initialFormat]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFormatChange = (newFormat: ExportFormat) => {
    setExportFormat(newFormat);
    setErrorMessage(null);
    setSuccessPath(null);
  };

  const handleExport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsExporting(true);
    setErrorMessage(null);

    try {
      if (exportFormat === "html") {
        if (!outputPath.trim()) {
          setErrorMessage("エクスポート先のファイルパスを入力してください。");
          setIsExporting(false);
          return;
        }
        await exportToHtml(outputPath.trim(), markdownContent, title.trim() || undefined, theme);
        setSuccessPath(outputPath.trim());
        if (onExportSuccess) {
          onExportSuccess(outputPath.trim());
        }
      } else {
        // PDF形式: 印刷ダイアログ連携
        await printMarkdownDocument({
          markdown: markdownContent,
          title: title.trim() || undefined,
          theme,
        });
        setSuccessPath("印刷ダイアログを開きました。「PDFに保存」を選択してPDFファイルを作成できます。");
        if (onExportSuccess) {
          onExportSuccess("print_pdf_dialog");
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`エクスポートに失敗しました: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transition-all">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </div>
            <div>
              <h2
                id="export-modal-title"
                className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
              >
                {exportFormat === "html" ? "HTML形式でエクスポート" : "PDF形式でエクスポート (印刷)"}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {exportFormat === "html"
                  ? "Markdownドキュメントをスタイル付きHTMLファイルとして書き出します"
                  : "Markdownドキュメントを印刷ダイアログと連携してPDF形式でエクスポートします"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="閉じる (Esc)"
            aria-label="閉じる"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 形式選択タブ */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-6 pt-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={() => handleFormatChange("html")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              exportFormat === "html"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span>HTML (.html)</span>
          </button>
          <button
            type="button"
            onClick={() => handleFormatChange("pdf")}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
              exportFormat === "pdf"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>PDF (印刷 / .pdf)</span>
          </button>
        </div>

        {/* コンテンツ本体 */}
        <form onSubmit={handleExport} className="p-6 space-y-4">
          {successPath ? (
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>{exportFormat === "html" ? "エクスポートが正常に完了しました！" : "印刷ダイアログを起動しました！"}</span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono break-all bg-white/60 dark:bg-black/30 p-2 rounded border border-emerald-100 dark:border-emerald-900/50">
                {successPath}
              </p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* タイトル */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  ドキュメントタイトル (&lt;title&gt;)
                </label>
                <input
                  ref={initialFocusRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="タイトルを入力..."
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-100 transition-colors"
                />
              </div>

              {/* HTML形式の場合のみ: 出力先ファイルパス */}
              {exportFormat === "html" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    出力先ファイルパス (.html)
                  </label>
                  <input
                    type="text"
                    value={outputPath}
                    onChange={(e) => setOutputPath(e.target.value)}
                    placeholder="C:/path/to/exported.html"
                    className="w-full px-3 py-2 text-sm font-mono bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-zinc-900 dark:text-zinc-100 transition-colors"
                  />
                </div>
              )}

              {/* PDF形式の場合: 案内ボックス */}
              {exportFormat === "pdf" && (
                <div className="p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>PDF出力について</span>
                  </div>
                  <p className="leading-relaxed text-zinc-600 dark:text-zinc-300">
                    「PDFとしてエクスポート (印刷)」ボタンを押すと、OSのネイティブ印刷ダイアログが開きます。送信先プリンタ一覧から<strong>「PDFに保存」</strong>または<strong>「Microsoft Print to PDF」</strong>を選択してPDFファイルとして保存してください。
                  </p>
                </div>
              )}

              {/* テーマ選択 */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  スタイリングテーマ {exportFormat === "pdf" && "(印刷時は自動で高コントラスト白背景に最適化されます)"}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      theme === "light"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    <span>ライト (標準スタイル)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      theme === "dark"
                        ? "border-indigo-600 bg-indigo-50/70 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-500 shadow-xs"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    <span>ダーク (GitHubダーク)</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* フッターアクション */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            {successPath ? (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs"
              >
                閉じる
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isExporting}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isExporting || (exportFormat === "html" && !outputPath.trim())}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-all ${
                    isExporting || (exportFormat === "html" && !outputPath.trim())
                      ? "bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isExporting ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>{exportFormat === "html" ? "エクスポート中..." : "印刷準備中..."}</span>
                    </>
                  ) : (
                    <>
                      {exportFormat === "html" ? (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      )}
                      <span>{exportFormat === "html" ? "HTMLとしてエクスポート" : "PDFとしてエクスポート (印刷)"}</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
