import React, { useState } from "react";
import { SidebarProps } from "./types";
import { SidebarItem } from "./SidebarItem";

export const Sidebar: React.FC<SidebarProps> = ({
  currentDirectory,
  entries = [],
  selectedPath = null,
  directoryContents,
  expandedPaths,
  loadingPaths,
  isLoading = false,
  error = null,
  isOpen = true,
  onToggleOpen,
  onSelectFile,
  onToggleDirectory,
  onNavigateUp,
  onRefresh,
  onOpenDirectory,
}) => {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [customPath, setCustomPath] = useState("");

  const handleStartEditPath = () => {
    setCustomPath(currentDirectory || "");
    setIsEditingPath(true);
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim() && onOpenDirectory) {
      onOpenDirectory(customPath.trim());
      setIsEditingPath(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="w-10 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center py-3 flex-shrink-0 select-none">
        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
          title="サイドバーを展開"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
        </button>
      </div>
    );
  }

  const dirName = currentDirectory
    ? currentDirectory.split(/[/\\]/).filter(Boolean).pop() || currentDirectory
    : "未選択";

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-950/75 flex flex-col flex-shrink-0 select-none transition-all duration-200">
      {/* サイドバーヘッダー */}
      <div className="h-10 border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
            Explorer
          </span>
        </div>

        {/* ツールバーボタン群 */}
        <div className="flex items-center gap-0.5">
          {onNavigateUp && (
            <button
              onClick={onNavigateUp}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="親ディレクトリへ (..)"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            </button>
          )}

          {onOpenDirectory && (
            <button
              onClick={handleStartEditPath}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="フォルダパスを指定して開く"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="更新"
            >
              <svg
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {onToggleOpen && (
            <button
              onClick={onToggleOpen}
              className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
              title="サイドバーを折りたたむ"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* カレントディレクトリ表示 / パス入力バー */}
      <div className="px-3 py-1.5 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-100/50 dark:bg-zinc-900/50 text-xs">
        {isEditingPath ? (
          <form onSubmit={handlePathSubmit} className="flex flex-col gap-1.5">
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="C:\path\to\folder"
              autoFocus
              className="w-full px-2 py-1 text-xs rounded border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end gap-1">
              <button
                type="button"
                onClick={() => setIsEditingPath(false)}
                className="px-2 py-0.5 text-[11px] rounded text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="px-2 py-0.5 text-[11px] rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                開く
              </button>
            </div>
          </form>
        ) : (
          <div
            className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 group cursor-pointer"
            onClick={handleStartEditPath}
            title={`${currentDirectory ?? ""}\n(クリックしてフォルダ変更)`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <svg
                className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span className="font-medium truncate">{dirName}</span>
            </div>
            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-indigo-500 dark:text-indigo-400 flex-shrink-0 transition-opacity">
              変更
            </span>
          </div>
        )}
      </div>

      {/* ファイルツリー / エラー / ローディング */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {isLoading && entries.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500">
            <svg
              className="w-6 h-6 animate-spin text-indigo-500 mb-2"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>ディレクトリを読み込み中...</span>
          </div>
        ) : error ? (
          <div className="p-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-md border border-rose-200 dark:border-rose-900/50">
            <p className="font-semibold mb-1">読み込みエラー</p>
            <p className="text-[11px] break-words">{error}</p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="mt-2 px-2 py-1 bg-white dark:bg-zinc-800 border border-rose-300 dark:border-rose-800 rounded text-[11px] text-rose-700 dark:text-rose-300 hover:bg-rose-100/50"
              >
                再試行
              </button>
            )}
          </div>
        ) : entries.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-zinc-400 dark:text-zinc-500 px-4 text-center">
            <svg
              className="w-8 h-8 mb-2 stroke-zinc-300 dark:stroke-zinc-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <span>ファイルがありません</span>
          </div>
        ) : (
          entries.map((entry) => (
            <SidebarItem
              key={entry.path}
              entry={entry}
              depth={0}
              isSelected={selectedPath === entry.path}
              isExpanded={expandedPaths?.has(entry.path) ?? false}
              isLoading={loadingPaths?.has(entry.path) ?? false}
              childrenEntries={directoryContents?.[entry.path]}
              expandedPaths={expandedPaths}
              loadingPaths={loadingPaths}
              directoryContents={directoryContents}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              onToggleDirectory={onToggleDirectory}
            />
          ))
        )}
      </div>

      {/* フッター */}
      <div className="h-7 border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>{entries.length} 項目</span>
        {currentDirectory && (
          <span className="truncate max-w-[120px]" title={currentDirectory}>
            {dirName}
          </span>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
