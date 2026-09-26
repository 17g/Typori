import React from "react";
import { SidebarProps } from "./types";
import { SidebarItem } from "./SidebarItem";

export const Sidebar: React.FC<SidebarProps> = ({
  entries = [],
  selectedPath = null,
  currentDirectory = null,
  onSelectEntry,
  isOpen = true,
  onToggleOpen,
}) => {
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

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/75 dark:bg-zinc-950/75 flex flex-col flex-shrink-0 select-none transition-all duration-200">
      {/* サイドバーヘッダー */}
      <div className="h-10 border-b border-zinc-200/80 dark:border-zinc-800/80 px-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500">
            Explorer
          </span>
          {currentDirectory && (
            <span
              className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[120px]"
              title={currentDirectory}
            >
              / {currentDirectory.split(/[/\\]/).filter(Boolean).pop()}
            </span>
          )}
        </div>
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

      {/* ファイルリスト */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {entries.length === 0 ? (
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
              isSelected={selectedPath === entry.path}
              onSelect={onSelectEntry}
            />
          ))
        )}
      </div>

      {/* フッター */}
      <div className="h-7 border-t border-zinc-200/80 dark:border-zinc-800/80 px-3 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>{entries.length} items</span>
      </div>
    </aside>
  );
};

export default Sidebar;
