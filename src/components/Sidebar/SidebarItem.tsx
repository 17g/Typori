import React from "react";
import { FileEntry } from "./types";

interface SidebarItemProps {
  entry: FileEntry;
  isSelected?: boolean;
  onSelect?: (entry: FileEntry) => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  entry,
  isSelected = false,
  onSelect,
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(entry);
    }
  };

  const isMarkdown =
    entry.name.endsWith(".md") ||
    entry.name.endsWith(".markdown") ||
    entry.name.endsWith(".mdown");

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer text-xs select-none transition-colors duration-150 ${
        isSelected
          ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-200"
      }`}
      title={entry.path}
    >
      {/* アイコン */}
      <span className="flex-shrink-0 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
        {entry.is_dir ? (
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
      <span className="truncate flex-1">{entry.name}</span>
    </div>
  );
};
