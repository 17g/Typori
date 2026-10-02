import React from "react";

export interface EditorToolbarProps {
  onInsertLink: () => void;
  onToggleBlockquote: () => void;
  onInsertTable?: () => void;
  onInsertImage?: () => void;
  onToggleSourceMode?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isRightSidebarOpen?: boolean;
  visible?: boolean;
  isScrolled?: boolean;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertLink,
  onToggleBlockquote,
  onInsertTable,
  onInsertImage,
  onToggleSourceMode,
  isFocusMode,
  onToggleFocusMode,
  onUndo,
  onRedo,
  isRightSidebarOpen = false,
  visible,
  isScrolled = false,
  className = "",
  onMouseEnter,
  onMouseLeave,
}) => {
  // 右サイドバー（アウトライン）展開時のオフセット自動調整
  const rightOffsetClass = isRightSidebarOpen ? "right-5" : "right-6";

  // スクロール量に応じた可視状態の判定（明示的な visible が無ければ !isScrolled）
  const isVisible = visible !== undefined ? visible : !isScrolled;

  // 表示・非表示スタイル（最上部では通常表示、スクロール時は自動非表示）
  const visibilityClass = isVisible
    ? "opacity-60 hover:opacity-100 pointer-events-auto translate-y-0"
    : "opacity-0 pointer-events-none -translate-y-1";

  return (
    <div
      data-testid="editor-toolbar"
      data-right-sidebar-open={isRightSidebarOpen}
      data-visible={isVisible}
      data-scrolled={isScrolled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`typori-quick-toolbar absolute top-3 ${rightOffsetClass} z-20 flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md px-2 py-1 rounded-md border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm transition-all duration-200 ease-out ${visibilityClass} ${className}`}
    >
      {onToggleFocusMode && (
        <button
          type="button"
          onClick={onToggleFocusMode}
          title={isFocusMode ? "フォーカスモードを解除 (F8)" : "フォーカスモードに切り替え (F8)"}
          className={`p-1.5 rounded transition-colors ${
            isFocusMode
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 font-medium"
              : "text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M6 12H3" />
          </svg>
        </button>
      )}
      {onToggleSourceMode && (
        <button
          type="button"
          onClick={onToggleSourceMode}
          title="ソース直接編集モードに切り替え (Ctrl+/)"
          className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      )}
      {onInsertImage && (
        <button
          type="button"
          onClick={onInsertImage}
          title="画像を挿入"
          className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      )}

      {onInsertTable && (
        <button
          type="button"
          onClick={onInsertTable}
          title="表（テーブル）を挿入 (3x3)"
          className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M3 10h18M3 14h18M9 4v16M15 4v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z"
            />
          </svg>
        </button>
      )}

      <button
        type="button"
        onClick={onInsertLink}
        title="リンクを挿入・編集 (Ctrl+K)"
        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={onToggleBlockquote}
        title="引用ブロックの切り替え (Ctrl+Shift+Q)"
        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
      </button>

      <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

      <button
        type="button"
        onClick={onUndo}
        title="元に戻す (Ctrl+Z)"
        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a5 5 0 015 5v2m0 0l-4-4m4 4l4-4M3 10l4-4m-4 4l4 4"
          />
        </svg>
      </button>

      <button
        type="button"
        onClick={onRedo}
        title="やり直し (Ctrl+Y)"
        className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 10H11a5 5 0 00-5 5v2m0 0l4-4m-4 4l-4-4m15-6l-4-4m4 4l-4 4"
          />
        </svg>
      </button>
    </div>
  );
};

export default EditorToolbar;
