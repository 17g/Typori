import React from "react";

export interface EditorToolbarProps {
  onInsertLink: () => void;
  onToggleBlockquote: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onInsertLink,
  onToggleBlockquote,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="typori-quick-toolbar absolute top-3 right-6 z-20 flex items-center gap-1 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-md px-2 py-1 rounded-md border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm opacity-60 hover:opacity-100 transition-opacity">
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
