import React from "react";
import { FileEntry } from "./types";

interface SidebarItemProps {
  entry: FileEntry;
  depth?: number;
  isSelected?: boolean;
  isExpanded?: boolean;
  isLoading?: boolean;
  childrenEntries?: FileEntry[];
  expandedPaths?: Set<string>;
  loadingPaths?: Set<string>;
  directoryContents?: Record<string, FileEntry[]>;
  selectedPath?: string | null;
  onSelectFile?: (entry: FileEntry) => void;
  onToggleDirectory?: (entry: FileEntry) => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  entry,
  depth = 0,
  isSelected = false,
  isExpanded = false,
  isLoading = false,
  childrenEntries,
  expandedPaths,
  loadingPaths,
  directoryContents,
  selectedPath,
  onSelectFile,
  onToggleDirectory,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entry.is_dir) {
      onToggleDirectory?.(entry);
    } else {
      onSelectFile?.(entry);
    }
  };

  const isMarkdown =
    entry.name.endsWith(".md") ||
    entry.name.endsWith(".markdown") ||
    entry.name.endsWith(".mdown");

  return (
    <div>
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (entry.is_dir) {
              onToggleDirectory?.(entry);
            } else {
              onSelectFile?.(entry);
            }
          }
        }}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        className={`group flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer text-xs select-none transition-colors duration-150 ${
          isSelected
            ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`}
        title={entry.path}
      >
        {/* ディレクトリ展開アイコン または スペーサー */}
        <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-zinc-400 dark:text-zinc-500">
          {entry.is_dir ? (
            isLoading ? (
              <svg
                className="w-3 h-3 animate-spin text-zinc-400"
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
            ) : isExpanded ? (
              <svg
                className="w-3 h-3 text-zinc-500 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg
                className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )
          ) : (
            <span className="w-3" />
          )}
        </span>

        {/* ファイル・フォルダアイコン */}
        <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
          {entry.is_dir ? (
            isExpanded ? (
              <svg
                className="w-4 h-4 text-amber-500/90 dark:text-amber-400/90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 text-amber-500/80 dark:text-amber-400/80"
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
            )
          ) : isMarkdown ? (
            <svg
              className="w-4 h-4 text-indigo-500 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ) : (
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          )}
        </span>

        {/* ファイル / ディレクトリ名 */}
        <span className="truncate flex-1 font-normal">{entry.name}</span>
      </div>

      {/* サブディレクトリの子エントリ（展開時） */}
      {entry.is_dir && isExpanded && (
        <div>
          {isLoading ? (
            <div
              style={{ paddingLeft: `${(depth + 1) * 14 + 16}px` }}
              className="py-1 text-[11px] text-zinc-400 dark:text-zinc-500 italic"
            >
              読み込み中...
            </div>
          ) : childrenEntries && childrenEntries.length > 0 ? (
            childrenEntries.map((child) => (
              <SidebarItem
                key={child.path}
                entry={child}
                depth={depth + 1}
                isSelected={selectedPath === child.path}
                isExpanded={expandedPaths?.has(child.path) ?? false}
                isLoading={loadingPaths?.has(child.path) ?? false}
                childrenEntries={directoryContents?.[child.path]}
                expandedPaths={expandedPaths}
                loadingPaths={loadingPaths}
                directoryContents={directoryContents}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                onToggleDirectory={onToggleDirectory}
              />
            ))
          ) : childrenEntries && childrenEntries.length === 0 ? (
            <div
              style={{ paddingLeft: `${(depth + 1) * 14 + 16}px` }}
              className="py-1 text-[11px] text-zinc-400 dark:text-zinc-500 italic"
            >
              (空のフォルダ)
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
